
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
        # TODO: handle `N`, `*`, `.`
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


def detect_build(build_scores, match_threshold=1):
    '''
    `build_scores` is the output of `get_build_scores`.

    A build matches the variants if either `allele1` or `allele2` match the build's reference bases in at least `match_threshold` fraction of variants.
    Within a build, an allele column matches if that allele column matches the build's reference bases in at least `match_threshold` fraction of variants.

    Returns:
        (None, None) if multiple builds match or if no builds match.
        (build, 'allele1' or 'allele2') if one build matches and one allele column matches.
        (build, 'either') if one build matches but neither allele1 nor allele2 match.

    `build` is an instance of `Build`.  `build.hg_name` is "hg38" or similar.  `build.grch_name` is "GRCh38" or similar.

    Usage:
        variant_iterator = pheweb.load.detect_ref.make_variant_iterator('a.vcf', chrom_pos_a1_a2_cols=(0,1,3,4)) # by default, it checks 1000 variants and skips "#" lines.
        build_scores = get_build_scores(variant_iterator) # by default, it tries [hg18, hg19, hg38].
        build, allele_col = detect_build(build_scores, match_threshold=0.999)
        if build is None:
            print("Sorry, this file doesn't match common genome builds.")
        elif allele_col == 'either':
            print("This file matches {} but neither allele column is consistently reference.  Maybe they are effect/non-affect?".format(build.hg_name))
        else:
            print("This file matches {} and column {} matches is the reference.".format(build.hg_name, allele_col))
    '''
    matching_builds = []
    for build, score in build_scores.items():
        if score['either'] >= match_threshold:
            if score['a1'] >= match_threshold:  matching_builds.append((build, 'a1'))
            elif score['a2'] >= match_threshold: matching_builds.append((build, 'a2'))
            else: matching_builds.append((build, 'either'))
    return matching_builds[0] if len(matching_builds) == 1 else (None, None)

def get_build_scores(variant_iterator, builds=None):
    '''
    return `{build_GRCh36:{'allele1':0.99, 'allele2':0.01, 'either':'1.0}, ...}`
    '''
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


def make_variant_iterator(filepath_or_file_or_iterable, chrom_pos_a1_a2_cols=(0,1,2,3), comment_char='#', num_header_lines=0, limit_num_variants=1000):
    '''
    returns an iterator where each item is `(chrom, pos, allele1, allele2)`.  For example, `('X', 23456, 'A', 'TGG')`.

    `filepath_or_file_or_iterable` can any of these:
       - the path to a tab-delimited file.
       - an already-opened file, like `open(filepath)` or `sys.stdin`.
       - a list or iterable of strings, like ["X\t123\tC\tG", "X\t456\tA\tGG"].

    It skips line that being with `comment_char` ('#' by default). If your header lines don't begin with a consistent character, use `num_header_lines` to skip them.

    It only looks at `limit_num_variants` (1000 by default) to save time.  Set `limit_num_variants=None` to check all variants in the file or iterable.

    It extracts chromosome, position, allele1 and allele2 from the zero-indexed columns `chrom_pos_a1_a2`.  For example, use `(0,1,3,4)` for a VCF.
    '''
    if isinstance(filepath_or_file_or_iterable, str):
        with read_maybe_gzip(filepath_or_file_or_iterable) as f:
            yield from make_variant_iterator(f, chrom_pos_a1_a2_cols, comment_char, num_header_lines, limit_num_variants)
    else:
        chrom_col, pos_col, a1_col, a2_col = chrom_pos_a1_a2_cols
        for i, line in enumerate(filepath_or_file_or_iterable):
            line = line.rstrip('\n')
            if i < num_header_lines or comment_char and line.startswith(comment_char): continue
            if limit_num_variants and i >= limit_num_variants + num_header_lines: break
            parts = line.split('\t')
            if len(parts) < 4:
                raise PheWebError("There should be 4 tab-delimited items (chromosome, position, allel1, allele2) but there are only {} on the line {!r}".format(
                    len(parts), line))
            yield (parse_chrom(parts[chrom_col].strip()), parse_pos(parts[pos_col].strip()), parts[a1_col].strip(), parts[a2_col].strip())


def parse_build(build_string):
    for b in get_default_builds():
        if build_string.lower() in (b.hg_name.lower(), b.grch_name.lower()):
            return b
    raise PheWebError("unknown build {!r}, try one of {}".format(build_string, [(b.hg_name, b.grch_name) for b in get_default_builds()]))
def parse_chrom(chrom):
    if chrom.startswith('chr'): chrom = chrom[3:]
    if chrom == 'MT': chrom = 'M' # UCSC says "chrM"
    if chrom not in Build._allowed_chroms: raise PheWebError("unknown chromosome {!r} (accepted chromosomes are {} with optional prefix 'chr')".format(chrom, Build._allowed_chroms+['MT']))
    return chrom
def parse_pos(pos_string):
    try: return int(pos_string)
    except ValueError: raise PheWebError("position {!r} is not an integer".format(pos_string))

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
