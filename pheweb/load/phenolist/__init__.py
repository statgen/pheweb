
from ...utils import PheWebError
from ...file_utils import get_generated_path, make_basedir, common_filepaths, read_maybe_gzip
from ..read_input_file import PhenoReader

import os
import string
import json
import csv
import glob
import re
import itertools
import sys
import copy
import boltons.iterutils
import tqdm
import datetime
import shutil


def get_phenolist_with_globs(globs, star_is_phenocode):
    phenolist = []
    with tqdm.tqdm(total=int(1e100), bar_format='Found {n:7} files') as progressbar:
        for g in globs:
            num_files_in_this_glob = 0
            for filepath in glob.iglob(g):
                num_files_in_this_glob += 1
                phenolist.append({'assoc_files': [os.path.abspath(filepath)]})
                if star_is_phenocode:
                    phenolist[-1]['phenocode'] = _extract_star(g, filepath)
                progressbar.update()
            if num_files_in_this_glob == 0:
                progressbar.write("\rWARNING: the shell-glob {!r} didn't match any files\n".format(g))
    print("NOTE: found {} association files".format(len(phenolist)))
    return phenolist

def _extract_star(glob_pattern, filepath):
    if '*' not in glob_pattern:
        raise PheWebError("You tried to use --star-is-phenocode, but your pattern {!r} doesn't contain any *s.  If you tried to use a *, maybe wrap your pattern in single-quotes (') to prevent your shell from expanding it.")
    regex = '^{}$'.format(re.escape(glob_pattern).replace(r'\*', '([^/]*)'))
    matches = re.match(regex, filepath).groups()
    if boltons.iterutils.same(matches):
        return matches[0]
    raise PheWebError("You used --star-is-phenocode with the pattern {!r} which found the file {!r}, but the *s appeared to match {!r}, which are different.".format(
        glob, filepath, matches))
assert _extract_star('/foo/pheno-*.epacts.gz', '/foo/pheno-bar.epacts.gz') == 'bar'
assert _extract_star('/foo/*/pheno-*.epacts.gz', '/foo/bar/pheno-bar.epacts.gz') == 'bar'

def extract_phenocode_from_filepath(phenolist, regex):
    print("NOTE: working with {} phenos".format(len(phenolist)))
    re_pattern_type = re._pattern_type if hasattr(re, '_pattern_type') else re.Pattern # changed in py3.7
    if not isinstance(regex, re_pattern_type):
        regex = re.compile(regex)
    for pheno in phenolist:
        if 'assoc_files' not in pheno:
            raise PheWebError("ERROR: At least one phenotype doesn't have the key 'assoc_files'.")
        if not pheno['assoc_files']:
            raise PheWebError("ERROR: At least one phenotype has an empty 'assoc_files' list.")
        phenocodes = []
        for assoc_filepath in pheno['assoc_files']:
            match = re.search(regex, assoc_filepath)
            if match is None:
                raise PheWebError("ERROR: The regex {!r} doesn't match the filepath {!r}".format(regex.pattern, assoc_filepath))
            groups = match.groups()
            if len(groups) != 1:
                raise PheWebError("ERROR: The regex {!r} doesn't capture any groups on the filepath {!r}!  You're using parentheses without backslashes, right?".format(regex.pattern, assoc_filepath))
            phenocodes.append(groups[0])
        if len(set(phenocodes)) != 1:
            raise PheWebError("ERROR: At least one phenotype gets multiple different phenocodes from its several association filepaths.  Here they are: {!r}".format(list(set(phenocodes))))
        if 'phenocode' in pheno:
            if pheno['phenocode'] != phenocodes[0]:
                raise PheWebError("""\
ERROR: The regex {!r} matched the filepaths {!r} to produce the phenocode {!r}.  But that phenotype already had a phenocode, {!r}.
""".format(regex.pattern, pheno['assoc_files'], phenocodes[0], pheno['phenocode']))
        pheno['phenocode'] = phenocodes[0]
    return phenolist

def check_that_columns_are_present(phenolist, columns):
    error_message = ""
    for col in columns:
        phenos_without_col = [pheno for pheno in phenolist if col not in pheno]
        if phenos_without_col:
            error_message += (
                "ERROR: the column {!r} is required but {} phenotypes don't have it.\n".format(col, len(phenos_without_col)) +
                "Here are a few phenotypes that are missing that column:\n")
            for pheno in phenos_without_col[:3]:
                error_message += "- {}\n".format(pheno)
            error_message += "\n"
    if error_message: raise PheWebError(error_message)

def check_that_phenocode_is_unique(phenolist):
    phenocodes = [pheno['phenocode'] for pheno in phenolist]
    phenocode_groups = boltons.iterutils.bucketize(phenocodes, key=lambda p:p).values()
    repeated_phenocodes = [phenocode_group for phenocode_group in phenocode_groups if len(phenocode_group) > 1]
    if repeated_phenocodes:
        raise PheWebError(
            "ERROR: At least one phenocode is used by multiple phenotypes.\n" +
            "Here are some repeated phenocodes: {!r}\n".format(repeated_phenocodes[:5]))

def check_that_all_phenos_have_same_columns(phenolist):
    all_columns = list(boltons.iterutils.unique(col for pheno in phenolist for col in pheno))
    for pheno in phenolist:
        for col in all_columns:
            if col not in pheno:
                raise PheWebError("ERROR: the column {!r} is in at least one phenotype but not in {!r}".format(col, pheno))

def check_that_all_phenotypes_have_assoc_files(phenolist):
    for pheno in phenolist:
        if 'assoc_files' not in pheno: raise PheWebError("Some phenotypes don't have any association files")
        if not isinstance(pheno['assoc_files'], list): raise PheWebError("Assoc_files is not a list for some phenotypes.  I don't know how that happened but it's bad.")
        if any(not isinstance(s, str) for s in pheno['assoc_files']): raise PheWebError("assoc_files contains things other than strings for some phenotypes.")

def extract_info_from_assoc_files(phenolist):
    for pheno in tqdm.tqdm(phenolist, bar_format='Read {n:7} files'):
        pheno.update(PhenoReader(pheno).get_info())
    return phenolist

def filter_phenolist(phenolist, filter_func, name_for_debugging=''):
    passing_phenos = []
    failing_phenos = []
    for pheno in phenolist:
        if filter_func(pheno):
            passing_phenos.append(pheno)
        else:
            failing_phenos.append(pheno)
    print('running filter {}: {} phenos pass, {} phenos fail.'.format(name_for_debugging, len(passing_phenos), len(failing_phenos)))
    if failing_phenos:
        print("Here's the first phenotype that failed:", json.dumps(failing_phenos[0]))
    return passing_phenos

def hide_small_numbers_of_samples(phenolist, minimum_visible_number=50):
    # Hide small numbers of cases for identifiability reasons.
    for pheno in phenolist:
        for key in ['num_cases', 'num_controls', 'num_samples']:
            if key in pheno and pheno[key] < minimum_visible_number:
                pheno[key] = '<{}'.format(minimum_visible_number)
    return phenolist

def import_phenolist(filepath, has_header):
    # Return a list-of-dicts with the original column names, or integers if none.
    # It'd be great to use pandas for this.
    if not os.path.exists(filepath):
        raise PheWebError("ERROR: unable to import {!r} because it doesn't exist".format(filepath))
    # 1. try openpyxl.
    phenos = _import_phenolist_xlsx(filepath, has_header)
    if phenos is not None:
        return phenos
    with read_maybe_gzip(filepath) as f:
        # 2. try json.load(f)
        try:
            return json.load(f)
        except ValueError:
            if filepath.endswith('.json'):
                raise PheWebError("The filepath {!r} ends with '.json' but reading it as json failed.".format(filepath))
        # 3. try csv.reader() with csv.Sniffer().sniff()
        f.seek(0)
        phenos = _import_phenolist_csv(f, has_header)
        if phenos is not None:
            return phenos
        raise PheWebError("I couldn't figure out how to open the file {!r}, sorry.".format(filepath))

def _import_phenolist_xlsx(filepath, has_header):
    import openpyxl
    try:
        wb = openpyxl.load_workbook(filepath)
        assert len(wb.worksheets) == 1
        sheet = wb.worksheets[0]
        rows = [[cell.value for cell in row] for row in sheet.rows]
        num_cols = len(rows[0])
        if has_header:
            fieldnames, rows = rows[0], rows[1:]
            if any(fieldname is None or fieldname == '' for fieldname in fieldnames):
                if has_header == 'augment':
                    fieldnames = [i if fieldname is None else fieldname for i, fieldname in enumerate(fieldnames)]
                else:
                    raise PheWebError('bad xlsx header')
            assert len(set(fieldnames)) == len(fieldnames), fieldnames
        else:
            fieldnames = list(range(num_cols))
        return [{fieldnames[i]: row[i] for i in range(num_cols)} for row in rows]
    except openpyxl.utils.exceptions.InvalidFileException:
        if filepath.endswith('.xlsx'):
            raise PheWebError("The filepath {!r} ends with '.xlsx' but reading it as an excel file failed.".format(filepath))
        return None

def _import_phenolist_csv(f, has_header):
    # Note: If a csv (1) contains commas in quoted cells and (2) doesn't have any line that starts with a quoted cell,
    #       then sometimes this makes very bad choices.
    #       In particular, if all lines have the same number of some other character (even a letter), that character might become the delimeter.
    try:
        dialect = csv.Sniffer().sniff(f.read(4096))
    except Exception as exc:
        raise PheWebError("Sniffing csv format failed.  Check that your csv file is well-formed.  If it is, try delimiting with tabs or semicolons.") from exc
    if dialect.delimiter in string.ascii_letters or dialect.delimiter in string.digits:
        raise PheWebError("Our csv sniffer decided that {!r} looks like the most likely delimiter in your csv file, but that's crazy.")
    f.seek(0)
    try:
        rows = list(csv.reader(f, dialect))
    except ValueError:
        return None
    num_cols = len(rows[0])
    if has_header:
        fieldnames, rows = rows[0], rows[1:]
        if any(fieldname is None or fieldname == '' for fieldname in fieldnames):
            if has_header == 'augment':
                fieldnames = [i if fieldname is None else fieldname for i, fieldname in enumerate(fieldnames)]
            else:
                raise PheWebError('bad csv header')
        assert len(set(fieldnames)) == len(fieldnames)
    else:
        fieldnames = list(range(num_cols))
    return [{fieldnames[i]: row[i] for i in range(num_cols)} for row in rows]

def interpret_json(phenolist):
    for pheno in phenolist:
        for k in pheno:
            if isinstance(pheno[k], str) and pheno[k].startswith('json:'):
                s = pheno[k][len('json:'):]
                try:
                    pheno[k] = json.loads(s)
                except Exception as exc:
                    raise PheWebError("The input file contained an invalid field marked to be interpreted as json: {!r}".format(pheno[k])) from exc
    return phenolist

def split_values_on_pipes(phenolist):
    all_keys = list(set(itertools.chain.from_iterable(phenolist)))
    str_keys = [key for key in all_keys if all(isinstance(pheno.get(key, None), str) for pheno in phenolist)]
    pipe_keys = [key for key in str_keys if any('|' in pheno.get(key, '') for pheno in phenolist)]
    if pipe_keys:
        print("Here are the keys that are going to be split into lists (ie, all values are strings and at least one contains '|'):")
        for key in pipe_keys:
            print("- {!r}".format(key))
        for key in pipe_keys:
            for pheno in phenolist:
                if key in pheno:
                    pheno[key] = pheno[key].split('|')
    return phenolist

def listify_assoc_files(phenolist):
    for pheno in phenolist:
        if 'assoc_files' in pheno and not isinstance(pheno['assoc_files'], list):
            if not isinstance(pheno['assoc_files'], str):
                raise PheWebError("assoc_files is of unsupported type({!r}). value: {!r}".format(type(pheno['assoc_files']), pheno['assoc_files']))
            pheno['assoc_files'] = [pheno['assoc_files']]
    return phenolist

def numify_numeric_cols(phenolist):
    int_regex = re.compile(r'^-?(?:[1-9]\d)?\d$')
    float_regex = re.compile(r'^-?(?:[1-9]\d*)?\d(?:\.\d+)?(?:[Ee]-?\d+)?$')
    def floaty(value): return isinstance(value, str) and float_regex.match(value)
    def inty(value): return isinstance(value, str) and int_regex.match(value)
    all_keys = list(set(itertools.chain.from_iterable(phenolist)))
    for key in all_keys:
        if all(inty(pheno[key]) for pheno in phenolist if key in pheno):
            for pheno in phenolist:
                if key in pheno:
                    pheno[key] = int(pheno[key])
        elif all(floaty(pheno[key]) for pheno in phenolist if key in pheno):
            for pheno in phenolist:
                if key in pheno:
                    pheno[key] = float(pheno[key])
    return phenolist

def print_as_csv(phenolist):
    phenolist = copy.deepcopy(phenolist)
    all_columns = sorted(set(col for pheno in phenolist for col in pheno))
    w = csv.DictWriter(sys.stdout, all_columns)
    w.writeheader()
    for pheno in phenolist:
        for k in pheno:
            if isinstance(pheno[k], (int, float)):
                pass
            elif isinstance(pheno[k], str):
                pass
            elif isinstance(pheno[k], list) and len(pheno[k])>0 and all(isinstance(v,str) for v in pheno[k]) and all('|' not in v for v in pheno[k]):
                pheno[k] = '|'.join(pheno[k])
            else:
                pheno[k] = 'json:' + json.dumps(pheno[k])
        w.writerow(pheno)


def rename_column(phenolist, old_name, new_name):
    for pheno in phenolist:
        if new_name in pheno:
            raise PheWebError("ERROR: You're renaming the column {!r} to {!r}, but {!r} already exists in the phenotype {!r}.".format(old_name, new_name, new_name, pheno))
        if old_name not in pheno:
            raise PheWebError("ERROR: You're renaming the column {!r} to {!r}, but {!r} doesn't exist in the phenotype {!r}.".format(old_name, new_name, old_name, pheno))
        pheno[new_name] = pheno[old_name]
        del pheno[old_name]
    return phenolist

def keep_only_columns(phenolist, good_keys):
    for pheno in phenolist:
        for key in list(pheno):
            if key not in good_keys:
                del pheno[key]
    return phenolist

class _hashabledict(dict):
    # TODO: could this be recursive? at that point, just jsonify everything.
    def __key(self):
        return tuple((k,self[k]) for k in sorted(self))
    def __hash__(self):
        return hash(self.__key())
    def __eq__(self, other):
        return self.__key() == other.__key()
def _get_hashable(obj):
    if isinstance(obj, dict):
        return _hashabledict(obj)
    assert hasattr(obj, '__hash__')
    return obj

def merge_in_info(phenolist, more_info_rows):
    "This function assumes that every pheno in phenolist has exactly one match (ie, same phenocode) in more_info_rows"
    # TODO: rename "more_info_rows" something else.
    for t in [phenolist, more_info_rows]:
        #check_that_all_phenos_have_same_columns(t)
        check_that_phenocode_is_unique(t)
        check_that_columns_are_present(t, ['phenocode'])
    keys_to_add = set(itertools.chain.from_iterable(more_info_rows)) - set(itertools.chain.from_iterable(phenolist))
    print("new columns being added to pheno-list: {!r}".format(keys_to_add))
    more_info_by_phenocode = {row['phenocode']: row for row in more_info_rows}
    for pheno in phenolist:
        row = more_info_by_phenocode.get(pheno['phenocode'], None)
        if row is None:
            raise PheWebError("ERROR: there's no row in your info-to-merge file with the phenocode {!r}".format(pheno['phenocode']))
        for key in keys_to_add:
            pheno[key] = row[key]
    return phenolist

# def merge_in_info(phenos, more_info_rows):
#     # TODO: do some special-casing for category and phenostring, since we have to have exactly one of each.
#     keys_that_cant_be_lists = {'category_string', 'phenostring'}
#     keys_to_add = {key for row in more_info_rows for key in row} - {key for row in phenos for key in row}
#     keys_to_add_that_are_dicts = {key for key in keys_to_add if any(isinstance(row[key], dict) for row in more_info_rows)}
#     for key in keys_to_add_that_are_dicts:
#         assert all(isinstance(row[key], dict) for row in more_info_rows)
#     phenos_by_phenocode = {pheno['phenocode']: pheno for pheno in phenos}
#     for more_info_row in more_info_rows:
#         pheno = phenos_by_phenocode.get(more_info_row['phenocode'], None)
#         if pheno is not None:
#             for key in more_info_row:
#                 if key in keys_that_cant_be_lists:
#                     if key in pheno:
#                         assert pheno[key] == more_info_row[key], (key, pheno, more_info_row)
#                     else:
#                         pheno[key] = more_info_row[key]
#                 elif key in keys_to_add:
#                     if key in keys_to_add_that_are_dicts:
#                         pheno.setdefault(key, set()).add(_hashabledict(more_info_row[key]))
#                     else:
#                         pheno.setdefault(key, set()).add(more_info_row[key])
#                 elif key in pheno:
#                     assert pheno[key] == more_info_row[key]
#                 else:
#                     print("wat?")
#     keys_with_multiple_items = set(key for key in keys_to_add-keys_that_cant_be_lists if any(key not in pheno or len(pheno[key]) != 1 for pheno in phenos))
#     for pheno in phenos:
#         for key in keys_to_add:
#             if key in keys_with_multiple_items:
#                 try:
#                     pheno[key] = sorted(pheno[key])
#                 except:
#                     pheno[key] = list(pheno.get(key, []))
#             elif key not in keys_that_cant_be_lists:
#                 assert len(pheno[key]) == 1
#                 pheno[key] = next(iter(pheno[key]))


def unique_phenocode(phenolist, new_column_name):
    # if new_column_name is None, that means that we want to keep all the columns independent.
    # so, for example, [{LDL, a, 5}, {LDL, b, 2}] -> [{LDL, [a,b], [2,5]}]
    # notice how the order got scrambed within each list.
    # if new_column_name is a string, then we make a new column by that name and put all the stuff with multiple values into it.
    # so, for example, [{LDL, a, 5}, {LDL, b, 2}] -> [{LDL, [{a,5},{b,2}]}].
    # notice how we can still see that `a` goes with `5` and `b` with `2`.
    if not all('phenocode' in pheno for pheno in phenolist):
        raise PheWebError("At least one pheno doesn't have a 'phenocode', so you can't run unique-phenocode")
    if not boltons.iterutils.same(pheno.keys() for pheno in phenolist):
        raise PheWebError("Not all phenotypes have the same columns.  That probably not a problem, but I haven't thought through the implications yet.")
    phenocode_groups = boltons.iterutils.bucketize(phenolist, lambda p: p['phenocode']).values()
    columns_to_listify = set()
    for phenocode_group in phenocode_groups:
        for key in phenocode_group[0]:
            if not boltons.iterutils.same(pheno[key] for pheno in phenocode_group):
                columns_to_listify.add(key)
    print("NOTE: the columns {!r} sometimes have multiple values for the same phenocode so we'll combine them.".format(list(columns_to_listify)))
    if len(columns_to_listify) == 0:
        print("It looks like some lines are exact dupes of others. That's easy to fix.")
        new_phenolist = []
        for phenocode_group in phenocode_groups:
            assert boltons.iterutils.same(phenocode_group)
            new_phenolist.append(phenocode_group[0])
        return new_phenolist
    elif len(columns_to_listify) == 1 or new_column_name is None:
        new_phenolist = []
        for phenocode_group in phenocode_groups:
            new_pheno = {}
            for key in phenocode_group[0]:
                if key not in columns_to_listify:
                    new_pheno[key] = phenocode_group[0][key]
                    assert all(row[key] == phenocode_group[0][key] for row in phenocode_group)
                else:
                    if not boltons.iterutils.same(type(row[key]) for row in phenocode_group):
                        raise PheWebError("ERROR: there are multiple types in the column {!r}, so I don't want to make it a list".format(key))
                    if isinstance(phenocode_group[0][key], list):
                        # TODO: assert that the elements of the lists are all the same type
                        items_to_add = itertools.chain.from_iterable(row[key] for row in phenocode_group)
                    else:
                        if not isinstance(phenocode_group[0][key], (str, int, float, dict)):
                            raise PheWebError("Where did you even get the type {!r}?".format(type(phenocode_group[0][key])))
                        items_to_add = (row[key] for row in phenocode_group)
                    new_pheno[key] = list(set(_get_hashable(item) for item in items_to_add))
            new_phenolist.append(new_pheno)
        return new_phenolist
    else:
        new_phenolist = []
        print("Putting all new info into the column {!r}".format(new_column_name))
        for phenocode_group in phenocode_groups:
            new_pheno = {}
            for key in phenocode_group[0]:
                if key not in columns_to_listify:
                    new_pheno[key] = phenocode_group[0][key]
                    assert all(row[key] == phenocode_group[0][key] for row in phenocode_group)
            new_pheno[new_column_name] = []
            for row in phenocode_group:
                new_pheno[new_column_name].append({key:row[key] for key in columns_to_listify})
            new_pheno[new_column_name] = list(set(_get_hashable(d) for d in new_pheno[new_column_name]))
            new_phenolist.append(new_pheno)
        return new_phenolist

def load_phenolist(filepath):
    if not os.path.exists(filepath):
        raise PheWebError("The filepath {!r} does not exist.".format(filepath))
    with open(filepath) as f:
        try:
            phenolist = json.load(f)
        except json.JSONDecodeError:
            raise PheWebError("Failed to load json from {!r}.".format(filepath))
        return phenolist

def save_phenolist(phenolist, filepath=None):
    filepath = os.path.abspath(filepath)
    if os.path.exists(filepath): backup_phenolist(filepath)
    else: make_basedir(filepath)
    with open(os.path.join(filepath), 'w') as f:
        write_phenolist_to_file(phenolist, f)
    all_columns = list(boltons.iterutils.unique(col for pheno in phenolist for col in pheno))
    print("NOTE: wrote {} phenotypes to {!r} with columns {!r}".format(len(phenolist), filepath, all_columns))
def backup_phenolist(filepath):
    backup_filepath = '{}-{}'.format(datetime.datetime.isoformat(datetime.datetime.now()), os.path.basename(filepath))
    backup_filepath = get_generated_path('phenolist-backups', backup_filepath)
    make_basedir(backup_filepath)
    print("NOTE: moving the old {!r} to {!r}".format(filepath, backup_filepath))
    shutil.move(filepath, backup_filepath)
def write_phenolist_to_file(phenolist, f):
    phenolist = sorted(phenolist, key=lambda pheno: pheno.get('phenocode', ''))
    json.dump(phenolist, f, sort_keys=True, indent=1)

default_phenolist_filepath = common_filepaths['phenolist']

def run(argv):
    # TODO: replace -f with -p .  That's more clear for import-phenolist.
    # TODO: clean up that nasty usage, especially the {...}
    # TODO: its' awkward that some printing is to STDERR and some to STDOUT.  Use logger.

    import signal
    signal.signal(signal.SIGPIPE, signal.SIG_DFL) # don't throw a messy exception when running `pheweb phenolist ... | head`

    import argparse
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest='subcommand')
    subcommand_handlers = {}
    def add_subcommand(name):
        def dec(f):
            subcommand_handlers[name] = f
            return f
        return dec
    def modifies_phenolist(f):
        def f2(args):
            filepath = args.filepath or default_phenolist_filepath
            phenolist = load_phenolist(filepath)
            v = f(args, phenolist)
            if v is not None: phenolist = v
            save_phenolist(phenolist, filepath)
        return f2

    @add_subcommand('view')
    def f(args):
        filepath = args.filepath or default_phenolist_filepath
        phenolist = load_phenolist(filepath)
        write_phenolist_to_file(phenolist, sys.stdout)
    p = subparsers.add_parser('view', help='just print the file')
    p.add_argument('-f', dest="filepath", help="output filepath (default: {!r})".format(default_phenolist_filepath))

    @add_subcommand('glob')
    def f(args):
        if args.simple_phenocode and args.star_is_phenocode:
            raise PheWebError('You cannot use --star-is-phenocode and --simple-phenocode at the same time.')
        filepath = args.filepath or default_phenolist_filepath
        phenolist = get_phenolist_with_globs(args.patterns, star_is_phenocode=args.star_is_phenocode)
        if args.simple_phenocode:
            pattern = r'.*/(?:(?:epacts|pheno)[\.-]?)?' + r'([^/]+?)' + r'(?:\.chr(?:[1-9][0-9]?|X|Y|MT?)|\.epacts|\.gz|\.tsv|\.txt|\.csv)*$'
            extract_phenocode_from_filepath(phenolist, pattern)
        save_phenolist(phenolist, filepath)
    p = subparsers.add_parser('glob', help='use one or more shell-glob patterns to select association files')
    p.add_argument('patterns', nargs='+', help="one or more shell-glob patterns")
    p.add_argument('-f', dest="filepath", help="output filepath (default: {!r})".format(default_phenolist_filepath))
    p.add_argument('--simple-phenocode', dest="simple_phenocode", action="store_true", help="Extract a simple phenocode from the end of each filepath")
    p.add_argument('--star-is-phenocode', dest="star_is_phenocode", action="store_true",
                   help="Turn whatever text the * matches into the phenocode. Put quotes around the pattern, so that the shell doesn't interpret the *.")

    @add_subcommand('extract-phenocode-from-filepath')
    @modifies_phenolist
    def f(args, phenolist):
        if args.simple:
            args.pattern = r'.*/(?:(?:epacts|pheno)[\.-]?)?' + r'([^/]+?)' + r'(?:\.epacts|\.gz|\.tsv)*$'
        if not args.pattern: raise PheWebError("You must either supply a pattern or use --simple")
        extract_phenocode_from_filepath(phenolist, args.pattern)
    p = subparsers.add_parser('extract-phenocode-from-filepath', help='use a regex to extract phenocodes from association filepaths')
    p.add_argument('pattern', nargs='?', help="a perl-compatible regex pattern with one capture group")
    p.add_argument('-f', dest="filepath", help="pheno-list filepath, used for both input and output (default: {!r})".format(default_phenolist_filepath))
    p.add_argument('--simple', dest='simple', action='store_true', help="just take whatever's between the last / and the first .")

    @add_subcommand('unique-phenocode')
    @modifies_phenolist
    def f(args, phenolist):
        return unique_phenocode(phenolist, args.new_column_name)
    p = subparsers.add_parser('unique-phenocode', help='if multiple rows have the same phenocode, merge them')
    p.add_argument('--columns-are-independent', action='store_true', default=None,
                   help="when merging rows, if multiple columns are different, just turn each of those columns into a list.")
    p.add_argument('--columns-are-related', dest="new_column_name", default=None,
                   help="when merging rows, if multiple columns are different, add a new column with this name.")
    p.add_argument('-f', dest="filepath", help="pheno-list filepath, used for both input and output (default: {!r})".format(default_phenolist_filepath))

    @add_subcommand('verify')
    def f(args):
        filepath = args.filepath or default_phenolist_filepath
        phenolist = load_phenolist(filepath)
        check_that_columns_are_present(phenolist, ['phenocode', 'assoc_files'] + args.required_columns)
        check_that_phenocode_is_unique(phenolist)
        check_that_all_phenotypes_have_assoc_files(phenolist)
        print("The {} phenotypes in {!r} look good.".format(len(phenolist), filepath))
    p = subparsers.add_parser('verify', help='check that pheno-list is well-formed and could plausibly be used to make a pheweb')
    p.add_argument('-f', dest="filepath", help="pheno-list filepath to check (default: {!r})".format(default_phenolist_filepath))
    p.add_argument('--required-columns', dest='required_columns', nargs='+', default=[], help="a list of column names that must be included in all phenotypes")

    @add_subcommand('filter-phenotypes')
    @modifies_phenolist
    def f(args, phenolist):
        if args.minimum_num_cases is not None: phenolist = filter_phenolist(phenolist, lambda p: p.get('num_cases', float('inf')) >= args.minimum_num_cases, 'minimum_num_cases')
        if args.minimum_num_controls is not None: phenolist = filter_phenolist(phenolist, lambda p: p.get('num_controls', float('inf')) >= args.minimum_num_controls, 'minimum_num_controls')
        if args.minimum_num_samples is not None: phenolist = filter_phenolist(phenolist, lambda p: p.get('num_samples', float('inf')) >= args.minimum_num_samples, 'minimum_num_samples')
        return phenolist
    p = subparsers.add_parser('filter-phenotypes', help='filter the phenotypes using various rules')
    p.add_argument('-f', dest="filepath", help="pheno-list filepath, used for both input and output (default: {!r})".format(default_phenolist_filepath))
    p.add_argument('--minimum-num-cases', dest='minimum_num_cases', type=int, help="remove any phenotypes with fewer than this number of cases")
    p.add_argument('--minimum-num-controls', dest='minimum_num_controls', type=int, help="remove any phenotypes with fewer than this number of controls")
    p.add_argument('--minimum-num-samples', dest='minimum_num_samples', type=int, help="remove any phenotypes with fewer than this number of samples")

    @add_subcommand('hide-small-numbers-of-samples')
    @modifies_phenolist
    def f(args, phenolist):
        return hide_small_numbers_of_samples(phenolist, args.minimum_visible_number)
    p = subparsers.add_parser('hide-small-numbers-of-samples', help="if a phenotype has too few samples, cases, or controls, don't show the number")
    p.add_argument('-f', dest="filepath", help="pheno-list filepath, used for both input and output (default: {!r})".format(default_phenolist_filepath))
    p.add_argument('--minimum-visible-number', dest='minimum_visible_number', type=int, help="the minimum number of samples, cases, or controls that will be visible")

    @add_subcommand('read-info-from-association-files')
    @modifies_phenolist
    def f(args, phenolist):
        return extract_info_from_assoc_files(phenolist)
    p = subparsers.add_parser('read-info-from-association-files', help="read per-pheno fields from association files")
    p.add_argument('-f', dest="filepath", help="pheno-list filepath, used for both input and output (default: {!r})".format(default_phenolist_filepath))

    @add_subcommand('import-phenolist')
    def f(args):
        filepath = args.filepath or default_phenolist_filepath
        phenolist = import_phenolist(args.input_filepath, not args.no_header)
        phenolist = interpret_json(phenolist)
        if args.delimit_lists_with_pipe:
            phenolist = split_values_on_pipes(phenolist)
        phenolist = listify_assoc_files(phenolist)
        phenolist = numify_numeric_cols(phenolist)
        save_phenolist(phenolist, filepath)
    p = subparsers.add_parser('import-phenolist', help='read a csv, tsv, gzipped csv, gzipped tsv, or xlsx file and produce a json file')
    p.add_argument('input_filepath', help="input filepath")
    p.add_argument('-f', dest="filepath", help="output filepath (default: {!r})".format(default_phenolist_filepath))
    p.add_argument('--no-header', dest="no_header", action="store_true", help="whether input_filepath has no header, in which case columns will just be numbered")
    p.add_argument('--never-delimit-lists-with-pipe', dest="delimit_lists_with_pipe", action="store_false", help="whether to split any fields that contain pipes into lists")
    # TODO: add option to strictly read a comma-delimited double-doublequote-escaped csv

    @add_subcommand('print-as-csv')
    def f(args):
        filepath = args.filepath or default_phenolist_filepath
        phenolist = load_phenolist(filepath)
        print_as_csv(phenolist)
    p = subparsers.add_parser('print-as-csv', help='Produce a csv file that could be read in by import-phenolist')
    p.add_argument('-f', dest="filepath", help="output filepath (default: {!r})".format(default_phenolist_filepath))
    # TODO: maybe make this be `view --csv`

    @add_subcommand('keep-only-columns')
    @modifies_phenolist
    def f(args, phenolist):
        return keep_only_columns(phenolist, args.columns_to_keep)
    p = subparsers.add_parser('keep-only-columns', help='')
    p.add_argument('-f', dest="filepath", help="pheno-list filepath, used for both input and output (default: {!r})".format(default_phenolist_filepath))
    p.add_argument('columns_to_keep', nargs='+', help="a list of column names to keep in phenotypes -- the rest will be deleted")

    @add_subcommand('rename-columns')
    @modifies_phenolist
    def f(args, phenolist):
        if len(args.renames) % 2 != 0:
            raise PheWebError("You supplied {} arguments. That's not a multiple of two. How am I supposed to pair old names with new names if you don't give me the same number of each?".format(len(args.renames)))
        for oldname, newname in boltons.iterutils.chunked_iter(args.renames, 2):
            phenolist = rename_column(phenolist, oldname, newname)
        return phenolist
    p = subparsers.add_parser('rename-columns', help='')
    p.add_argument('-f', dest="filepath", help="pheno-list filepath, used for both input and output (default: {!r})".format(default_phenolist_filepath))
    p.add_argument('renames', nargs='+', help="columns to rename, in pairs, like this: <oldname> <newname> <oldname> <newname>...")

    # TODO:
    # =====

    @add_subcommand('merge-in-info')
    @modifies_phenolist
    def f(args, phenolist):
        more_info_file = load_phenolist(args.file_with_more_info) # TODO: maybe import_phenolist?
        phenolist = merge_in_info(phenolist, more_info_file)
        return phenolist
    p = subparsers.add_parser('merge-in-info', help='')
    p.add_argument('-f', dest="filepath", help="pheno-list filepath, used for both input and output (default: {!r})".format(default_phenolist_filepath))
    p.add_argument('file_with_more_info', help="a pheno-list file with more information to add to the main pheno-list file")

    args = parser.parse_args(argv)
    if not args.subcommand: parser.parse_args(['-h'])
    subcommand_handlers[args.subcommand](args)
