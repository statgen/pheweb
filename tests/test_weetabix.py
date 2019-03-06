"""Test simple tabixing of files"""

import os
import pickle
import shutil

import pytest

from pheweb import weetabix


FIXTURE = os.path.join(os.path.dirname(__file__), 'input_files/correlations/rg-pipeline-output.txt')


@pytest.fixture(scope='session')
def sample_data(tmpdir_factory):
    """Index a test file"""
    fn = tmpdir_factory.getbasetemp() / 'sample.txt'
    shutil.copy(FIXTURE, fn)

    weetabix.make_byte_index(fn, 1, skip_lines=1)
    return fn


def test_generates_index_in_default_location(sample_data):
    expected_fn = weetabix._index_name(sample_data)
    assert os.path.isfile(expected_fn), "Index file was created"


def test_index_has_all_column_values(sample_data):
    index_fn = weetabix._index_name(sample_data)

    with open(index_fn, 'rb') as f:
        contents = pickle.load(f)

    keys = contents.keys()
    assert len(keys) == 3, 'has expected number of keys'
    assert set(keys) == {'008', '008.5', '038'}, 'has correct set of unique keys'


def test_gets_correct_number_of_lines_for_each_key(sample_data):
    expected = (
        ('008', 1),
        ('008.5', 2),
        ('038', 3)
    )

    for k, count in expected:
        rows = weetabix.get_indexed_rows(sample_data, k)
        assert len(rows) == count, 'found expected number of rows for key {}'.format(k)


def test_fetches_line_content_for_key(sample_data):
    expected = ['008	038	-0.5524	1.5359	-0.3597	0.7191	ldsc']
    rows = weetabix.get_indexed_rows(sample_data, '008')
    assert rows == expected, 'returned expected row content'


def test_strict_mode_fails_if_key_not_in_index(sample_data):
    with pytest.raises(KeyError):
        weetabix.get_indexed_rows(sample_data, 'not_a_key', strict=True)
