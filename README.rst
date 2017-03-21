How to Build a PheWeb for your Data
===================================

If any of these steps is incorrect, please email me at pjvh@umich.edu
and I'll see what I can do to improve things.


Quickstart
----------

If everything goes well, you should be able to build a PheWeb with the
following commands:

.. code:: bash

   pip3 install git+https://github.com/statgen/pheweb.git
   mkdir ~/my-new-pheweb && cd ~/my-new-pheweb
   pheweb phenolist glob --simple-phenocode /data/my-analysis/*/*.epacts.gz
   pheweb process-assoc-files
   pheweb serve --port 5000
   # open http://localhost:5000 in your web browser

Here are more detailed instructions:


1. Install PheWeb
-----------------

1) Run ``pip3 install git+https://github.com/statgen/pheweb.git``.

   -  If that doesn't work, use a virtualenv like this:

      .. code:: bash

         python3 -m venv ~/venv3 # Choose whatever path you like.
         ~/venv3/bin/activate
         pip3 install git+https://github.com/statgen/pheweb.git

2) Make a data directory. It should be in a location where you can
   afford to store twice as much data as the size of your input files.

   -  All ``pheweb ...`` commands should be run while in this directory.
      Alternatively, you may set the environment variable
      ``PHEWEB_DATADIR="/path/to/data/dir``.

3) In your data directory, make a file ``config.py`` if you want to
   configure any options. Some options you can set:

   -  ``minimum_maf``: any variant that has at least this minor allele
      frequency in some phenotype will be shown. (default:
      ``minimum_maf = 0``)
   -  ``cache``: a directory where files common to all datasets can be
      stored. If you don't want one, set ``cache = False``. (default:
      ``cache = "~/.pheweb/cache/"``)

4) Make sure you have tabix, bgzip, wget, and g++.  If you can't
   just run ``tabix``, ``bgzip``, ``wget``, and ``g++`` from the
   command line, find a way to install them or add them to your
   ``$PATH``.

   -  on macOS, run ``xcode-select --install`` to install XCode,
      install `homebrew <http://brew.sh>`__, and run
      ``brew install htslib wget``.
   -  on Ubuntu, run ``apt-get install tabix g++``.  If you don't have
      permissions, you can install `linuxbrew <http://linuxbrew.sh>`__
      and run ``brew install htslib``.

2. Prepare your association files
---------------------------------

You should have one file for each phenotype. It can be gzipped if you
want. It should be tab-delimited and have a header row. Variants must be
sorted by chromosome and position, with chromosomes in the order
[1-22,X,Y,MT].

-  If you are using EPACTS, your files should work just fine. If they
   don't, email me. EPACTS files won't have ``REF`` or ``ALT``, but
   PheWeb will parse their ``MARKER_ID`` column to get those.

The file must have columns for:

-  

   chromosome
       -  named ``#CHROM`` or ``CHROM`` (all column names are not
          case-sensitive)
       -  must be a number between 1 and 22 or ``X`` or ``Y`` or ``M``
          or ``MT``

-  

   position
       -  named ``POS``, ``BEG``, or ``BEGIN``
       -  must be an integer

-  

   reference allele
       -  named ``REF``

-  

   alternate allele
       -  named ``ALT``

-  

   minor allele frequency
       -  named ``MAF``
       -  must be a real number between 0 and 1 (numbers may be in
          scientific notation, like ``5.4e-12``)

-  

   p-value
       -  named ``PVAL`` or ``PVALUE``
       -  must be decimal number between 0 and 1 or ``.`` or ``NA``
          (both representing unknown)

You may also have columns for:

-  

   effect size
       -  named ``BETA``
       -  must be a real number

-  

   standard error of effect size
       -  named ``SEBETA``
       -  must be a real number

If you need Odds Ratio, I can add that.

3. Make a list of your phenotypes
---------------------------------

Inside of your data directory, you need a file named ``pheno-list.json``
that looks like this:

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

That example file only includes the columns ``assoc_files`` (a list of
paths to association files) and ``phenocode`` (a string representing
your phenotype that is valid in a URL). If you want, you can also
include:

-  ``phenostring``: a string that is more descriptive than ``phenocode``
   and will be shown in several places
-  ``category``: a string that will group together phenotypes in the
   PheWAS plot and also be shown in several places
-  ``num_cases``, ``num_controls``, and/or ``num_samples``: numbers of
   strings which will be shown in several places
-  anything else you want, but you'll have to modify templates to show
   it.

There are four ways to make a ``pheno-list.json``:

1. If you have a csv (or tsv, optionally gzipped) with a header that has
   EXACTLY the right column names, just import it by running
   ``pheweb phenolist import-phenolist "/path/to/my/pheno-list.csv"``.

   If you have multiple association files for each phenotype, you may
   put them all into a single column with ``|`` between them.

   For example, your file ``pheno-list.csv`` might look like this:

   ::

       phenocode,assoc_files
       eats-kimchi,/home/watman/eats-kimchi.autosomal.epacts.gz|/home/watman/eats-kimchi.X.epacts.gz
       ear-length,/home/watman/ear-length.all.epacts.gz

2. If you have one association file per phenotype, you can use a
   shell-glob and a regex to get assoc-files and phenocodes for them.

   Suppose that your assocation files are at paths like:

   -  ``/home/watman/eats-kimchi.epacts.gz``
   -  ``/home/watman/ear-length.epacts.gz``

   Then you could run
   ``pheweb phenolist glob-files "/home/watman/*.epacts.gz"`` to get
   ``assoc-files``.

   To get ``phenocodes``, you can use a regex that captures the
   phenocode from the file path. In most cases (including this one),
   just use:

   ::

       pheweb phenolist extract-phenocode-from-fname --simple

3. If you have multiple association files for some phenotypes, you can
   follow the directions in 2 and then run
   ``pheweb phenolist unique-phenocode``.

   For example, if your association files are at:

   -  ``/home/watman/autosomal/eats-kimchi.epacts.gz``
   -  ``/home/watman/X/eats-kimchi.epacts.gz``
   -  ``/home/watman/all/ear-length.epacts.gz``

   then you can run:

   ::

       pheweb phenolist glob-files "/home/watman/*/*.epacts.gz"
       pheweb phenolist extract-phenocode-from-fname --simple
       pheweb phenolist unique-phenocode

4. If you want to do more advanced things, like merging in more
   information from another file, email pjvh@umich.edu and I'll write
   documentation for ``pheweb phenolist``.

No matter what you do, please run ``pheweb phenolist verify`` when you
are done to check that it worked correctly. At any point, you may run
``pheweb phenolist view`` or ``pheweb phenolist print-as-csv`` to view
the current file.

4. Load your association files
------------------------------

1) Run ``pheweb process-assoc-files``.
2) If something breaks, read the error message.

   -  If you can understand the error message, modify your input files
      to avoid it.
   -  If the problem is something that PheWeb should support by default,
      feel free to email it to me at pjvh@umich.edu.
   -  If you can't understand the error message, please email your error
      message to pjvh@umich.edu and hopefully I can get back to you
      quickly.

   Then re-run ``pheweb process-assoc-files``.

5. Run a simple server to check that everything loaded correctly
----------------------------------------------------------------

Run ``pheweb serve``.

-  If port 5000 is already taken, choose a different port (for example,
   5432) and run ``pheweb serve --port 5432`` instead.

Next you need to find a way to for your computer to access the server.
You have two options:

A. Run PheWeb exposed to anybody on the internet. This might be
   dangerous, but I never worry much about it.

   You need a port that can get through your firewall. 80 or 5000
   probably work, though 80 will require you to run something like
   ``sudo $(which python3) $(which pheweb) serve --port 80``.

   Find an IP adddress or hostname that refers to your server. If you
   ssh into your server with ``ssh watman@foobar.example.com``, this is
   ``foobar.example.com``. If you don't know this, run
   ``curl http://httpbin.org/ip`` on your server to get its IP address.
   (If it returns something like ``"origin": "12.34.5.678"``, your
   server's IP is ``12.34.5.678``).

   Now run ``pheweb serve --port <myport> --host <myhost>``. For
   example, if you're using the default port (5000), and
   ``curl http://httpbin.org/ip`` returns ``"origin": "12.34.5.678"``,
   then run ``pheweb serve --port 5000 --host 12.34.5.678``.

   When the server starts, it should say something like
   ``Running on http://12.34.5.678:5000/ (Press CTRL+C to quit)``. Open
   that URL in the web browser on your computer.

B. Run PheWeb with the default settings, then use an SSH tunnel to
   connect to it from your computer.

   For example, if you normally ssh in with
   ``ssh watman@foobar.example.com``, then the command you should run
   (from your local computer) is
   ``ssh -N -L localhost:5000:localhost:5000 watman@foobar.example.com``.
   Now open `http://localhost:5000 <http://localhost:5000>`__ in your
   web browser.

6. Use a real webserver.
------------------------

At this point your PheWeb should be working how you want it to, and
everything should be good except maybe the URL you're using.

To start, run Flask behind gunicorn.  To do that, run ``pheweb make-wsgi``,
to produce a file ``wsgi.py``.  Then you can run
``gunicorn -b 0.0.0.0:5000 -w4 wsgi``, to start a webserver.

For maximum speed and safety, you should run gunicorn behind
something like Apache2 or Nginx. More information about this is
`here <http://flask.pocoo.org/docs/0.12/deploying/wsgi-standalone/#gunicorn>`__.
If you choose Apache2, I have some documentation for you
`here <https://github.com/statgen/pheweb/tree/master/unnecessary_things/other_documentation/running_with_apache2>`__.
