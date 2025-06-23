import gzip
import os
import re
from pheweb.serve.data_access.db import Variant, optional_float
from pheweb.serve.data_access.db import AnnotationDB, ResultDB, TabixResultDao, TabixResultFiltDao, TabixResultCommonDao

# results_db_test.py
import unittest
from unittest.mock import Mock

mock_data =  os.getcwd()+ '/tests/mocked-data/mocked.tsv.gz'
mocked_columns = {'pheno': '#pheno', 'mlogp': 'mlogp', 'beta': 'beta', 'sebeta': 'sebeta', 'maf': 'af_alt', 'maf_cases': 'af_alt_cases', 'maf_controls': 'af_alt_controls'}


phenos = Mock(return_value=['test'])

def test_optional_float() -> None:
    """Test optional float.

    @return: None
    """
    assert optional_float(None) is None
    assert optional_float('NA') is None
    assert optional_float('') is None
    assert optional_float('1.0') == 1.0
    assert optional_float(1.0) == 1.0



class TestDBValidatedInterfacesImplemented(unittest.TestCase):
    
            
    def test_resultdb_interface_implemented(self):
        self.assertTrue(hasattr(ResultDB, 'get_single_variant_results'), "ResultDB should implement get_single_variant_results")
        self.assertTrue(hasattr(ResultDB, 'get_variant_results_range'), "ResultDB should implement get_variant_results_range")
        self.assertTrue(hasattr(ResultDB, 'get_top_per_pheno_variant_results_range'), "ResultDB should implement get_top_per_pheno_variant_results_range")
        self.assertTrue(hasattr(ResultDB, 'get_variants_results'), "ResultDB should implement get_variants_results")
        self.assertFalse(hasattr(ResultDB, 'not_implemented'), "ResultDB should not implement not_implemented")

    def test_tabixresults_interface_implemented(self):
        self.assertTrue(hasattr(TabixResultDao, 'get_single_variant_results'), "TabixResultDao should implement get_single_variant_results")
        self.assertTrue(hasattr(TabixResultDao, 'get_variant_results_range'), "TabixResultDao should implement get_variant_results_range")
        self.assertTrue(hasattr(TabixResultDao, 'get_top_per_pheno_variant_results_range'), "TabixResultDao should implement get_top_per_pheno_variant_results_range")
        self.assertTrue(hasattr(TabixResultDao, 'get_variants_results'), "TabixResultDao should implement get_variants_results")
        self.assertFalse(hasattr(TabixResultDao, 'not_implemented'), "TabixResultDao should not implement not_implemented")

    def test_tabixresultsfilt_interface_implemented(self):
        self.assertTrue(hasattr(TabixResultFiltDao, 'get_single_variant_results'), "TabixResultFiltDao should implement get_single_variant_results")
        self.assertTrue(hasattr(TabixResultFiltDao, 'get_variant_results_range'), "TabixResultFiltDao should implement get_variant_results_range")
        self.assertTrue(hasattr(TabixResultFiltDao, 'get_top_per_pheno_variant_results_range'), "TabixResultFiltDao should implement get_top_per_pheno_variant_results_range")
        self.assertTrue(hasattr(TabixResultFiltDao, 'get_variants_results'), "TabixResultFiltDao should implement get_variants_results")
        self.assertFalse(hasattr(TabixResultFiltDao, 'not_implemented'), "TabixResultFiltDao should not implement not_implemented")

    def test_tabixresultsfilt_interface_implemented(self):
        self.assertTrue(hasattr(TabixResultCommonDao, 'get_variant_columns_using_header'), "TabixResultCommonDao should implement get_variant_columns_using_header")
        self.assertTrue(hasattr(TabixResultCommonDao, 'get_variant_columns_using_header_offset'), "TabixResultCommonDao should implement get_variant_columns_using_header_offset")
        self.assertTrue(hasattr(TabixResultCommonDao, 'get_variant_common_columns'), "TabixResultCommonDao should implement get_variant_common_columns")
        self.assertTrue(hasattr(TabixResultCommonDao, 'get_common_pheno_results'), "TabixResultCommonDao should implement get_common_pheno_results")
        self.assertFalse(hasattr(TabixResultCommonDao, 'not_implemented'), "TabixResultCommonDao should not implement not_implemented")

    def test_annotationdb_interface_implemented(self):
        self.assertTrue(hasattr(AnnotationDB, 'add_variant_annotations'), "AnnotationDB should implement add_variant_annotations")
        self.assertTrue(hasattr(AnnotationDB, 'add_variant_annotations_range'), "AnnotationDB should implement add_variant_annotations_range")
        self.assertTrue(hasattr(AnnotationDB, 'add_single_variant_annotations'), "AnnotationDB should implement add_single_variant_annotations")
        self.assertTrue(hasattr(AnnotationDB, 'get_gene_functional_variant_annotations'), "AnnotationDB should implement get_gene_functional_variant_annotations")
        self.assertFalse(hasattr(AnnotationDB, 'not_implemented'), "AnnotationDB should not implement not_implemented")


class TestTabixResultDao(unittest.TestCase):
    def setUp(self):
        # Load resource (e.g., TSV, config, etc.)
        with gzip.open(mock_data, 'r') as f:
            self.data = f.read().splitlines()

    def test_get_single_variant_results(self):
        # Check subclassing
        print(self.data[0])
        tabix_results = TabixResultDao(phenos, mock_data, mocked_columns)
        split_query=re.split('-|:|/|_', '1:13668:G:A')
        variant = Variant(split_query[0], split_query[1], split_query[2], split_query[3])
        self.assertEqual(tabix_results.get_single_variant_results(variant), {})
    
    # def test_get_variants_results(self):
    #     # Check subclassing
    #     print(self.data[0])
    #     tabix_results = TabixResultDao(phenos, mock_data, mocked_columns)
    #     split_query=re.split('-|:|/|_', '1:13668:G:A')
    #     variant = Variant(split_query[0], split_query[1], split_query[2], split_query[3])
    #     self.assertIsNotNone(tabix_results.get_variants_results(variant), True)
    
    # def test_get_top_per_pheno_variant_results_range(self):
    #     # Check subclassing
    #     print(self.data[0])
    #     tabix_results = TabixResultDao(phenos, mock_data, mocked_columns)
    #     split_query=re.split('-|:|/|_', '1:13668:G:A')
    #     variant = Variant(split_query[0], split_query[1], split_query[2], split_query[3])
    #     self.assertIsNotNone(tabix_results.get_top_per_pheno_variant_results_range(variant), True)
    
    # def test_get_variant_results_range(self):
    #     # Check subclassing
    #     print(self.data[0])
    #     tabix_results = TabixResultDao(phenos, mock_data, mocked_columns)
    #     split_query=re.split('-|:|/|_', '1:13668:G:A')
    #     variant = Variant(split_query[0], split_query[1], split_query[2], split_query[3])
    #     self.assertIsNotNone(tabix_results.get_variant_results_range(variant), True)


if __name__ == '__main__':
    unittest.main()