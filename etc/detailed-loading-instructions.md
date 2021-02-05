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
