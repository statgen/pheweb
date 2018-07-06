
import math
import json
import os
import csv
import boltons.mathutils
import urllib.parse


class PheWebError(Exception):
    '''implies that an exception is being handled by PheWeb, so its message should just be printed.'''

def round_sig(x, digits):
    if x == 0:
        return 0
    elif abs(x) == math.inf or math.isnan(x):
        raise ValueError("Cannot round infinity or NaN")
    else:
        log = math.log10(abs(x))
        digits_above_zero = int(math.floor(log))
        return round(x, digits - 1 - digits_above_zero)
assert round_sig(0.00123, 2) == 0.0012
assert round_sig(1.59e-10, 2) == 1.6e-10

def approx_equal(a, b, tolerance=1e-4):
    return abs(a-b) <= max(abs(a), abs(b)) * tolerance
assert approx_equal(42, 42.0000001)
assert not approx_equal(42, 42.01)



def get_phenolist():
    # TODO: should this be memoized?
    from .file_utils import common_filepaths
    filepath = common_filepaths['phenolist']
    try:
        with open(os.path.join(filepath)) as f:
            phenolist = json.load(f)
    except (FileNotFoundError, PermissionError):
        raise PheWebError(
            "You need a file to define your phenotypes at '{}'.\n".format(filepath) +
            "For more information on how to make one, see <https://github.com/statgen/pheweb#3-make-a-list-of-your-phenotypes>")
    except json.JSONDecodeError as exc:
        raise PheWebError("Your file at '{}' contains invalid json.\n".format(filepath)) from exc
    for pheno in phenolist:
        pheno['phenocode'] = urllib.parse.quote_plus(pheno['phenocode'])
    return phenolist


def pad_gene(start, end):
    # We'd like to get 100kb on each side of the gene.
    # But max-region-length is 500kb, so let's try not to exceed that.
    # Maybe this should only go down to 1 instead of 0. That's confusing, let's just hope this works.
    if start < 1e5:
        if end > 5e5: return (0, end)
        if end > 4e5: return (0, 5e5)
        return (0, end + 1e5)
    padding = boltons.mathutils.clamp(5e5 - (end - start), 0, 2e5)
    return (int(start - padding//2), int(end + padding//2))
assert pad_gene(1000,     2345) == (0,      102345)
assert pad_gene(1000,   400000) == (0,      500000)
assert pad_gene(200000, 400000) == (100000, 500000)
assert pad_gene(200000, 500000) == (100000, 600000)
assert pad_gene(200000, 500001) == (100001, 600000)
assert pad_gene(200000, 600000) == (150000, 650000)
assert pad_gene(200000, 700000) == (200000, 700000)
assert pad_gene(200000, 800000) == (200000, 800000)


chrom_order_list = [str(i) for i in range(1,22+1)] + ['X', 'Y', 'MT']
chrom_order = {chrom: index for index,chrom in enumerate(chrom_order_list)}
chrom_aliases = {'23': 'X', '24': 'Y', '25': 'MT', 'M': 'MT'}


def get_gene_tuples(include_ensg=False):
    from .file_utils import common_filepaths
    with open(common_filepaths['genes']) as f:
        for row in csv.reader(f, delimiter='\t'):
            assert row[0] in chrom_order, row[0]
            if include_ensg:
                yield (row[0], int(row[1]), int(row[2]), row[3], row[4])
            else:
                yield (row[0], int(row[1]), int(row[2]), row[3])
