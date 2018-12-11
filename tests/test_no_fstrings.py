
def test_no_fstrings():
    from pathlib import Path
    import ast
    py_paths = list((Path().absolute().parent / 'kpa').rglob('*.py'))
    for py_path in py_paths:
        parsed = ast.parse(py_path.read_text())
        for node in ast.walk(parsed):
            assert not isinstance(node, ast.FormattedValue), (py_path, node.lineno)
