## Detailed install instructions

First, try:

```bash
pip3 install pheweb
```

If that command fails, then:

   - If you have root, run:

     ```bash
     sudo pip3 install pheweb
     ```

   - Otherwise, I recommend using miniconda3 to install pheweb.

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

    Type &lt;enter&gt; to view the terms & conditions.  When you're done with them, type "q" to close them, and then "yes" &lt;enter&gt; to accept them.

    Type &lt;enter&gt; to agree to the path `~/miniconda3`.

    Type "yes" and &lt;enter&gt; to let have miniconda modify `$PATH` in your `~/.bash_profile` or `~/.bashrc`.

    Miniconda3 makes `python` an alias for `python3` and `pip` an alias for `pip3`.  That's likely to cause problems, so I recommend running:

    ```bash
    rm ~/miniconda3/bin/python
    rm ~/miniconda3/bin/pip
    ```

    Next, close and re-open your terminal (to make the new changes take effect) and then run:

    ```bash
    pip3 install pheweb
    ```
