
/*
compile with:
  g++ -std=c++11 -lz -o x x.cpp
*/

#include <cstring> // memcpy on Linux
#include <algorithm> // count on Linux
#include <stdexcept>  // runtime_error on Linux
#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <string>
#include <glob.h>
#include <stdlib.h>
#include <sys/resource.h> // setrlimit
#include <stdio.h>
#include <errno.h>
#include <iomanip> // setprecision
#include <zlib.h>
#include <fcntl.h> // O_WRONLY &c
#include <exception> // do I need this?


// ------
// BGZIP-writer

class BgzipWriter {
// This is adapted from <https://github.com/samtools/htslib/blob/master/bgzf.c>,
// also referencing <http://github.com/samtools/htslib/blob/master/bgzip.c>
public:
    BgzipWriter(std::string filepath) {
        if (compressBound(BGZF_BLOCK_SIZE) > BGZF_MAX_BLOCK_SIZE) { throw std::runtime_error("[BGZF_MAX_BLOCK_SIZE is too small to hold compressed random data]"); }
        _filepath = filepath;
        _file.open(filepath.c_str(), std::ios::out | std::ios::binary);
        _uncompressed_block = new uint8_t[2*BGZF_MAX_BLOCK_SIZE];
        _compressed_block = _uncompressed_block + BGZF_MAX_BLOCK_SIZE;
        _uncompressed_block_size = 0;
    }
    ~BgzipWriter() {
        _file.close();
        delete _uncompressed_block;
    }
    void write(const char* src_buffer, size_t src_len) {
        while (src_len > 0) {
            size_t copy_length = BGZF_BLOCK_SIZE - _uncompressed_block_size;
            if (copy_length > src_len) copy_length = src_len;
            memcpy(_uncompressed_block + _uncompressed_block_size, src_buffer, copy_length);
            _uncompressed_block_size += copy_length;
            src_buffer += copy_length;
            src_len -= copy_length;
            if (_uncompressed_block_size >= BGZF_BLOCK_SIZE) {
                if (_uncompressed_block_size > BGZF_BLOCK_SIZE) {
                    throw std::runtime_error("[uncompressed block too long]");
                }
                flush_uncompressed();
            }
        }
    }
    void write(const std::string src_string) {
        write(src_string.c_str(), src_string.length());
    }
    void close() {
        // Make one empty block at the end to indicate EOF (as per samtools unofficial spec)
        if (_uncompressed_block_size) flush_uncompressed();
        flush_uncompressed();
    }
private:
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
        std::ostringstream errstream;
        // compress the body
        zs.zalloc = NULL; zs.zfree = NULL;
        zs.msg = NULL;
        zs.next_in  = (Bytef*)src;
        zs.avail_in = slen;
        zs.next_out = dst + BLOCK_HEADER_LENGTH;
        zs.avail_out = dlen - BLOCK_HEADER_LENGTH - BLOCK_FOOTER_LENGTH;
        int ret = deflateInit2(&zs,
                               Z_DEFAULT_COMPRESSION, // compression level. default is 6
                               Z_DEFLATED,
                               -15, // use 2^15=32kB window and output raw (no zlib header/footer)
                               8,
                               Z_DEFAULT_STRATEGY);
        if (ret != Z_OK) {
            errstream << "[E::" << __func__ << "] deflateInit2 failed: " << zerr(ret, &zs) << "\n";
            throw std::runtime_error(errstream.str().c_str());
        }
        ret = deflate(&zs, Z_FINISH);
        if (ret != Z_STREAM_END) {
            errstream << "[E::" << __func__ << "] deflate failed: " << zerr(ret, ret == Z_DATA_ERROR ? &zs: NULL) << "\n";
            throw std::runtime_error(errstream.str().c_str());
        }
        ret = deflateEnd(&zs);
        if (ret != Z_OK) {
            errstream << "[E::" << __func__ << "] deflateEnd failed: " << zerr(ret, NULL) << "\n";
            throw std::runtime_error(errstream.str().c_str());
        }
        dlen = zs.total_out + BLOCK_HEADER_LENGTH + BLOCK_FOOTER_LENGTH;
        // write the header
        memcpy(dst, BLOCK_HEADER, BLOCK_HEADER_LENGTH); // the last two bytes are a place holder for the length of the block
        packInt16(&dst[16], dlen - 1); // write the compressed length; -1 to fit into 2 bytes
        // write the footer
        crc = crc32(crc32(0L, NULL, 0L), (Bytef*)src, slen);
        packInt32((uint8_t*)&dst[dlen - 8], crc);
        packInt32((uint8_t*)&dst[dlen - 4], slen);
    }
    // flush_uncompressed compresses _uncompressed_block into _file
    inline void flush_uncompressed() {
        // NOTE: for random data, the compressed data is often longer than the uncompressed.
        //       but compressed blocks cannot be more than 64KiB, because their size is two bytes.
        //       so, if `bgzf_compress` throws `insufficient_space_exception`, rerun with each half of data.
        //       this should never happen, because our header+footer is 26 bytes, so we only need marginally compressible data.
        size_t compressed_block_size = BGZF_MAX_BLOCK_SIZE;
        bgzf_compress(_compressed_block, compressed_block_size, _uncompressed_block, _uncompressed_block_size);
        _file.write( (const char*)_compressed_block, compressed_block_size);
        _uncompressed_block_size = 0;
    }
    std::string _filepath;
    std::ofstream _file;
    uint8_t *_uncompressed_block; // 64KiB
    uint8_t *_compressed_block; // 64KiB
    size_t _uncompressed_block_size; // num bytes occupied
    static const size_t BGZF_BLOCK_SIZE = 0xff00; // 255*256
    static const size_t BGZF_MAX_BLOCK_SIZE = 0x10000; //64K
    static const int COMPRESSION_LEVEL = 2; // default of 6 is 3x slower than 2.  2 is 10% slower than 1.
    static const int BLOCK_HEADER_LENGTH = 18;
    static const int BLOCK_FOOTER_LENGTH = 8;
    static constexpr const char* BLOCK_HEADER =
        "\x1f\x8b\x08\x04" // magic number, DEFLATE, extra field
        "\0\0\0\0" // no timestamp, what a waste
        "\0\xff" // no info about compression method or OS
        "\x06\0BC\x02\0\0"/* implicit \0 */; // 6-byte extra field named BC with 2-byte value (currently empty)
};


// ------
// Gzip reader with the istream interface
// copied from <http://www.cs.unc.edu/Research/compgeom/gzstream/>
// I raised bufferSize from `47+256` to 32*1024, though it didn't seem to affect speed.
class gzstreambuf : public std::streambuf {
private:
    // static const int bufferSize = 47+256;    // size of data buff
    // // totals 512 bytes under g++ for igzstream at the end.
    static const int bufferSize = 32*1024;
    gzFile           file;               // file handle for compressed file
    char             buffer[bufferSize]; // data buffer
    char             opened;             // open/close state of stream
    int              mode;               // I/O mode
    int flush_buffer();
public:
    gzstreambuf() : opened(0) {
        setp( buffer, buffer + (bufferSize-1));
        setg( buffer + 4,     // beginning of putback area
              buffer + 4,     // read position
              buffer + 4);    // end position
        // ASSERT: both input & output capabilities will not be used together
    }
    int is_open() { return opened; }
    gzstreambuf* open( const char* name, int open_mode);
    gzstreambuf* close();
    ~gzstreambuf() { close(); }
    virtual int     overflow( int c = EOF);
    virtual int     underflow();
    virtual int     sync();
};
class gzstreambase : virtual public std::ios {
protected:
    gzstreambuf buf;
public:
    gzstreambase() { init(&buf); }
    gzstreambase( const char* name, int open_mode);
    ~gzstreambase();
    void open( const char* name, int open_mode);
    void close();
    gzstreambuf* rdbuf() { return &buf; }
};
class igzstream : public gzstreambase, public std::istream {
public:
    igzstream() : std::istream( &buf) {}
    igzstream( const char* name, int open_mode = std::ios::in)
        : gzstreambase( name, open_mode), std::istream( &buf) {}
    gzstreambuf* rdbuf() { return gzstreambase::rdbuf(); }
    void open( const char* name, int open_mode = std::ios::in) {
        gzstreambase::open( name, open_mode);
    }
};
gzstreambuf* gzstreambuf::open( const char* name, int open_mode) {
    if ( is_open())
        return (gzstreambuf*)0;
    mode = open_mode;
    // no append nor read/write mode
    if ((mode & std::ios::ate) || (mode & std::ios::app)
        || ((mode & std::ios::in) && (mode & std::ios::out)))
        return (gzstreambuf*)0;
    char  fmode[10];
    char* fmodeptr = fmode;
    if ( mode & std::ios::in)
        *fmodeptr++ = 'r';
    else if ( mode & std::ios::out)
        *fmodeptr++ = 'w';
    *fmodeptr++ = 'b';
    *fmodeptr = '\0';
    file = gzopen( name, fmode);
    if (file == 0)
        return (gzstreambuf*)0;
    opened = 1;
    return this;
}
gzstreambuf * gzstreambuf::close() {
    if ( is_open()) {
        sync();
        opened = 0;
        if ( gzclose( file) == Z_OK)
            return this;
    }
    return (gzstreambuf*)0;
}
int gzstreambuf::underflow() { // used for input buffer only
    if ( gptr() && ( gptr() < egptr()))
        return * reinterpret_cast<unsigned char *>( gptr());

    if ( ! (mode & std::ios::in) || ! opened)
        return EOF;
    // Josuttis' implementation of inbuf
    int n_putback = gptr() - eback();
    if ( n_putback > 4)
        n_putback = 4;
    memcpy( buffer + (4 - n_putback), gptr() - n_putback, n_putback);

    int num = gzread( file, buffer+4, bufferSize-4);
    if (num <= 0) // ERROR or EOF
        return EOF;

    // reset buffer pointers
    setg( buffer + (4 - n_putback),   // beginning of putback area
          buffer + 4,                 // read position
          buffer + 4 + num);          // end of buffer

    // return next character
    return * reinterpret_cast<unsigned char *>( gptr());    
}
int gzstreambuf::flush_buffer() {
    // Separate the writing of the buffer from overflow() and
    // sync() operation.
    int w = pptr() - pbase();
    if ( gzwrite( file, pbase(), w) != w)
        return EOF;
    pbump( -w);
    return w;
}
int gzstreambuf::overflow( int c) { // used for output buffer only
    if ( ! ( mode & std::ios::out) || ! opened)
        return EOF;
    if (c != EOF) {
        *pptr() = c;
        pbump(1);
    }
    if ( flush_buffer() == EOF)
        return EOF;
    return c;
}
int gzstreambuf::sync() {
    // Changed to use flush_buffer() instead of overflow( EOF)
    // which caused improper behavior with std::endl and flush(),
    // bug reported by Vincent Ricard.
    if ( pptr() && pptr() > pbase()) {
        if ( flush_buffer() == EOF)
            return -1;
    }
    return 0;
}
gzstreambase::gzstreambase( const char* name, int mode) {
    init( &buf);
    open( name, mode);
}
gzstreambase::~gzstreambase() {
    buf.close();
}
void gzstreambase::open( const char* name, int open_mode) {
    if ( ! buf.open( name, open_mode))
        clear( rdstate() | std::ios::badbit);
}
void gzstreambase::close() {
    if ( buf.is_open())
        if ( ! buf.close())
            clear( rdstate() | std::ios::badbit);
}


// ------
// Line-by-line file-reader that can handle plaintext or gzip files
class LineReader {
public:
    inline void attach(const std::string& filepath) { // immediately reads the first line
        stream.open(filepath.c_str());
        next();
    }
    inline void next() {
        std::getline(stream, line); // drops the \n
        if (!line.empty() && line[line.size() - 1] == '\r') line.erase(line.size() - 1); // CR remover from <http://stackoverflow.com/a/2529011/1166306>
    }
    inline bool eof() { return stream.peek() == std::ifstream::traits_type::eof(); } // tells whether `next()` will work.
    std::string line;
    igzstream stream;
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

bool endsWith (std::string const &str, std::string const &suffix) {
    if (str.length() >= suffix.length()) {
        return (0 == str.compare (str.length() - suffix.length(), suffix.length(), suffix));
    }
    return false;
}


// ------
// main

int make_matrix(const char *sites_filepath, const char *augmented_pheno_glob, const char *matrix_filepath) {
    BgzipWriter writer(matrix_filepath);

    LineReader sites_reader;
    sites_reader.attach(sites_filepath);

    std::vector<std::string> aug_filepaths = glob(augmented_pheno_glob);
    size_t N_phenos = aug_filepaths.size();
    std::vector<LineReader> aug_readers(N_phenos);
    std::vector<std::string> aug_phenocodes(N_phenos);
    std::vector<unsigned> aug_n_per_assoc_fields(N_phenos); // initialized to 0s.
    set_ulimit_num_files(N_phenos + 100); // are python files still open?
    for (size_t i = 0; i < N_phenos; i++) {
        aug_readers[i].attach(aug_filepaths[i]);
        aug_phenocodes[i] = aug_filepaths[i];
        size_t last_slash_idx = aug_phenocodes[i].find_last_of("/");
        if (std::string::npos != last_slash_idx) {
            aug_phenocodes[i].erase(0, last_slash_idx + 1);
        }
        if (endsWith(aug_phenocodes[i], ".gz")) {
            aug_phenocodes[i] = aug_phenocodes[i].erase(aug_phenocodes[i].length() - 3);
        }
    }

    // Headers:
    // sites.tsv's header must begin with "chrom pos ref alt ".
    // Every file's header must begin with the header of sites.tsv
    // All fields after the ones in sites.tsv will be written as "<field>@<pheno>"
    static const std::string cpra_header = "chrom\tpos\tref\talt\t";
    if(0 != sites_reader.line.compare(0, cpra_header.size(), cpra_header)) { throw std::runtime_error("[sites.tsv header doesn't begin with \"chrom\tpos\tref\talt\t\"]"); }
    for (size_t i=0; i < N_phenos; i++) {
        if(0 != aug_readers[i].line.compare(0, sites_reader.line.size(), sites_reader.line)) {
            std::ostringstream errstream;
            errstream << "[One of the pheno files has a header that doesn't begin with the header of sites.tsv (or it failed to read).]";
            errstream << "[bad phenocode = " << aug_phenocodes[i] << "]";
            errstream << "[bad pheno file = " << aug_filepaths[i] << "]";
            errstream << "[bad pheno header = " << aug_readers[i].line << "]";
            errstream << "[sites.tsv header = " << sites_reader.line << "]";
            throw std::runtime_error(errstream.str().c_str());
        }
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
            writer.write(aug_phenocodes[i]);
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
                if (0 != aug_readers[i].line.compare(0, sites_reader.line.size(), sites_reader.line)) {
                    std::ostringstream errstream;
                    errstream << "[There's a variant in a pheno file that has different information from that same variant in sites.tsv.]";
                    errstream << "[bad phenocode = " << aug_phenocodes[i] << "]";
                    errstream << "[bad pheno line = " << aug_readers[i].line << "]";
                    errstream << "[bad sites.tsv line = " << sites_reader.line << "]";
                    throw std::runtime_error(errstream.str().c_str());
                }
                if (n_fields(aug_readers[i].line) != n_per_variant_fields + aug_n_per_assoc_fields[i]) { // correct number of fields on line.
                    std::ostringstream errstream;
                    errstream << "[a pheno has a line with a different number of tab-delimited fields than its header]";
                    errstream << "[bad phenocode = " << aug_phenocodes[i] << "]";
                    errstream << "[bad pheno line = " << aug_readers[i].line << "]";
                    errstream << "[num fields on line = " << n_fields(aug_readers[i].line) << "]";
                    errstream << "[num fields in header = " << n_per_variant_fields + aug_n_per_assoc_fields[i] << "]";
                    throw std::runtime_error(errstream.str().c_str());
                }
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

    writer.close();

    return 0;
}



// ------
// entry points

const char* make_matrix_and_return_string(const char *sites_filepath, const char *augmented_pheno_glob, const char *matrix_filepath) {
  try {
    make_matrix(sites_filepath, augmented_pheno_glob, matrix_filepath);
    return "ok";
  } catch (const std::exception &exc) {
    return exc.what();
  } catch (...) {
    return "[something broke]";
  }
}

extern "C" { // we need C because C++ mangles names supposedly
  extern const char* cffi_make_matrix(const char *sites_filepath, const char *augmented_pheno_glob, const char *matrix_filepath) {
    return make_matrix_and_return_string(sites_filepath, augmented_pheno_glob, matrix_filepath);
  }
}

// for use when compiling directly (for debugging)
int main(int argc, char **argv) {
  if (argc == 4) {
    const char* ret = make_matrix_and_return_string(argv[1], argv[2], argv[3]);
    std::cerr << ret << std::endl;
    std::string good_output = "ok";
    return (0 == good_output.compare(ret)) ? 0 : 1;
  }
  std::cout << "Usage:\n"
            << " ./x /path/to/sites.tsv \"/path/to/pheno/*\" /path/to/matrix.tsv.gz"
            << std::endl;
  return 1;
}
