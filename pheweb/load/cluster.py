
from ..utils import get_phenolist
from ..conf_utils import conf
from ..file_utils import get_tmp_path, get_dated_tmp_path, common_filepaths
from .load_utils import PerPhenoParallelizer

import sys, argparse
from boltons.iterutils import chunked

N_AT_A_TIME = 5

header_template = {
    'slurm': '''
#!/bin/bash
#SBATCH --array=0-{n_jobs}
#SBATCH --mem=4G
#SBATCH --time=5-0:0
#SBATCH --output={tmp_path}/slurm-%j.out
#SBATCH --error={tmp_path}/slurm-%j.out
''',
    'sge': '''
#!/bin/bash
#$ -t 0-{n_jobs}
#$ -l h_vmem=4G
#$ -l h_rt=120:00:00
#$ -o {tmp_path}
#$ -e {tmp_path}
'''
}
array_id_variable = {
    'slurm': 'SLURM_ARRAY_TASK_ID',
    'sge': 'SGE_TASK_ID',
}
submit_command = {
    'slurm': 'sbatch',
    'sge': 'qsub',
}
monitor_command = {
    'slurm': 'squeue --long --array --job',
    'sge': 'qstat -j',
}

def run(argv):
    parser = argparse.ArgumentParser()
    parser.add_argument('--engine', choices=['slurm', 'sge'], required=True)
    parser.add_argument('--step', choices=['parse', 'augment-phenos', 'manhattan', 'qq'], required=True)
    args = parser.parse_args(argv)

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
    batch_filepath = get_dated_tmp_path('{}-{}'.format(args.engine, args.step)) + '.sh'
    tmp_path = get_tmp_path('')
    with open(batch_filepath, 'w') as f:
        f.write(header_template[args.engine].format(n_jobs = len(jobs)-1, tmp_path=tmp_path))
        f.write('\n\njobs=(\n')
        for job in jobs:
            f.write(','.join(map(str,job)) + '\n')
        f.write(')\n\n')
        f.write('export PHEWEB_DATADIR={!r}\n'.format(conf.data_dir))
        f.write(sys.argv[0] + ' conf num_procs=1 ' + args.step +' --phenos=${jobs[$' + array_id_variable[args.engine] + ']}\n')
    print('Run:\n{} {}\n'.format(submit_command[args.engine], batch_filepath))
    print('Monitor with `{} <jobid>`\n'.format(monitor_command[args.engine]))
    print('output will be in {}'.format(tmp_path))
