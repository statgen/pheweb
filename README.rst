How to Build a PheWeb for your Data
===================================

Loading data into a new PheWeb is done in four steps, followed by two steps of polishing.
Hopefully only steps 1 and 2 will take much effort.
If steps 3 or 4 give you any trouble, please email me at <pjvh@umich.edu> and I'll see what I can do to improve things.
And steps 5 and 6 should only be as difficult as you want them to be.

1. Install PheWeb
-----------------

1) Run ``pip2 install pheweb``.

   If you get an error about permissions, try ``pip2 install --user pheweb``.

   If that doesn't work, make a python2 virtualenv.
   If you don't have virtualenv installed, follow the directions `here`__.
   Use these commands to make a virtualenv and activate a virtualenv:

   __ https://virtualenv.pypa.io/en/stable/installation/

   .. code:: bash

      virtualenv --python=python2.7 ~/venv-python2 # Choose a path you like.
      ~/venv-python2/bin/activate

#) Make a data directory.  It should be in a location where you can afford to store twice as much data as the size of your input files.

#) In your data directory, make a file ``config.py``.  Options you can set:

   - ``minimum_maf``: any variant that has at least this minor allele frequency in some phenotype will be shown. (default: ``minimum_maf = 0``)
   - ``cache``: a directory where files used by all datasets can be stored.  If you don't want one, set `cache = False`.  (default: ``cache = "~/.pheweb/cache/"``)

#) Make sure you have tabix, bgzip, wget, and g++ and that they are on your ``$PATH``.  If you can't just run ``tabix``, ``bgzip``, ``wget``, and ``g++``, find a way to install them.

   - on macOS, you can install ``wget`` and ``htslib`` (which includes ``tabix`` and ``bgzip``) with `homebrew`__.
   - on linux, either use a system package manager or `linuxbrew`__.
   - if they aren't in your ``$PATH``, you can set ``tabix_path``, ``bgzip_path``, ``wget_path``, ``gxx_path`` in ``config.py``.

__ http://brew.sh/
__ http://linuxbrew.sh/

2. Prepare your association files
---------------------------------

You should have one file for each phenotype.  It can be gzipped if you want.  It should be tab-delimited and have a header row.  Variants must be sorted by chromosome and position, with chromosomes in the order [1-22,X,Y,MT].

Note: If you are using EPACTS, your files should work just fine.  If they don't, email me.  EPACTS files won't have ``REF`` or ``ALT``, but PheWeb will parse their ``MARKER_ID`` column to get those.

The file must have columns for:

- chromosome
    - named ``#CHROM`` or ``CHROM`` (all column are not case-sensitive)
    - must be a number between 1 and 22 or ``X`` or ``Y`` or ``M`` or ``MT``
- position
    - named ``POS``, ``BEG``, or ``BEGIN``
    - must be an integer
- reference allele
    - named ``REF``
- alternate allele
    - named ``ALT``
- minor allele frequency
    - named ``MAF``
    - must be a real number between 0 and 1 (numbers may be in scientific notation, like ``5.4e-12``)
- p-value
    - named ``PVAL`` or ``PVALUE``
    - must be decimal number between 0 and 1 or ``.`` or ``NA`` (both representing unknown)

You may also have columns for:

- effect size
    - named ``BETA``
    - must be a real number
- standard error of effect size
    - named ``SEBETA``
    - must be a real number

If you need Odds Ratio, I can add that.


3. Make a list of your phenotypes
---------------------------------

Inside of your data directory, you need to end up with a file named ``pheno-list.json`` that looks like this:

.. code:: json
   [
    {
     "assoc_files": ["/home/watman/ear-length.epacts.gz"],
     "phenocode": "ear-length"
    },
    {
     "assoc_files": ["/home/watman/eats-kimchi.X.epacts.gz","/home/watman/eats-kimchi.autosomal.epacts.gz"],
     "phenocode": "eats-kimchi"
    },
    ...
   ]

``phenocode`` must only contain letters, numbers, or any of ``_-~``.

That example file only includes the columns ``assoc_files`` (a list of paths) and ``phenocode`` (any string that works in a URL).  If you want, you can also include:

- ``phenostring``: a string that is more descriptive than ``phenocode`` and will be shown in several places
- ``category``: a string that will group together phenotypes in the PheWAS plot and also be shown in several places
- ``num_cases``, ``num_controls``, and/or ``num_samples``: numbers of strings which will be shown in several places
- anything else you want, but you'll have to modify templates to show it.

There are four ways to make a ``pheno-list.json``:

1. If you have a csv (or tsv, optionally gzipped) with a header that has EXACTLY the right column names, just import it by running ``./phenolist.py import-phenolist "/path/to/my/pheno-list.csv"``.

   If you have multiple association files for each phenotype, you may put them all into a single column with ``|`` between them.

   For example, your file ``pheno-list.csv`` might look like this::

      phenocode,assoc_files
      eats-kimchi,/home/watman/eats-kimchi.autosomal.epacts.gz|/home/watman/eats-kimchi.X.epacts.gz
      ear-length,/home/watman/ear-length.all.epacts.gz

2. If you have one association file per phenotype, you can use a shell-glob and a regex to get assoc-files and phenocodes for them.

   Suppose that your assocation files are at paths like:

   - ``/home/watman/eats-kimchi.epacts.gz``
   - ``/home/watman/ear-length.epacts.gz``

   Then you could run ``./phenolist.py glob-files "/home/watman/*.epacts.gz"`` to get ``assoc-files``.

   To get ``phenocodes``, you can use a regex that captures the phenocode from the file path.  In this example, ``./phenolist.py extract-phenocode-from-fname '^/home/watman/(.*).epacts.gz$'`` would work.

3. If you have multiple association files for some phenotypes, you can follow the directions in 2and then run ``./phenolist unique-phenocode``.

   For example, if your association files are at:

   - ``/home/watman/autosomal/eats-kimchi.epacts.gz``
   - ``/home/watman/X/eats-kimchi.epacts.gz``
   - ``/home/watman/all/ear-length.epacts.gz``

   then you can run::

     ./phenolist.py glob-files "/home/watman/*/*.epacts.gz"
     ./phenolist.py extract-phenocode-from-fname '^/home/watman/(.*).epacts.gz$'
     ./phenolist.py unique-phenocode

4. If you want to do more advanced things, like merging in more information from another file, email <pjvh@umich.edu> and I'll write documentation for ``./phenolist.py``.

No matter what you do, please run ``./phenolist.py verify`` when you are done to check that it worked correctly.  At any point, you may run ``./phenolist.py view`` to view the current file.


4. Load your association files
------------------------------

0) If you only want variants that reach some minimum MAF, then set ``minimum_maf`` in ``config.py``.
   Any variant that has at least that minor allele frequency (MAF) will be shown on the website, no matter what.
   If a variant has a smaller MAF (in some phenotype), it will still be shown if it has a large enough MAF in some other phenotype.

1) Run ``./run_all.sh``.

2) If something breaks, read the error message.  Then,

   - If you can understand the error message, modify ``data/input_file_parsers/epacts.py`` to handle your file type.
     If the modification is something that pheweb should support by default, please email your changes to <pjvh@umich.edu>.

   - If you can't understand the error message, please email your error message to <pjvh@umich.edu> and hopefully I get back to you quickly.

   Then re-run ``./run_all.sh``.


5. Run a simple server to check that everything loaded correctly
--------------------------

Run ``./server.py``.

If port 5000 is already taken, choose a different port (for example, 5432) and run ``./server.py --port 5432`` instead.

Next you need to find a way to for your computer to access the server.  You have two options:

A. Run Flask exposed to anybody on the internet.  This might be dangerous, but I never worry much about it.

   You need a port that can get through your firewall. 80 or 5000 probably work, though 80 will require you to run ``sudo ./server.py --port 80``.

   You need an IP adddress or hostname that refers to your server.  If you ssh into your server with ``ssh watman@foobar.example.com``, this is ``foobar.example.com``.
   If you don't know this, run ``curl http://httpbin.org/ip`` on your server to get its IP address.  (If it returns something like ``"origin": "12.34.5.678"``, your server's IP is ``12.34.5.678``).

   Now run ``./server.py --port <myport> --host <myhost>``.
   For example, if you're using the default port (5000), and ``curl http://httpbin.org/ip`` return ``"origin": "12.34.5.678"``, then run ``./server.py --port 5000 --host 12.34.5.678``.

   When the server starts, it should say something like ``Running on http://12.34.5.678:5000/ (Press CTRL+C to quit)``.  Open that URL in the web browser on your computer.

B. Run Flask with the default settings, then use an SSH tunnel to connect to it from your computer.

   For example, if you normally ssh in with ``ssh watman@foobar.example.com``, then the command you should run (from your local computer) is ``ssh -N -L localhost:5000:localhost:5000 watman@foobar.example.com``.  Now open <http://localhost:5000> in your web browser.


6. Modify templates if necessary.
------

The templates that you might want to modify are:

- ``templates/about.html``
- ``templates/index.html``
- the tooltip template in ``templates/pheno.html``
- the tooltip template and ``fields`` in ``static/region.js``.

As you modify templates, you might have to kill and restart your development server for the changes to take effect.  Or maybe not.  Who knows.


7. Use a real webserver.
-------

At this point your PheWeb should be working how you want it to, and everything should be good except maybe the URL you're using.

For maximum speed and safety, you should switch to running Flask behind something like Apache2 or Nginx.
More information about this is `here`__.
If you choose Apache2, I have some documentation for you `here`__.

__ http://flask.pocoo.org/docs/0.11/deploying/#deployment
__ https://github.com/statgen/pheweb/tree/master/unnecessary_things/other_documentation/running_with_apache2