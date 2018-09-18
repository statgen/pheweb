
from ..conf_utils import conf
from ..file_utils import write_json, write_heterogenous_variantfile, common_filepaths

from .top_hits import get_all_hits, stringify_assocs


def get_loci():
    hits = get_all_hits()

    hits_by_chrom = dict()
    for hit in hits:
        hits_by_chrom.setdefault(hit['chrom'], []).append(hit)

    for hits in hits_by_chrom.values():
        while hits:
            best_assoc = min(hits, key=lambda assoc: assoc['pval'])
            yield best_assoc
            hits = [h for h in hits if abs(h['pos'] - best_assoc['pos']) > conf.between_pheno_mask_around_peak]


def run(argv):
    out_filepath_json = common_filepaths['top-loci']
    out_filepath_tsv = common_filepaths['top-loci-tsv']

    if argv and argv[0] == '-h':
        print('''
Make lists of top loci for this PheWeb in {} and {}.

To count as a top loci, a variant must:
- have a p-value < {}
- be among the top {:,} associations in its phenotype
- have the smallest p-value within {:,} bases within its phenotype (well, not exactly, but pretty much)
- have the smallest p-value within {:,} bases (well, not exactly, but pretty much)

Each loci will include the phenotype that has the smallest p-value at that location.
Even if this loci also contains significant hits for other phenotypes, they won't be
shown.  If you want all hits, use `pheweb top-hits`.
'''.format(out_filepath_json,
           out_filepath_tsv,
           '{:0.0e}'.format(conf.top_hits_pval_cutoff).replace('e-0', 'e-'),
           conf.manhattan_num_unbinned,
           conf.within_pheno_mask_around_peak,
           conf.between_pheno_mask_around_peak,
))
        exit(1)

    loci = sorted(get_loci(), key=lambda l: l['pval'])
    write_json(filepath=out_filepath_json, data=loci, sort_keys=True)
    print("wrote {} loci to {}".format(len(loci), out_filepath_json))

    stringify_assocs(loci)
    write_heterogenous_variantfile(out_filepath_tsv, loci)
    print("wrote {} loci to {}".format(len(loci), out_filepath_tsv))
