from unittest.mock import patch
from pheweb.command_line import run
import tempfile
import os


@patch("pheweb.load.format_summary_file.log_error")
def test_format_summary_file(mock_log_error):
    with tempfile.NamedTemporaryFile() as out_file:
        with tempfile.NamedTemporaryFile() as in_file:
            assert run(["format-summary-file", "--out-file", out_file.name, in_file.name]) is None
