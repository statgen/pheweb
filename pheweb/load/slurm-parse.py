
from ..utils import get_phenolist
from ..conf_utils import conf
from ..file_utils import get_tmp_path, get_dated_tmp_path, common_filepaths
from .load_utils import PerPhenoParallelizer

import sys
from boltons.iterutils import chunked

N_AT_A_TIME = 10

def run(argv):
    def should_process(pheno):
        return PerPhenoParallelizer().should_process_pheno(
            pheno,
            get_input_filepaths = lambda pheno: pheno['assoc_files'],
            get_output_filepaths = lambda pheno: common_filepaths['parsed'](pheno['phenocode']),
        )
    idxs = [i for i,pheno in enumerate(get_phenolist()) if should_process(pheno)]
    if not idxs:
        print('All phenos are up-to-date!')
        exit(0)

    jobs = chunked(idxs, N_AT_A_TIME)
    sbatch_filepath = get_dated_tmp_path('slurm-parse') + '.sh'
    tmp_path = get_tmp_path('')
    with open(sbatch_filepath, 'w') as f:
        f.write('''\
#!/bin/bash
#SBATCH --cpus-per-task=4
#SBATCH --mem=1G
#SBATCH --time=5-0:0
#SBATCH --array=0-{n_jobs}
#SBATCH --output={tmp_path}/slurm-%j.out
#SBATCH --error={tmp_path}/slurm-%j.out

jobs=(
'''.format(n_jobs = len(jobs)-1, tmp_path=tmp_path))

        for job in jobs:
            f.write(','.join(map(str,job)) + '\n')
        f.write(')\n\n')
        f.write('export PHEWEB_DATADIR={!r}\n'.format(conf.data_dir))
        f.write(sys.argv[0] + ' conf num_procs=4 parse --phenos=${jobs[$SLURM_ARRAY_TASK_ID]}\n')
    print('Run:\nsbatch {}\n'.format(sbatch_filepath))
    print('Monitor with `squeue --long --array --job <jobid>`\n')
    print('output will be in {}/slurm-*.out'.format(tmp_path))
