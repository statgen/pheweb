## Detailed install instructions

First, try:

```bash
python3 -m pip install pheweb
```

*(Note: In most cases this is equivalent to `pip3 install pheweb`, but if you have a bad version of `pip3` on your `$PATH`, using `python3 -m pip` will avoid it.)*

If that command fails, then use one of the approaches below.


### Installing on Linux with `sudo`:

*(Note: If you're not sure whether you have root access, just try it.  If you don't have root access, it will say something like `you are not in the sudoers file.`*)


Install prerequisites:

- If you are running Ubuntu (or another `apt-get`-based distribution), run:

   ```bash
   sudo apt-get update
   sudo apt-get install python3-pip python3-dev libz-dev libffi-dev
   ```

- If you are running Fedora, RedHat, or CentOS (or another `yum`-based distribution), run:

   ```bash
   sudo yum install python3-devel gcc-c++ zlib-devel
   ```

Then run:

```bash
sudo python3 -m pip install pheweb
```

If this doesn't work, email me or try the miniconda3 approach instead.


### Installing on Linux or Mac with Miniconda3:

To install miniconda3,

- if you're on macOS, run:

   ```bash
   curl https://repo.continuum.io/miniconda/Miniconda3-latest-MacOSX-x86_64.sh > install-miniconda3.sh
   bash install-miniconda3.sh
   ```

- if you're on Linux, run:

   ```bash
   curl https://repo.continuum.io/miniconda/Miniconda3-latest-Linux-x86_64.sh > install-miniconda3.sh
   bash install-miniconda3.sh
   ```

Type &lt;enter&gt; to view the terms & conditions.
When you're done with them, type "q" to close them, and then "yes" &lt;enter&gt; to accept them.

Type &lt;enter&gt; to agree to use the directory `~/miniconda3`.

Type "yes" and &lt;enter&gt; to let miniconda modify `$PATH` in your `~/.bash_profile` or `~/.bashrc`.
(This allows you to type just `pheweb` instead of `~/miniconda/bin/pheweb` on the command line.)

Miniconda3 makes `python` an alias for `python3` and `pip` an alias for `pip3`.
That's likely to cause problems, so I recommend running:

```bash
rm ~/miniconda3/bin/python
rm ~/miniconda3/bin/pip
```

Next, close and re-open your terminal (to make the new `$PATH` take effect) and then run:

```bash
python3 -m pip install pheweb
```
