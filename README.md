## How to Build a Pheweb for your Data

Loading data into a new Pheweb is done in four steps, followed by two steps of polishing.
Hopefully only steps 1 and 2 will take much effort.
If steps 3 or 4 give you any trouble, please email me at <pjvh@umich.edu> and I'll see what I can do to improve things.
And steps 5 and 6 should only be as difficult as you want them to be.

### 1. Prepare the environment.

1. Download this repo into a folder.  Go to the place you want it to be stored and run `git clone https://github.com/statgen/pheweb.git`.

2. Make a data directory.  It should be in a location where you can afford to store twice as much data as the size of your input files.
   If you don't have read/write access to it, most of the commands you run later will need to start with `sudo `.

3. Make a python2 virtualenv.  If you don't have `virtualenv` installed, follow the directions [here](https://virtualenv.pypa.io/en/stable/installation/).
   Use these commands to make a virtualenv and install the packages we need:

    ```
    virtualenv --python=python2.7 /path/to/my/new/venv # Choose a path you like.
    /path/to/my/new/venv/bin/activate
    pip install -r requirement.txt # the `requirements.txt` in this repository.
    ```

4. Make sure you have tabix and bgzip.  If you can't just run `tabix` and `bgzip`, then either install them or find paths to those commands that work.

5. Put all of this information in `config.config`.  Just Read The Instructions in `config.config` for how to do this.


### 2. Make a list of your phenotypes

Inside of your data directory, you need to end up with a file named `pheno-list.json` that looks like this:

```
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
```

That example file only include the columns `assoc_files` (a list of paths) and `phenocode` (any string that works in a URL).  You may also optionally include:

- `phenostring`: a string that is more descriptive than `phenocode` and will be shown in several places
- `category`: a string that will group together phenotypes in the PheWAS plot and also be shown in several places
- `num_cases`, `num_controls`, and/or `num_samples`: numbers of strings which will be shown in several places
- anything else you want, but you'll have to modify templates to show it.

There are three ways to make that file:

- (A) If you have a csv (or tsv, optionally gzipped) with a header that has EXACTLY the right column names, just import it by running `./phenolist.py "/path/to/my/pheno-list.csv"`.

  If you have multiple association files for each phenotype, you may put them all into a single column with `|` between them.

  For example, your file `pheno-list.csv` might look like this:

  ```
  phenocode,assoc_files
  eats-kimchi,/home/watman/eats-kimchi.autosomal.epacts.gz|/home/watman/eats-kimchi.X.epacts.gz
  ear-length,/home/watman/ear-length.all.epacts.gz
  ```

- (B) If you have a shell-glob that matches all of your association filenames, run `./phenolist.py glob-files "/path/to/association/files/*/*.epacts.gz"`.

  Then use a regular expression to make a phenocode for each phenotype.
  For example, you could use the regex `/(.*?)\.[^\.]+\.epacts\.gz` to match `eats-kimchi` and `ear-length` from the association files:

    - `/home/watman/eats-kimchi.autosomal.epacts.gz`
    - `/home/watman/eats-kimchi.X.epacts.gz`
    - `/home/watman/ear-length.all.epacts.gz

  If you have multiple association files for some phenotypes (like "eats-kimchi", which has separate files for X and autosomal chromosomes),
  you can combine lines that have identical `phenocode`s with this command:

  ```
  ./phenolist.py unique-phenocode
  ```

- (D) If you want to do more advanced things, like merging in more information from another file, email <pjvh@umich.edu> and I'll write documentation for `./phenolist.py`.

No matter what you do, please run `./phenolist.py verify` when you are done.  At any point, you may run `./phenolist.py view` to view the current file.


### 3. Load your association files.

0. If you only want variants that reach some minimum MAF, then set `minimum_maf` in `config.config`.
   Any variant that has at least that minor allele frequency (MAF) will be shown on the website, no matter what.
   If a variant has a smaller MAF (in some phenotype), it will still be shown if it has a large enough MAF in some other phenotype.

1. Run `./run_all.sh`.

2. If something breaks, read the error message.  Then,

    - If you can understand the error message, modify `data/input_file_parsers/epacts.py` to handle your file type.
      If the modification is something that pheweb should support by default, please email your changes to <pjvh@umich.edu>.

    - If you can't understand the error message, please email your error message to <pjvh@umich.edu> and hopefully I get back to you quickly.

    Then re-run `./run_all.sh`.


### 4. Run a simple server to check that everything loaded correctly.

Run `./server.py`.

If port 5000 is already taken, choose a different port (for example, 5432) and run `./server.py --port 5432` instead.

Next you need to find a way to for your computer to access the server.  You have a few options:

- (A) Run Flask exposed to anybody on the internet.  This might be dangerous, but I never worry much about it.

   You need a port that can get through your firewall. 80 or 5000 probably work, though 80 will require you to run `sudo ./server.py --port 80`.

   You need an IP adddress or hostname that refers to your server.  If you ssh into your server with `ssh watman@foobar.example.com`, this is `foobar.example.com`.
   If you don't know this, run `curl http://httpbin.org/ip` on your server to get its IP address.  (If it returns something like `"origin": "12.34.5.678"`, your server's IP is `12.34.5.678`).

   Now run `./server.py --port <myport> --host <myhost>`.
   For example, if you're using the default port (5000), and `curl http://httpbin.org/ip` return `"origin": "12.34.5.678"`, then run `./server.py --port 5000 --host 12.34.5.678`.

   When the server starts, it should say something like `Running on http://12.34.5.678:5000/ (Press CTRL+C to quit)`.  Open that URL in the web browser on your computer.

- (B) Run Flask with the default settings, then use an SSH tunnel to connect to it from your computer.

   For example, if you normally ssh in with `ssh watman@foobar.example.com`, then the command you should run (from your local computer) is `ssh -N -L localhost:5000:localhost:5000 watman@foobar.example.com`.  Now open <http://localhost:5000> in your web browser.

- (C) Skip straight to step 6, then do step 5 after that.


### 5. Modify templates if necessary.

The templates that you might want to modify are:

- `templates/about.html`
- `templates/index.html`
- the tooltip template in `templates/pheno.html`
- the tooltip template and `fields` in `static/region.js`.

As you modify templates, you might have to kill and restart your development server for the changes to take effect.  Or maybe not.  Who knows.


### 6. Use a real webserver.

At this point your Pheweb should be working how you want it to, and everything should be good except maybe the URL you're using.

For maximum speed and safety, you should switch to running Flask behind something like Apache2 or Nginx.
More information about this is [here](http://flask.pocoo.org/docs/0.11/deploying/#deployment).
If you choose Apache2, I have some documentation for you [here](https://github.com/statgen/pheweb/tree/master/other_documentation/running_with_apache2).
