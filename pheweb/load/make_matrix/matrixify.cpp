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

void set_ulimit_num_files(unsigned num_files) {
  struct rlimit limit;
  limit.rlim_cur = num_files;
  limit.rlim_max = num_files;
  if (setrlimit(RLIMIT_NOFILE, &limit) != 0) {
    std::cerr << "setrlimit() failed with errno=" << errno << "\n";
    exit(1);
  }
}

int main(int argc, char** argv) {

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
