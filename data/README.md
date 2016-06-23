Start with:
- PheWAS_code_translation_v1_2.txt
- Either:
    - Both:
        - a big matrix of chr-pos-ref-alt (in MARKER_ID form), maf, and [pval, beta] for each pheno
        - a file of [num_cases, num_controls] for each pheno
    - For each pheno, a file of chr-pos-ref-alt (in MARKER_ID form), maf, pval, beta, num_cases, num_controls

Process into:
- `phenos.json`: [num_cases, num_controls] for each pheno
- `sites.tsv`: chr-pos-ref-alt, maf, rsid, nearest_gene
- `main-matrix.tsv`: chr-pos-ref-alt, maf, rsid, nearest_gene [pval, beta] for only variants and phenos that we want
- `pheno-<phewas_code>.tsv`: chr-pos-ref-alt, maf, rsid, nearest_gene, pval, beta

Then make these for use by the server:
- `cpra-to-rsid.marisa_trie`: Trie from chr-pos-ref-alt -> rsid
- `rsid-to-cpra.marisa_trie`: Trie rsid -> from chr-pos-ref-alt
- `manhattan/<phewas_code>.json`
- `qq/<phewas_code>.json`
- parser for a single variant


Steps for per-pheno input:
- [x] Make `phenos.json`. (2_)
- [x] Make `pheno/<phewas_code>.tsv` by parsing MARKER_ID and subsetting by maf. (0_1)
- [x] Make `sites/cpra.tsv` by merging the cpras from all of `pheno/<phewas_code>.tsv` (0_2)
- [x] Make `sites/sites.tsv` from `sites/cpra.tsv` with `rsid` and `nearest_gene`. (1_2-1_7)
    - [x] Handle gene overlaps like 1:879911 (NOC2L,SAMD11)
    - [x] Sort correctly
- [ ] Make `pheno_with_rsids_genes/<phewas_code>.tsv` by extracting `sites/sites.tsv` positions & info from the raw input files. (3_1)
- [ ] Make `main-matrix.tsv` from all `single/<phewas_code>.tsv` plus `sites/sites.tsv`. (4_1)

- [x] `cpra-to-rsid.marisa_trie`: Trie from chr-pos-ref-alt -> rsid (1_8.1)
- [x] `rsid-to-cpra.marisa_trie`: Trie rsid -> from chr-pos-ref-alt (1_8.2)
- [ ] `manhattan/<phewas_code>.json` (3_2)
    - [ ] Mark which variants should have a gene label.
        - While variants w/ p<1e-4: m_s_v = min(significant_variants, key=_.pval); m_s_v.showgene=True; significant_variants = [v for v in significant_variants if abs(v.pos-m_s_v.pos) > 100k]
- [ ] `qq/<phewas_code>.json` (3_3)

- [ ] Webpage: pheno.html: 1 <-> 4 QQ.
- [ ] Webpage: variant.html: StreamTable of [pheno_code, pheno_string, icd9_info, neglog10_pval(desc)]
- [ ] Webpage: pheno.html: StreamTable of [cpra, maf, nearest_gene, neglog10_pval(desc)] with checkbox "show only strongest hit for each gene"
- [ ] Webpage: pheno.html: for variants that have the "showgene" attribute, show their gene above them, but behind the points if possible.


Info:
- 39355320 variants in each input file I checked
- 7740489 variants in `cpra.tsv`.
- ??? variants in `cpra-all.tsv`.
- 1448 phenos
- But `cat phenos.json | grep "\": {" | wc -l` finds only 1440.  Which 8 had <20 cases?


Later:
- Require a parser script that can use sites.tsv plus the raw data to make each `augmented_pheno/<pheno_code>`?
- Skip `pheno/<pheno_code>` and instead directly parse input in `0_2_get_all_cpras.py`, subsetting by MAF if the file has it.

Timing:
- 0_1:
- 0_2: 13 min
- 1_2: 8 min
- 1_3: .
- 1_4: 9 min
- 1_5: 40 sec
- 1_6: 30 sec
- 1_7: 20 sec
- 1_8: 1 min
- 2: fast
- 3_1:
- 3_2:
- 3_3: