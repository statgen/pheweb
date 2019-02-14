
from ..file_utils import common_filepaths
from ..conf_utils import conf
from ..serve.server_jeeves import ServerJeeves
from flask.json import dump



import argparse
import numpy as np


def run(argv):
    parser = argparse.ArgumentParser(description="Export data of pheweb installation")
    parser.add_argument("outpath",
                        help="Output path",)
    parser.add_argument("--gene_report", action="store_true")

    args = parser.parse_args(argv)

    jeeves = ServerJeeves( conf)
    if args.gene_report:
        export_gene_reports(args, jeeves, args.outpath)

#/api/gene_phenos/[gene]
#/api/drugs/[gene]
#/api/lof/[gene]
#/api/gene_functional_variants/[gene]?p=0.0001

def export_gene_reports(args, jeeves, outpath):
    print(common_filepaths["genes"])
    print("Exporting data for genes: {}".format(common_filepaths["genes"]))
    geneList = np.loadtxt(common_filepaths['genes'],dtype = str,usecols = (3,))
    print("Generating data for : {} genes".format( len(geneList) ))

    for gene in geneList:
        func_vars = jeeves.gene_functional_variants(gene)
        gene_phenos = jeeves.gene_phenos(gene)
        gene_lofs = jeeves.get_gene_lofs(gene)
        gene_drugs = jeeves.get_gene_drugs(gene)
        data = {"func_vars":func_vars, "gene_phenos":gene_phenos, "gene_lofs":gene_lofs, "gene_drugs":gene_drugs}
        with open("{}/{}_{}".format(outpath,gene,"_report_data.json"), 'wt') as f:
            dump(data, f )
