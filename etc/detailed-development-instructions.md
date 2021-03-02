## Detailed development instructions

This document contains information useful for those looking to modify and develop the PheWeb source code. 
It requires some familiarity with Python and terminal.

### Installing PheWeb
In order to reflect code changes as you work, PheWeb should be installed in "editable" mode.

1. Clone the repository to a new folder.
2. Create and active a new virtual environment. For example, in the checked-out PheWeb directory: `python3 -m venv .venv && source .venv/bin/activate` (if you prefer to manage your virtualenv some other way, that is ok)
3. With the virtualenv activated, install the package in "editable" mode: `pip3 install -e .`
4. When complete, verify that PheWeb is installed and working correctly: `pheweb -h`

### Running static analysis

You can do simple static analysis by running `./etc/pre-commit`.  It requires `pip3 install flake8 mypy`. If it is broken, it might not be a problem, but it can be a good way to catch bugs.

### Running the unit tests
The tests take a minute or two. PheWeb loads a sample dataset, runs a local server, and then queries some pages on that server.  It doesn't test everything in PheWeb, but it gets most of it.

`pytest`


### Running a local server with sample data
Run `./tests/run-all.sh`, and then open <http://localhost:5000/> to view your site.  

This uses the same data as the unit tests to serve a website you can browse.

The homepage links to some good pages.  Most of the other pages aren't very useful because the data is so sparse.

If you are only modifying the server code, you can quickly re-run just `pheweb serve` without re-running all the loading steps.  Use the line like `+ pheweb conf ... serve` that is printed to your console.

