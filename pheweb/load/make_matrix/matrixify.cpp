// This program takes two args:
// 1. the path to the sites file, like /foo/sites/sites.tsv
// 2. the path to the augmented pheno directory, like /foo/augmented_phenos/
// The augmented pheno files must look somewhat like:
//      chr    pos  ref  alt       rsids  nearest_genes      maf     pval
//        1  49298    T    C  rs10399793         OR4G4P  0.36596  0.73483
//        1  54676    C    T   rs2462492         OR4G4P   0.3857  0.52691
// The sites file is like that but with only [chr, pos, ref, alt, rsid, nearest_genes] and without headers.
// Every augmented pheno file must be a subsequence of the sites file.
// This program will print the full matrix to stdout.

/*
 Current overall flow:
- get cpras from each input file -> cpra/<pheno_id>
- merge them -> cpras.tsv
- annotate that -> sites.tsv
- sites.tsv + each input file -> augmented_pheno/<pheno_id>
- sites.tsv + augmented_pheno/* -> matrix.tsv.gz

Flow for per-variant info:
- sites.tsv is just cpra.tsv + per-variant annotations.  Allow users to merge more annotations into that file.
    - those fields must be documented in possible_fields, so that we can auto-tooltip them.
    - use annotation_files=[{...},...] in config.py
        - make it work for VEP with special fields.
- read from input files -> augmented_pheno/<pheno_id>
- assert that they are the same in every augmented_pheno/<pheno_id> in matrix.tsv.gz
- so, matrixify.cpp must directly include EVERY column in sites.tsv.
- augmented_pheno/<pheno_id> must have every field from sites.tsv.
*/

// TODO:
// 0. Map out current algorithm.
//   - make sure that $datadir/augmented_phenos contains exactly the right phenos.
//   - check whether matrix.tsv.gz includes all source phenos and if its newer-or-equal to them all.
//   - open every source file
//   - const per-variant columns (TODO: can these be constant in the new version?
//
// 1. Map out how things should work.
//   - Replace ColIdx with a dictionary
//   - what to pass in?  per_variant, per_assoc?


#include <iterator>
#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <string>
#include <glob.h>
#include <assert.h>
#include <stdlib.h>
#include <sys/resource.h> // setrlimit
#include <stdio.h>
#include <errno.h>
#include <iomanip> // setprecision


// ------
// BGZIP-writing code

// references:
// - htslib-cffi @ <https://github.com/quinlan-lab/hts-python/blob/master/hts/hts_concat.h>

// todo:
// 1. drop this into matrixify.cpp and get it working with c++ on test data.
// 2. get it working with cffi.
// 3. understand tabix and build .tbi on-the-fly.
//   - see <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3042176/>
//   - see <https://samtools.github.io/hts-specs/tabix.pdf>

//#include <iostream> // redundant
//#include <fstream> // redundant
//#include <sys/stat.h> // struct stat // TODO: should we be using stat to get the system's preferred blocksize?
#include <zlib.h>
#include <assert.h>
#include <fcntl.h> // O_WRONLY &c

class Compressor {
// This is adapted from <https://github.com/samtools/htslib/blob/master/bgzf.c>,
// referencing <http://github.com/samtools/htslib/blob/master/bgzip.c>
public:
    Compressor(std::string fname) {
        assert(compressBound(BGZF_BLOCK_SIZE) < BGZF_MAX_BLOCK_SIZE); // sanity-check
        _fname = fname;
        _file.open(fname.c_str(), std::ios::binary | std::ios::out);
        _uncompressed_block = new uint8_t[2*BGZF_MAX_BLOCK_SIZE];
        _compressed_block = _uncompressed_block + BGZF_MAX_BLOCK_SIZE;
        _uncompressed_block_size = 0;
    }
    void close() {
        // Make one empty block at the end to indicate EOF (as per samtools unofficial spec)
        if (_uncompressed_block_size) flush_uncompressed();
        flush_uncompressed();
    }
    ~Compressor() { close(); }
    void write(const char* src_buffer, size_t src_len) {
        while (src_len > 0) {
            int copy_length = BGZF_BLOCK_SIZE - _uncompressed_block_size;
            if (copy_length > src_len) {
                copy_length = src_len;
            }
            memcpy(_uncompressed_block + _uncompressed_block_size, src_buffer, copy_length);
            _uncompressed_block_size += copy_length;
            src_buffer += copy_length;
            src_len -= copy_length;
            if (_uncompressed_block_size == BGZF_BLOCK_SIZE) {
                flush_uncompressed();
            } else if (_uncompressed_block_size > BGZF_BLOCK_SIZE) {
                std::cerr << "oh no why is BGZF_BLOCK_SIZE longer than _uncompressed_block_size??" << std::endl;
            }
        }
    }
    void write(const std::string src_string) {
        write(src_string.c_str(), src_string.length());
    }
    void write(const std::string chrom, uint64_t pos, const std::string rest) {
        write(chrom); write("\t");
        write(std::to_string(pos)); write("\t");
        write(rest); write("\n");
    }
private:
     static inline void packInt16(uint8_t *buffer, uint16_t value) {
        buffer[0] = value;
        buffer[1] = value >> 8;
    }
    static inline int unpackInt16(const uint8_t *buffer) {
        return buffer[0] | buffer[1] << 8;
    }
    static inline void packInt32(uint8_t *buffer, uint32_t value) {
        buffer[0] = value;
        buffer[1] = value >> 8;
        buffer[2] = value >> 16;
        buffer[3] = value >> 24;
    }
    static const char *zerr(int errnum, z_stream *zs) {
        static char buffer[32];
        /* Return zs->msg if available.
           zlib doesn't set this very reliably.  Looking at the source suggests
           that it may get set to a useful message for deflateInit2, inflateInit2
           and inflate when it returns Z_DATA_ERROR. For inflate with other
           return codes, deflate, deflateEnd and inflateEnd it doesn't appear
           to be useful.  For the likely non-useful cases, the caller should
           pass NULL into zs. */
        if (zs && zs->msg) return zs->msg;
        // gzerror OF((gzFile file, int *errnum)
        switch (errnum) {
        case Z_ERRNO:
            return strerror(errno);
        case Z_STREAM_ERROR:
            return "invalid parameter/compression level, or inconsistent stream state";
        case Z_DATA_ERROR:
            return "invalid or incomplete IO";
        case Z_MEM_ERROR:
            return "out of memory";
        case Z_BUF_ERROR:
            return "progress temporarily not possible, or in() / out() returned an error";
        case Z_VERSION_ERROR:
            return "zlib version mismatch";
        case Z_OK: // 0: maybe gzgets error Z_NULL
        default:
            snprintf(buffer, sizeof(buffer), "[%d] unknown", errnum);
            return buffer;
        }
    }
    static void bgzf_compress(uint8_t *dst, size_t &dlen, const uint8_t *src, size_t slen) {
        // TODO: return compressed_len
        uint32_t crc;
        z_stream zs;
        // compress the body
        zs.zalloc = NULL; zs.zfree = NULL;
        zs.msg = NULL;
        zs.next_in  = (Bytef*)src;
        zs.avail_in = slen;
        zs.next_out = dst + BLOCK_HEADER_LENGTH;
        zs.avail_out = dlen - BLOCK_HEADER_LENGTH - BLOCK_FOOTER_LENGTH;
        int ret = deflateInit2(&zs, COMPRESSION_LEVEL, Z_DEFLATED, -15, 8, Z_DEFAULT_STRATEGY); // -15 to disable zlib header/footer
        if (ret != Z_OK) {
            fprintf(stderr, "[E::%s] deflateInit2 failed: %s\n", __func__, zerr(ret, &zs));
            throw std::runtime_error("?");
        }
        if ((ret = deflate(&zs, Z_FINISH)) != Z_STREAM_END) {
            fprintf(stderr, "[E::%s] deflate failed: %s\n", __func__, zerr(ret, ret == Z_DATA_ERROR ? &zs : NULL));
            throw std::runtime_error("??");
        }
        if ((ret = deflateEnd(&zs)) != Z_OK) {
            fprintf(stderr, "[E::%s] deflateEnd failed: %s\n", __func__, zerr(ret, NULL));
            throw std::runtime_error("???");
        }
        dlen = zs.total_out + BLOCK_HEADER_LENGTH + BLOCK_FOOTER_LENGTH;
        // write the header
        memcpy(dst, BLOCK_HEADER, BLOCK_HEADER_LENGTH); // the last two bytes are a place holder for the length of the block
        packInt16(&dst[16], dlen - 1); // write the compressed length; -1 to fit 2 bytes
        // write the footer
        crc = crc32(crc32(0L, NULL, 0L), (Bytef*)src, slen);
        packInt32((uint8_t*)&dst[dlen - 8], crc);
        packInt32((uint8_t*)&dst[dlen - 4], slen);
    }
    // flush_uncompressed compresses _uncompressed_block into _file
    void flush_uncompressed() {
        size_t compressed_block_size = BGZF_MAX_BLOCK_SIZE;
        bgzf_compress(_compressed_block, compressed_block_size, _uncompressed_block, _uncompressed_block_size);
        _file.write( (const char*)_compressed_block, compressed_block_size);
        _uncompressed_block_size = 0;
    }
    std::string _fname;
    std::ofstream _file;
    uint8_t *_uncompressed_block; //  64KiB
    uint8_t *_compressed_block; // 64KiB
    size_t _uncompressed_block_size; // num bytes occupied
static const size_t BGZF_BLOCK_SIZE = 0xff00; // 255*256
static const size_t BGZF_MAX_BLOCK_SIZE = 0x10000; //64K
static const size_t WINDOW_SIZE = 0x10000; //64K
static const int COMPRESSION_LEVEL = Z_DEFAULT_COMPRESSION; // currently 6
static const int BLOCK_HEADER_LENGTH = 18;
static const int BLOCK_FOOTER_LENGTH = 8;
static constexpr const char* BLOCK_HEADER =
  "\x1f\x8b\x08\x04" // magic number, DEFLATE, extra field
  "\0\0\0\0" // no timestamp, what a waste
  "\0\xff" // no info about compression method or OS
  "\x06\0BC\x02\0\0"/*implicit \0*/; // 6-byte extra field named BC with 2-byte value (currently empty)
};

// int main() {
//     Compressor comp("matrix.tsv.gz");
//     std::string chrom[] = {"X", "Y", "28"};
//     for (int i=0; i<3; i++) {
//       for (uint64_t j=1; j < 900000; j+=10) {
//         comp.write(chrom[i], j, "foo-bar-baz-quux-wat-maltlickey-texas");
//       }
//     }
//       return 0;
// }



// ------
// CSV-reading code

std::vector<std::string> glob(const std::string& pat) {
  // From <http://stackoverflow.com/a/8615450/1166306>
  glob_t glob_result;
  glob(pat.c_str(),GLOB_TILDE,NULL,&glob_result);
  std::vector<std::string> ret;
  for(unsigned int i=0;i<glob_result.gl_pathc;++i){
    ret.push_back(std::string(glob_result.gl_pathv[i]));
  }
  globfree(&glob_result);
  return ret;
}


class CSVRow { // From <http://stackoverflow.com/questions/1120140/how-can-i-read-and-parse-csv-files-in-c>
public:
  std::string const& operator[](std::size_t index) const { return m_data[index]; }
  std::size_t size() const { return m_data.size(); }
  void readNextRow(std::istream& str) {
    std::string line;
    std::getline(str, line);
    // CR remover from <http://stackoverflow.com/a/2529011/1166306>
    if (!line.empty() && line[line.size() - 1] == '\r')
      line.erase(line.size() - 1);
    std::stringstream lineStream(line);
    std::string cell;
    m_data.clear();
    while(std::getline(lineStream, cell, '\t')) {
      m_data.push_back(cell);
    }
    if (!lineStream && cell.empty()) { //check for trailing empty cell
      m_data.push_back("");
    }
  }
private:
  std::vector<std::string> m_data;
};
std::istream& operator>>(std::istream& str, CSVRow& data) {
  data.readNextRow(str);
  return str;
}

class CSVIterator {
public:
  typedef std::input_iterator_tag iterator_category;
  typedef CSVRow value_type;
  typedef std::size_t difference_type;
  typedef CSVRow *pointer;
  typedef CSVRow &reference;
  CSVIterator(std::istream& stream) : m_str(stream.good()?&stream:NULL) { ++(*this); }
  CSVIterator(std::ifstream& stream) : m_str(stream.good()?&stream:NULL) { ++(*this); }
  CSVIterator() : m_str(NULL) {}
  CSVIterator& operator++() {
    if (m_str) {
      if (!((*m_str) >> m_row)){
        m_str = NULL;
      }
    }
    return *this;
  }
  CSVIterator operator++(int) {
    CSVIterator tmp(*this);
    ++(*this);
    return tmp;
  }
  CSVRow const& operator*() const { return m_row; }
  CSVRow const* operator->() const { return &m_row; }
  bool operator==(CSVIterator const& rhs) { return ((this == &rhs) || ((this->m_str == NULL) && (rhs.m_str == NULL))); }
  bool operator!=(CSVIterator const& rhs) { return !((*this) == rhs); }
private:
  std::istream *m_str;
  CSVRow m_row;
};

class ColIdx {
  // TODO: Long-term, how can we support arbitrary columns?
public:
  int CHR_COL = -1;
  int POS_COL = -1;
  int REF_COL = -1;
  int ALT_COL = -1;
  int RSID_COL = -1;
  int GENE_COL = -1;
  int MAF_COL = -1;
  int PVAL_COL = -1;
  int BETA_COL = -1;
  int SEBETA_COL = -1;
};


bool is_empty(std::ifstream& f)
{
  return f.peek() == std::ifstream::traits_type::eof();
}


// ------
// &c

void set_ulimit_num_files(unsigned num_files) {
  struct rlimit limit;
  limit.rlim_cur = num_files;
  limit.rlim_max = num_files;
  if (setrlimit(RLIMIT_NOFILE, &limit) != 0) {
    std::cerr << "setrlimit() failed with errno=" << errno << "\n";
    exit(1);
  }
}


// ------
// main

int run(int argc, char** argv) {

  //sites file
  std::string sites_fname = argv[1];
  std::ifstream sites_file(sites_fname);
  CSVIterator sites_it(sites_file);
  const int SITES_CHR_COL = 0;
  const int SITES_POS_COL = 1;
  const int SITES_REF_COL = 2;
  const int SITES_ALT_COL = 3;
  const int SITES_RSID_COL = 4;
  const int SITES_GENE_COL = 5;

  // augmented_pheno files
  std::string phenos_dir = argv[2];
  phenos_dir += "/*";
  std::vector<std::string> aug_fpaths = glob(phenos_dir.c_str());
  std::vector<std::string> aug_fnames(aug_fpaths.size());
  std::vector<std::ifstream*> aug_files(aug_fpaths.size()); // ifstreams have a problem with copies, so just pre-allocate.
  std::vector<CSVIterator*> aug_its(aug_fpaths.size());
  std::vector<ColIdx> aug_colidx(aug_fpaths.size());
  set_ulimit_num_files(aug_fpaths.size() + 5); // stdin, stdout, stderr, sites_file, ???

  for (size_t i = 0; i != aug_fnames.size(); i++) {
    aug_fnames[i] = aug_fpaths[i];
    size_t last_slash_idx = aug_fnames[i].find_last_of("/");
    if (std::string::npos != last_slash_idx) {
      aug_fnames[i].erase(0, last_slash_idx + 1);
    }
    std::ifstream* f = new std::ifstream(aug_fpaths[i].c_str());
    aug_files[i] = f;
    CSVIterator *it = new CSVIterator(*f);
    aug_its[i] = it;

    CSVRow row = **aug_its[i];
    for (int fieldname_index = 0; fieldname_index < row.size(); fieldname_index++) {
      if (row[fieldname_index] == "chrom") {
        aug_colidx[i].CHR_COL = fieldname_index;
      } else if (row[fieldname_index] == "pos") {
        aug_colidx[i].POS_COL = fieldname_index;
      } else if (row[fieldname_index] == "ref") {
        aug_colidx[i].REF_COL = fieldname_index;
      } else if (row[fieldname_index] == "alt") {
        aug_colidx[i].ALT_COL = fieldname_index;
      } else if (row[fieldname_index] == "rsids") {
        aug_colidx[i].RSID_COL = fieldname_index;
      } else if (row[fieldname_index] == "nearest_genes") {
        aug_colidx[i].GENE_COL = fieldname_index;
      } else if (row[fieldname_index] == "maf") {
        aug_colidx[i].MAF_COL = fieldname_index;
      } else if (row[fieldname_index] == "pval") {
        aug_colidx[i].PVAL_COL = fieldname_index;
      } else if (row[fieldname_index] == "beta") {
        aug_colidx[i].BETA_COL = fieldname_index;
      } else if (row[fieldname_index] == "sebeta") {
        aug_colidx[i].SEBETA_COL = fieldname_index;
      } else {
        std::cerr << "What is this column \"" << row[fieldname_index] << "\"?" << std::endl;
        return 1;
      }
    }
    (*aug_its[i])++; // go past header.
    // TODO: can I: row = (*aug_its[i])++; ?
  }

  // Print header line.
  std::cout << "#chrom\tpos\tref\talt\trsids\tnearest_genes\tmaf";
  for (size_t i = 0; i != aug_fnames.size(); i++) {
    std::cout << "\tpval@" << aug_fnames[i];
    if (aug_colidx[i].BETA_COL != -1) {
      std::cout << "\tbeta@" << aug_fnames[i];
    }
    if (aug_colidx[i].SEBETA_COL != -1) {
      std::cout << "\tsebeta@" << aug_fnames[i];
    }
  }
  std::cout << "\n";

  // Combine the remaining lines of each file.
  for(; sites_it != CSVIterator(); ++sites_it) {

    CSVRow sites_row = *sites_it;
    std::cout << sites_row[SITES_CHR_COL] << "\t"
              << sites_row[SITES_POS_COL] << "\t"
              << sites_row[SITES_REF_COL] << "\t"
              << sites_row[SITES_ALT_COL] << "\t"
              << sites_row[SITES_RSID_COL] << "\t"
              << sites_row[SITES_GENE_COL];

    int num_mafs = 0;
    double maf = 0;
    std::ostringstream all_the_rest; // gotta hold these while you calculate avg maf
    for (size_t i = 0; i < aug_fnames.size(); i++) {

      if (*aug_its[i] == CSVIterator()) {
        // just print blanks and continue
        all_the_rest << "\t.";
        if (aug_colidx[i].BETA_COL != -1) all_the_rest << "\t.";
        if (aug_colidx[i].SEBETA_COL != -1) all_the_rest << "\t.";
        continue;
      }

      // load current variant
      CSVRow row = **aug_its[i];

      if (row[aug_colidx[i].CHR_COL] == sites_row[SITES_CHR_COL] &&
          row[aug_colidx[i].POS_COL] == sites_row[SITES_POS_COL] &&
          row[aug_colidx[i].REF_COL] == sites_row[SITES_REF_COL] &&
          row[aug_colidx[i].ALT_COL] == sites_row[SITES_ALT_COL]) {

        // print row
        if (row[aug_colidx[i].RSID_COL] != sites_row[SITES_RSID_COL]) {
          std::cerr << "rsids disagree: [" << row[aug_colidx[i].RSID_COL] << "] [" << sites_row[SITES_RSID_COL] << "]" << std::endl;
          exit(1);
        }
        if (row[aug_colidx[i].GENE_COL] != sites_row[SITES_GENE_COL]) {
          std::cerr << "genes disagree: [" << row[aug_colidx[i].GENE_COL] << "] [" << sites_row[SITES_GENE_COL] << "]" << std::endl;
          exit(1);
        }

        maf += atof(row[aug_colidx[i].MAF_COL].c_str());
        num_mafs++;
        all_the_rest << "\t" << row[aug_colidx[i].PVAL_COL];
        if (aug_colidx[i].BETA_COL != -1) all_the_rest << "\t" << row[aug_colidx[i].BETA_COL];
        if (aug_colidx[i].SEBETA_COL != -1) all_the_rest << "\t" << row[aug_colidx[i].BETA_COL];
        (*aug_its[i])++;
      } else {
        // print blanks

        all_the_rest << "\t.";
        if (aug_colidx[i].BETA_COL != -1) all_the_rest << "\t.";
        if (aug_colidx[i].SEBETA_COL != -1) all_the_rest << "\t.";
      }
    }

    std::cout << "\t" << std::setprecision(3) << maf/num_mafs;
    std::cout << all_the_rest.str() << "\n";
  }
}




extern "C" {
  extern int cffi_run(int argc, char *argv[]) {
    return run(argc, argv);
  }
}
