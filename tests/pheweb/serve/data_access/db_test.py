import pytest

from pheweb.serve.data_access.db import optional_float

def test_optional_float() -> None:
    """Test optional float.

    @return: None
    """
    assert optional_float(None) is None
    assert optional_float('NA') is None
    assert optional_float('') is None
    assert optional_float('1.0') == 1.0
    assert optional_float(1.0) == 1.0

