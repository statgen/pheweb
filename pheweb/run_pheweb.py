#!/usr/bin/env python3

# Use this script for development to serve pheweb from a given directory instead of one installed with pip
#
# E.g.:
#
# cd /path/to/where_config.py_is
#
# /path/to/pheweb/pheweb/run_pheweb.py /path/to/pheweb serve --port 8080 --num-workers=4
#
# will serve code from /path/to/pheweb

import re
import sys
sys.path.insert(0,sys.argv[1])
del sys.argv[1]
from pheweb.command_line import main

if __name__ == '__main__':
    sys.argv[0] = re.sub(r'(-script\.pyw?|\.exe)?$', '', sys.argv[0])
    sys.exit(main())
