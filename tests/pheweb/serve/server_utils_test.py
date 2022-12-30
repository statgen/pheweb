# -*- coding: utf-8 -*-
from pheweb.serve.server_utils import parse_variant

def test_parse_variant() -> None:
    assert  ('2', 0, None, None) == parse_variant('2')
    assert  ('9', 0, None, None) == parse_variant('9')
    assert  ('X', 0, None, None) == parse_variant('X')
    assert  ('X', 0, None, None) == parse_variant('XE') # this is bad, it should fail
