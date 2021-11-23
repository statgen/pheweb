from pheweb.conf_utils import get_field_parser, validate_fields
import pytest

def test_get_field_parser():
    """ this is depdendent on the defaults"""
    assert get_field_parser("chrom")("1") == "1"
    assert get_field_parser("pos")("1") == 1
    with pytest.raises(KeyError):
        get_field_parser("no such field by this name", strict_schema = True)
    get_field_parser("no such field by this name", strict_schema=False)(1) == 1
    assert get_field_parser("pos",False)("1") == 1

def test_validate_fields():
    validate_fields([]) == False
    validate_fields(["a"]) == False
    validate_fields(["pos"]) == True
