
from ..utils import chrom_order, PheWebError
from ..file_utils import get_cacheable_file_location, get_tmp_path, read_maybe_gzip
from .load_utils import run_script, ProgressBar

from collections import OrderedDict
import wget
import os
import sys

# TODO:
# class Build?
#   .lookup_base(chrom, pos, length=1)
#   ._ref_filepath(chrom)
#   ._download_ref(chrom)
#   .__str__()
#   .__hash__()
# class AllBuilds?
#   .compatible_builds(chrom, pos, base)
#   .lookup_base(chrom, pos

known_builds = [{'hg':'hg'+a, 'GRCh':'GRCh'+b} for a,b in [('18','36'),('19','37'),('38','38')]]

def handle_cpaa():
    f = sys.stdin
    col_idx = dict(chrom=0, pos=1, a1=2, a2=3)
    handle_lines(f, col_idx)

def handle_vcf(args):
    # TODO: only check builds that are still compatible.
    vcf_filepath = args[0]
    col_idx = dict(chrom=0, pos=1, a1=3, a2=4)
    with read_maybe_gzip(vcf_filepath) as f:
        handle_lines(f, col_idx)

def handle_lines(lines, col_idx):
    match_counts = OrderedDict((build['hg'],{'a1':0, 'a2':0, 'either':0}) for build in known_builds)
    num_variants = 0
    with ProgressBar() as progressbar:
        for line in lines:
            if line.startswith('#'): continue
            parts = line.rstrip('\n').split('\t')
            try:
                chrom = parse_chrom(parts[col_idx['chrom']])
                pos = parse_pos(parts[col_idx['pos']])
                a1 = parts[col_idx['a1']]
                a2 = parts[col_idx['a2']]
                matching_builds_a1 = {build['hg'] for build in get_matching_builds(chrom, pos, a1)}
                matching_builds_a2 = {build['hg'] for build in get_matching_builds(chrom, pos, a2)}
            except Exception as exc:
                raise exc from Exception('Failed line: {!r}'.format(line))
            for build in matching_builds_a1: match_counts[build]['a1'] += 1
            for build in matching_builds_a2: match_counts[build]['a2'] += 1
            for build in set.union(matching_builds_a1,matching_builds_a2): match_counts[build]['either'] += 1
            num_variants += 1

            if not any(d['either'] == num_variants for d in match_counts.values()):
                print('No build matches perfectly, so quitting')
                break

            progressbar.set_message(
                ' '.join(
                    '{}[{}]'.format(
                        build_hg,
                        ' '.join(
                            '{}:{}'.format(
                                allele,
                                'all' if num_match==num_variants else '{}%'.format(100*num_match//num_variants))
                            for allele, num_match in d.items()
                        )
                    )
                    for build_hg, d in match_counts.items()
                ) +
                ' for {:,} variants'.format(num_variants)
            )


def get_matching_builds(chrom, pos, ref):
    matching_builds = []
    for build, base in get_base_in_all_builds(chrom, pos, length=len(ref)):
        if base is not None and base.upper() == ref:
            matching_builds.append(build)
    return matching_builds

def get_base_in_all_builds(chrom, pos, length=1):
    return [(build, get_base(build, chrom, pos, length=length)) for build in known_builds]

def get_base(build, chrom, pos, length=1):
    '''returns A/T/C/G or None (if read failed)'''
    with open(ref_filepath(build, chrom), 'rb') as f:
        try:
            f.seek(pos - 1) # I don't understand why we need -1 but I'm not surprised.
        except OSError:
            return None
        alt = f.read(length)
    if not alt: return None
    return alt.decode('ascii')


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
        print('')
        os.rename(dl_tmp_filepath, dl_filepath)

    tmp_filepath = get_tmp_path(dest_filepath)
    run_script(r'''
    gzip -cd '{dl_filepath}' |
    tail -n +2 |
    tr -d "\n" > '{tmp_filepath}'
    '''.format(dl_filepath=dl_filepath, tmp_filepath=tmp_filepath))
    os.rename(tmp_filepath, dest_filepath)
    print("this reference file has been downloaded to", dest_filepath)

def ref_filepath(build, chrom, download=True):
    filepath = get_cacheable_file_location('ref', 'reference-{}-chrom-{}.fa'.format(build['hg'], chrom))
    if download: download_ref(build, chrom)
    return filepath


def parse_build(build_string):
    for b in known_builds:
        if build_string in b.values():
            return b
    raise PheWebError("unknown build {!r}, try one of {}".format(build_string, known_builds))
def parse_chrom(chrom):
    if chrom.startswith('chr'): chrom = chrom[3:]
    if chrom not in chrom_order: raise PheWebError("unknown chromosome {}".format(chrom))
    if chrom == 'MT': chrom = 'M' # UCSC says "chrM"
    return chrom
def parse_pos(pos_string):
    try: pos = int(pos_string)
    except ValueError: raise PheWebError("pos {} is not an integer".format(pos_string))
    return pos


def run(argv):
    def usage():
        print('''
$ detect-ref get-base 22 18271078
hg18 22:18,271,078 C
hg19 22:18,271,078 G
hg38 22:18,271,078 N

$ detect-ref get-base hg19 22 18271078
hg19 22:18,271,078 G

$ zcat a.vcf.gz | grep -v '^#' | cut -f1-2,4-5 | detect-ref chr-pos-a1-a2
hg18[a1:26% a2:24% either:50%] hg19[a1:all a2:0% either:all] hg38[a1:26% a2:23% either:49%] for 53,988 variants
''')
        exit(0)

    if not argv or any(arg in {'-h', '--help', 'help'} for arg in argv):
        usage()

    elif len(argv) == 4 and argv[0] == 'get-base':
        build = parse_build(argv[1])
        chrom = parse_chrom(argv[2])
        pos = parse_pos(argv[3])
        base = get_base(build, chrom, pos)
        print('{} {}:{:,} {}'.format(build['hg'], chrom, pos, 'not found' if base is None else base))

    elif len(argv) == 3 and argv[0] == 'get-base':
        chrom = parse_chrom(argv[1])
        pos = parse_pos(argv[2])
        for build, base in get_base_in_all_builds(chrom, pos):
            print('{} {}:{:,} {}'.format(build['hg'], chrom, pos, 'not found' if base is None else base))

    elif len(argv) == 2 and argv[0] == 'vcf':
        handle_vcf(argv[1])

    elif len(argv) == 1 and argv[0] in ['chr-pos-a1-a2', 'cpaa']:
        handle_cpaa()

    else:
        usage()

# this is in `entry_points` in setup.py:
def main():
    import sys
    run(sys.argv[1:])
