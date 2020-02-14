#!/usr/bin/env python3

import re
import sys
sys.path.insert(0,'/mnt/nfs/juha/pheweb/')
print(sys.path)
from pheweb.command_line import main

if __name__ == '__main__':
    sys.argv[0] = re.sub(r'(-script\.pyw?|\.exe)?$', '', sys.argv[0])
    sys.exit(main())
