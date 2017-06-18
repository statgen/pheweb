#!/bin/bash

set -euo pipefail

# use system python
#export PATH="$(echo $PATH | tr : "\n" | grep -v $HOME | tr "\n" : | perl -ple 's{^:|:$}{}g')"

rm -rf "/tmp/pheweb-test-${USER}-"* # pre-clean

if echo "${1:-}" | grep -q g; then # install globally
    pip3 install --upgrade -e .
    echo -e "\n\n===> \`pheweb\` is $(which pheweb)"
elif echo "${1:-}" | grep -q v; then # install in virtualenv in /tmp
    tempdir="$(mktemp -d "/tmp/pheweb-test-${USER}-XXXX")"
    pushd "$tempdir" > /dev/null
    echo -e "\n\n====> populating $tempdir/venv"
    python3 -m pip install -I --prefix venvdir virtualenv
    ./venvdir/bin/virtualenv venv
    set +u && source ./venv/bin/activate && set -u
    popd > /dev/null
    pip3 install .
    which pheweb | grep -q "$tempdir"
elif echo "${1:-}" | grep -q c; then # use currently-install pheweb
    :
else
    echo "Please pass in one of:"
    echo "   g : install pheweb globally and test it"
    echo "   v : install pheweb in a virtualenv and test it"
    echo "   c : test currently-installed pheweb"
    echo
    echo "You can also pass any of:"
    echo "   e : drop into IPython Debugger on an uncaught exception (equivalent to 'export PHEWEB_IPDB=1')"
    echo "   d : run pheweb in debug mode"
    exit 1
fi

if ! type -t pheweb >/dev/null; then
    echo "pheweb not installed"
    exit 1
fi


if echo "${1:-}" | grep -q e; then
    export PHEWEB_IPDB=1
fi
if echo "${1:-}" | grep -q e; then
    export PHEWEB_DEBUG=1
fi

echo $'\n\n'"===> \`pheweb\` is $(which pheweb)"
first_line="$(head -n1 $(which pheweb))"
echo "pheweb will run with: '$first_line'"
python_runner="$(echo "$first_line" | perl -nale 'print $1 if m{#!/usr/bin/env (.*)}')"
if [[ -n $python_runner ]]; then echo "- in which $python_runner refers to $(which $python_runner)"; fi

cd test/data_dir

rm -rf pheno-list.json generated-by-pheweb

echo -e "\n\n\n====> ./make_phenolist.sh"
./make_phenolist.sh

echo -e "\n\n\n====> pheweb process-assoc-files"
pheweb process-assoc-files
pheweb top-loci

port="$(python3 -c "print(__import__('random').randrange(8000,9000))")"
echo -e "\n\n\n====> pheweb serve --port $port --no-reloader"
pheweb serve --port "$port" --no-reloader &
pid=$!
sleep 1
check_url() { url="$1"; echo "$url"; curl -sSI "$url" | grep -q 200; }
grep_url()  { url="$1"; echo "$url"; pattern="$2"; curl -sS "$url" | grep -q "$pattern"; }
if check_url "http://localhost:$port/" &&
   check_url "http://localhost:$port/variant/15-55447871-C-T"&&
   check_url "http://localhost:$port/static/variant.js" &&
   check_url "http://localhost:$port/pheno/snowstorm" &&
   check_url "http://localhost:$port/api/manhattan/pheno/snowstorm.json" &&
   check_url "http://localhost:$port/api/qq/pheno/snowstorm.json" &&
   check_url "http://localhost:$port/region/snowstorm/8:926279-1326279" &&
   check_url "http://localhost:$port/api/region/snowstorm/lz-results/?filter=analysis%20in%203%20and%20chromosome%20in%20%20%278%27%20and%20position%20ge%20976279%20and%20position%20le%201276279" &&
   check_url "http://localhost:$port/region/snowstorm/gene/DNAH14?include=1-225494097" &&
   check_url "http://localhost:$port/api/autocomplete?query=%20DAP-2" &&
   grep_url "http://localhost:$port/region/1/gene/SAMD11" "EAR-LENGTH"
then passed=false
fi
kill $pid
if [[ ${failed:-} = false ]]; then exit 1; fi

echo -e "\n\n====> SUCCESS"

rm -rf "/tmp/pheweb-test-venv-${USER}-"* # post-clean
