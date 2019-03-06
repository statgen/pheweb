"""
Tests for the Table of Correlated Phenotypes feature

Verifies that the sample file is correctly combined with phenotype information
"""
import os
import shutil


import pytest

from pheweb.load import pheno_correlation
from pheweb import weetabix


# Simplified files for testing purposes
CORREL_FILE = os.path.join(os.path.dirname(__file__), 'input_files/correlations/rg-pipeline-output.txt')
PHENOLIST = os.path.join(os.path.dirname(__file__), 'input_files/correlations/pheno-list.json')


@pytest.fixture(scope='module')
def sample_data(tmpdir_factory):
    """Index a test file"""
    fn = tmpdir_factory.getbasetemp() / 'sample.txt'
    shutil.copy(CORREL_FILE, fn)
    return fn


@pytest.fixture(scope='module')
def annotated_sample(sample_data):
    output_fn = str(sample_data) + '.out'
    pheno_correlation.main(sample_data, output_fn, phenolist_path=PHENOLIST)
    return output_fn


def test_phenos_are_annotated(annotated_sample):
    raw_file_cols = 7
    with open(annotated_sample, 'r') as f:
        num_cols = len(f.readline().strip().split('\t'))
    assert num_cols == (raw_file_cols + 1), 'Processed file has one extra column'


def test_new_column_contains_trait2_descriptions(annotated_sample):
    with open(annotated_sample, 'r') as f:
        next(f)
        labels = [line.strip().split('\t')[-1] for line in f]

    expected = ['Septicemia', '041.4', 'Ileostomy status', 'Diverticulosis', 'Bacterial enteritis']
    assert expected == labels, "Labels correspond to trait 2: phenostring if possible, else phenocode"


def test_phenos_are_indexed(annotated_sample):
    expected_fn = weetabix._index_name(annotated_sample)
    assert os.path.isfile(expected_fn)


def test_unknown_phenocodes_get_dropped_from_annotated_file(sample_data, annotated_sample):
    # 1 unknown pheno, so annotated file should have one less line
    with open(sample_data, 'r') as raw, open(annotated_sample, 'r') as proc:
        c1 = raw.readlines()
        c2 = proc.readlines()

    assert (len(c1) - 1) == len(c2), 'Annotated file has one less line, due to omitted phenotype'
