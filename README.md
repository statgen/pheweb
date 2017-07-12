For a demo, see the [Michigan Genomics Initiative PheWeb](http://pheweb.sph.umich.edu).

![screenshot of PheWAS plot](https://cloud.githubusercontent.com/assets/862089/25474725/3edbe256-2b02-11e7-8abb-0ca26d406b11.png)

# How to Build a PheWeb for your Data

If any of these steps is incorrect, please email me at <pjvh@umich.edu> and I'll see what I can do to improve things.

## Quickstart

If everything goes well, you should be able to build a PheWeb with the
following commands:

```bash
pip3 install pheweb
mkdir ~/my-new-pheweb && cd ~/my-new-pheweb
pheweb phenolist glob --simple-phenocode /data/my-analysis/*/*.epacts.gz
pheweb process
pheweb serve --open
```

If any of those commands don't work, use these long instructions instead:

## Detailed Instructions

### 1. Install PheWeb

1. Run `pip3 install pheweb`.

   - If that doesn't work, either:

       - Install as root with `sudo pip3 install pheweb`, or
       - Install PheWeb through [miniconda3](https://conda.io/miniconda.html) by running:

          ```bash
          if uname -a | grep -q Darwin; then curl https://repo.continuum.io/miniconda/Miniconda3-latest-MacOSX-x86_64.sh > install-miniconda.sh; fi
          if uname -a | grep -q Linux; then curl https://repo.continuum.io/miniconda/Miniconda3-latest-Linux-x86_64.sh > install-miniconda.sh; fi
          bash install-miniconda.sh
          ```

          Then hit "q" when you're done with reading the terms and hit enter at every `>>>` prompt. They'll create `~/miniconda3` and modify `$PATH` in your `~/.bash_profile`.

          Next, close and re-open your terminal and then run:

          ```bash
          python3 -m pip install pheweb
          ```

          Finally, because miniconda makes `python` refer to `python3`, (which most users don't want) you should probably run:
          ```bash
          rm ~/miniconda3/bin/python
          ```

2. Make a data directory. It should be in a location where you can afford to store twice as much data as the size of your input files. All `pheweb ...` commands should be run in this directory.

3. If you want to configure any options, make a file `config.py` in your data directory. Some options you can set are:


    - Minor Allele Frequency cutoffs:
        - `assoc_min_maf`: an association (between a phenotype and variant) will only be included if its MAF is greater than this value.  (default: `0`, but it saves disk space during loading, so I usually use at least `variant_inclusion_maf / 2`)
        - `variant_inclusion_maf`: a variant will only be included if it has some associations with MAF greater than this value.  That is, if some or all associations for a variant are above `assoc_min_maf`, but none are above `variant_inclusion_maf`, all will be dropped.  If any is above `variant_inclusion_maf`, all that are above `assoc_min_maf` will be included. (default: `0`, but I recommend at least `0.005`)

    - `cache`: a directory where files common to all datasets can be stored. If you don't want one, set `cache = False`. (default: `cache = "~/.pheweb/cache/"`)

### 2. Prepare your association files

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


### 3. Make a list of your phenotypes

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

### 4. Load your association files

1. Run `pheweb process`.
2. If something breaks, read the error message.

  - If you can understand the error message, modify your input files to avoid it.
  - If the problem is something that PheWeb should support by default, feel free to email it to me at <pjvh@umich.edu>.
  - If you can't understand the error message, please email your error message to <pjvh@umich.edu> and hopefully I can get back to you quickly.

  Then re-run `pheweb process`.

### 5. Run a server to check that everything loaded correctly

Run `pheweb serve --open`.

- If that succeeds and you are able to view the site in a web browser, you're done with this section.

- If port 5000 is already taken, choose a different port (for example, 5432) and run `pheweb serve --port 5432` instead.

- If the server works but you can't open it in a web browser, you have two options:

  1. Run PheWeb on the open internet.

     You need a port that can get through your firewall. 80 or 5000 probably work. 80 will require you to run something like `sudo $(which python3) $(which pheweb) serve --port 80`.

     Then run `pheweb serve --guess-address` and open the two URLs it provides.

  2. Run PheWeb with the default settings, then use an SSH tunnel to connect to it from your computer.

     For example, if you normally ssh in with `ssh watman@x.example.com`, then the command you should run (on the computer you're sitting at) is `ssh -N -L localhost:5000:localhost:5000 watman@x.example.com`.

     Then open <http://localhost:5000> in your web browser.

### 6. Use Apache/Nginx (optional)

At this point your PheWeb should be working how you want it to, except maybe the URL you're using.

`pheweb serve` already uses gunicorn. For maximum speed and safety, you should run gunicorn routed through a program like Apache2 or Nginx. If you choose Apache2, I have some documentation [here](https://github.com/statgen/pheweb/tree/master/unnecessary_things/other_documentation/running_with_apache2).

# Internal Data-Handling
```
                 input-association-files (epacts, plink, snptest, &c)
                      |         |
                      |         v
                      |  pheno-list.json
                      |   |           |
                      v   v           |
                     parsed/*----+    |
                         |       |    |
                         v       |    |
                       unanno    |    |
               genes.bed |       |    |
             rsids.tsv | |       |    |
                     | | |       |    |
                     v v v       |    |
                  sites.tsv      |    |
                  |   |   |      v    v
                  |   |   +----> pheno/*
                  v   |          | | | |
    cpra-rsids-tries  |          | | | v
                      v          v | | augmented_pheno_gz/*
                     matrix.tsv.gz | v
                      |    |       | manhattan/*
                      v    |       v         |
       matrix.tsv.gz.tbi   |      qq/*       v
                      |    |                top_{loci,hits{,_1k}}.{json,tsv}
                      v    v
         best-phenos-by-gene.json
```

- `parsed/*` have all per-variant and per-assoc fields from the input files
- `unanno` (unannotated) has all per-variant fields from `parsed/*`
- `sites.tsv` has `unanno`'s fields and also `rsids` and `nearest_genes`
- `pheno/*` have `parsed/*`'s fields and also `rsids` and `nearest_genes`
    - all must include the same optional per-variant fields, and all per-variant fields must be in the same order, due to the implemention of the `matrix.tsv.gz`-maker
- cpra-rsid-tries are for autocomplete suggestions.
- `matrix.tsv.gz` contains all per-variant fields at the beginning (confirmed to EXACTLY match any file among \[augmented\_pheno/\* , sites.tsv\] where they exist) and all per-assoc fields (with header format `<per-assoc-field>@<pheno-id>`).
- `top_hits.json` contains variants (and their per-variant and per-assoc fields) that passed this algorithm:
   - start with all variants with pval<1e-6
   - iteratively take the association with the most-significant pval, and mask all variants within 500kb in its phenotype
- `top_loci.json` contains variants (and their per-variant and per-assoc fields) that passed this algorithm:
   - start with all variants with pval<1e-6
   - iteratively take the association with the most-significant pval, and mask all variants within 1Mb in its phenotype or within 500kb in any phenotype
   - this might not be a subset of top_hits.
- `best-phenos-by-gene.json` includes the best phenos in/near a gene, and the best association for each.
