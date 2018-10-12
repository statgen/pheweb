## Detailed developer instructions

This document contains information useful for those looking to modify and develop PheWeb source code. 
Some familiarity with Python and basic commands is assumed.

### Installing the package
In order to reflect code changes as you work, PheWeb should be installed in "editable" mode.

1. Clone the repository to a new folder.
2. Create and active a new virtual environment (for example, based on Python 3). For example, in the checked-out 
    PheWeb directory: `python3 -m venv .venv && source .venv/bin/activate` (if you prefer to manage your virtualenv 
    some other way, that is ok)
3. With the virtualenv activated, install the package in "editable" mode: `pip3 install -e .`
4. When complete, verify that PheWeb is installed and working correctly: `pheweb -h`

### Running the unit tests
Tests may take several minutes to run. The test suite is intended to exercise the entire PheWeb codebase from start to 
finish. In the future, more granular test filtering may be provided.

`pytest`


### Creating a working instance with sample data
The data used for unit tests can also provide the basis for a persistent local demonstration PheWeb site.  

First, generate a working *pheno-list.json* file:

```
pheweb phenolist glob --simple-phenocode 'tests/input_files/assoc-files/*'
pheweb phenolist unique-phenocode
pheweb phenolist read-info-from-association-files
pheweb phenolist import-phenolist -f pheno-list-categories.json tests/input_files/categories.csv
pheweb phenolist merge-in-info pheno-list-categories.json
pheweb phenolist verify --required-columns category
```

Then process the data. The first iteration will typically take much longer than future iterations, due to the 
one-time need to download an updated copy of dbSNP.

`pheweb process`

Finally, the processed data can be served in a web browser, using the local development server:

`pheweb serve`

#### Alternative process
An alternative way to run this process would be to run the static unit tests once, then run the script 
`./tests/run-gunicorn.sh` to serve generated assets from the system temp directory. This approach relies on serving 
leftover data from a specific test run, and is not ideal if you plan to rerun unit tests often or in parts.

## Sample regions of interest
The test data has very limited coverage, so plots in many regions will appear sparse. 
See `<base_url>/pheno/EAR-LENGTH` for a sample manhattan/ QQ plot page, and `<base_url>/gene/SAMD11` for a sample 
association plot with data.
