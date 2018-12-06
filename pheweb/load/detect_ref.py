
from ..utils import PheWebError
from ..file_utils import read_maybe_gzip, mkdir_p
from .load_utils import run_script, ProgressBar

from collections import OrderedDict
import os, sys, contextlib, urllib.request, functools
from kpa.func_utils import list_from_iter


class Build:
    _allowed_chroms = list(map(str,range(1,22+1))) + ['X','Y','M']
    def __init__(self, hg_name, grch_name):
        self.hg_name = hg_name
        self.grch_name = grch_name
        self._open_chrom_files = {}
    def close(self):
        for chrom,f in list(self._open_chrom_files.items()):
            f.close()
            self._open_chrom_files.pop(chrom)
    def __str__(self): return self.hg_name
    def __repr__(self): return '<Build hg_name={} grch_name={}>'.format(self.hg_name, self.grch_name)
    def matches(self, chrom, pos, bases):
        # TODO: handle `N`, `*`, `.`, 
        ref_bases = self.get_bases(chrom, pos, len(bases))
        return ref_bases is None or bases.upper() == ref_bases.upper()
    def get_bases(self, chrom, pos, length=1):
        '''returns a string of A/T/C/G or None (if read failed)'''
        f = self._get_chrom_file(chrom)
        try:
            f.seek(pos - 1) # I don't understand why we need -1 but I'm not surprised.
        except OSError:
            return None
        bases = f.read(length)
        return bases.decode('ascii') if bases else None
    def _get_chrom_file(self, chrom):
        if chrom not in self._open_chrom_files:
            if chrom not in self._allowed_chroms:
                return None
            ref_filepath = os.path.join(os.path.expanduser('~'),'.pheweb/cache/reference-{}-chrom-{}.fa'.format(self.hg_name, chrom))
            if not os.path.exists(ref_filepath):
                mkdir_p(os.path.dirname(ref_filepath))
                url = 'ftp://hgdownload.cse.ucsc.edu/goldenPath/{}/chromosomes/chr{}.fa.gz'.format(self.hg_name, chrom)
                self._download_chrom_file(url, ref_filepath)
            self._open_chrom_files[chrom] = open(ref_filepath, 'rb')
        return self._open_chrom_files[chrom]
    def _download_chrom_file(self, url, filepath, verbose=True):
        '''Download a chromosome reference file, and remove the header and newlines so we can seek to positions.'''
        # TODO: download only the first 10^n MB of the reference file.
        if verbose: print('\ndownloading a reference file for {} to {}'.format(self, filepath))
        download_filepath = filepath+'.download'
        tmp_filepath = filepath+'.tmp'
        try:
            urllib.request.urlretrieve(url=url, filename=download_filepath)
            run_script(r'''
            gzip -cd '{download_filepath}' |
            tail -n +2 |
            tr -d "\n" > '{tmp_filepath}'
            '''.format(download_filepath=download_filepath, tmp_filepath=tmp_filepath))
            os.rename(tmp_filepath, filepath)
        finally:
            try: os.unlink(download_filepath)
            except FileNotFoundError: pass
            try: os.unlink(tmp_filepath)
            except FileNotFoundError: pass

@functools.lru_cache(None)
@list_from_iter
def get_default_builds():
    for hg_num, grch_num in [('18','36'),('19','37'),('38','38')]:
        yield Build('hg{}'.format(hg_num), 'GRCh{}'.format(grch_num))


@list_from_iter
def get_matching_builds(build_scores, build_threshold=1, ref_threshold=1):
    def build_goodness(build): return (build_scores[build]['either'], build_scores[build]['a1'], build_scores[build]['a2'])
    for build in sorted(build_scores.keys(), key=build_goodness):
        score = build_scores[build]
        if score['either'] >= build_threshold:
            if score['a1'] >= ref_threshold:  yield (build, 'a1')
            elif score['a2'] >= ref_threshold: yield (build, 'a2')
            elif score['either'] >= ref_threshold: yield (build, 'either')
            else: yield (build, None)

def get_build_scores(variant_iterator, builds=None):
    # return `{build_GRCh36:{'allele1':0.99, 'allele2':0.01, 'either':'1.0}, ...}`
    if builds is None: builds = get_default_builds()
    with contextlib.ExitStack() as es:
        for build in builds:  es.callback(build.close) # close all the builds' files when we finish.
        assert all(isinstance(build, Build) for build in builds)
        match_counts = OrderedDict((build,{'a1':0, 'a2':0, 'either':0}) for build in builds)
        for num_variants,(chrom,pos,a1,a2) in enumerate(variant_iterator, start=1):
            for build in builds:
                a1_matches = build.matches(chrom, pos, a1)
                a2_matches = build.matches(chrom, pos, a2)
                if a1_matches: match_counts[build]['a1'] += 1
                if a2_matches: match_counts[build]['a2'] += 1
                if a1_matches or a2_matches: match_counts[build]['either'] += 1
    for v in match_counts.values():
        v['a1'] /= num_variants
        v['a2'] /= num_variants
        v['either'] /= num_variants
    return match_counts


def progressbar_handle_variants(variant_iterator, builds=None):
    def fmt_match_percent(fraction): return 'all' if fraction == 1 else '{:2.0f}%'.format(100*fraction)
    if builds is None: builds = get_default_builds()
    with contextlib.ExitStack() as es:
        for build in builds:  es.callback(build.close) # close all the builds' files when we finish.
        assert all(isinstance(build, Build) for build in builds)
        match_counts = OrderedDict((build,{'a1':0, 'a2':0, 'either':0}) for build in builds)
        num_variants = 0
        try:
            with ProgressBar() as progressbar:
                for (chrom,pos,a1,a2) in variant_iterator:
                    for build in builds:
                        a1_matches = build.matches(chrom, pos, a1)
                        a2_matches = build.matches(chrom, pos, a2)
                        if a1_matches: match_counts[build]['a1'] += 1
                        if a2_matches: match_counts[build]['a2'] += 1
                        if a1_matches or a2_matches: match_counts[build]['either'] += 1
                    num_variants += 1
                    progressbar.set_message(
                        ' '.join(
                            '{}[{}]'.format(
                                str(build),
                                ' '.join(
                                    '{}:{}'.format(allele, fmt_match_percent(num_match/num_variants))
                                    for allele, num_match in counts.items())
                            ) for build, counts in match_counts.items()
                        ) +
                        ' for {:,} variants'.format(num_variants)
                    )
                    if not any(d['either'] == num_variants for d in match_counts.values()):
                        print('\nQuitting because no build matches perfectly\n')
                        break
        except KeyboardInterrupt: pass
        if num_variants:
            print()
            for build, counts in match_counts.items():
                print(build, '   1st allele column matches ref {:3.0f}% (at {:4}/{} variants)'.format(counts['a1']/num_variants*100, counts['a1'], num_variants))
                print(build, '   2nd allele column matches ref {:3.0f}% (at {:4}/{} variants)'.format(counts['a2']/num_variants*100, counts['a2'], num_variants))
                print(build, 'either allele column matches ref {:3.0f}% (at {:4}/{} variants)'.format(counts['either']/num_variants*100, counts['either'], num_variants))
            print()


def make_variant_iterator(filepath_or_file_or_iterable, chrom_pos_a1_a2_cols=(0,1,2,3), comment_char='#', num_header_lines=0):
    if isinstance(filepath_or_file_or_iterable, str):
        with read_maybe_gzip(filepath_or_file_or_iterable) as f:
            yield from make_variant_iterator(f, chrom_pos_a1_a2_cols, comment_char, num_header_lines)
    else:
        chrom_col, pos_col, a1_col, a2_col = chrom_pos_a1_a2_cols
        for i, line in enumerate(filepath_or_file_or_iterable):
            if i < num_header_lines or comment_char and line.startswith(comment_char): continue
            parts = line.split('\t')
            yield (parts[chrom_col], int(parts[pos_col]), parts[a1_col], parts[a2_col])


def parse_build(build_string):
    for b in get_default_builds():
        if build_string.lower() in (b.hg_name.lower(), b.grch_name.lower()):
            return b
    raise PheWebError("unknown build {!r}, try one of {}".format(build_string, [(b.hg_name, b.grch_name) for b in get_default_builds()]))
def parse_chrom(chrom):
    if chrom.startswith('chr'): chrom = chrom[3:]
    if chrom == 'MT': chrom = 'M' # UCSC says "chrM"
    if chrom not in Build._allowed_chroms: raise PheWebError("unknown chromosome {}".format(chrom))
    return chrom
def parse_pos(pos_string):
    try: return int(pos_string)
    except ValueError: raise PheWebError("pos {} is not an integer".format(pos_string))

def run(argv):
    def usage():
        print('''
$ detect-ref get-base 22 18271078
hg18 22:18,271,078 C
hg19 22:18,271,078 G
hg38 22:18,271,078 N

$ detect-ref get-base hg19 22 18271078
hg19 22:18,271,078 G

$ detect-ref a.vcf.gz
hg18[a1:26% a2:24% either:50%] hg19[a1:all a2:0% either:all] hg38[a1:26% a2:23% either:49%] for 53,988 variants

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
        base = build.get_bases(chrom, pos, length=1)
        print('{} {}:{:,} {}'.format(build['hg'], chrom, pos, 'not found' if base is None else base))

    elif len(argv) == 3 and argv[0] == 'get-base':
        chrom = parse_chrom(argv[1])
        pos = parse_pos(argv[2])
        for build in get_default_builds():
            base = build.get_bases(chrom, pos, length=1)
            print('{} {}:{:,} {}'.format(build, chrom, pos, base or 'not found'))

    elif len(argv) == 2 and argv[0] == 'vcf':
        filepath = argv[1]
        if not os.path.exists(filepath):
            raise PheWebError('File {} does not exist'.format(repr(filepath)))
        variant_iterator = make_variant_iterator(filepath, (0,1,3,4,), comment_char='#')
        progressbar_handle_variants(variant_iterator)

    elif len(argv) == 1 and argv[0] in ['chr-pos-a1-a2', 'cpaa']:
        variant_iterator = make_variant_iterator(sys.stdin, (0,1,2,3))
        progressbar_handle_variants(variant_iterator)

    else:
        usage()

# this is in `entry_points` in setup.py:
def main():
    import sys
    run(sys.argv[1:])
