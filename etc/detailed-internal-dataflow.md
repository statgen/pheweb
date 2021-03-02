# Internal Data-Handling
```
                 input-association-files (epacts, plink, snptest, &c)
                      │         │
                      │         v
                      │  pheno-list.json
                      │   │           │
                      v   v           │
                     parsed/*         │
                        │ └──────┐    │
                        v        │    │
                       unanno    │    │
               genes.bed │       │    │
             rsids.tsv │ │       │    │
                     │ │ │       │    │
                     v v v       │    │
                  sites.tsv      │    │
                  │   │   │      v    v
                  │   │   └────> pheno_gz/*
                  v   │          │ │ │ │
  cpras-rsids-sqlite3 │          │ │ │ v
                      v          v │ │ best_of_pheno/*
                     matrix.tsv.gz │ v
                      │    │       │ manhattan/*
                      v    │       v         │
       matrix.tsv.gz.tbi   │      qq/*       v
                      │    │                top_{loci,hits{,_1k}}.{json,tsv}
                      v    v                phenotypes.json
         best-phenos-by-gene.json
```

- `parsed/*` have all per-variant and per-assoc fields from the input files
- `unanno` (unannotated) has all per-variant fields from `parsed/*`
- `sites.tsv` has `unanno`'s fields and also `rsids` and `nearest_genes` and (optionally) `consequence`.
- `pheno_gz/*` have `parsed/*`'s fields and also `rsids` and `nearest_genes` and (optionally) `consequence`.
    - every phenotype must include the same optional per-variant fields, and every per-variant field must be in the same order, due to the implemention of the `pheweb matrix`
- `cpras-rsid-sqlite3` is for autocomplete suggestions.
- `matrix.tsv.gz` contains all per-variant fields at the beginning (confirmed to EXACTLY match every file among \[pheno\_pheno/\* , sites.tsv\]) and all per-assoc fields (with header format `<per-assoc-field>@<pheno-id>`).
- `top_hits.json` contains variants (and their per-variant and per-assoc fields) that passed this algorithm:
   - start with all variants with pval<1e-6
   - iteratively take the association with the most-significant pval, and mask all variants within 500kb in its phenotype
- `top_loci.json` contains variants (and their per-variant and per-assoc fields) that passed this algorithm:
   - start with all variants with pval<1e-6
   - iteratively take the association with the most-significant pval, and mask all variants within 1Mb in its phenotype or within 500kb in any phenotype
   - this might not be a subset of top_hits.
- `best-phenos-by-gene.json` includes the best phenos in/near a gene, and the best association for each.
