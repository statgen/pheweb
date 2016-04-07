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

The data subsetted so MAF>=1% and #cases>=20 is:
- `/var/pheweb_data/phewas_maf_gte_1e-2_ncases_gte_20.vcf.gz`
- 53 GB compressed (gzip -2)
- maybe 165 GB
- must be 7,741,775 lines
- 2900 columns (1448*2+4)
- took 45min.

The bgzipped data is:
- `/var/pheweb_data/phewas_maf_gte_1e-2_ncases_gte_20b.vcf.gz`
- 48 GB compressed (bgzip)
- took 3hr.

Tabix is:
- `/var/pheweb_data/phewas_maf_gte_1e-2_ncases_gte_20b.vcf.gz.tbi`
- 2.5 MB
- took 25min.

TODO backend
============

- With this, we can find the:
    - #cases, #controls, and MAF for any variant
    - pval, beta for each phewas_code for that variant

- From `phenos.json`, we can get:
    - name and category of each phewas_code.
    - icd9s for each phewas_code.

- Serve these with the page.

- Later, for GWAS view, we'll just make (for each pheno) `top1k-variants-phewas_code-0.08.json`.

- Sort phenos by their phewas_code-as-a-float, rather than as text.

- Replace phenos.json with sqlite

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
