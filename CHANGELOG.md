*This file only includes changes that are relevant to people running a pheweb site.*

## 1.3.7
Changes needed to data:

- Re-run `pheweb download-genes`
- Re-run `pheweb make-gene-aliases-sqlite3`
- Re-run `pheweb phenotypes`

Improvements:

- Updated to gencode v37
- Show GClambda and num_samples/num_cases/num_controls and num_loci<5e8 on /phenotypes

## 1.3.6
- Speeds up `pheweb gather-pvalues-for-each-gene` ~2x by avoiding reading any variant twice.  (Thanks to finngen for this suggestion.)
- Allows live-filtering a manhattan plot by MAF or snp/indel, with instructions in README.
- Verifies that `num_cases + num_controls == num_samples` in `pheweb phenolist verify` (which is included in `pheweb process`).

## 1.3.5
- Removes dependence on `pandas` (because it wouldn't install on my laptop)

## 1.3.4
- Allows setting `loading_nice = True`.
- Allows setting `field_aliases` again.
- Reduces memory usage by `pheweb qq` by ~10x by switching to `numpy` and `pandas`.
- Fixes the bug where `pheweb matrix` breaks when `matrix.tsv.gz` is up-to-date.

## 1.3.0
- Rewrites configuration management, losing the ability to customize `extra_per_*_fields` and `null_values` and `field_aliases`.
- Fixes bug where config wasn't passed to child processes when using `PHEWEB_DATADIR` or `pheweb conf key=value <subcommand>`.

bug:

- `pheweb matrix` breaks when `matrix.tsv.gz` is already up-to-date.

## 1.2.5
- Makes sure that `pheno_gz/<phenocode>.gz.tbi` gets created, and re-runs traits that don't have it.

## 1.2.3
- Uses dbSNP v154 (the latest!) with way more rsids.

## 1.2.1
Changes needed to data:

- Re-run `pheweb gather-pvalues-for-each-gene` (which should quickly upgrade the old json to the new sqlite3)
- Re-run `pheweb make_cpras_rsids_sqlite3`

Improvements:

- Allows hg38 via `hg_build_number=38`
- Downloads resources from <https://resources.pheweb.org> instead of processing raw data from EBI, dbSNP, etc.
- Replaces marisa-trie with sqlite3 to remove a flaky dependency and improve the order of autocomplete suggestions.
- Replaces more json files with sqlite3 to handle large datasets better.
- Compresses all internal files with `gzip -2` to save storage and IO.
- Gets rid of `generated-by-pheweb/pheno/`, relying on `generated-by-pheweb/pheno_gz/` instead.
- Allows `chr1`-`chr25` in input files.

## 1.2.0 (broken)
(`pheweb matrix` fails to match filenames to columns.)

## 1.1.28
- Allows selecting which phenotypes to run in most steps via `pheweb <subcommand> --phenos=5-10`.
- Adds `pheweb cluster --step=<subcommand>`.
