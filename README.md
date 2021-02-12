For an example, see the [Michigan Genomics Initiative PheWeb](http://pheweb.sph.umich.edu).
For a walk-through demo see [here](etc/demo.md#demo-navigating-pheweb).
If you have questions or comments, check out our [Google Group](https://groups.google.com/g/pheweb-umich).

![screenshot of PheWAS plot](https://cloud.githubusercontent.com/assets/862089/25474725/3edbe256-2b02-11e7-8abb-0ca26d406b11.png)

# How to Cite PheWeb
If you use the PheWeb code base for your work, please cite our paper:

Gagliano Taliun, S.A., VandeHaar, P. et al. Exploring and visualizing large-scale genetic associations by using PheWeb. *Nat Genet* 52, 550–552 (2020).

# How to Build a PheWeb for your Data

If any of these steps is incorrect, please [open an issue on github](https://github.com/statgen/pheweb/issues/new) and I'll see what I can do to improve things.

### 1. Install PheWeb

```bash
pip3 install pheweb
```

- If that doesn't work, follow [the detailed install instructions](etc/detailed-install-instructions.md#detailed-install-instructions).

### 2. Create a directory for your new dataset

1. `mkdir ~/my-new-pheweb && cd ~/my-new-pheweb`

   - This directory will store all data for the pheweb your are building. All `pheweb ...` commands should be run in this directory.
   - You can put it wherever you want and name it whatever you want.

2. If you want to configure any options, make a file `config.py` in your data directory. Some options you can set are:

   - `hg_build_number` (int): either `19` or `38`.

   - `assoc_min_maf` (float): an association (between a phenotype and variant) will only be included if its MAF is greater than or equal to this value. (default: `0`)

   - `cache` (string): a directory where files common to all datasets can be stored. (default: `cache = "~/.pheweb/cache/"`)

   - `num_procs` (int or dict): the number of processes to use for parallel loading steps.  You can also set `num_procs = {'qq':5, '*':30}`. (default: 2/3 of the number of cores on your machine)

### 3. Prepare your association files

You need one file for each phenotype, and there are some requirements:
- It needs a header row.
- Columns can be delimited by tabs, spaces, or commas.
- It needs a column for the reference allele (which must always match the reference genome that you specified with `hg_build_number`) and a column for the alternate allele.  If you have a `MARKER_ID` column like `1:234_C/G`, that's okay too.  If you have an allele1 and allele2, and sometimes one or the other is the reference, then you'll need to modify your files.
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

| column description            | name           | other allowed column names | allowed values |
| ---                           | ---            | ---                        | --- |
| minor allele frequency        | `maf`          |                            | number in (0,0.5] |
| allele frequency              | `af`           | `a1freq`, `frq`            | number in (0,1) |
| allele count                  | `ac`           |                            | integer |
| effect size                   | `beta`         |                            | number |
| standard error of effect size | `sebeta`       | `se`                       | number |
| odds ratio                    | `or`           |                            | number |
| R2                            | `r2`           |                            | number |
| number of samples             | `num_samples`  | `ns`, `n`                  | integer, must be the same for every variant in its phenotype |
| number of controls            | `num_controls` | `ns.ctrl`, `n_controls`    | integer, must be the same for every variant in its phenotype |
| number of cases               | `num_cases`    | `ns.case`, `n_cases`       | integer, must be the same for every variant in its phenotype |


Column names are case-insensitive.  If you used a different column name, set `field_aliases = {"column_name": "field_name"}` in `config.py`.  For example, `field_aliases = {'P_BOLT_LMM_INF': 'pval', 'NSAMPLES': 'num_samples'}`.

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
  "assoc_files": ["/home/peter/data/a1c.X.gz","/home/peter/a1c.autosomal.gz"],
  "phenocode": "A1C"
 }
]
```

`phenocode` must only contain letters, numbers, or any of `_-~`.

Each phenotype needs `assoc_files` (a list of paths to association files) and `phenocode` (a string representing your phenotype that is valid in a URL). If you want, you can also include:

- `phenostring` (string): a name for the phenotype. Shown in tables and tooltips and page headers.
- `category` (string): groups together phenotypes in the PheWAS plot. Shown in tables and tooltips.
- `num_cases`, `num_controls`, and/or `num_samples` (number): if your input data only has `AC` or `MAC`, this will be used to calculated `AF` or `MAF`.  Shown in tooltips.  If your input data has correctly-named columns for these, the command `pheweb phenolist read-info-from-association-files` will add them into your existing `pheno-list.json`.
- anything else you want, but you'll have to modify templates to use it.

There are four ways to make a `pheno-list.json`:

1. If you have a csv (or tsv, optionally gzipped) with a header that has exactly the right column names, just import it by running `pheweb phenolist import-phenolist "/path/to/my/pheno-list.csv"`.

   If you have multiple association files for each phenotype, you may put them all into a single column with `|` between them. For example, your file `pheno-list.csv` might look like this:

   ```
   phenocode,assoc_files
   a1c,/home/peter/data/a1c.autosomal.gz|/home/peter/data/a1c.X.gz
   ear-length,/home/peter/data/ear-length.gz
   ```

2. If you have one association file per phenotype, you can use a shell-glob to get assoc-files. Suppose that your assocation files are at paths like:

   - `/home/peter/data/a1c.autosomal.gz`
   - `/home/peter/data/ear-length.gz`

   Then you could run `pheweb phenolist glob-files "/home/peter/data/*.gz"` to get `assoc-files`.

   To get `phenocodes`, you can use this command which will take the text after the last `/` and before the next `.`:

   ```
   pheweb phenolist extract-phenocode-from-filepath --simple
   ```
   
   If that doesn't work, see `pheweb phenolist extract-phenocode-from-filepath -h` for how to use a regex capture group.

3. If you have multiple association files for some phenotypes, you can follow the directions in 2 and then run `pheweb phenolist unique-phenocode`.

   For example, if your association files are at:

   - `/home/peter/data/ear-length.gz`
   - `/home/peter/data/a1c.autosomal.gz`
   - `/home/peter/data/a1c.X.gz`

   then you can run:

   ```
   pheweb phenolist glob-files "/home/peter/data/*.gz"
   pheweb phenolist extract-phenocode-from-filepath --simple
   pheweb phenolist unique-phenocode
   ```

4. If you want to do more advanced things, like merging in more information from another file, check out the tools in `pheweb phenolist --help`.

### 5. Load your association files

1. Run `pheweb process`.

   - To distribute jobs across a cluster, see instructions [here](etc/detailed-loading-instructions.md#distributing-jobs-across-a-cluster).
   
2. If something breaks, read the error message.

   - If you can understand the error message, modify your association or config files to avoid it, or drop the problematic phenotypes from `pheno-list.json`.  Then re-run `pheweb process`.
   - If the problem is something that PheWeb should support by default, [open an issue on github](https://github.com/statgen/pheweb/issues/new) or email me.
   - If you can't understand the error message, [open an issue on github](https://github.com/statgen/pheweb/issues/new) or email me.

### 6. Serve the website

Run `pheweb serve --open`.

That command should either open a browser to your new PheWeb, or it should give you a URL that you can open in your browser to access your new PheWeb.
If it doesn't, follow the directions for [hosting a PheWeb and accessing it from your browser](etc/detailed-webserver-instructions.md#hosting-a-pheweb-and-accessing-it-from-your-browser).

### More options:

To run pheweb through systemd, see sample file [here](etc/pheweb.service).
To use Apache2 or Nginx, see instructions [here](etc/detailed-webserver-instructions.md#using-apache2-or-nginx).
To require login via OAuth, see instructions [here](etc/detailed-webserver-instructions.md#using-oauth).
To track page views with Google Analytics, see instructions [here](etc/detailed-webserver-instructions.md#using-google-analytics).
To reduce storage use, see instructions [here](etc/detailed-webserver-instructions.md#reducing-storage-use).
To customize page contents, see instructions [here](etc/detailed-webserver-instructions.md#customizing-page-contents).

PheWeb can display phenotype correlations generated by [another tool](https://github.com/statgen/pheweb-rg-pipeline).
To use this feature, set `show_correlations = True`  in `config.py` and place the output of the rg pipeline as `pheno-correlations.txt` in the same folder as `pheno-list.json`.

To hide the button for downloading summary stats, add `download_pheno_sumstats = "secret"` and `SECRET_KEY = "random string here"` in `config.py`.  That will make a secret page (printed to the console when you start the server) to share summary stats.

