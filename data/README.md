Todo:
- [ ] Webpage: pheno.html: 1 <-> 4 QQ.
- [ ] Mark peaks better.
    - While variants w/ p<1e-4: m_s_v = min(significant_variants, key=_.pval); m_s_v.showgene=True; significant_variants = [v for v in significant_variants if abs(v.pos-m_s_v.pos) > 100k]
    - [ ] Then peaks with p<1e-8 get gene labels, and peaks with p<1e-6 go in StreamTable.
- [ ] LZ - see Andrew's code.
   - bgzip and tabix augmented_phenos
- [ ] input_parsers/epacts.py should offer a generator function from an input file that returns [cpra, pval, maf] with optional min_maf.
    - Affects 0_1, 2, 3_1
    - [ ] Then merge 0_1 into 0_2 to cut down tmp file usage by ~5X.  Then put strict assertions around the input parser.
- [ ] Fill more of `gwas-trait-mapping.csv` and re-Manhattan those phenotypes.
    - use `cat gwas_catalog_v1.0.1-associations_e84_r2016-06-12.tsv | cut -f 35 | tr , "\n" | sed 's_^ __' | sort -u | less`
- [ ] Show GWAS Catalog info on variant.html (using rs#)
- [ ] Write a Makefile to do all of this?  Snakemake?
- [ ] Invert colors (like ctrl-opt-com-8)?
- [ ] Keep annoations separate from data, and maybe put data into hdf5 of flat files to save some space.
    - Maybe add row# into annoations (sites.tsv) to index into the matrices.
    - Maybe keep separate row-major and column-major matrices, or just a separate file for each phenotype.


Info:
- 39355320 variants in each input file I checked
- 7878230 variants in `cpra-any.tsv`. (MAF>0.01 in at least one pheno)
- 7878127 variants in any pheno, with sorted alt.
- 7602114 variants in `cpra-all.tsv`. (MAF>0.01 in all phenos) (except 769 350.3 350.6)
- 1448 phenos
- But `cat phenos.json | grep "\": {" | wc -l` finds only 1440.  Which 8 had <20 cases?


Timing:
- 0_1: ~6 hrs (~10 min/pheno) (think)
- 0_2:
    - 21 min (all, 8-at-a-time)
    - 13 min (any, 8-at-a-time)
    - 24 min (any, 4-at-a-time)
    - slower with io.open(fname, buffering=2**16)
    - 30 min (any, 8-at-a-time, sorted alt)
- 1_2: 8 min
- 1_3: 10 sec
- 1_4: 9 min
- 1_5: 40 sec
- 1_6: 30 sec
- 1_7: 20 sec
- 1_8: 1 min
- 2: .
- 3_1: ~6 hrs
- 3_2: ~1 hr (2 min/pheno) (guess)
- 3_3: ~1 hr (2 min/pheno) (guess)
- 4_1: ~5 hr
- 4_2: 1.7 hr
