
# For reference, see <https://github.com/quinlan-lab/hts-python/blob/master/hts/htsffi.py>, even though it uses deprecated .verify()

import cffi
import os.path

cxx_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'matrixify.cpp')
with open(cxx_path) as f:
    src = f.read()

ffibuilder = cffi.FFI()
ffibuilder.set_source('pheweb.load.matrix._matrixify',
                      src,
                      source_extension='.cpp',
                      extra_compile_args=['--std=c++11'],
                      libraries=['z'], # needed on Linux but not macOS
)
ffibuilder.cdef("int cffi_run(char *sites_fname, char *augmented_pheno_glob, char *matrix_fname);")

# ffibuilder.compile(verbose=True) # seems like I don't need this.
