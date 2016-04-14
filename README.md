Data
====
The original data is:
- `/net/fantasia/home/schellen/PheWAS/epacts_multi/gwas_17March2016/gwas_17March2016.epacts.gz`
- 216 GB compressed
- probably 650-710 GB. (affected by NA lines)
- probably 25M-31M lines. (affected by NA lines)
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
- took 3hr. (with gzip -2, makes 53GB in only 45min, but we need bgzip which is slow)

Tabix is:
- `/var/pheweb_data/phewas_maf_gte_1e-2_ncases_gte_20.vcf.gz.tbi`
- 2.5 MB
- took 25min.


TODO GWAS backend
=================
- Regenerate jsons with binned variants.


TODO GWAS frontend
==================
- Display chromosomes on x-axis


TODO PheWAS backend
===================
- Search by rsid (make a RecordTrie that maps to 'chrom-pos-ref-alt')


TODO PheWAS frontend
====================
- Use collision detection when displaying phewas_strings.
  - For collision detection, see <https://www.w3.org/TR/SVG11/struct.html#__svg__SVGSVGElement__checkIntersection> or <http://stackoverflow.com/a/2178680/1166306>
  - Also check whether a label falls off the right side.
  - First try flipping left.  Then just don't display.
  - Render all labels after all points.
  - Maybe include an invisible background rect to ensure proper collision detection.
- Point tooltips based on quadrant.
