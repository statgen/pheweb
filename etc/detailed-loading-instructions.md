## Configuration options

- `assoc_min_maf` (float): an association (between a phenotype and variant) will only be included if its MAF is greater than or equal to this value. (default: `0`)

- `cache` (string): a directory where files shared by all datasets can be cached. If you're loading multiple phewebs, setting `cache = "~/.pheweb/cache/"` will avoid downloading files multiples times. (default: None)

- `num_procs` (int): the number of processes to use for parallel loading steps.  (default: 2/3 of the number of cores on your machine)

- `loading_nice = True`: sets nice=19 (reducing cpu priority) and sets ionice to class "Idle" (reducing IO when anything else is using disk)

- `debugging_limit_num_variants` (int): only parses this many variants from each input association file and from the rsids file.  This is convenient for quickly loading part of a dataset to check that it works as expected.

- `download_pheno_sumstats`: explained in [README](../README.md)

- `show_correlations`: explained in [README](../README.md)


## Making pheno-list.json


There are four ways to make a `pheno-list.json`:

1. If you have a csv (or tsv, optionally gzipped) with a header that has exactly the right column names, just import it by running `pheweb phenolist import-phenolist "/path/to/my/pheno-list.csv"`.

   If you have multiple association files for each phenotype, you may put them all into a single column with `|` between them. For example, your file `pheno-list.csv` might look like this:

   ```
   phenocode,assoc_files
   a1c,/home/peter/data/a1c.autosomal.gz|/home/peter/data/a1c.X.gz
   ear-length,/home/peter/data/ear-length.gz
   ```

2. If you have one association file per phenotype, you can use a shell-glob to get assoc-files. Suppose that your assocation files are at paths like:

   - `/home/peter/data/a1c.autosomal.gz`
   - `/home/peter/data/ear-length.gz`

   Then you could run `pheweb phenolist glob-files "/home/peter/data/*.gz"` to get `assoc-files`.

   To get `phenocodes`, you can use this command which will take the text after the last `/` and before the next `.`:

   ```
   pheweb phenolist extract-phenocode-from-filepath --simple
   ```
   
   If that doesn't work, see `pheweb phenolist extract-phenocode-from-filepath -h` for how to use a regex capture group.

3. If you have multiple association files for some phenotypes, you can follow the directions in 2 and then run `pheweb phenolist unique-phenocode`.

   For example, if your association files are at:

   - `/home/peter/data/ear-length.gz`
   - `/home/peter/data/a1c.autosomal.gz`
   - `/home/peter/data/a1c.X.gz`

   then you can run:

   ```
   pheweb phenolist glob-files "/home/peter/data/*.gz"
   pheweb phenolist extract-phenocode-from-filepath --simple
   pheweb phenolist unique-phenocode
   ```

4. If you want to do more advanced things, like merging in more information from another file, check out the tools in `pheweb phenolist --help`.





## Distributing jobs across a cluster

`pheweb process` runs a bunch of steps, which you can see by running `pheweb process -h`.
Some of those steps can instead be run distributed across a cluster.
You can see which steps by running `pheweb cluster -h`.

The schedulers SLURM and SGE are natively supported.
Use `--engine=slurm` or `--engine=sge` when you run `pheweb cluster`.
For other schedulers, you'll have to modify the output of `pheweb cluster`.

For example, on SLURM you could run:

```
pheweb phenolist verify
pheweb cluster --engine=slurm --step=parse
pheweb sites && pheweb make-gene-aliases-sqlite3 && pheweb add-rsids && pheweb add-genes && pheweb make-cpras-rsids-sqlite3
pheweb cluster --engine=slurm --step=augment-phenos
pheweb cluster --engine=slurm --step=manhattan
pheweb cluster --engine=slurm --step=qq
pheweb process  # This won't re-create any files that are already up-to-date.
```


## Annotating with VEP

Run the code in `etc/annotate_vep/run.sh`.  It requires docker (and thus sudo) and only works on hg38.
Read the comments at the top of that script.


<br><br><br><br><br><br><br><br><br><br><br><br>
