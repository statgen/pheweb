
// Compile with -std=c++11 -lz -Wall -Wextra matrixify.cpp

#include <cstring> // memcpy on Linux
#include <algorithm> // count on Linux
#include <stdexcept>  // runtime_error on Linux
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

// todo: understand tabix and build .tbi on-the-fly.
//       - see <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3042176/>
//       - see <https://samtools.github.io/hts-specs/tabix.pdf>

class BgzipWriter {
// This is adapted from <https://github.com/samtools/htslib/blob/master/bgzf.c>,
// referencing <http://github.com/samtools/htslib/blob/master/bgzip.c>
public:
    BgzipWriter(std::string filepath) {
        assert(compressBound(BGZF_BLOCK_SIZE) < BGZF_MAX_BLOCK_SIZE); // sanity-check
        _filepath = filepath;
        _file.open(filepath.c_str(), std::ios::out | std::ios::binary);
        _uncompressed_block = new uint8_t[2*BGZF_MAX_BLOCK_SIZE];
        _compressed_block = _uncompressed_block + BGZF_MAX_BLOCK_SIZE;
        _uncompressed_block_size = 0;
    }
    ~BgzipWriter() { close(); }
    void write(const char* src_buffer, size_t src_len) {
        while (src_len > 0) {
            size_t copy_length = BGZF_BLOCK_SIZE - _uncompressed_block_size;
            if (copy_length > src_len) copy_length = src_len;
            memcpy(_uncompressed_block + _uncompressed_block_size, src_buffer, copy_length);
            _uncompressed_block_size += copy_length;
            src_buffer += copy_length;
            src_len -= copy_length;
            if (_uncompressed_block_size >= BGZF_BLOCK_SIZE) {
                assert (_uncompressed_block_size == BGZF_BLOCK_SIZE);
                flush_uncompressed();
            }
        }
    }
    void write(const std::string src_string) {
        write(src_string.c_str(), src_string.length());
    }
private:
    void close() {
        // Make one empty block at the end to indicate EOF (as per samtools unofficial spec)
        if (_uncompressed_block_size) flush_uncompressed();
        flush_uncompressed();
    }
     static inline void packInt16(uint8_t *buffer, uint16_t value) {
        buffer[0] = value;
        buffer[1] = value >> 8;
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
        switch (errnum) {
        case Z_ERRNO: return strerror(errno);
        case Z_STREAM_ERROR: return "invalid parameter/compression level, or inconsistent stream state";
        case Z_DATA_ERROR: return "invalid or incomplete IO";
        case Z_MEM_ERROR: return "out of memory";
        case Z_BUF_ERROR: return "progress temporarily not possible, or in() / out() returned an error";
        case Z_VERSION_ERROR: return "zlib version mismatch";
        case Z_OK:
        default: snprintf(buffer, sizeof(buffer), "[%d] unknown", errnum); return buffer;
        }
    }
    static inline void bgzf_compress(uint8_t *dst, size_t &dlen, const uint8_t *src, size_t slen) {
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
    std::string _filepath;
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
        "\x06\0BC\x02\0\0"/* implicit \0 */; // 6-byte extra field named BC with 2-byte value (currently empty)
};


// ------
// Line-by-line file-reader

class LineReader {
public:
    inline void attach(std::string filepath) {
        stream.open(filepath);
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
  struct rlimit old_limit, new_limit;
  getrlimit(RLIMIT_NOFILE, &old_limit);
  if (num_files > old_limit.rlim_max) {
    std::cerr << "You're trying to open " << num_files << " files at once, but your ulimit only allows you to open " << old_limit.rlim_max << ".  Use administrative rights to raise your limit." << std::endl;
    exit(1);
  }
  new_limit.rlim_cur = num_files;
  new_limit.rlim_max = num_files;
  if (setrlimit(RLIMIT_NOFILE, &new_limit) != 0) {
    std::cerr << "setrlimit() failed with errno=" << errno << "\n";
    std::cerr << "current soft limit is " << old_limit.rlim_cur << ", hard limit is " << old_limit.rlim_max << ", requested new limit is " << num_files << std::endl;
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

int make_matrix(char *sites_filepath, char *augmented_pheno_glob, char *matrix_filepath) {
    BgzipWriter writer(matrix_filepath);

    LineReader sites_reader;
    sites_reader.attach(sites_filepath);

    std::vector<std::string> aug_filepaths = glob(augmented_pheno_glob);
    size_t N_phenos = aug_filepaths.size();
    std::vector<LineReader> aug_readers(N_phenos);
    std::vector<std::string> aug_basenames(N_phenos);
    std::vector<unsigned> aug_n_per_assoc_fields(N_phenos); // initialized to 0s.
    set_ulimit_num_files(N_phenos + 100); // are python files still open?
    for (size_t i = 0; i < N_phenos; i++) {
        aug_readers[i].attach(aug_filepaths[i]);
        aug_basenames[i] = aug_filepaths[i];
        size_t last_slash_idx = aug_basenames[i].find_last_of("/");
        if (std::string::npos != last_slash_idx) {
          aug_basenames[i].erase(0, last_slash_idx + 1);
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
    writer.write("#"); // tabix needs the header commented.
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
            writer.write(aug_basenames[i]);
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


int bgzip_file(char *in_filepath, char *out_filepath, char *prepend_bytes) {

  BgzipWriter writer(out_filepath);
  std::string prepend_bytes_string(prepend_bytes);
  writer.write(prepend_bytes_string);

  std::ifstream reader(in_filepath, std::ios::in | std::ios::binary);

  static const size_t BLOCK_SIZE = 256 * 1024; // number is arbitrary
  char *buffer = new char[BLOCK_SIZE];

  while (!reader.eof()) {
    reader.read(buffer, BLOCK_SIZE);
    size_t num_bytes_read = reader.gcount();
    assert(reader.eof() || num_bytes_read == BLOCK_SIZE);
    writer.write(buffer, num_bytes_read);
  }

  return 0;
}



// ------
// entry points

extern "C" {
  extern int cffi_make_matrix(char *sites_filepath, char *augmented_pheno_glob, char *matrix_filepath) {
    return make_matrix(sites_filepath, augmented_pheno_glob, matrix_filepath);
  }

  extern int cffi_bgzip_file(char *in_filepath, char *out_filepath, char *prepend_bytes) {
    return bgzip_file(in_filepath, out_filepath, prepend_bytes);
  }
}

// compile with `g++ -lz -std=c++11 -o x x.cpp`
int main(int argc, char **argv) {
  if (argc == 5 && strcmp(argv[1], "matrix") == 0)
    return make_matrix(argv[2], argv[3], argv[4]);
  if (argc == 5 && strcmp(argv[1], "bgzip") == 0)
    return bgzip_file(argv[2], argv[3], argv[4]);
  std::cout << "Usage:\n"
            << " ./x matrix /path/to/sites.tsv \"/path/to/pheno/*\" /path/to/matrix.tsv.gz\n"
            << " ./x bgzip /path/to/files.tsv /path/to/files.tsv.gz \"#\"" << std::endl;
  return 1;
}
