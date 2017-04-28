# this file will be interpreted as python


# Any variant with this minor allele frequency (MAF) or larger WILL BE SHOWN, no matter what.
# If a variant has a smaller MAF, it will still be shown if it has a large enough MAF in some other phenotype.
# For example, if you set it to 0.01, you'll see variants that have a MAF>=1% in at least one phenotype.
minimum_maf=0.01

num_procs = 2 # makes debugging a little nicer

# These aren't needed by default.
# But, if you can't just run `bgzip` and `tabix` from the commandline, you need to put their paths here.
#tabix_path = "/path/to/my/tabix"
#bgzip_path = "/path/to/my/bgzip"

# directory for caching large (~1GB) common files like dbsnp
cache = '../fake-cache'
