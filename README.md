For an example, see the [Michigan Genomics Initiative PheWeb](http://pheweb.sph.umich.edu).
For a walk-through demo see [here](etc/demo.md#demo-navigating-pheweb).
If you have questions or comments, check out our [Google Group](https://groups.google.com/forum/#!forum/pheweb).

![screenshot of PheWAS plot](https://cloud.githubusercontent.com/assets/862089/25474725/3edbe256-2b02-11e7-8abb-0ca26d406b11.png)

# How to Build a PheWeb for your Data

If any of these steps is incorrect, please email me at <pjvh@umich.edu> and I'll see what I can do to improve things.

*Currently PheWeb only supports GRCh37/hg19, and will show incorrect genes and rsids for other genome builds.  We're working on fixing this.  If you need this to use an older or newer build, email or submit a github issue.*

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

   - Minor Allele Frequency cutoffs:
     - `assoc_min_maf`: an association (between a phenotype and variant) will only be included if its MAF is greater than this value.  (default: `0`, but it saves disk space during loading, so I usually use at least `variant_inclusion_maf / 2`)
     - `variant_inclusion_maf`: a variant will only be included if it has some associations with MAF greater than this value.  That is, if some or all associations for a variant are above `assoc_min_maf`, but none are above `variant_inclusion_maf`, that entire variant (including all of its associations with phenotypes) will be dropped.  If any association's MAF is above `variant_inclusion_maf`, all associations for that variant that are above `assoc_min_maf` will be included. (default: `0`, but I recommend at least `0.005`)

   - `cache`: a directory where files common to all datasets can be stored. If you don't want one, set `cache = False`. (default: `cache = "~/.pheweb/cache/"`)

### 3. Prepare your association files

You should have one file for each phenotype. It can be gzipped if you want. It should be **tab-delimited** and have a **header row**. Variants must be sorted by chromosome and position, with chromosomes in the order [1-22,X,Y,MT].

- If you are using EPACTS, your files should work just fine. If they don't, email me. EPACTS files won't have `REF` or `ALT`, but PheWeb will parse their `MARKER_ID` column to get those.

The file must have columns for:

| column description | name | other allowed column names | allowed values |
| --- | --- | --- | --- |
| chromosome | `chrom` | `#chrom` | integer 1-22, `X`, `Y`, `M`, `MT` |
| position | `pos` | `beg`, `begin` | integer | a |
| reference allele | `ref` | | anything |
| alternate allele | `alt` | | anything |
| p-value | `pval` | `pvalue` | number in [0,1] |

_Note: column names are case-insensitive._

_Note: any field may be `.` or `NA`.  For required fields, these values will cause the variant to be dropped._

_Note: if your column name is not one of these, you may set `field_aliases = {"column_name": "field_name"}` in `config.py`.  For example, `field_aliases = {'P_BOLT_LMM_INF': 'pval'}`._

_Note: scientific notation is okay._

You may also have columns for:

| column description | name | allowed column names | allowed values |
| --- | --- | --- | --- |
| minor allele frequency | `maf` | | number in (0,0.5] |
| allele frequency | `af` | | number in (0,1) |
| allele count | `ac` | | integer |
| effect size | `beta` | | number |
| standard error of effect size | `sebeta` | | number |
| odds ratio | `or` | | number |
| R2 | `r2` | | number |
| number of samples | `num_samples` | `ns`, `n` | integer, must be the same for every variant in its phenotype |
| number of controls | `num_controls` | `ns.ctrl`, `n_controls` | integer, must be the same for every variant in its phenotype |
| number of cases | `num_cases` | `ns.case`, `n_cases` | integer, must be the same for every variant in its phenotype |


### 4. Make a list of your phenotypes

Inside of your data directory, you need a file named `pheno-list.json` that looks like this:

```json
[
 {
  "assoc_files": ["/home/watman/ear-length.epacts.gz"],
  "phenocode": "ear-length"
 },
 {
  "assoc_files": ["/home/watman/eats-kimchi.X.epacts.gz","/home/watman/eats-kimchi.autosomal.epacts.gz"],
  "phenocode": "eats-kimchi"
 }
]
```

`phenocode` must only contain letters, numbers, or any of `_-~`.

That example file only includes the columns `assoc_files` (a list of paths to association files) and `phenocode` (a string representing your phenotype that is valid in a URL). If you want, you can also include:

- `phenostring`: a string that is more descriptive than `phenocode` and will be shown in several places
- `category`: a string that will group together phenotypes in the PheWAS plot and also be shown in several places
- `num_cases`, `num_controls`, and/or `num_samples`: numbers of strings which will be shown in several places
- anything else you want, but you'll have to modify templates to show it.

There are four ways to make a `pheno-list.json`:

1. If you have a csv (or tsv, optionally gzipped) with a header that has EXACTLY the right column names, just import it by running `pheweb phenolist import-phenolist "/path/to/my/pheno-list.csv"`.

   If you have multiple association files for each phenotype, you may put them all into a single column with `|` between them. For example, your file `pheno-list.csv` might look like this:

   ```
   phenocode,assoc_files
   eats-kimchi,/home/watman/eats-kimchi.autosomal.epacts.gz|/home/watman/eats-kimchi.X.epacts.gz
   ear-length,/home/watman/ear-length.all.epacts.gz
   ```

2. If you have one association file per phenotype, you can use a shell-glob and a regex to get assoc-files and phenocodes for them. Suppose that your assocation files are at paths like:

   - `/home/watman/eats-kimchi.epacts.gz`
   - `/home/watman/ear-length.epacts.gz`

   Then you could run `pheweb phenolist glob-files "/home/watman/*.epacts.gz"` to get `assoc-files`.

   To get `phenocodes`, you can use a regex that captures the phenocode from the file path. In most cases (including this one), just use:

   ```
   pheweb phenolist extract-phenocode-from-filepath --simple
   ```

3. If you have multiple association files for some phenotypes, you can follow the directions in 2 and then run `pheweb phenolist unique-phenocode`.

   For example, if your association files are at:

   - `/home/watman/autosomal/eats-kimchi.epacts.gz`
   - `/home/watman/X/eats-kimchi.epacts.gz`
   - `/home/watman/all/ear-length.epacts.gz`

   then you can run:

   ```
   pheweb phenolist glob-files "/home/watman/*/*.epacts.gz"
   pheweb phenolist extract-phenocode-from-filepath --simple
   pheweb phenolist unique-phenocode
   ```

4. If you want to do more advanced things, like merging in more information from another file, email <pjvh@umich.edu> and I'll write documentation for `pheweb phenolist`.

   No matter what you do, please run `pheweb phenolist verify` when you are done to check that it worked correctly. At any point, you may run `pheweb phenolist view` or `pheweb phenolist print-as-csv` to view the current file.

### 5. Load your association files

1. Run `pheweb process`.

   - This step can take hours or days for large datasets.  If you want to use the SLURM cluster scheduler, run `pheweb slurm-parse` for parsing and then `pheweb process --no-parse` for everything else.

2. If something breaks, read the error message.

   - If you can understand the error message, modify your association or config files to avoid it, or drop the problematic phenotypes from `pheno-list.json`.  Then re-run `pheweb process`.
   - If the problem is something that PheWeb should support by default, feel free to email it to me at <pjvh@umich.edu>.
   - If you can't understand the error message, please email your error message to <pjvh@umich.edu> and hopefully I can get back to you quickly.

### 6. Serve the website

Run `pheweb serve --open`.

That command should either open a browser to your new PheWeb, or it should give you a URL that you can open in your browser to access your new PheWeb.
If it doesn't, follow the directions for [hosting a PheWeb and accessing it from your browser](etc/detailed-webserver-instructions.md#hosting-a-pheweb-and-accessing-it-from-your-browser).

To use Apache2 or Nginx (for performance), see instructions [here](etc/detailed-webserver-instructions.md#using-apache2-or-nginx).
To require login via OAuth, see instructions [here](etc/detailed-webserver-instructions.md#using-oauth).
To track page views with Google Analytics, see instructions [here](etc/detailed-webserver-instructions.md#using-google-analytics).
