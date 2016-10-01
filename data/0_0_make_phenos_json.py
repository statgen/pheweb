#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

# Load config
import os.path
import imp
my_dir = os.path.dirname(os.path.abspath(__file__))
conf = imp.load_source('conf', os.path.join(my_dir, '../config.config'))

# Load utils
utils = imp.load_source('utils', os.path.join(my_dir, '../utils.py'))

# Activate virtualenv
utils.activate_virtualenv(os.path.join(conf.virtualenv_dir, 'bin/activate_this.py'))


import glob
import re
import json
import gzip
import collections
import string
import csv


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
phenos = list(get_phenos_with_regex())
print('Done with globbing.')


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


# Extract some information from each phenotype's input file(s).
input_file_parser = imp.load_source('input_file_parser', os.path.join(my_dir, 'input_file_parsers/{}.py'.format(conf.source_file_parser)))
for pheno in phenos:
    pheno.update(input_file_parser.get_pheno_info(pheno['src_filename']))
    print('get_pheno_info({!r})'.format(pheno['src_filename']))


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
if hasattr(conf, 'minimum_num_cases'):
    phenos = filter_phenos(phenos, lambda pheno: pheno.get('num_controls', float('inf')) > conf.minimum_num_cases, 'num_case_filter')
if hasattr(conf, 'minimum_num_samples'):
    phenos = filter_phenos(phenos, lambda pheno: pheno.get('num_controls', float('inf')) > conf.minimum_num_samples, 'num_samples_filter')
if hasattr(conf, 'minimum_num_controls'):
    phenos = filter_phenos(phenos, lambda pheno: pheno.get('num_controls', float('inf')) > conf.minimum_num_controls, 'num_control_filter')


# Hide small numbers of cases for identifiability reasons.
for pheno in phenos:
    for key in ['num_cases', 'num_controls', 'num_samples']:
        if key in pheno and pheno[key] < 50:
            pheno[key] = '<50'


# TODO: let's not switch to this format until later, or maybe never.
phenos_by_phewas_code = {pheno['pheno_code']: pheno for pheno in phenos}
for pheno in phenos_by_phewas_code.values():
    del pheno['pheno_code']


if hasattr(conf, 'use_vanderbilt_phewas_icd9s_and_categories'):
    # Load icd9 info, category_string, and phewas_string for each phewas_code.
    for pheno in phenos:
        pheno['icd9s'] = []
    pheno_and_icd9_filename = os.path.join(my_dir, 'PheWAS_code_translation_v1_2.txt')
    with open(pheno_and_icd9_filename) as f:
        for icd9 in csv.DictReader(f, delimiter='\t'):

            pheno = phenos_by_phewas_code.get(icd9['phewas_code'], None)
            if pheno is not None:
                pheno['icd9s'].append({
                    'icd9_code': icd9['icd9'],
                    'icd9_string': icd9['icd9_string'],
                })

                if 'phewas_string' not in pheno:
                    pheno['phewas_string'] = icd9['phewas_string']
                else:
                    assert pheno['phewas_string'] == icd9['phewas_string']

                if 'category_string' not in pheno:
                    pheno['category_string'] = icd9['category_string']
                else:
                    assert pheno['category_string'] == icd9['category_string']

    for pheno in phenos:
        assert len(pheno['icd9s']) > 0


if hasattr(conf, 'no_category_string'):
    for pheno in phenos:
        pheno['category_string'] = ''


required_keys = ['category_string']
if any('phewas_string' in pheno for pheno in phenos):
    required_keys.append('phewas_string')
for required_key in required_keys:
    for pheno in phenos:
        if required_key not in pheno:
            print("\nWARNING: pheno {} doesn't have a {}.".format(pheno['pheno_code'], required_key))
            print("Other phenotypes might be missing '{}' as well.".format(required_key))
            if conf.use_vanderbilt_phewas_icd9s_and_categories:
                raise Exception("I have no idea how this could have happened")
            else:
                print("Please add the key '{}' to each phenotype in 'phenos.json' manually.".format(required_key))
                print("If you don't, things will probably break sooner or later.")
                break

with open('phenos.json', 'w') as f:
    json.dump(phenos_by_phewas_code, f, sort_keys=True, indent=0)
