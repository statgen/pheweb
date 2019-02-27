from .data_access import DataFactory
from .data_access.db import Variant, PhenoResult
from concurrent.futures import ThreadPoolExecutor
from ..utils import get_phenolist, get_gene_tuples, pad_gene
import functools
from collections import defaultdict
import traceback
import time
from ..file_utils import common_filepaths
import json

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
        startt = time.time()
        func_var_annot = self.annotation_dao.get_gene_functional_variant_annotations(gene)
        print(" gene functional variantts took {}".format( time.time()-startt) )
        remove_indx =[]
        chrom,start,end = self.get_gene_region_mapping()[gene]
        startt = time.time()
        ## if there are not many functional variants and gene is large it is better to get them one by one 
        results = self.result_dao.get_variant_results( func_var_annot )
        print(" gene variant results for func annot n={} took {}".format(len(func_var_annot),time.time()-startt) )

        res_indx = { v:(v,p) for v,p in results }

        for i,var in enumerate(func_var_annot):
            if  var not in res_indx:
                # variants found in annotations but they have been filtered out from results. Add in decreasing order for easy 
                # removal 
                remove_indx.insert(0,i)
                continue

            ## nearest gene and rsids are in result file although logically would belong to annotations. override variant to get the annotations.
            func_var_annot[i].rsids =  res_indx[var][0].rsids
            func_var_annot[i].add_annotation("nearest_gene", res_indx[var][0].get_annotation("nearest_gene"))
            res = res_indx[var]
            phenos = res[1] 
            filtered = { "rsids": res[0].get_annotation('rsids'), "significant_phenos": [res for res in phenos if res.pval is not None and res.pval < pThreshold ] }
            for ph in filtered["significant_phenos"]:
                uk_var = self.ukbb_dao.get_matching_results(ph.phenocode, [var])
                if(len(uk_var)>0):
                    ph.add_matching_result("ukbb",uk_var[var])

            func_var_annot[i] = {'var':func_var_annot[i], **filtered}
            
        for i in remove_indx:
            del func_var_annot[i]
        
        vars = [v["var"] for v in func_var_annot]
        startt = time.time()
        print("getting gnomad")
        gnomad = self.gnomad_dao.get_variant_annotations(vars)
        print(" gnomad took {}".format( time.time()-startt) )

        gd = {g['variant']:g["var_data"] for g in gnomad}

        for v in func_var_annot:
            if v['var'] in gd:
                v['var'].add_annotation("gnomad",gd[v['var']])
        
        return func_var_annot

    def gene_phenos(self, gene):
        print('jeevesing {}'.format(gene))
        gene = gene.upper()
        gene_region_mapping = self.get_gene_region_mapping()

        if gene not in gene_region_mapping:
            print("its not in mapping!!!!!")
            return []
        chrom, start, end = gene_region_mapping[gene]
        start, end = pad_gene(start, end)
        starttime = time.time()
        print("getting top phenos:")
        results = self.result_dao.get_top_per_pheno_variant_results_range(chrom, start, end)
        print("get top per pheno variants  took {} seconds".format(time.time()-starttime))
        vars = list(set([pheno['variant'] for pheno in results]))
        if len(results)==0:
            print("no variants in gene {}. Chr: {} pos:{}".format(gene,start,end))
            return []
        varpheno = defaultdict(lambda: [])
        for p in results:
            varpheno[p['variant']].append( p['assoc'].phenocode )
        
        starttime = time.time()
        gnomad = self.gnomad_dao.get_variant_annotations(vars)

        print("gnomad variant annos took {} seconds".format(time.time()-starttime))
        gd = { g['variant']:g['var_data'] for g in gnomad}
        starttime = time.time()
        ukbbs = self.ukbb_matrixdao.get_multiphenoresults(varpheno, known_range=(chrom,start,end))
        print("UKB fetching for {} variants took {}".format( len( list(varpheno.keys()) ),time.time()-starttim) )
        for pheno in results:
            if pheno['variant'] in ukbbs and pheno['assoc'].phenocode in ukbbs[pheno['variant']]:
                pheno['assoc'].add_matching_result('ukbb', ukbbs[pheno['variant']][pheno['assoc'].phenocode])

            if pheno['variant'] in gd:
                pheno['variant'].add_annotation('gnomad', gd[pheno['variant']])

        return results

    def get_gene_lofs(self, gene):
        lofs = self.lof_dao.get_lofs(gene)
        for lof in lofs:
            if lof['gene_data']['pheno'] in self.phenos and 'phenostring' in self.phenos[lof['gene_data']['pheno']]:
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

    def get_pheno(self, phenocode):
        with open(common_filepaths['manhattan'](phenocode)) as f:
            variants = json.load(f)

        vars = [ Variant( d['chrom'].replace("chr","").replace("X","23").replace("Y","24").replace("MT","25"), d['pos'], d['ref'], d['alt'] ) for d in variants['unbinned_variants'] if 'peak' in d ]

        f_annotations = self.threadpool.submit( self.annotation_dao.get_variant_annotations, vars)
        f_gnomad = self.threadpool.submit( self.gnomad_dao.get_variant_annotations, vars)
        annotations = f_annotations.result()
        gnomad = f_gnomad.result()
        d = { v["variant"]:v['var_data']  for v in annotations }
        gd = { v['variant']:v['var_data'] for v in gnomad}

        ukbbvars = self.ukbb_dao.get_matching_results(phenocode, vars)

        for variant in variants['unbinned_variants']:
            if 'peak' in variant:
                ## TODO remove chr dickery when new annots ready
                chrom =  variant['chrom'].replace("chr","").replace('X','23').replace('Y','24').replace("MT","25")
                v = Variant( chrom, variant['pos'], variant['ref'], variant['alt'])
                if v in d:
                    variant['annotation'] = d[v]
                if v in gd:
                    variant['gnomad'] = gd[v]

                if v in ukbbvars:
                    variant['ukbb'] = ukbbvars[v]

        return variants

    def get_single_variant_data(self, variant: Variant):
        r = self.result_dao.get_variant_results(variant)
        annot = self.annotation_dao.get_variant_annotations([variant])

        if r is not None:
            var = r[0]
            annot[0]['var_data']['rsids'] = var.get_annotation("rsids")
            annot[0]['var_data']['nearest_genes'] = var.get_annotation("nearest_gene")
            phenos = [ p.phenocode for p in r[1]]
            ukb = self.ukbb_matrixdao.get_multiphenoresults( {variant:phenos} )
            if var in ukb:
                ukb_idx = { u:u for u in ukb[var] }
                for res in r[1]:
                    if res.phenocode in ukb_idx:
                        res.add_matching_result('ukbb',ukb[var][res.phenocode])
        else:
            return None
        return {"var":r[0],"annotation":annot[0]['var_data'],"results":r[1]}

    @functools.lru_cache(None)
    def get_gene_region_mapping(self):
        return {genename: (chrom, pos1, pos2) for chrom, pos1, pos2, genename in get_gene_tuples()}
