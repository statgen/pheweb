from pheweb.serve.data_access.drug_db import nvl_attribute, copy_attribute


def test_nvl_attribute():
    assert nvl_attribute('name', None, 1) == 1
    assert nvl_attribute('name', {}, 1) == 1
    assert nvl_attribute('name', {'name': 2}, 1) == 2


def test_copy_attribute():
    assert copy_attribute('name', None, None) is None
    assert copy_attribute('name', {}, None) is None
    assert copy_attribute('name', {}, {}) is None
    assert copy_attribute('name', {'name': 1}, {}) == 1
