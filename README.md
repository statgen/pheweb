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
- Speed up `3_1_`.
  - we want top ~1k
  - p < 0.1: 800k
  - p < 0.01 : 80k
  - p < 0.001 : 8k
  - subsetting each pheno takes 15 min. 15min * 1500 = 16 days.

Option 1: recursive splitting.
- write a script like `3_`, but where the python gives the input and output filenames.  Then the python will guide the bash through a recursive splitting process.
  - Each layer of splitting should take 2hr.  We need 11 splits.  That's 1 day.

Option 2: remove variants where p > 0.001 for all phenos.
- If this has good results, but not good enough to solve the problem completely, it can be combined with option 1.
- grep won't work, b/c beta often has 0.00
- `4_` shows that we can't use this until we've already split a few times b/c every variant is 0.00X somewhere.

Option 3: Convert to hdf5 and then extract columns.
- hdf5 will convert my floats-as-strings to floats-as-32bit-floats I think.  That will not save much space.
- Will the initial hdf5 array need to live in memory?  That seems like a deal-breaker.


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
