Steps for per-pheno input:
- [x] Make `phenos.json` from input files and `PheWAS_code_translation_v1_2.txt`. (2_)
- [x] Make `pheno/<phewas_code>.tsv` by parsing MARKER_ID and subsetting by maf. (0_1)
- [x] Make `sites/cpra.tsv` by intersecting the cpras from all of `pheno/<phewas_code>.tsv` (0_2)
- [x] Make `sites/sites.tsv` from `sites/cpra.tsv` with `rsid` and `nearest_gene`. (1_2-1_7)
    - [x] Handle gene overlaps like 1:879911 (NOC2L,SAMD11)
    - [x] Sort correctly (including multi-allelics)
- [x] Make `augmented_pheno/<phewas_code>.tsv` by extracting `sites/sites.tsv` positions (& [nearest_gene, rsids]) from the raw input files. (3_1)
- [o] Make `main-matrix.tsv` from all `augmented_pheno/<phewas_code>.tsv`. (4_1)
    - This mostly keeps one cpu at 100% usage.
    - We could have calculated mean_maf beforehand, and then we'd just need to concat pval columns.  That could be done recursively -- just divide up the files among the cpus.

- [x] `cpra-to-rsid.marisa_trie`: Trie from chr-pos-ref-alt -> rsid (1_8.1)
- [x] `rsid-to-cpra.marisa_trie`: Trie rsid -> from chr-pos-ref-alt (1_8.2)
- [x] `manhattan/<phewas_code>.json` (3_2)
    - when rsids == '', should I leave it undefined?
    - [ ] Mark which variants should have a gene label.
        - While variants w/ p<1e-4: m_s_v = min(significant_variants, key=_.pval); m_s_v.showgene=True; significant_variants = [v for v in significant_variants if abs(v.pos-m_s_v.pos) > 100k]
        - Might as well wait until LZ.js-based view.
- [x] `qq/<phewas_code>.json` (3_3)

- [ ] Webpage: pheno.html: 1 <-> 4 QQ.
- [ ] Webpage: variant.html: StreamTable of [pheno_code, pheno_string, icd9_info, neglog10_pval(desc)]
- [ ] Webpage: pheno.html: StreamTable of [cpra, maf, nearest_gene, neglog10_pval(desc)] with checkbox "show only strongest hit for each gene"
- [ ] Webpage: pheno.html: for variants that have the "showgene" attribute, show their gene above them, but behind the points if possible.


Info:
- 39355320 variants in each input file I checked
- 7878230 variants in `cpra-any.tsv`. (MAF>0.01 in at least one pheno)
- 7602114 variants in `cpra-all.tsv`. (MAF>0.01 in all phenos) (except 769 350.3 350.6)
- 1448 phenos
- But `cat phenos.json | grep "\": {" | wc -l` finds only 1440.  Which 8 had <20 cases?


Later:
- Get a working [769, 350.3, 350.6] and re-run things (after removing their blacklisting from 3_1).
- Require a parser script that can use sites.tsv plus the raw data to make each `augmented_pheno/<pheno_code>`?
- Include pval in `pheno/<pheno_code>` and then never again use input files -  use `pheno/<pheno_code>` to make `augmented_pheno/<pheno_code>` (b/c `sites/sites.tsv` is the intersection)
    - This will make the input format easy to specify.


Timing:
- 0_1: ~6 hrs (~10 min/pheno) (think)
- 0_2: 21 min (all, 8-at-a-time), 13 min (any, 8-at-a-time)
- 1_2: 8 min
- 1_3: .
- 1_4: 9 min
- 1_5: 40 sec
- 1_6: 30 sec
- 1_7: 20 sec
- 1_8: 1 min
- 2: .
- 3_1: ~6 hrs (10 min/pheno) (guess)
- 3_2: ~1 hr (2 min/pheno) (guess)
- 3_3: ~1 hr (2 min/pheno) (guess)
- 4_1: ~5 hr (wild guess)
