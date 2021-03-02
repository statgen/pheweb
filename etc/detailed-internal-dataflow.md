# Internal Data-Handling
```
                 input-association-files
                      │         │
                      │     [phenolist]
                      │         │
                      │         v
                      │  pheno-list.json
                      │   │           │
                     [parse]          │
                      │   │           │
                      v   v           │
                     parsed/*         │
                      │   └──────┐    │
                   [sites]       │    │
   rsids.tsv.gz--[add-rsids]     │    │
      genes.bed--[add-genes]     │    │
                      │          │    │
                      v          │    │
                  sites.tsv      │    │
                  │   │   └──[augment-phenos]
          [make-...]  │             │
                  │   │             v
                  v   │          pheno_gz/*
 cpras-rsids-sqlite3  └─[matrix]─┘  │  │  └─[best-of-pheno]─> best_of_pheno/*
                           │        │  └─[qq]-> qq/*  
                           v        └─[manhattan]-> manhattan/*
                     matrix.tsv.gz                   │      │
                      │    │                  [top-hits]  [phenotypes]
           [gather-pvalues-for-each-gene]            │      │
                      │    │                         v      v
                      v    v               top_hits.json  phenotypes.json
         best-phenos-by-gene.sqlite3
```

Square brackets show `pheweb <step>` subcommands.
Filenames are in `generated-by-pheweb/` or its subdirectories (except `pheno-list.json` which is its sibling).

Reference this diagram against the filepaths listed in `file_utils.py` and the steps in `pheweb process -h`.
You can see all of the per-variant fields, per-association fields, and per-phenotype fields in `parse_utils.py`.

- `parsed/*` have the per-variant and per-association fields from the input files.
- `unanno` (unannotated) has all per-variant fields from `parsed/*`.
- `sites.tsv` has `unanno`'s fields plus `rsids` and `nearest_genes` and (optionally) `consequence`.
- `pheno_gz/*` is like `parsed/*`'s plus `rsids` and `nearest_genes` and (optionally) `consequence`.
    - Every line in these files must begin with a line from `sites.tsv` in order for `pheweb matrix` to work.  ie, they've got to have the same per-variant fields.
- `cpras-rsid-sqlite3` is for autocomplete suggestions.
- `matrix.tsv.gz` contains all the per-variant fields (ie, an exact copy of `sites.tsv` in its left few columns, and all per-assoc fields (with header format `<fieldname>@<phenocode>`, eg `maf@a1c`).
- `best-phenos-by-gene.json` includes the best phenos in/near a gene, and the best association for each.
