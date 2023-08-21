For a list of available instances of PheWeb, navigate [here](http://pheweb.sph.umich.edu).
For a walk-through demo see [here](etc/demo.md#demo-navigating-pheweb).
If you have questions or comments, check out our [Google Group](https://groups.google.com/g/pheweb-umich).

![screenshot of PheWAS plot](https://cloud.githubusercontent.com/assets/862089/25474725/3edbe256-2b02-11e7-8abb-0ca26d406b11.png)

# How to Cite PheWeb
If you use the PheWeb code base for your work, please cite our paper:

Gagliano Taliun, S.A., VandeHaar, P. et al. Exploring and visualizing large-scale genetic associations by using PheWeb. *Nat Genet* 52, 550–552 (2020).

# How to Build a PheWeb for your Data

If this is broken, [open an issue on github](https://github.com/statgen/pheweb/issues/new) and hopefully I can help.

### 1. Install PheWeb

```bash
pip3 install pheweb
```

- If that doesn't work, follow [the detailed install instructions](etc/detailed-install-instructions.md#detailed-install-instructions).

### 2. Create a directory and `config.py` for your new dataset

```
mkdir ~/my-new-pheweb && cd ~/my-new-pheweb
```

This directory will store all the files pheweb makes for your dataset. All `pheweb ...` commands should be run in this directory.

Make `config.py` in this directory. In it, either set `hg_build_number = 19` or `hg_build_number = 38`.  Other options you can set are listed [here](etc/detailed-loading-instructions.md#configuration-options).

### 3. Check that your GWAS summary statistics files will work

You need one file for each phenotype.  Most common GWAS file formats should work.  Here are the requirements:

- It needs a header row.
- Columns can be delimited by tabs, spaces, or commas.
- It needs a column for the reference allele (which must always match the bases on the reference genome that you specified with `hg_build_number`) and a column for the alternate allele.  If you have a `MARKER_ID` column like `1:234_C/G`, that's okay too.  If you have an allele1 and allele2, and sometimes one or the other is the reference, then you'll need to modify your files.
- It can be gzipped if you want.
- Variants must be sorted by chromosome and position, with chromosomes in the order [1-22,X,Y,MT].

The file must have columns for:

| column description | name    | other allowed column names | allowed values |
| ---                | ---     | ---                        | --- |
| chromosome         | `chrom` | `#chrom`, `chr`            | 1-22, `X`, `Y`, `M`, `MT`, `chr1`, etc |
| position           | `pos`   | `beg`, `begin`, `bp`       | integer |
| reference allele   | `ref`   | `reference`                | must match reference genome |
| alternate allele   | `alt`   | `alternate`                | anything |
| p-value            | `pval`  | `pvalue`, `p`, `p.value`   | number in [0,1] |


You may also have columns for:

| column description                     | name           | other allowed column names | allowed values |
| ---                                    | ---            | ---                        | --- |
| minor allele frequency                 | `maf`          |                            | number in (0,0.5] |
| allele frequency (of alternate allele) | `af`           | `a1freq`, `frq`            | number in (0,1) |
| AF among cases                         | `case_af`      | `af.cases`                 | number in (0,1) |
| AF among controls                      | `control_af`   | `af.controls`              | number in (0,1) |
| allele count                           | `ac`           |                            | integer |
| effect size (of alternate allele)      | `beta`         |                            | number |
| standard error of effect size          | `sebeta`       | `se`                       | number |
| odds ratio (of alternate allele)       | `or`           |                            | number |
| R2                                     | `r2`           |                            | number |
| number of samples                      | `num_samples`  | `ns`, `n`                  | integer, must be the same for every variant in its phenotype |
| number of controls                     | `num_controls` | `ns.ctrl`, `n_controls`    | integer, must be the same for every variant in its phenotype |
| number of cases                        | `num_cases`    | `ns.case`, `n_cases`       | integer, must be the same for every variant in its phenotype |


Column names are case-insensitive.  If your file has a different column name, set `field_aliases = {"column_name": "field_name"}` in `config.py`.  For example, `field_aliases = {'P_BOLT_LMM_INF': 'pval', 'NSAMPLES': 'num_samples'}`.

Any field can be null if it is one of ['', '.', 'NA', 'N/A', 'n/a', 'nan', '-nan', 'NaN', '-NaN', 'null', 'NULL'].  If a required field is null, the variant gets dropped.


### 4. Make a list of your phenotypes

Inside of your data directory, you need a file named `pheno-list.json` that looks like this:

```json
[
 {
  "assoc_files": ["/home/peter/data/ear-length.gz"],
  "phenocode": "ear-length"
 },
 {
  "assoc_files": ["/home/peter/data/a1c.X.gz","/home/peter/data/a1c.autosomal.gz"],
  "phenocode": "A1C"
 }
]
```

Each phenotype needs `assoc_files` (a list of paths to association files) and `phenocode` (a string representing your phenotype that is used in filenames and URLs, comprised of `[A-Za-z0-9_~-]`).

If you want, you can also include:

- `phenostring` (string): a name for the phenotype. Shown in tables and tooltips and page headers.
- `category` (string): groups together phenotypes in the PheWAS plot. Shown in tables and tooltips.
- `num_cases`, `num_controls`, and/or `num_samples` (number): if your input data only has `AC` or `MAC`, this will be used to calculated `AF` or `MAF`.  Shown in tooltips.  If your input data has correctly-named columns for these, the command `pheweb phenolist read-info-from-association-files` will add them into your existing `pheno-list.json`.
- anything else you want, but you'll have to modify templates to use it.

You can use a csv by running:

```
pheweb phenolist import-phenolist "/path/to/pheno-list.csv"
```

or you can make one from scratch by running:

```
pheweb phenolist glob --star-is-phenocode "/home/peter/data/*.gz"
```

You can see other methods [here](etc/detailed-loading-instructions.md#making-pheno-listjson).


### 5. Load your association files

Run `pheweb process`.

To distribute jobs across a cluster, follow [these instructions](etc/detailed-loading-instructions.md#distributing-jobs-across-a-cluster).

To include VEP annotations, follow [these instructions](etc/detailed-loading-instructions.md#annotating-with-vep).

If something breaks and you can't understand the error message or it's something that PheWeb should support by default, [open an issue on github](https://github.com/statgen/pheweb/issues/new) or email me.

### 6. Serve the website

Run `pheweb serve --open`.

That command should either open a browser to your new PheWeb, or it should give you a URL that you can open in your browser to access your new PheWeb.
If it doesn't, follow [the directions for hosting a PheWeb and accessing it from your browser](etc/detailed-webserver-instructions.md#hosting-a-pheweb-and-accessing-it-from-your-browser).

### More options:

To run pheweb through systemd, see sample file [here](etc/pheweb.service).
To use Apache2 or Nginx, see instructions [here](etc/detailed-webserver-instructions.md#using-apache2-or-nginx).
To require login via OAuth, see instructions [here](etc/detailed-webserver-instructions.md#using-oauth).
To track page views with Google Analytics, see instructions [here](etc/detailed-webserver-instructions.md#using-google-analytics).
To reduce storage use, see instructions [here](etc/detailed-webserver-instructions.md#reducing-storage-use).
To customize page contents, see instructions [here](etc/detailed-webserver-instructions.md#customizing-page-contents).

PheWeb can display phenotype correlations generated by [another tool](https://github.com/statgen/pheweb-rg-pipeline).
To use this feature, set `show_correlations = True`  in `config.py` and place the output of the rg pipeline as `pheno-correlations.txt` in the same folder as `pheno-list.json`.

To hide the button for downloading summary stats, add `download_pheno_sumstats = "secret"` and `SECRET_KEY = "your random string"` in `config.py`.  That will make a secret page (printed to the console when you start the server) to share summary stats.
To hide the button for downloading top hits and phenotypes, add `download_top_hits = "hide"` and `download_phenotypes = "hide"` respectively.

To allow dynamically filtering the manhattan plot, run `pheweb best-of-pheno` and set `show_manhattan_filter_button=True` in `config.py`.

# Modifying PheWeb

See instructions [here](etc/detailed-development-instructions.md).
See documentation about the files in `generated-by-pheweb/` [here](etc/detailed-internal-dataflow.md).
