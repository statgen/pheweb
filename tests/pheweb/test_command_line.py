from pheweb.command_line import run


def test_format_summary_file():
    assert run(["format-summary-file"]) is None
