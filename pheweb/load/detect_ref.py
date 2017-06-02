
from ..utils import chrom_order
from ..file_utils import get_cacheable_file_location, get_tmp_path
from .load_utils import run_script

import wget
import os


known_builds = [{'hg':'hg'+a, 'GRCh':'GRCh'+b} for a,b in [('18','36'),('19','37'),('38','38')]]

def get_base(build, chrom, pos):
    '''returns A/T/C/G or None (if read failed)'''
    with open(ref_filepath(build, chrom), 'rb') as f:
        try:
            f.seek(pos - 1) # I don't understand why we need -1 but I'm not surprised.
        except OSError:
            return None
        alt = f.read(1)
    if not alt: return None
    return alt.decode('ascii')

def get_base_in_all_builds(chrom, pos):
    return [(build, get_base(build, chrom, pos)) for build in known_builds]

def download_ref(build, chrom):
    '''Download a chromosome reference file, and remove the header and newlines so we can seek to positions.'''
    dest_filepath = ref_filepath(build, chrom, download=False)
    if os.path.exists(dest_filepath):
        return

    dl_filepath = get_tmp_path('dl-chrom-{}-{}'.format(build['hg'], chrom))
    if not os.path.exists(dl_filepath):
        dl_tmp_filepath = get_tmp_path(dl_filepath)
        url = 'ftp://hgdownload.cse.ucsc.edu/goldenPath/{}/chromosomes/chr{}.fa.gz'.format(build['hg'], chrom)
        wget.download(url=url, out=dl_tmp_filepath)
        os.rename(dl_tmp_filepath, dl_filepath)

    tmp_filepath = get_tmp_path(dest_filepath)
    run_script(r'''
    gzip -cd '{dl_filepath}' |
    tail -n +2 |
    tr -d "\n" > '{tmp_filepath}'
    '''.format(dl_filepath=dl_filepath, tmp_filepath=tmp_filepath))
    os.rename(tmp_filepath, dest_filepath)
    print("ref is at", dest_filepath)

def ref_filepath(build, chrom, download=True):
    filepath = get_cacheable_file_location('ref', 'reference-{}-chrom-{}.fa'.format(build['hg'], chrom))
    if download: download_ref(build, chrom)
    return filepath

def parse_build(build_string):
    for b in known_builds:
        if build_string in b.values():
            return b
    raise Exception("unknown build {!r}, try one of {}".format(build_string, known_builds))
def parse_chrom(chrom):
    if chrom.startswith('chr'): chrom = chrom[3:]
    if chrom not in chrom_order: raise Exception("unknown chromosome {}".format(chrom))
    if chrom == 'MT': chrom = 'M' # UCSC says "chrM"
    return chrom
def parse_pos(pos_string):
    try: pos = int(pos_string)
    except: raise Exception("pos {} is not an integer".format(pos_string))
    return pos

def run(argv):

    def usage():
        print('''
$ detect-ref get-base 22 18271078
hg18 22:18,271,078 C
hg19 22:18,271,078 G
hg38 22:18,271,078 N
''')
        exit(0)

    if not argv or argv[0] in ['-h', '--help', 'help']:
        usage()

    elif len(argv) == 3 and argv[0] in ['download', 'dl']:
        build = parse_build(argv[1])
        chrom = parse_chrom(argv[2])
        download_ref(build, chrom)

    elif len(argv) == 4 and argv[0] == 'get-base':
        build = parse_build(argv[1])
        chrom = parse_chrom(argv[2])
        pos = parse_pos(argv[3])
        base = get_base(build, chrom, pos)
        if base is None:
            print('{} {}:{:,} {}'.format(build['hg'], chrom, pos, base))
        else:
            print('{} {}:{:,} not found'.format(build['hg'], chrom, pos))

    elif len(argv) == 3 and argv[0] == 'get-base':
        chrom = parse_chrom(argv[1])
        pos = parse_pos(argv[2])
        for build, base in get_base_in_all_builds(chrom, pos):
            if base is not None:
                print('{} {}:{:,} {}'.format(build['hg'], chrom, pos, base))
            else:
                print('{} {}:{:,} not found'.format(build['hg'], chrom, pos))

    elif len(argv) == 4 and argv[0] == 'build':
        chrom = parse_chrom(argv[1])
        pos = parse_pos(argv[2])
        base = parse_base(argv[3])
        print('{}:{:,} {}'.format(chrom, pos, base), 'matches builds', compatible_builds(chrom, pos, base))

    else:
        usage()

# this is in `entry_points` in setup.py:
def main():
    import sys
    run(sys.argv[1:])
