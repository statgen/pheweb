# this file will be interpreted as python

# `virtualenv_dir` is for a python2 virtualenv.  `$virtualenv_dir/bin/activate` should exist.
virtualenv_dir='/path/to/my/venv/'

# `data_dir` should have enough space to store all of your association files.
# It's best if you have read/write access to it.  If you don't, prefix all commands with `sudo `.
data_dir='/path/to/my/data/'


# Any variant with this minor allele frequency (MAF) or larger WILL BE SHOWN, no matter what.
# If a variant has a smaller MAF, it will still be shown if it has a large enough MAF in some other phenotype.
# For example, if you set it to 0.01, you'll only see variants that have a MAF>=1% in at least one phenotype.
minimum_maf = 0.0


# These aren't needed by default.
# But, if you can't just run `bgzip` and `tabix` from the commandline, you need to put their paths here.
# tabix_path = "/path/to/my/tabix"
# bgzip_path = "/path/to/my/bgzip"
# wget_path = "/path/to/my/wget"

# Don't touch this unless you know what you're doing.
source_file_parser="epacts"


# -*- mode: python -*-
