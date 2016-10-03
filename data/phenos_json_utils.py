
from __future__ import print_function, division, absolute_import

# Load config
import os.path
import imp
my_dir = os.path.dirname(os.path.abspath(__file__))
conf = imp.load_source('conf', os.path.join(my_dir, '../config.config'))

# Load utils
utils = imp.load_source('utils', os.path.join(my_dir, '../utils.py'))

import string
import json
import csv
import glob
import re
import itertools


def get_phenos_with_regex():
    src_filenames = glob.glob(conf.source_filenames_pattern)
    print('number of source files:', len(src_filenames))
    for src_filename in src_filenames:
        match = re.search(conf.source_filenames_pheno_code_extracting_regex, src_filename)
        if match is None:
            raise Exception('Failed to match regex {} against the path {}'.format(conf.source_filenames_pheno_code_extracting_regex, src_filename))
        pheno_code = match.groups()[0]
        yield {
            'src_filename': src_filename,
            'pheno_code': pheno_code,
        }

def check_that_pheno_code_is_urlsafe(phenos):
    # Check that pheno_code is url-safe.
    urlsafe_characters = string.ascii_letters + string.digits + '_-~. ' # TODO: Is this complete?  Am I missing some characters?  Is space okay?
    for pheno in phenos:
        bad_chars = list(set(char for char in pheno['pheno_code'] if char not in urlsafe_characters))
        if bad_chars:
            print("The phenotype with pheno_code {!r} contains the characters {!r} which is not allowed, because these string will be used in URLs".format(pheno['pheno_code'], bad_chars))
            print("Other phenotypes might have this problem too.")
            print("If this character IS actually urlsafe, it needs to be added to the list urlsafe_characters")
            print("If this is something you can't or don't want to fix, we can modify pheweb.")
            exit(1)

def extract_info_from_input_files(phenos):
    # Extract some information from each phenotype's input file(s).
    input_file_parser = imp.load_source('input_file_parser', os.path.join(my_dir, 'input_file_parsers/{}.py'.format(conf.source_file_parser)))
    for pheno in phenos:
        pheno.update(input_file_parser.get_pheno_info(pheno['src_filename']))
        #print('get_pheno_info({!r})'.format(pheno['src_filename']))

def filter_phenos(phenos, filter_func, name_for_debugging=''):
    good_phenos = [] # phenos with enough cases/samples
    bad_phenos = [] # phenos without enough cases/samples
    for pheno in phenos:
        if filter_func(pheno):
            good_phenos.append(pheno)
        else:
            bad_phenos.append(pheno)
    print('running filter {}: {} phenos pass, {} phenos fail.'.format(name_for_debugging, len(good_phenos), len(bad_phenos)))
    if bad_phenos:
        print('- example phenotypes with too few cases/samples:', json.dumps(bad_phenos[:3]))
    return good_phenos

def hide_small_numbers_of_samples(phenos, minimum_visible_number=50):
    # Hide small numbers of cases for identifiability reasons.
    for pheno in phenos:
        for key in ['num_cases', 'num_controls', 'num_samples']:
            if key in pheno and pheno[key] < minimum_visible_number:
                pheno[key] = '<{}'.format(minimum_visible_number)

def read_file(fname, has_header=False):
    # Return a list-of-dicts with the original column names, or integers if none.
    # It'd be great to use pandas for this.

    assert os.path.exists(fname)

    # 1. try openpyxl.
    phenos = _read_xlsx_file(fname, has_header)
    if phenos is not None:
        return phenos

    # 2. try json.load(f)
    with open(fname) as f:
        try:
            phenos = json.load(f)
        except ValueError:
            if fname.endswith('.json'):
                print("The filename {!r} ends with '.json' but reading it as json failed.".format(fname))
                exit(1)

    # 3. try csv.reader() with csv.Sniffer().sniff()
    phenos = _read_csv_file(fname, has_header)
    if phenos is not None:
        return phenos

    print("I couldn't figure out how to open the file {!r}, sorry.".format(fname))
    exit(1)

def _read_xlsx_file(fname, has_header):
    import openpyxl
    try:
        wb = openpyxl.load_workbook(fname)
        assert len(wb.worksheets) == 1
        sheet = wb.worksheets[0]
        rows = [[cell.value for cell in row] for row in sheet.rows]
        num_cols = len(rows[0])
        if has_header:
            fieldnames = rows[0]
            if any(fieldname is None or fieldname == '' for fieldname in fieldnames):
                if has_header == 'augment':
                    fieldnames = [i if fieldname is None else fieldname for i, fieldname in enumerate(fieldnames)]
                else:
                    exit(1)
            assert len(set(fieldnames)) == len(fieldnames), fieldnames
        else:
            fieldnames = range(num_cols)
        return [{fieldnames[i]: row[i] for i in range(num_cols)} for row in rows]
    except openpyxl.utils.exceptions.InvalidFileException:
        if fname.endswith('.xlsx'):
            print("The filename {!r} ends with '.xlsx' but reading it as an excel file failed.".format(fname))
            exit(1)
        return None

def _read_csv_file(fname, has_header):
    with open(fname) as f:
        dialect = csv.Sniffer().sniff(f.read(1024))
        f.seek(0)
        try:
            rows = list(csv.reader(f, dialect))
        except ValueError:
            return None
        num_cols = len(rows[0])
        if has_header:
            fieldnames = rows[0]
            if any(fieldname is None or fieldname == '' for fieldname in fieldnames):
                if has_header == 'augment':
                    fieldnames = [i if fieldname is None else fieldname for i, fieldname in enumerate(fieldnames)]
                else:
                    exit(1)
            assert len(set(fieldnames)) == len(fieldnames)
        else:
            fieldnames = range(num_cols)
        return [{fieldnames[i]: row[i] for i in range(num_cols)} for row in rows]

def rename_column(phenos, old_name, new_name):
    for pheno in phenos:
        assert new_name not in pheno
        pheno[new_name] = pheno[old_name]
        del pheno[old_name]

def keep_only_columns(phenos, good_keys):
    for pheno in phenos:
        for key in list(pheno):
            if key not in good_keys:
                del pheno[key]

def combine_columns(phenos, colnames_to_combine, new_colname):
    for pheno in phenos:
        assert new_colname not in pheno
        pheno[new_colname] = {k:pheno[k] for k in colnames_to_combine}
        for k in colnames_to_combine:
            del pheno[k]

class _hashabledict(dict):
  def __key(self):
    return tuple((k,self[k]) for k in sorted(self))
  def __hash__(self):
    return hash(self.__key())
  def __eq__(self, other):
    return self.__key() == other.__key()

def merge_in_info(phenos, more_info_rows):
    # TODO: do some special-casing for category_string and phewas_string, since we have to have exactly one of each.

    keys_that_cant_be_lists = {'category_string', 'phewas_string'}
    keys_to_add = {key for row in more_info_rows for key in row} - {key for row in phenos for key in row}
    keys_to_add_that_are_dicts = {key for key in keys_to_add if any(isinstance(row[key], dict) for row in more_info_rows)}
    for key in keys_to_add_that_are_dicts:
        assert all(isinstance(row[key], dict) for row in more_info_rows)

    phenos_by_pheno_code = {pheno['pheno_code']: pheno for pheno in phenos}
    for more_info_row in more_info_rows:
        pheno = phenos_by_pheno_code.get(more_info_row['pheno_code'], None)
        if pheno is not None:
            for key in more_info_row:
                if key in keys_that_cant_be_lists:
                    if key in pheno:
                        assert pheno[key] == more_info_row[key], (key, pheno, more_info_row)
                    else:
                        pheno[key] = more_info_row[key]
                elif key in keys_to_add:
                    if key in keys_to_add_that_are_dicts:
                        pheno.setdefault(key, set()).add(_hashabledict(more_info_row[key]))
                    else:
                        pheno.setdefault(key, set()).add(more_info_row[key])
                elif key in pheno:
                    assert pheno[key] == more_info_row[key]
                else:
                    print("wat?")

    keys_with_multiple_items = set(key for key in keys_to_add-keys_that_cant_be_lists if any(key not in pheno or len(pheno[key]) != 1 for pheno in phenos))

    for pheno in phenos:
        for key in keys_to_add:
            if key in keys_with_multiple_items:
                try:
                    pheno[key] = sorted(pheno[key])
                except:
                    pheno[key] = list(pheno.get(key, []))
            elif key not in keys_that_cant_be_lists:
                assert len(pheno[key]) == 1
                pheno[key] = next(iter(pheno[key]))


def check_that_all_phenos_have_keys(phenos, keys):
    failed = False
    for key in keys:
        phenos_missing_key = [pheno for pheno in phenos if key not in pheno]
        if phenos_missing_key:
            failed = True
            print("\nERROR: the key {} is required but {} phenotypes don't have it.".format(
                key, len(phenos_missing_key)))
            print("Here are the first few other phenotypes that are missing the key {}:".format(key))
            for pheno in phenos_missing_key[:10]:
                print(repr(pheno))
            print("Please consult the documentation on how to add more keys to phenotypes.")
    if failed:
        exit(1)

def save(phenos):
    phenos = sorted(phenos, key=lambda pheno: pheno['pheno_code'])
    with open(os.path.join(my_dir, 'phenos.json'), 'w') as f:
        json.dump(phenos, f, sort_keys=True, indent=0)

