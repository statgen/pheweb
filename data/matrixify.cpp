// This program must be run from the directory where the phenotypes reside.
// Those files must look somewhat like:
//      chr    pos  ref  alt       rsids  nearest_genes      maf     pval
//        1  49298    T    C  rs10399793         OR4G4P  0.36596  0.73483
//        1  54676    C    T   rs2462492         OR4G4P   0.3857  0.52691
// And they must all have exactly the same number of lines and the same first 4 columns on each line.

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


class CSVRow {
  // From <http://stackoverflow.com/questions/1120140/how-can-i-read-and-parse-csv-files-in-c>
public:
  std::string const& operator[](std::size_t index) const {
    return m_data[index];
  }
  std::size_t size() const {
    return m_data.size();
  }
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
  }
private:
  std::vector<std::string> m_data;
};
std::istream& operator>>(std::istream& str, CSVRow& data) {
  data.readNextRow(str);
  return str;
}

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

// TODO: read these from the first file, and then assert them in all the others.
// TODO: don't try to be a hero - just check for [beta, sebeta] and add them when they are available.
//     - if they aren't, maybe just set them to -1.

int main() {
  std::vector<std::string> fnames = glob("*");
  std::vector<std::ifstream*> ifs(fnames.size()); // ifstreams have a problem with copies, so just pre-allocate.

  std::cerr << "number of input files: " << fnames.size() << "\n";

  set_ulimit_num_files(fnames.size() + 4);

  for (std::vector<std::string>::size_type i = 0; i != fnames.size(); i++) {
    std::ifstream* f = new std::ifstream(fnames[i].c_str());
    ifs[i] = f;
  }

  //TODO: check .isgood() on each ifstream.

  //Read the column indexes of each field from the first file.
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
  CSVRow row;
  *ifs[0] >> row;
  for (int fieldname_index = 0; fieldname_index < row.size(); fieldname_index++) {
    if (row[fieldname_index] == "chrom") {
       CHR_COL = fieldname_index;
    } else if (row[fieldname_index] == "pos") {
      POS_COL = fieldname_index;
    } else if (row[fieldname_index] == "ref") {
      REF_COL = fieldname_index;
    } else if (row[fieldname_index] == "alt") {
      ALT_COL = fieldname_index;
    } else if (row[fieldname_index] == "rsids") {
      RSID_COL = fieldname_index;
    } else if (row[fieldname_index] == "nearest_genes") {
      GENE_COL = fieldname_index;
    } else if (row[fieldname_index] == "maf") {
      MAF_COL = fieldname_index;
    } else if (row[fieldname_index] == "pval") {
      PVAL_COL = fieldname_index;
    } else if (row[fieldname_index] == "beta") {
      BETA_COL = fieldname_index;
    } else if (row[fieldname_index] == "sebeta") {
      SEBETA_COL = fieldname_index;
    } else {
      std::cerr << "What is this column \"" << row[fieldname_index] << "\"?" << std::endl;
      return 1;
    }
  }


  // Print header
  std::cout << "chrom\tpos\tref\talt\trsids\tnearest_genes\tmaf";
  for (std::vector<std::string>::size_type i = 0; i != fnames.size(); i++) {
    std::cout << "\tpval-" << fnames[i];
    if (BETA_COL != -1) {
      std::cout << "\tbeta-" << fnames[i];
    }
    if (SEBETA_COL != -1) {
      std::cout << "\tsebeta-" << fnames[i];
    }
  }
  std::cout << "\n";

  // Read first line of each file.
  for (std::vector<std::ifstream>::size_type i = 1; i != ifs.size(); i++) {
    CSVRow row;
    *ifs[i] >> row;
    assert (row[CHR_COL] == "chrom");
    assert (row[POS_COL] == "pos");
    assert (row[REF_COL] == "ref");
    assert (row[ALT_COL] == "alt");
    assert (row[RSID_COL] == "rsids");
    assert (row[GENE_COL] == "nearest_genes");
    assert (row[MAF_COL] == "maf");
    assert (row[PVAL_COL] == "pval");
    assert (BETA_COL == -1 || row[BETA_COL] == "beta");
    assert (SEBETA_COL == -1 || row[SEBETA_COL] == "sebeta");
  }

  // Combine the remaining lines of each file.
  while(true) {
    //TODO: reshape this loop to primarily follow the first file.
    //      then check that all other files are exhausted after the loop.
    CSVRow row;
    if (!(*ifs[0] >> row)) {
      std::cerr << "success!\n";
      // Check that all the other files are empty too.
      for (std::vector<std::fstream>::size_type i = 1; i != ifs.size(); i++) {
        assert (is_empty(*ifs[i]));
      }
      return 0;
    }
    std::cout << row[CHR_COL] << "\t"
              << row[POS_COL] << "\t"
              << row[REF_COL] << "\t"
              << row[ALT_COL] << "\t"
              << row[RSID_COL] << "\t"
              << row[GENE_COL] << "\t";
    double maf = atof(row[MAF_COL].c_str());
    std::ostringstream all_the_rest;
    all_the_rest << row[PVAL_COL];
    if (BETA_COL != -1) {
      all_the_rest << "\t" << row[BETA_COL];
    }
    if (SEBETA_COL != -1) {
      all_the_rest << "\t" << row[BETA_COL];
    }

    const std::string chr = row[CHR_COL];
    const std::string pos = row[POS_COL];
    const std::string alt = row[ALT_COL];

    for (std::vector<std::fstream>::size_type i = 1; i != ifs.size(); i++) {
      if(!(*ifs[i] >> row)) {
        std::cerr << "ran out while looking at file #" << i << " (" << fnames[i] << ")\n";
        return 1;
      }

      assert (row[CHR_COL] == chr);
      assert (row[POS_COL] == pos);
      assert (row[ALT_COL] == alt);

      maf += atof(row[MAF_COL].c_str());
      all_the_rest << "\t" << row[PVAL_COL];
      if (BETA_COL != -1) {
        all_the_rest << "\t" << row[BETA_COL];
      }
      if (SEBETA_COL != -1) {
        all_the_rest << "\t" << row[BETA_COL];
      }
    }

    std::cout << maf/fnames.size() << "\t" << all_the_rest.str() << "\n";
  }
}
