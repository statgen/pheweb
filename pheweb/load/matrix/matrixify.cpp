// This program takes two args:
// 1. the path to the sites file, like /foo/sites/sites.tsv
// 2. the path to the augmented pheno directory, like /foo/augmented_phenos/
// The augmented pheno files must look somewhat like:
//      chr    pos  ref  alt       rsids  nearest_genes      maf     pval
//        1  49298    T    C  rs10399793         OR4G4P  0.36596  0.73483
//        1  54676    C    T   rs2462492         OR4G4P   0.3857  0.52691
// The sites file is like that but with only [chr, pos, ref, alt, rsid, nearest_genes] and without headers.
// Every augmented pheno file must be a subsequence of the sites file.


// Compile with -std=c++11 -lz
// test with:
// clear&& g++ -Wall -Wextra -std=c++11 -lz matrixify.cpp &&echo --&& ./a.out 4 ~/PROJECTS/pheweb/test/data_dir/sites/sites.tsv '/Users/peter/PROJECTS/pheweb/test/data_dir/augmented_pheno/*' ~/PROJECTS/pheweb/test/data_dir/matrix.tsv.gz &&echo --&& zcat /Users/peter/PROJECTS/pheweb/test/data_dir/matrix.tsv.gz | head


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
#include <zlib.h>
#include <fcntl.h> // O_WRONLY &c
//#include <sys/stat.h> // struct stat // TODO: should we be using stat to get the system's preferred blocksize?


// ------
// BGZIP-writer

// references:
// - htslib-cffi (for ffibuilder) @ <https://github.com/quinlan-lab/hts-python/blob/master/hts/hts_concat.h>

// todo: understand tabix and build .tbi on-the-fly.
//       - see <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3042176/>
//       - see <https://samtools.github.io/hts-specs/tabix.pdf>

class BgzipWriter {
// This is adapted from <https://github.com/samtools/htslib/blob/master/bgzf.c>,
// referencing <http://github.com/samtools/htslib/blob/master/bgzip.c>
public:
    BgzipWriter(std::string fname) {
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
    ~BgzipWriter() { close(); }
    void write(const char* src_buffer, size_t src_len) {
        while (src_len > 0) {
            size_t copy_length = BGZF_BLOCK_SIZE - _uncompressed_block_size;
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
    static inline void bgzf_compress(uint8_t *dst, size_t &dlen, const uint8_t *src, size_t slen) {
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
    inline void flush_uncompressed() {
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


// ------
// Line-by-line file-reader

class LineReader {
public:
    inline void attach(std::string fpath) {
        stream.open(fpath);
        next();
    }
    inline void next() {
        std::getline(stream, line); // drops the \n
        if (!line.empty() && line[line.size() - 1] == '\r') line.erase(line.size() - 1); // CR remover from <http://stackoverflow.com/a/2529011/1166306>
    }
    inline bool eof() { return stream.peek() == std::ifstream::traits_type::eof(); }
    std::string line;
    std::ifstream stream;
};


// ------
// utility functions

static inline void set_ulimit_num_files(unsigned num_files) {
  struct rlimit limit;
  limit.rlim_cur = num_files;
  limit.rlim_max = num_files;
  if (setrlimit(RLIMIT_NOFILE, &limit) != 0) {
    std::cerr << "setrlimit() failed with errno=" << errno << "\n";
    exit(1);
  }
}

static inline std::vector<std::string> glob(const std::string& pat) {
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

static inline size_t pos_after_n_of_char(std::string str, size_t n, char c) {
    // return the position AFTER `n` instances of the char `c`
    size_t i = 0;
    for (; i < str.size(); i++) {
        if (n == 0) return i;
        if (str[i] == c) n--;
    }
    if (n == 0) return i;
    return -1;
}

static inline size_t n_fields(std::string str) {
    // count the number of tab-delimited fields in a string
    return 1 + std::count(str.begin(), str.end(), '\t'); // `1+` because there's no trailing \t
}


// ------
// main

int run(char *sites_fname, char *augmented_pheno_glob, char *matrix_fname) {
    BgzipWriter writer(matrix_fname);

    LineReader sites_reader;
    sites_reader.attach(sites_fname);

    std::vector<std::string> aug_fpaths = glob(augmented_pheno_glob);
    size_t N_phenos = aug_fpaths.size();
    std::vector<LineReader> aug_readers(N_phenos);
    std::vector<std::string> aug_fnames(N_phenos);
    std::vector<unsigned> aug_n_per_assoc_fields(N_phenos); // initialized to 0s.
    set_ulimit_num_files(N_phenos + 10000); // are python files still open?
    for (size_t i = 0; i < N_phenos; i++) {
        aug_readers[i].attach(aug_fpaths[i]);
        aug_fnames[i] = aug_fpaths[i];
        size_t last_slash_idx = aug_fnames[i].find_last_of("/");
        if (std::string::npos != last_slash_idx) {
          aug_fnames[i].erase(0, last_slash_idx + 1);
        }
    }

    // Headers:
    // Every file's header must begin with "chrom pos ref alt ".
    // Every file's header must begin with the header of sites.tsv
    // All fields after the ones in sites.tsv will be written as "<field>@<pheno>"
    static const std::string cpra_header = "chrom\tpos\tref\talt\t";
    assert(0 == sites_reader.line.compare(0, cpra_header.size(), cpra_header));
    for (size_t i=0; i < N_phenos; i++) {
        assert(0 == aug_readers[i].line.compare(0, sites_reader.line.size(), sites_reader.line));
    }
    writer.write(sites_reader.line); // no trailing \t or \n
    for (size_t i=0; i < N_phenos; i++) {
        std::string per_assoc_fields = aug_readers[i].line.substr(sites_reader.line.size(), std::string::npos);
        std::istringstream line_stream(per_assoc_fields);
        std::string field;
        std::getline(line_stream, field, '\t'); // consume first tab.
        while(std::getline(line_stream, field, '\t')) {
            writer.write("\t");
            writer.write(field);
            writer.write("@");
            writer.write(aug_fnames[i]);
            aug_n_per_assoc_fields[i]++;
        }
    }
    writer.write("\n");
    const size_t n_per_variant_fields = n_fields(sites_reader.line);
    // advance every file to its 1st data-line
    sites_reader.next();
    for (size_t i=0; i<N_phenos; i++) aug_readers[i].next();

    // Data:
    // Every aug_pheno is a subsequence of sites.tsv.
    // If a line in an aug_pheno has the same chrom-pos-ref-alt as sites.tsv, then it must have the sites.tsv line as its prefix.
    //    (ie, it must have the same per-variant fields, in the same order.)
    // So, we iterate over sites.tsv, printing and advancing any aug_pheno that matches CPRA, and printing '' for every field in non-matching aug_phenos.
    while(1) {
        writer.write(sites_reader.line);

        size_t pos_after_cpra = pos_after_n_of_char(sites_reader.line, 4, '\t');

        for (size_t i=0; i<N_phenos; i++) {
            if (!aug_readers[i].eof() && 0 == sites_reader.line.compare(0, pos_after_cpra, aug_readers[i].line, 0, pos_after_cpra)) { // CPRAs match.
                assert(0 == aug_readers[i].line.compare(0, sites_reader.line.size(), sites_reader.line)); // per-variant fields match.
                assert(n_fields(aug_readers[i].line) == n_per_variant_fields + aug_n_per_assoc_fields[i]); // correct number of fields on line.
                writer.write(aug_readers[i].line.c_str() + sites_reader.line.size(), aug_readers[i].line.size() - sites_reader.line.size()); //write per-assoc fields
                aug_readers[i].next();

            } else { // CPRAs don't match
                // write blanks for this pheno
                for (size_t j=0; j<aug_n_per_assoc_fields[i]; j++) writer.write("\t");
            }
        }
        writer.write("\n");

        if (sites_reader.eof()) break;
        sites_reader.next();
    }

    return 0;
}

int main(int argc, char *argv[]) {
    return run(argv[2], argv[3], argv[4]);
}

extern "C" {
  extern int cffi_run(char *sites_fname, char *augmented_pheno_glob, char *matrix_fname) {
    return run(sites_fname, augmented_pheno_glob, matrix_fname);
  }
}
