Data
====
The original data is:
- `/net/fantasia/home/schellen/PheWAS/epacts_multi/gwas_17March2016/gwas_17March2016.epacts.gz`
- 216 GB compressed
- by ratio, 650 GB.  NA lines are 40% the length of non-NA lines.  Then 25M non-NA lines + 6M NA lines = 710 GB.
- by ratio, 25M lines. Lines with MAF>1% have no NAs.  1/3 of lines with MAF<1% are all NAs.  If NA lines are free, then we actually have 31M lines.
- 3639 columns (1815*2+9)

The data subsetted so MAF>=1% is:
- `/var/pheweb_data/phewas_maf_gte_1e-2.vcf.gz`
- 67 GB compressed (gzip -2)
- 210 GB
- 7,741,775 lines
- 3639 columns (1815*2+9)
- took a few hours.

The data subsetted so MAF>=1% and #cases>=20 is:
- `/var/pheweb_data/phewas_maf_gte_1e-2_ncases_gte_20.vcf.gz`
- 48 GB compressed (bgzip)
- maybe 165 GB
- must be 7,741,775 lines
- 2900 columns (1448*2+4)
- took 3hr. (with gzip -2, makes 53GB in only 45min)

Tabix is:
- `/var/pheweb_data/phewas_maf_gte_1e-2_ncases_gte_20.vcf.gz.tbi`
- 2.5 MB
- took 25min.


TODO backend
============

- Put phenos.json in sorted order

- Replace sites.vcf with a marisa-trie of `{chr}:{pos}`

- Replace phenos.json with sqlite


TODO GWAS
=========
- make (for each pheno) `top1k-variants-phewas_code-0.08.json`.
  - write a python script `get_columns_for_each_pheno.py` which prints `80.1 1,2,3,10,11\n80.2 1,2,3,12,13\n...`
  - `./get_columns_for_each_pheno.py | while read phewas_code columns; do pigz vcf.gz | cut -d $'\t' -f "$columns" | perl -nale 'print if $F[3] < 0.01' | pigz > pheno-$phewas_code-only.vcf.gz`
  - check that file size.  If it's small, just use `sort -k4 | head -1000 | sort -nk1,2` or python or something.  If it's huge, p<1% is wrong.


TODO frontend
=============
- Use collision detection when displaying phewas_strings.
  - For collision detection, see <https://www.w3.org/TR/SVG11/struct.html#__svg__SVGSVGElement__checkIntersection> or <http://stackoverflow.com/a/2178680/1166306>
- Point tooltips based on quadrant.
- On click, show GWAS.


TODO GWAS
=========
- Show icd9 codes.
- Show top 1000 positions.
- Significance Threshold: 5E-8
