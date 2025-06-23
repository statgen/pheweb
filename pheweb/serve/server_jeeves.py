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
import pandas as pd
import glob
import math
from pheweb.serve.data_access.finemapping import region_summary
from pheweb.serve.data_access.finemapping_susie import parse_susie
from pheweb.serve.data_access.finemapping_conditional import parse_conditional
from pheweb.serve.data_access.finemapping_finemap import parse_finemap_dict_list
from typing import List, Dict,Tuple, Union
from .server_utils import get_pheno_region

def annotate_manhattan(*,
                       threadpool,
                       manhattan_filepath : str,
                       annotation_dao,
                       gnomad_dao,
                       anno_cpra,
                       ):
        with open(manhattan_filepath, encoding="utf-8") as f:
            variants = json.load(f)

        vars = [ Variant( d['chrom'].replace("chr","").replace("X","23").replace("Y","24").replace("MT","25"), d['pos'], d['ref'], d['alt'] ) for d in variants['unbinned_variants'] if 'peak' in d ]

        f_annotations = threadpool.submit( annotation_dao.add_variant_annotations,
                                           vars,
                                           anno_cpra)
        f_gnomad = threadpool.submit( gnomad_dao.get_variant_annotations,
                                           vars)

        annotations = f_annotations.result()
        gnomad = f_gnomad.result()
        d = { v:v  for v in annotations }
        # TODO... refactor gnomaddao to behave similary as annotation dao i.e. returning stuff as Variant annotations.
        gd = { v["variant"]:v["var_data"] for v in gnomad}

        for variant in variants['unbinned_variants']:
            ## TODO remove chr dickery when new annots ready

            chrom =  variant['chrom'].replace("chr","").replace('X','23').replace('Y','24').replace("MT","25")
            v = Variant( chrom, variant['pos'], variant['ref'], variant['alt'])
            if v in d:
                variant['annotation'] = d[v].get_annotations()["annot"]
            if v in gd:
                variant['gnomad'] = gd[v]

        return variants
        
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
        self.coding_dao = self.dbs_fact.get_coding_dao()
        self.chip_dao = self.dbs_fact.get_chip_dao()
        self.finemapping_dao = self.dbs_fact.get_finemapping_dao()
        self.missing_variant_dao = self.dbs_fact.get_missing_variant_dao()
        self.knownhits_dao = self.dbs_fact.get_knownhits_dao()
        self.autoreporting_dao = self.dbs_fact.get_autoreporting_dao()
        self.colocalization = self.dbs_fact.get_colocalization_dao()
        self.variant_phenotype = self.dbs_fact.get_variant_phenotype_dao()
        self.threadpool = ThreadPoolExecutor(max_workers= self.conf.n_query_threads)
        self.phenos = {pheno['phenocode']: pheno for pheno in get_phenolist()}
        self.autocompleter_dao = self.dbs_fact.get_autocompleter_dao()
        self.pqtl_colocalization = self.dbs_fact.get_pqtl_colocalization_dao()
        self.health_dao = self.dbs_fact.get_health_dao()
        self.manhattan_dao = self.dbs_fact.get_manhattan_dao()
        
    def gene_functional_variants(self, gene, pThreshold=None, use_aliases=None):
        if pThreshold is None:
            pThreshold = self.conf.report_conf["func_var_assoc_threshold"]

        startt = time.time()
        func_var_annot = self.annotation_dao.get_gene_functional_variant_annotations(gene, use_aliases=use_aliases)
        print(" gene functional variants took {}".format( time.time()-startt) )
        remove_indx =[]
        chrom,start,end = self.get_gene_region_mapping()[gene]

        startt = time.time()
        ## if there are not many functional variants and gene is large it is better to get them one by one
        results = self.result_dao.get_variant_results_range( chrom, start, end )

        # add rsids
        vars_anno = self.annotation_dao.add_variant_annotations_range(chrom, start, end, self.conf.anno_cpra)
        rsids = { v : v.annotation['annot']['rsid'] for v in vars_anno }
        for r in results:
            if r[0] in rsids:
                r[0].add_annotation("rsids", rsids[r[0]])

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
        gnomad = self.gnomad_dao.get_variant_annotations(vars)
        print(" gnomad took {}".format( time.time()-startt) )

        gd = {g['variant']:g["var_data"] for g in gnomad}

        for v in func_var_annot:
            if v['var'] in gd:
                v['var'].add_annotation("gnomad",gd[v['var']])

        return func_var_annot

    def gene_phenos(self, gene):

        gene_region_mapping = self.get_gene_region_mapping()

        if gene not in gene_region_mapping:
            return []
        chrom, start, end = gene_region_mapping[gene]
        start, end = pad_gene(start, end)
        starttime = time.time()
        results = self.result_dao.get_top_per_pheno_variant_results_range(chrom, start, end)

        # add rsids
        vars_anno = self.annotation_dao.add_variant_annotations_range(chrom, start, end, self.conf.anno_cpra)
        rsids = {v : v.annotation['annot']['rsid'] for v in vars_anno }
        for r in results:
            if r.variant in rsids:
                r.variant.add_annotation("rsids", rsids[r.variant])

        print(" get top per pheno variants  took {} seconds".format(time.time()-starttime))
        vars = list(set([pheno.variant for pheno in results]))
        if len(results)==0:
            print("no variants in gene {}. Chr: {} pos:{}".format(gene,start,end))
            return []
        varpheno = defaultdict(lambda: [])
        for p in results:
            varpheno[p.variant].append( p.assoc.phenocode )

        starttime = time.time()
        gnomad = self.gnomad_dao.get_variant_annotations(vars)

        print("gnomad variant annos took {} seconds".format(time.time()-starttime))
        gd = { g['variant']:g['var_data'] for g in gnomad}
        starttime = time.time()

        ukbbs = self.ukbb_matrixdao.get_multiphenoresults(varpheno, known_range=(chrom,start,end))
        print("UKB fetching for {} variants took {}".format( len( list(varpheno.keys()) ),time.time()-starttime) )
        for pheno in results:
            if pheno.variant in ukbbs and pheno.assoc.phenocode in ukbbs[pheno.variant]:
                pheno.assoc.add_matching_result('ukbb', ukbbs[pheno.variant][pheno.assoc.phenocode])
            if pheno.variant in gd:
                pheno.variant.add_annotation('gnomad', gd[pheno.variant])

        return results

    def get_all_lofs(self, threshold):
        if self.lof_dao is None:
            return None
        lofs = self.lof_dao.get_all_lofs(threshold)
        for i in range( len(lofs)-1,-1,-1):
            ## lof data is retrieved externally so it can be out of sync with phenotypes that we want to show
            # TODO: alerting mechanism + test cases for installation to detect accidental out of sync issues.
            lof = lofs[i]
            if lof['gene_data']['pheno'] not in self.phenos:
                del lofs[i]
            else:
                lof['gene_data']['phenostring'] = self.phenos[lof['gene_data']['pheno']]['phenostring']
        return lofs

    def get_gene_lofs(self, gene):
        try:
            lofs = self.lof_dao.get_lofs(gene) if self.lof_dao is not None else []
        except Exception as exc:
            print("Could not fetch LoFs for gene {!r}. Error: {}".format(gene,traceback.extract_tb(exc.__traceback__).format() ))
            raise
        return lofs

    def get_gene_data(self, gene):
        try:
            print(gene)
            print(self.dbs_fact.get_geneinfo_dao)
            gene_data = self.dbs_fact.get_geneinfo_dao().get_gene_info(gene)
        except Exception as exc:
            print("Could not fetch data for gene {!r}. Error: {}".format(gene,traceback.extract_tb(exc.__traceback__).format() ))
            raise
        return gene_data

    def get_gene_drugs(self, gene):
        try:
            drugs = self.dbs_fact.get_drug_dao().get_drugs(gene)
            return drugs
        except Exception as exc:
            print("Could not fetch drugs for gene {!r}. Error: {}".format(gene,traceback.extract_tb(exc.__traceback__).format() ))
            raise

    def get_pheno_manhattan(self, phenocode) -> str:
        manhattan_filepath = common_filepaths['manhattan'](phenocode)    
        if self.manhattan_dao is None:
                manhattan = annotate_manhattan(threadpool=self.threadpool,
                                               manhattan_filepath=manhattan_filepath,
                                               annotation_dao=self.annotation_dao,
                                               gnomad_dao=self.gnomad_dao,
                                               anno_cpra=self.conf.anno_cpra)
        else:
                manhattan = self.manhattan_dao.get_resource(manhattan_filepath,
                                                            phenocode=phenocode,
                                                            filepath=manhattan_filepath)
        return manhattan

    def get_single_variant_pheno_data(self, variant: Variant, pheno: str):
        """
            Returns summary statistics for a single variant and a single phenotype.
        """
        variants = get_pheno_region(pheno, str(variant.chr), variant.pos, variant.pos)['data']

        # get cols from results by get_pheno_region function and reaname
        cols = {'beta': 'beta', 'mlogp': 'mlogp', 'pvalue': 'pval', 'maf_cases': 'maf_case', 'maf_controls': 'maf_control'}
        if len(variants.items()) > 0:
            for i in range(len(variants['ref'])):
                if variants['ref'][i] == variant.ref and variants['alt'][i] == variant.alt:
                    res = {j:variants[j][i] for j in variants}
                    res = {cols[key]: res[key] for key in cols if key in res }
                    break
            return res
        else:
            return {}

    def get_single_variant_data(self, variant: Variant)-> Tuple[Variant, List[PhenoResult]]:
        """
            Returns association results and basic annotations for a single variant. Returns tuple with variant and phenoresults.
        """

        variant_annotated = None
        single_variant_results = self.result_dao.get_single_variant_results(variant)
        if single_variant_results is not None:
            single_variant, pheno_results = single_variant_results
            variant_annotated = self.annotation_dao.add_single_variant_annotations(single_variant, self.conf.anno_cpra)
            if variant_annotated is None:
                ## no annotations found even results were found. Should not happen except if the results and annotation files are not in sync
                print("Warning! Variant results for " + str(single_variant) + " found but no basic annotation!")
                variant_result = single_variant
                variant_result.add_annotation("annot", {})
            else:
                variant_result = variant_annotated
            # add rsids from variant annotation if wasn't available in the merged sumstat matrix
            if variant_result.rsids is None:
                variant_result.add_annotation("rsids", variant_result.annotation['annot']['rsid'])

            gnomad = self.gnomad_dao.get_variant_annotations([variant_result])
            if len(gnomad) == 1:
                variant_result.add_annotation('gnomad', gnomad[0]['var_data'])

            phenos = [ p.phenocode for p in pheno_results]
            uk_biobank = self.ukbb_matrixdao.get_multiphenoresults( {variant:phenos} )
            phenotype = self.variant_phenotype.get_variant_phenotype(int(variant.chr),int(variant.pos),variant.ref,variant.alt) if self.variant_phenotype else dict()
            for res in pheno_results:
                if res.phenocode in phenotype:
                    res.set_suplementary(phenotype[res.phenocode])

            if variant_result in uk_biobank:
                ukb_idx = { u:u for u in uk_biobank[variant_result] }
                for res in pheno_results:
                    if res.phenocode in ukb_idx:
                        res.add_matching_result('ukbb',uk_biobank[variant_result][res.phenocode])

            return variant_result,pheno_results
        else:
            return None

    def add_annotations(self, chr, start, end, datalist):
        if chr == 'X':
            chr = 23
        if start == 0:
            start = 1
        t = time.time()
        # TODO tabix fetch takes forever, combine FG and gnomAD annotations and use relevant columns only, or get annotations on the fly for individual variant
        print(f'getting annotation for region {chr} {start} {end}')
        annotations = self.annotation_dao.add_variant_annotations_range(chr, start, end, self.conf.anno_cpra)
        annot_hash = { anno.varid: anno.get_annotations() for anno in annotations }

        check = self.annotation_dao.add_variant_annotations_range(chr, 112756070, 112756070, self.conf.anno_cpra)
       ## 10:112756070:A:G
        print(f'this is it {check}')
        print(f'annot keys {list(annot_hash.keys())[0:4]}')

        gnomad = self.gnomad_dao.get_variant_annotations_range(chr, start, end)
        gnomad_hash = { anno.varid: anno.get_annotations() for anno in gnomad }
        print("getting annotations for {} bp took {} seconds".format(end-start+1, time.time()-t ) )
        for d in datalist:
            print('n variants ' + str(len(d['data']['id'])))
            d['data']['varid'] = []
            d['data']['fin_enrichment'] = []
            d['data']['most_severe'] = []
            d['data']['AF'] = []
            d['data']['INFO'] = []
            hasvar=True
            for i,r in enumerate(d['data']['id']):
                varid = r.replace('X', '23').replace('_', ':').replace('/', ':')
                d['data']['varid'].append(varid)
                try:
                    if not varid in annot_hash:
                        vid = varid.split(":")
                        if (int(vid[1])>start and int(vid[1])<end):
                            print(f'omg it\'s not {varid}')
                            return

                        d['data']['most_severe'].append('NA')
                        d['data']['AF'].append('NA')
                        d['data']['INFO'].append('NA')
                        d['data']['fin_enrichment'].append('Unknown')
                        continue

                    a = annot_hash[varid]['annot']
                    ms = (a['most_severe'] if 'most_severe' in a else (a['consequence'] if 'consequence' in a else 'unknown')).replace('_', ' ')
                    d['data']['most_severe'].append(ms)
                    d['data']['AF'].append(a['AF'] if 'AF' in a else 'NA')
                    d['data']['INFO'].append(a['INFO'] if 'INFO' in a else 'NA')
                    if varid not in gnomad_hash:
                        d['data']['fin_enrichment'].append('No gnomAD data')
                    else:
                        g = gnomad_hash[varid]['gnomad']
                        if 'enrichment_nfe' in g:
                            d['data']['fin_enrichment'].append(g['enrichment_nfe'])
                        elif 'AF_fin' in g and 'AC_nfe_nwe' in g and 'AC_nfe_onf' in g and 'AC_nfe_seu' in g:
                            if g['AF_fin'] == '.' or float(g['AF_fin']) == 0:
                                d['data']['fin_enrichment'].append('No FIN in gnomAD')
                            elif float(g['AC_nfe_nwe']) + float(g['AC_nfe_onf']) + float(g['AC_nfe_seu']) == 0:
                                d['data']['fin_enrichment'].append('No NFEE in gnomAD')
                            else:
                                d['data']['fin_enrichment'].append(round(float(g['AF_fin']) / ((float(g['AC_nfe_nwe']) + float(g['AC_nfe_onf']) + float(g['AC_nfe_seu'])) / (float(g['AN_nfe_nwe']) + float(g['AN_nfe_onf']) + float(g['AN_nfe_seu']))), 3))
                        else:
                            d['data']['fin_enrichment'].append('Unknown')

                except KeyError as ke:
                    ##print('no annotation for ' + varid + ', is annotation file out of sync or is the variant correctly id\'d?')
                    d['data']['most_severe'].append("NA")
                    d['data']['AF'].append('NA')
                    d['data']['INFO'].append('NA')
                    d['data']['fin_enrichment'].append('Unknown')
        return datalist

    def get_conditional_regions_for_pheno(self, phenocode, chr, start, end, p_threshold=None, add_anno=True):
        if p_threshold is None:
            p_threshold = self.conf.locuszoom_conf['p_threshold']
        regions = self.finemapping_dao.get_regions_for_pheno('conditional', phenocode, chr, start, end)
        ret = []

        t = time.time()
        min_start = 1e30
        max_end = -1
        for region in regions:
            if region['start'] < min_start:
                min_start = region['start']
            if region['end'] > max_end:
                max_end = region['end']
            data = []
            for i,path in enumerate(region['paths']):
                try:
                    df = parse_conditional(path, p_threshold)
                    d = df.to_dict(orient='list')
                    ret.append({'type': 'conditional', 'data': d, 'conditioned_on': region['conditioned_on'][i].replace('X','23'), 'lastpage': None})
                except FileNotFoundError:
                    print(f'file "{path}" not found')
        print(f'Region data taken for  {chr} {start} {end}')
        print("reading conditional files took {} seconds".format(time.time()-t ) )
        t = time.time()
        if len(ret) > 0 and add_anno:
            #self.add_annotations(chr, min_start, max_end, ret)
            ret = self.add_annotations(chr, start, end, ret)
            print("adding annotations to {} conditional results took {} seconds".format(len(ret), time.time()-t ) )
        return ret

    def get_finemapped_region_boundaries_for_pheno(self, fm_type, phenocode, chrom, start, end):
        return self.finemapping_dao.get_regions_for_pheno(fm_type, phenocode, chrom, start, end) if self.finemapping_dao is not None else None

    def get_finemapped_region_variant_summary(self, phenocode, chromosome, start, end, prob_threshold=-1):
        if self.finemapping_dao is None:
            return []
        regions = self.finemapping_dao.get_regions_for_pheno('all', phenocode, chromosome, start, end)
        index = {}
        for r in map(region_summary, regions):
            region_key = f"{r['chr']}:{r['start']}:{r['end']}"
            if region_key not in index:
                index[region_key] = { "location" : { "chromosome" : r['chr'],
                                                     "start" : r['start'],
                                                     "stop" : r['end'] },
                                     "credible_sets": [],
                                     "region_id" : region_key}
            index[region_key]["credible_sets"].append(r)
        result = list(index.values())
        result = sorted(result, key=lambda r: (r['location']['chromosome'], r['location']['start'], r['location']['stop']), reverse=True)
        return result
    
    def get_finemapped_regions_for_pheno(self, phenocode, chr, start, end, prob_threshold=-1, add_anno=True):
        regions = self.finemapping_dao.get_regions_for_pheno('finemapping', phenocode, chr, start, end)
        ret = []
        min_start = 1e30
        max_end = -1
        for region in regions:
            if region['start'] < min_start:
                min_start = region['start']
            if region['end'] > max_end:
                max_end = region['end']
            if region['type'] == 'susie':
                # TODO fix - chr X is 0 in the db, everything should be 23
                if region['chr'] == 0 or region['chr'] == 23:
                    region['chr'] = 'X'
                data = parse_susie(region)
                ret.append({'region': f"{region['chr']}:{region['start']}-{region['end']}",
                            'type': region['type'],
                            'data': data.reset_index().to_dict(orient='list'),
                            'lastpage': None})
            elif region['type'] == 'finemap':
                data = parse_finemap_dict_list(region['path'])
                ret.append({'region': f"{region['chr']}:{region['start']}-{region['end']}",
                            'type': region['type'],
                            'data': data,
                            'lastpage': None})
            else:
                print(f"UNSUPPORTED REGION TYPE: {region['type']}")
        if add_anno:
            self.add_annotations(chr, start, end, ret)
                
        return ret

    def get_max_finemapped_region(self, phenocode, chrom, start, end):
        return self.finemapping_dao.get_max_region(phenocode, chrom, start, end) if self.finemapping_dao is not None else []

    def get_finemapped_regions(self, variant: Variant):
        return self.finemapping_dao.get_regions(variant) if self.finemapping_dao is not None else []

    def get_missing_variant(self, variant: Variant):
        return self.missing_variant_dao.get_missing_variant(variant) if self.missing_variant_dao is not None else None

    def get_UKBB_n(self, phenocode):
        return self.ukbb_dao.getNs(phenocode) if self.ukbb_dao is not None else None

    def get_known_hits_by_loc(self, chrom, start, end):
        return self.knownhits_dao.get_hits_by_loc(chrom,start,end)

    def coding(self):
        return self.coding_dao.get_coding() if self.coding_dao is not None else None

    def chip(self):
        return self.chip_dao.get_chip() if self.chip_dao is not None else None

    @functools.lru_cache(None)
    def get_gene_region_mapping(self):
        return {genename: (chrom, pos1, pos2) for chrom, pos1, pos2, genename in get_gene_tuples()}

    @functools.lru_cache(None)
    def get_best_phenos_by_gene(self, gene):
        chrom,start,end = self.get_gene_region_mapping()[gene]
        results = self.result_dao.get_top_per_pheno_variant_results_range(chrom, start, end)
        phenolist_pval = [r.assoc.phenocode for r in results if hasattr(r.assoc, 'pval') and r.assoc.pval < 1e-08]
        phenolist_mlogp = [r.assoc.phenocode for r in results if hasattr(r.assoc, 'mlogp') and r.assoc.mlogp > 16.8]
        phenolist = phenolist_pval + phenolist_mlogp
        return phenolist

    def get_autoreport(self, phenocode) -> List[Dict[str,Union[str,int,float,bool]]] :
        """Get autoreporting group report data.
        If autoreporting dao is available, returns a list of records for that endpoint, otherwise None.
        If UKBB dao is available, augments loci with matching UKBB pvals and betas.
        """
        if (self.autoreporting_dao == None):
            return None
        data = self.autoreporting_dao.get_group_report(phenocode)
        #fix data representation
        for record in data:
            #replace float inf & nan values with strings
            for key in record.keys():
                if isinstance(record[key],float):
                    if math.isnan(record[key]):
                        record[key] = "NA"
                    elif record[key] == float("inf"):
                        record[key] = "inf"
                    elif record[key] == float("-inf"):
                        record[key] = "-inf"
            record["ukbb_pval"]="NA"
            record["ukbb_beta"]="NA"
        #if no UKBB DAO, return as is
        if self.ukbb_dao == None:
            return data
        # fill in ukbb data
        var_strs = [a["locus_id"].replace("chr","").split("_") for a in data]
        variants = [Variant(v[0],v[1],v[2],v[3]) for v in var_strs]
        ukbbvars = self.ukbb_dao.get_matching_results(phenocode, variants)
        ukbb_vals = {}
        for var in ukbbvars.keys():
            ukbb_vals["chr{}_{}_{}_{}".format(var.chr,var.pos,var.ref,var.alt)] = {
                "pval":ukbbvars[var]["pval"],
                "beta":ukbbvars[var]["beta"]

            }
        for r in data:
            if r["locus_id"] in ukbb_vals:
                r["ukbb_pval"] = ukbb_vals[r["locus_id"]]["pval"]
                r["ukbb_pval"] = ukbb_vals[r["locus_id"]]["beta"]
        return data


    def get_autoreport_variants(self, phenocode: str, locus_id: str) -> List[Dict[str,Union[str,int,float,bool]]]:
        """
        Get variants of locus for a given locus and endpoint. Returns a list of records, one record corresponding to a single variant.
        Record fields:
        variant
        pval
        mlogp
        beta
        most_severe_gene
        most_severe_consequence
        af_alt
        af_alt_cases
        af_alt_controls
        enrichment_nfsee
        cs_prob
        functional_category
        trait_name
        r2_to_lead
        INFO
        """
        abort = [a == None for a in [self.autoreporting_dao, self.annotation_dao]]
        if any(abort):
            return None
        data=self.autoreporting_dao.get_group_variants(phenocode, locus_id)
        if not data:
            return []
        #determine that columns are available:
        required_columns = [
            "variant",
            "pval",
            "mlogp",
            "beta",
            "most_severe_gene",
            "most_severe_consequence",
            "af_alt",
            "af_alt_cases",
            "af_alt_controls",
            "enrichment_nfsee",
            "cs_prob",
            "functional_category",
            "trait_name",
            "r2_to_lead",
            "INFO"
        ]
        #check for columns
        missing_columns = [a for a in required_columns if a not in data[0].keys()]
        missing_info = True if missing_columns == ["INFO"] else False
        if missing_columns not in [[],["INFO"]]:
            msg = f"Error in server_jeeves.get_autoreport_variants: Output of autoreporting_dao.get_group_variants is missing columns {missing_columns}, when only INFO is allowed to be missing. Check autoreporting db contents."
            print(msg)
            raise Exception(msg)
        #limit records to required columns
        limited_data = [
            {c:record.get(c,"NA") for c in required_columns}
            for record in data
        ]
        #aggregate trait names by ;
        aggregated = {}
        trait_merge_func = lambda a,b: ";".join( filter( lambda x: x != "NA" and x != "",set( (a,b) ) ) )
        for row in limited_data:
            if row["variant"] not in aggregated:
                aggregated[row["variant"]] = row
            else:
                aggregated[row["variant"]]["trait_name"] = trait_merge_func(aggregated[row["variant"]]["trait_name"],row["trait_name"])
        values = [a for a in aggregated.values()]

        if missing_info:

            #missing info, replace it from annotation file
            print("Warning: Missing INFO in autoreporting group variant table. Please update autoreporting mysql db with new import script.")

            list_of_vars = []
            variants = list(set([a["variant"] for a in values]))
            for variant in variants:
                v=variant.replace("chr","").split("_")
                c = int(v[0].replace("X","23").replace("Y","24").replace("MT","25").replace("M","25"))
                list_of_vars.append(Variant(c,v[1],v[2],v[3]))
            fg_data = self.annotation_dao.add_variant_annotations(list_of_vars,True)
            # flatten
            fg_data = {a.varid:a.get_annotations()["annot"]["INFO"] for a in fg_data}
            #fill info back
            for record in values:
                vid = record["variant"].replace("chr","").replace("_",":").replace("X","23").replace("Y","24").replace("MT","25").replace("M","25")
                record["INFO"] = fg_data.get(vid,"NA")
        # fix data representation to format supported by json
        for record in values:
            for key in record:
                if isinstance(record[key],float):
                    if math.isnan(record[key]):
                        record[key] = "NA"
                    elif record[key] == float("inf"):
                        record[key] = "inf"
                    elif record[key] == float("-inf"):
                        record[key] = "-inf"
        return values

    def get_pqtl_colocalization_by_gene_name(self, gene_name: str):
        """ Get pqtl and colocalization by signal by the gene name """
        dat = self.pqtl_colocalization.get_pqtl_colocalization(gene_name) if self.pqtl_colocalization else dict()
        return dat

    def get_colocalization_by_gene_name(self, gene_name: str):
        """ Get gene colocalization data """
        dat = self.pqtl_colocalization.get_gene_colocalization(gene_name) if self.pqtl_colocalization else dict()
        return dat
