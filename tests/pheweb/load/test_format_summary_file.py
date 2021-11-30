from pheweb.load.format_summary_file import run
import os


def test_run():
    assert run([]) == os.EX_OK
