#!/usr/bin/env python3

import re, json, urllib.request, os.path, sys

def check_pkg(pkg, opt, version, line=None):
    if opt is None: opt=''
    if version is None: version=''
    try:
        url = 'https://pypi.python.org/pypi/{}/json'.format(pkg)
        j = json.loads(urllib.request.urlopen(url).read())
        latest = j['info']['version']
        v = version.lstrip('~=>')
        importance = '' if latest == v or latest==v+'.0' or latest.startswith(v) else '>>'
        print('{:<3}{:20}{:10}{:10}'.format(importance, pkg+opt, version, latest))
    except Exception:
        print([pkg, opt, version, line])
        raise

fname = sys.argv[1] if len(sys.argv)>1 else os.path.join(os.path.dirname(__file__),'../setup.py')

with open(fname) as f:
    for line in f:
        m = re.match(r'''^\s*'?([-a-zA-Z]+)(\[[a-zA-Z]+\])?([~<>=]{2}[0-9a-zA-Z\.]+)?'?,?\s*$''', line)
        if m:
            pkg, opt, version = m.group(1), m.group(2), m.group(3)
            check_pkg(pkg, opt, version, line)
