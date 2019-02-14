from .data_access import DataFactory
from concurrent.futures import ThreadPoolExecutor
from ..utils import get_phenolist, get_gene_tuples, pad_gene
import functools
from collections import defaultdict
import traceback

class ServerJeeves(object):
    '''
        Class that handles data aggregation and munging for server.py
        and other external programs That needs access to the same information as pheweb delivers.
        Relies on pheweb main configuration file defined in config.py
    '''

    def __init__(self, server_conf):
        self.conf = server_conf
        self.dbs_fact = DataFactory( self.conf.database_conf  )
        self.annotation_dao = self.dbs_fact.get_annotation_dao()
        self.gnomad_dao = self.dbs_fact.get_gnomad_dao()
        self.lof_dao = self.dbs_fact.get_lof_dao()
        self.result_dao = self.dbs_fact.get_result_dao()
        self.ukbb_dao = self.dbs_fact.get_UKBB_dao()
        self.ukbb_matrixdao =self.dbs_fact.get_UKBB_dao(True)
        self.threadpool = ThreadPoolExecutor(max_workers=4)
        self.phenos = {pheno['phenocode']: pheno for pheno in get_phenolist()}

    def gene_functional_variants(self, gene, pThreshold=None):

        if pThreshold is None:
            pThreshold = self.conf.report_conf["func_var_assoc_threshold"]

        gene = gene.upper()
        annotations = self.annotation_dao.get_gene_functional_variant_annotations(gene)
        for i in range(len(annotations)):
            chrom, pos, ref, alt = annotations[i]["id"].split(":")
            chrom = chrom.replace("chr", "")
            result = self.result_dao.get_variant_results_range(chrom, int(pos), int(pos))
            filtered = { "rsids": result[0]["assoc"]["rsids"], "significant_phenos": [res for res in result if res["assoc"]["pval"] < pThreshold ] }
            for ph in filtered["significant_phenos"]:
                var = ph["assoc"]["id"].split(":")
                var[1] = int(var[1])
                uk_var = self.ukbb_dao.get_matching_results(ph["pheno"]["phenocode"], [var])
                if(len(uk_var)>0):
                    ph["ukbb"] =uk_var[ph["assoc"]["id"]]

            annotations[i] = {**annotations[i], **filtered}
        ids = [v["id"] for v in annotations]
        gnomad = gnomad_dao.get_variant_annotations(ids)
        gd = {i['id']: i['var_data'] for i in gnomad}
        for v in annotations:
            if v['id'] in gd:
                v['gnomad'] = gd[v['id']]
        return annotations

    def gene_phenos(self, gene):

        gene = gene.upper()
        gene_region_mapping = self.get_gene_region_mapping()
        chrom, start, end = gene_region_mapping[gene]
        start, end = pad_gene(start, end)
        results = self.result_dao.get_variant_results_range(chrom, start, end)
        ids = list(set([pheno['assoc']['id'] for pheno in results]))

        varpheno = defaultdict(lambda: [])
        for p in results:
            var =p['assoc']['id']
            varpheno[var].append( p['pheno']['phenocode'])

        gnomad = self.gnomad_dao.get_variant_annotations(ids)
        gd = {i['id']: i['var_data'] for i in gnomad}

        ukbbs = self.ukbb_matrixdao.get_multiphenoresults(varpheno)
        for pheno in results:
            gnomad_id = pheno['assoc']['id'].replace('chr', '').replace(':', '-')

            var = pheno['assoc']['id'].split(":")
            var[1] = int(var[1])
            #uk_var = ukbb_matrixdao.get_matching_results( pheno['pheno']['phenocode'], tuple(var) )
            if pheno['assoc']['id'] in ukbbs and pheno['pheno']['phenocode'] in ukbbs[pheno['assoc']['id']]:
                pheno['assoc']['ukbb'] = ukbbs[pheno['assoc']['id']][pheno['pheno']['phenocode']]

            if pheno['assoc']['id'] in gd:
                pheno['assoc']['gnomad'] = gd[pheno['assoc']['id']]


        return results

    def get_gene_lofs(self, gene):
        lofs = self.lof_dao.get_lofs(gene)
        for lof in lofs:
            if 'phenostring' in self.phenos[lof['gene_data']['pheno']]:
                lof['gene_data']['phenostring'] = self.phenos[lof['gene_data']['pheno']]['phenostring']
            else:
                lof['gene_data']['phenostring'] = ""
        return lofs

    def get_gene_drugs(self, gene):
        try:
            drugs = self.dbs_fact.get_drug_dao().get_drugs(gene)
            return drugs
        except Exception as exc:
            print("Could not fetch drugs for gene {!r}. Error: {}".format(gene,traceback.extract_tb(exc.__traceback__).format() ))
            raise

    @functools.lru_cache(None)
    def get_gene_region_mapping(self):
        return {genename: (chrom, pos1, pos2) for chrom, pos1, pos2, genename in get_gene_tuples()}
