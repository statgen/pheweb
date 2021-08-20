## Detailed install instructions

First, try:

```bash
python3 -m pip install -U cython wheel pip setuptools
python3 -m pip install pheweb
pheweb --help
```

*(Note: In most cases this is equivalent to `pip3 install pheweb`, but if you have a bad version of `pip3` on your `$PATH`, using `python3 -m pip` will avoid it.)*

- If you get the error `Segmentation fault (core dumped)`, try running `python3 -m pip install --no-binary=cffi,cryptography,pyopenssl pheweb` instead. ([more info](https://github.com/pypa/pip/issues/5366))

- If you get an error related to pysam, run `python3 -m pip install -U cython; python3 -m pip install https://github.com/pysam-developers/pysam/archive/master.zip` and try again.

- If installation was successful but the command `pheweb --help` is not found, run `echo 'PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc`, start a new terminal, and try `pheweb --help` again.  If you're on macOS, you might need `echo 'source "$HOME/.bashrc" >> ~/.bash_profile`.

- If that command fails in a different way, then use one of the approaches below.


### Installing on Linux with `sudo`:

*(Note: If you're not sure whether you have permissions for `sudo`, just try it.  If you don't have root access, it will say something like `you are not in the sudoers file.`*)

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
sudo python3 -m pip install wheel cython
sudo python3 -m pip install pheweb
```

If this doesn't work, email me or try the miniconda3 approach instead.


### Installing on Linux or Mac with Miniconda3:

If you are on macOS, install XCode Developer Tools with `xcode-select --install`.

To install miniconda3, follow the instructions [here](https://docs.conda.io/projects/conda/en/latest/user-guide/install/).

In that installation, you can close the terms & conditions with "q".
You should install into the default directory of `~/miniconda3`.
You should let miniconda modify `$PATH` in your `~/.bash_profile` or `~/.bashrc`, so that you'll be able to run just `pheweb` instead of `~/miniconda/bin/pheweb` on the command line.

Miniconda3 makes `python` an alias for `python3` and `pip` an alias for `pip3`.
If you don't like that, run:

```bash
rm ~/miniconda3/bin/python
rm ~/miniconda3/bin/pip
```

Next, close and re-open your terminal, to make the new `$PATH` take effect. Then run:

```bash
python3 -m pip install pheweb
```
