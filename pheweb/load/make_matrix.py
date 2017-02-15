



# TODO:
# when we make a package, maybe `g++ matrixify.cpp` won't work.
# so pipe source into `g++ -x c++ - -o $data_dir/matrixify` instead. (how to pipe: http://stackoverflow.com/a/165662/1166306)
# we can probably store the sourcecode in pkg_resources.  otherwise, a string will do.
# later, cffi or ctypes will be good.


from .. import utils
conf = utils.conf

import os
import glob
import gzip

gxx = utils.get_path('g++', 'gxx_path')
tabix = utils.get_path('tabix')
bgzip = utils.get_path('bgzip')
my_dir = os.path.dirname(os.path.abspath(__file__))
matrixify_cpp_fname = os.path.join(my_dir, 'matrixify.cpp')
matrixify_exe_fname = os.path.join(conf.data_dir, 'tmp', 'matrixify')
sites_fname = os.path.join(conf.data_dir, 'sites', 'sites.tsv')
augmented_pheno_dir = os.path.join(conf.data_dir, 'augmented_pheno')
matrix_gz_tmp_fname = os.path.join(conf.data_dir, 'tmp', 'matrix.tsv.gz')
matrix_gz_fname = os.path.join(conf.data_dir, 'matrix.tsv.gz')

def should_run():
    cur_phenos = set(pheno['phenocode'] for pheno in utils.get_phenolist())

    # Remove files that shouldn't be there (and will confuse the glob in matrixify)
    for fname in glob.glob(os.path.join(augmented_pheno_dir, '*')):
        if os.path.basename(fname) not in cur_phenos:
            os.remove(fname)

    if not os.path.exists(matrix_gz_fname): return True

    # check that the current matrix is composed of the correct columns/phenotypes.  If it's changed, rebuild the matrix.
    with gzip.open(matrix_gz_fname, 'rt') as f:
        fieldnames = next(f).strip().split('\t')
    prev_phenos = set(fieldname.split('@')[1] for fieldname in fieldnames if '@' in fieldname)
    if prev_phenos != cur_phenos:
        print('re-running because cur matrix has wrong phenos.')
        print('- phenos in pheno-list.json but not matrix.tsv.gz:', ', '.join(repr(p) for p in cur_phenos - prev_phenos))
        print('- phenos in matrix.tsv.gz but not pheno-list.json:', ', '.join(repr(p) for p in prev_phenos - cur_phenos))
        return True

    infiles = [os.path.join(augmented_pheno_dir, phenocode) for phenocode in cur_phenos] + [sites_fname]
    infile_modtime = max(os.stat(fn).st_mtime for fn in infiles)
    if infile_modtime > os.stat(matrix_gz_fname).st_mtime:
        print('rerunning because some input files are newer than matrix.tsv.gz')
        return True

def run(argv):

    if should_run():
        utils.run_cmd([gxx, '--std=c++11', matrixify_cpp_fname, '-O3', '-o', matrixify_exe_fname])
        utils.run_script('''
        '{matrixify_exe_fname}' '{sites_fname}' '{augmented_pheno_dir}' |
        '{bgzip}' > '{matrix_gz_tmp_fname}'
        '''.format(matrixify_exe_fname=matrixify_exe_fname,
                   sites_fname=sites_fname,
                   augmented_pheno_dir=augmented_pheno_dir,
                   bgzip=bgzip,
                   matrix_gz_fname=matrix_gz_fname,
                   matrix_gz_tmp_fname=matrix_gz_tmp_fname))
        os.rename(matrix_gz_tmp_fname, matrix_gz_fname)
        utils.run_cmd([tabix, '-p','vcf', matrix_gz_fname])
    else:
        print('matrix is up-to-date!')
