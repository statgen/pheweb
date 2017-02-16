
from .. import utils
conf = utils.conf

import pysam
import os
import json

def run(argv):

    out_fname = os.path.join(conf.data_dir, 'best-phenos-by-gene.json')
    matrix_fname = os.path.join(conf.data_dir, 'matrix.tsv.gz')

    if not os.path.exists(out_fname) or os.stat(matrix_fname).st_mtime > os.stat(out_fname).st_mtime:

        rv = {}

        tabix_file = pysam.TabixFile(matrix_fname)
        phenos = utils.get_phenos_with_colnums()

        for chrom, start, end, gene_symbol in utils.get_gene_tuples():
            start, end = utils.pad_gene(start, end)
            # This dictionary will only contain p-values < MIN_PVALUE_TO_SHOW .
            best_assoc_for_pheno = {}

            if chrom in tabix_file.contigs:
                tabix_iter = tabix_file.fetch(chrom, start, end+1, parser = pysam.asTuple())
                for variant_row in tabix_iter:
                    for phenocode, pheno in phenos.items():
                        pval = variant_row[pheno['colnum']['pval']]
                        if pval == '.': continue
                        pval = float(pval)
                        if phenocode not in best_assoc_for_pheno or pval < best_assoc_for_pheno[phenocode]['pval']:
                            assoc = {}
                            assoc['pval'] = pval
                            assoc['maf'] = float(variant_row[6])
                            if variant_row[4]:
                                assoc['rsid'] = variant_row[4]
                            for key, colnum in pheno['colnum'].items():
                                if key == 'pval': continue
                                val = variant_row[colnum]
                                if key in ['beta', 'sebeta']:
                                    try: val = float(val)
                                    except: pass
                                assoc[key] = val
                            best_assoc_for_pheno[phenocode] = assoc

            if best_assoc_for_pheno:
                # decide how many phenotypes to include.
                # we want to show all significant phenotypes.
                # we always want at least three phenotypes.
                for phenocode, assoc in best_assoc_for_pheno.items():
                    assoc['phenocode'] = phenocode
                phenos_in_gene = sorted(best_assoc_for_pheno.values(), key=lambda a:a['pval'])
                biggest_idx_to_include = 2
                for idx in range(biggest_idx_to_include, len(phenos_in_gene)):
                    if phenos_in_gene[idx]['pval'] < 5e-8:
                        biggest_idx_to_include = idx
                    elif idx < 10 and phenos_in_gene[idx]['pval'] < 10 ** (-4 - idx//2):
                        # include at most ten phenos if they're not genome-wide significant.  I just made up this formula.
                        biggest_idx_to_include = idx
                    else:
                        break
                phenos_in_gene = phenos_in_gene[:biggest_idx_to_include + 1]

                rv[gene_symbol] = phenos_in_gene

        with open(out_fname, 'w') as f:
            json.dump(rv, f)
        print('Wrote best-phenos-by-gene to {!r}'.format(out_fname))
    else:
        print('{!r} is up-to-date!'.format(out_fname))
