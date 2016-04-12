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


TODO GWAS backend
=================


TODO GWAS frontend
==================
- Display chromosomes on x-axis


TODO PheWAS backend
===================
- search by rsid (make a RecordTrie that maps to 'chrom-pos-ref-alt')
- Is just top 2k fine?  If not, get 10k random variants spread through the genome.  Take all with p > max(pval of top 2k) for each pheno.  Put in a folder.


TODO PheWAS frontend
====================
- Use collision detection when displaying phewas_strings.
  - For collision detection, see <https://www.w3.org/TR/SVG11/struct.html#__svg__SVGSVGElement__checkIntersection> or <http://stackoverflow.com/a/2178680/1166306>
- Point tooltips based on quadrant.
