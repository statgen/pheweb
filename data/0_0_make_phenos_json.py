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

import phenos_json_utils


# TODO: put regex right here?
phenos = list(phenos_json_utils.get_phenos_with_regex())
print('Done with globbing.')

phenos_json_utils.check_that_pheno_code_is_urlsafe(phenos)

phenos_json_utils.extract_info_from_input_files(phenos)

if hasattr(conf, 'minimum_num_cases'):
    phenos = phenos_json_utils.filter_phenos(phenos, lambda pheno: pheno.get('num_controls', float('inf')) > conf.minimum_num_cases, 'num_case_filter')
if hasattr(conf, 'minimum_num_samples'):
    phenos = phenos_json_utils.filter_phenos(phenos, lambda pheno: pheno.get('num_controls', float('inf')) > conf.minimum_num_samples, 'num_samples_filter')
if hasattr(conf, 'minimum_num_controls'):
    phenos = phenos_json_utils.filter_phenos(phenos, lambda pheno: pheno.get('num_controls', float('inf')) > conf.minimum_num_controls, 'num_control_filter')

phenos_json_utils.hide_small_numbers_of_samples(phenos)

more_info = phenos_json_utils.read_file(os.path.join(my_dir, '../unnecessary_things/DbDescription_IV.xlsx'), has_header=False)
phenos_json_utils.keep_only_columns(more_info, [0, 1, 4])
phenos_json_utils.rename_column(more_info, 0, 'category_string')
phenos_json_utils.rename_column(more_info, 1, 'pheno_code')
phenos_json_utils.rename_column(more_info, 4, 'phewas_string')
print(more_info[:3])
phenos_json_utils.merge_in_info(phenos, more_info)

required_keys = ['category_string', 'phewas_string']
phenos_json_utils.check_that_all_phenos_have_keys(phenos, required_keys)

phenos_json_utils.save(phenos)
