# -*- coding: utf-8 -*-
from pheweb.serve.data_access.variant_phenotype import merge_dictionary

def test_parse_variant_trivial() -> None:
    acc = {}
    assert merge_dictionary(acc,{}) is None    
    assert acc == {}

def test_parse_variant_trivial() -> None:    
    acc = { "a" : { 1 : 2 } }
    value = { "a" : { 3 : 4 } }
    expected = { "a" : { 1 : 2 , 3 : 4 } }
    assert merge_dictionary(acc,value) is None
    assert acc == expected
