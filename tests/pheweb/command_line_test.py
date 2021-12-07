# -*- coding: utf-8 -*-
"""
Test command line.

Test calling commands from the command line.
"""
import os
import tempfile

import pytest

from pheweb.command_line import run


def test_format_summary_file() -> None:
    """
    Test format summary file.

    @return: None
    """
    with tempfile.NamedTemporaryFile() as out_file:
        with tempfile.NamedTemporaryFile() as in_file:
            with pytest.raises(SystemExit) as pytest_wrapped_e:
                run(["format-summary-file", "--out-file", out_file.name, in_file.name])
            assert pytest_wrapped_e.type == SystemExit
            assert pytest_wrapped_e.value.code == os.EX_CONFIG
