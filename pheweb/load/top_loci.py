
from .. import utils
conf = utils.conf

import json
import csv
import os.path

LOCI_SPREAD_FROM_BEST_HIT = int(500e3)
LOCI_SPREAD_FROM_BEST_HIT_WITHIN_PHENOTYPE = int(1e6)
PVAL_CUTOFF = 1e-6

def get_hits():
    phenos = utils.get_phenolist()

    hits_by_chrom = dict()
    for pheno in phenos:
        fname = os.path.join(conf.data_dir, 'manhattan/{}.json'.format(pheno['phenocode']))
        with open(fname) as f:
            variants = json.load(f)['unbinned_variants']

        for v in variants:
            if v['pval'] <= PVAL_CUTOFF:
                v['phenocode'] = pheno['phenocode']
                v.pop('show_gene', None)
                try: v['phenostring'] = pheno['phenostring']
                except KeyError: pass
                v['nearest_genes'] = sorted(v['nearest_genes'].split(','))
                hits_by_chrom.setdefault(v['chrom'], []).append(v)

    for hits in hits_by_chrom.values():
        while hits:
            best_hit = min(hits, key=lambda hit: hit['pval'])
            remaining_hits = []
            for h in hits:
                if h is best_hit: continue
                if h['phenocode'] == best_hit['phenocode']:
                    if abs(h['pos'] - best_hit['pos']) >= LOCI_SPREAD_FROM_BEST_HIT_WITHIN_PHENOTYPE:
                        remaining_hits.append(h)
                elif abs(h['pos'] - best_hit['pos']) >= LOCI_SPREAD_FROM_BEST_HIT:
                    remaining_hits.append(h)
            hits = remaining_hits
            yield best_hit

def run(argv):

    hits = sorted(get_hits(), key=lambda hit: hit['pval'])
    out_fname = os.path.join(conf.data_dir, 'top_loci.json')
    with open(out_fname, 'w') as f:
        json.dump(hits, f, sort_keys=True, indent=0)
    print("wrote {} hits to {}".format(len(hits), out_fname))

    for h in hits: h['nearest_genes'] = ','.join(h['nearest_genes'])
    out_fname = os.path.join(conf.data_dir, 'top_loci.tsv')
    with open(out_fname, 'w') as f:
        fieldnames = 'chrom pos ref alt rsids maf pval'.split()
        fieldnames = fieldnames + list(set(hits[0].keys()) - set(fieldnames))
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter='\t')
        writer.writeheader()
        writer.writerows(hits)
    print("wrote {} hits to {}".format(len(hits), out_fname))


if __name__ == '__main__':
    run([])
