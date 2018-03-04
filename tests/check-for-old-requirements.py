#!/usr/bin/env python3

import re, json, urllib.request, traceback, os.path

with open(os.path.join(os.path.dirname(__file__),'../setup.py')) as f:
    for line in f:
        m = re.match(r'''^\s+'([-a-zA-Z]+)(\[[a-zA-Z]+\])?([~<>=]+[0-9a-zA-Z\.]+)?',''', line)
        if m:
            pkg, opt, version = m.group(1), m.group(2), m.group(3)
            if opt is None: opt=''
            if version is None: version=''
            try:
                url = 'https://pypi.python.org/pypi/{}/json'.format(pkg)
                j = json.loads(urllib.request.urlopen(url).read())
                latest = j['info']['version']
                v = version.lstrip('~=>')
                importance = '' if latest == v or latest==v+'.0' or latest.startswith(v) else '<<'
                print('{:20}{:10}{:10}{}'.format(pkg+opt, version, latest, importance))
            except Exception:
                print([pkg, opt, version])
                print(traceback.format_exc())
