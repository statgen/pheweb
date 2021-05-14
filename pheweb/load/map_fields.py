#!/bin/env python3
# todo
# 1. document
# 2. unit tests

import sys
import argparse
import os

def rename_args(rename):
    rename_map = {}
    if rename:
        for columns in rename.split(","):
            if ":" in columns:
                old_name , new_name = columns.split(":")
                rename_map[old_name] = new_name
            else:
                raise Exception('could not find separator ":" {}'.format(columns))
    return rename_map

assert rename_args("") == {}
assert rename_args("a:b") == {"a" : "b" }
assert rename_args("a:b,c:d") == {"a" : "b" , "c" : "d" }
import pytest
with pytest.raises(Exception):
    rename_args("a")

def exclude_args(exclude):
    exclude_set = set()
    if exclude:
        exclude_set.update(exclude.split(","))
    return exclude_set

assert exclude_args("") == set()
assert exclude_args("a") == {"a"}
assert exclude_args("a,b") == {"a","b"}
assert exclude_args("a,b,c") == {"a","b","c"}

def process_header(line, rename):
    header = line.rstrip("\n").split("\t")
    header = [ rename[c] if c in rename else c for c in header ]
    return "{}\n".format("\t".join(header))

assert process_header("\n", {}) == "\n"
assert process_header("a\n", {}) == "a\n"
assert process_header("a\tb\n", {}) == "a\tb\n"
assert process_header("a\tb\n", {"b": "c"}) == "a\tc\n"
assert process_header("a\tb\td\n", {"b": "c", "d" : "e"}) == "a\tc\te\n"

def process_exclude(header,exclude):
    header = header.rstrip("\n").split("\t")
    return { i for i,h in enumerate(header) if h in exclude }

assert process_exclude("", {}) == set()
assert process_exclude("a\n", {"a"}) == { 0 }
assert process_exclude("a\tb\tc\n", {"a"}) == { 0 }
assert process_exclude("a\tb\tc\n", {"a","c"}) == { 0 , 2 }

def process_line(line, exclude):
    columns = line.rstrip("\n").split("\t")
    columns = [ c for i,c in enumerate(columns) if i not in exclude ]
    return "{}\n".format("\t".join(columns))

assert process_line("\n", {}) == "\n"
assert process_line("1\n", {}) == "1\n"
assert process_line("1\t2\n", {}) == "1\t2\n"
assert process_line("1\t2\t3\n", {}) == "1\t2\t3\n"
assert process_line("1\t2\t3\n", {0}) == "2\t3\n"
assert process_line("1\t2\t3\n", {0,1}) == "3\n"
assert process_line("1\t2\t3\n", {0,1,2}) == "\n"
assert process_line("1\t2\t3\n", {3}) == "1\t2\t3\n"

def process_io(readf, writef, rename, exclude):
    header = process_header(readf.readline(),rename)
    exclude = process_exclude(header,exclude)
    writef.write(process_line(header, exclude))
    for line in readf.readlines():
        writef.write(process_line(line, exclude))
    return writef

import io
assert process_io(io.StringIO("a\tb\n1\t2\n"),io.StringIO(), "", "").getvalue() == "a\tb\n1\t2\n"
assert process_io(io.StringIO("a\tb\n1\t2\n"),io.StringIO(), {"b":"c"}, "a").getvalue() == "c\n2\n"
assert process_io(io.StringIO("a\tb\tc\n1\t2\t3\n"),io.StringIO(), {"b":"z"}, "a").getvalue() == "z\tc\n2\t3\n"


def parse_args(argv):
    parser = argparse.ArgumentParser(description="map fields in a tsv file")
    parser.add_argument("--rename",
                        dest="rename",
                        default="",
                        action="store",
                        type=str,
                        help="rename fields format is old_name:new_name,... ")
    parser.add_argument("--exclude",
                        dest="exclude",
                        default="",
                        action="store",
                        type=str,
                        help="rename fields format is field_1,... ")
    parser.add_argument('files', default=[], nargs='+', help='files to be renamed')
    return parser.parse_args(argv)

assert parse_args([""]).rename == ""
assert parse_args([""]).exclude == ""
assert parse_args([""]).files == [""]
assert parse_args(["a"]).files == ["a"]
assert parse_args(["a","--exclude","e"]).exclude == "e"
assert parse_args(["a","--rename","r"]).rename == "r"

def process_files(f, rename, exclude):
    bkup = "{}.bkup".format(f)
    os.rename(f, bkup)
    op = gzip.open if(f.endswith(".gz")) else open
    with op(bkup,'rt') as readf:
        with op(f,'wt') as writef:
            process_io(readf, writef, rename, exclude)
    os.remove(bkup)

def run(argv):
    args = parse_args(argv)
    rename = rename_args(args.rename)
    exclude = exclude_args(args.exclude)
    for f in args.files:
        process_files(f, rename, exclude)
    
    
if __name__ == "__main__":
    run(sys.argv[1:])
