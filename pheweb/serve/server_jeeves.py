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

from typing import List, Dict,Tuple, Union

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
        self.knownhits_dao = self.dbs_fact.get_knownhits_dao()
        self.autoreporting_dao = self.dbs_fact.get_autoreporting_dao()
        self.colocalization = self.dbs_fact.get_colocalization_dao()
        self.variant_phenotype_pip = self.dbs_fact.get_variant_phenotype_pip_dao()
        self.threadpool = ThreadPoolExecutor(max_workers= self.conf.n_query_threads)
        self.phenos = {pheno['phenocode']: pheno for pheno in get_phenolist()}
        self.autocompleter = self.dbs_fact.get_autocompleter()

    def gene_functional_variants(self, gene, pThreshold=None):

        if pThreshold is None:
            pThreshold = self.conf.report_conf["func_var_assoc_threshold"]

        startt = time.time()
        func_var_annot = self.annotation_dao.get_gene_functional_variant_annotations(gene)
        print(" gene functional variants took {}".format( time.time()-startt) )
        remove_indx =[]
        chrom,start,end = self.get_gene_region_mapping()[gene]
        startt = time.time()
        ## if there are not many functional variants and gene is large it is better to get them one by one
        results = self.result_dao.get_variants_results( func_var_annot )
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
        print("get top per pheno variants  took {} seconds".format(time.time()-starttime))
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
        with open(common_filepaths['manhattan'](phenocode)) as f:
            manhattan = f.read()
            return manhattan

        vars = [ Variant( d['chrom'].replace("chr","").replace("X","23").replace("Y","24").replace("MT","25"), d['pos'], d['ref'], d['alt'] ) for d in variants['unbinned_variants'] if 'peak' in d ]

        f_annotations = self.threadpool.submit( self.annotation_dao.get_variant_annotations, vars, self.conf.anno_cpra)
        f_gnomad = self.threadpool.submit( self.gnomad_dao.get_variant_annotations, vars)

        annotations = f_annotations.result()
        gnomad = f_gnomad.result()
        d = { v:v  for v in annotations }
        # TODO... refactor gnomaddao to behave similary as annotation dao i.e. returning stuff as Variant annotations.
        gd = { v["variant"]:v["var_data"] for v in gnomad}

        ukbbvars = self.ukbb_dao.get_matching_results(phenocode, vars)

        for variant in variants['unbinned_variants']:
            ## TODO remove chr dickery when new annots ready

            chrom =  variant['chrom'].replace("chr","").replace('X','23').replace('Y','24').replace("MT","25")
            v = Variant( chrom, variant['pos'], variant['ref'], variant['alt'])
            if v in d:
                variant['annotation'] = d[v].get_annotations()["annot"]
            if v in gd:
                variant['gnomad'] = gd[v]

            if v in ukbbvars:
                variant['ukbb'] = ukbbvars[v]
        return variants

    def get_single_variant_data(self, variant: Variant)-> Tuple[Variant, List[PhenoResult]]:
        """
            Returns association results and basic annotations for a single variant. Returns tuple with variant and phenoresults.
        """

        ## TODO.... would be better to just return the results but currently rsid and nearest genes are stored alongside the result
        ## chaining variants like these retain all the existing annotations.
        r = self.result_dao.get_single_variant_results(variant)
        v_annot = self.annotation_dao.get_single_variant_annotations(r[0], self.conf.anno_cpra)

        if r is not None:
            if v_annot is None:
                ## no annotations found even results were found. Should not happen except if the results and annotation files are not in sync
                print("Warning! Variant results for " + str(r[0]) + " found but no basic annotation!")
                var = r[0]
                var.add_annotation("annot", {})
            else:
                var = v_annot
            gnomad = self.gnomad_dao.get_variant_annotations([var])
            if len(gnomad) == 1:
                var.add_annotation('gnomad', gnomad[0]['var_data'])

            phenos = [ p.phenocode for p in r[1]]
            ukb = self.ukbb_matrixdao.get_multiphenoresults( {variant:phenos} )
            phenotype_pip = self.variant_phenotype_pip.get_variant_phenotype_pip(int(variant.chr),int(variant.pos),variant.ref,variant.alt) if self.variant_phenotype_pip else dict()
            for res in r[1]:
                if res.phenocode in phenotype_pip:
                    res.set_pip(phenotype_pip[res.phenocode])

            if var in ukb:
                ukb_idx = { u:u for u in ukb[var] }
                for res in r[1]:
                    if res.phenocode in ukb_idx:
                        res.add_matching_result('ukbb',ukb[var][res.phenocode])
            return var,r[1]
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
        annotations = self.annotation_dao.get_variant_annotations_range(chr, start, end, self.conf.anno_cpra)
        annot_hash = { anno.varid: anno.get_annotations() for anno in annotations }

        check = self.annotation_dao.get_variant_annotations_range(chr, 112756070, 112756070, self.conf.anno_cpra)
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
                        if 'AF_fin' in g and 'AC_nfe_nwe' in g and 'AC_nfe_onf' in g and 'AC_nfe_seu' in g:
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

    def get_conditional_regions_for_pheno(self, phenocode, chr, start, end, p_threshold=None):
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
                    with open(path) as f:
                        d = {'id': [], 'varid': [], 'chr': [], 'position': [], 'end': [], 'ref': [], 'alt': [], 'maf': [], 'pvalue': [], 'beta': [], 'sebeta': []}
                        h = {h:i for i,h in enumerate(f.readline().strip().split(' '))}
                        for line in f:
                            fields = line.strip().split(' ')
                            if float(fields[h['p.value_cond']]) < p_threshold:
                                d['id'].append(fields[h['SNPID']].replace('chr', '').replace('X','23').replace('_', ':', 1)[::-1].replace('_', '/', 1)[::-1])
                                d['varid'].append(fields[h['rsid']].replace('chr', '').replace('_', ':').replace('X','23'))
                                d['chr'].append(fields[h['CHR']].replace('chr', ''))
                                d['position'].append(int(fields[h['POS']]))
                                d['end'].append(int(fields[h['POS']]))
                                d['ref'].append(fields[h['Allele1']])
                                d['alt'].append(fields[h['Allele2']])
                                d['maf'].append(float(fields[h['AF_Allele2']]))
                                d['pvalue'].append(float(fields[h['p.value_cond']]))
                                d['beta'].append(round(float(fields[h['BETA_cond']]), 3))
                                d['sebeta'].append(round(float(fields[h['SE_cond']]), 3))
                        ret.append({'type': 'conditional', 'data': d, 'conditioned_on': region['conditioned_on'][i].replace('X','23'), 'lastpage': None})
                    # data.append(pd.read_csv(path, sep=' '))
                except FileNotFoundError:
                    print('file ' + path + ' not found')
        print(f'Region data taken for  {chr} {start} {end}')
        print("reading conditional files took {} seconds".format(time.time()-t ) )
        t = time.time()
        if len(ret) > 0:
            #self.add_annotations(chr, min_start, max_end, ret)
            ret = self.add_annotations(chr, start, end, ret)
            print("adding annotations to {} conditional results took {} seconds".format(len(ret), time.time()-t ) )
        return ret

    def get_finemapped_region_boundaries_for_pheno(self, fm_type, phenocode, chrom, start, end):
        return self.finemapping_dao.get_regions_for_pheno(fm_type, phenocode, chrom, start, end) if self.finemapping_dao is not None else None

    def get_finemapped_regions_for_pheno(self, phenocode, chr, start, end, prob_threshold=-1):
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
                if (self.conf.release in ['R3', 'R4', 'R5']):
                    data = pd.read_csv(region['path'], sep='\t', compression='gzip')
                    data.rename(columns={'chromosome': 'chr', 'allele1': 'ref', 'allele2': 'alt'}, inplace=True)
                    format_chr = lambda chr : f"""chr{chr}:{region['start']}-{region['end']}"""
                    chromosome_key = format_chr(region['chr'])
                    chromosome_alt = format_chr(str(region['chr']).replace('23','X')) # hack to allow 23 and X
                    data = data[((data.region == chromosome_key) | (data.region == chromosome_key)) & (data.cs > -1) & (data.prob > prob_threshold)]
                    data['chr'] = data['chr'].str.replace('chr', '').replace('X','23')
                    data['id'] = data['rsid'].str.replace('chr', '')
                    data['id'] = data['id'].str.replace('_', ':', n=1).replace('X','23')
                    data['id'] = data['id'].apply(lambda x: x[::-1]).str.replace('_', '/', n=1).apply(lambda x: x[::-1])
                    data.prob = data.prob.round(3)
                    data = data[['id', 'rsid', 'chr', 'position', 'ref', 'alt', 'maf', 'prob', 'cs']]
                    ret.append({'type': region['type'], 'data': data.reset_index().to_dict(orient='list'), 'lastpage': None})
                else:
                    # TODO fix - chr X is 0 in the db, everything should be 23
                    if region['chr'] == 0 or region['chr'] == 23:
                        region['chr'] = 'X'
                    data = pd.read_csv(region['path'], sep='\t')
                    data.rename(columns={'chromosome': 'chr', 'allele1': 'ref', 'allele2': 'alt', 'v': 'id', 'cs_specific_prob': 'prob'}, inplace=True)
                    data = data[(data.region == 'chr' + str(region['chr']) + ':' + str(region['start']) + '-' + str(region['end'])) & (data.prob > prob_threshold)]
                    data['chr'] = data['chr'].str.replace('chr', '').replace('X','23')
                    data['rsid'] = data['id']
                    data['id'] = data['id'].str.replace(':', '_').replace('X','23')
                    data['id'] = data['id'].str.replace('_', ':', n=1)
                    data['id'] = data['id'].apply(lambda x: x[::-1]).str.replace('_', '/', n=1).apply(lambda x: x[::-1])
                    data.prob = data.prob.round(3)
                    data = data[['id', 'rsid', 'chr', 'position', 'ref', 'alt', 'maf', 'prob', 'cs']]
                    ret.append({'type': region['type'], 'data': data.reset_index().to_dict(orient='list'), 'lastpage': None})
            elif region['type'] == 'finemap':
                data = {'id': [], 'chr': [], 'position': [], 'ref': [], 'alt': [], 'prob': [], 'cs': []}
                with open(region['path']) as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith('#') or line.startswith('index'):
                            continue
                        fields = line.split(' ')
                        for i in range(0,int((len(fields)-1)/2)):
                            if fields[i*2+1] != 'NA':
                                cpra = fields[i*2+1].split('_')
                                data['id'].append(cpra[0].replace('chr', '').replace('X','23') + ':' + cpra[1] + '_' + cpra[2] + '/' + cpra[3])
                                data['chr'].append(cpra[0].replace('chr', '').replace('X','23'))
                                data['position'].append(cpra[1])
                                data['ref'].append(cpra[2])
                                data['alt'].append(cpra[3])
                                data['prob'].append(round(float(fields[i*2+2]), 3))
                                data['cs'].append(i+1)
                ret.append({'type': region['type'], 'data': data, 'lastpage': None})
            else:
                print('UNSUPPORTED REGION TYPE: ' + region['type'])
        #self.add_annotations(chr, min_start, max_end, ret)
        self.add_annotations(chr, start, end, ret)
        return ret

    def get_max_finemapped_region(self, phenocode, chrom, start, end):
        return self.finemapping_dao.get_max_region(phenocode, chrom, start, end) if self.finemapping_dao is not None else []

    def get_finemapped_regions(self, variant: Variant):
        return self.finemapping_dao.get_regions(variant) if self.finemapping_dao is not None else []

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
    def get_best_phenos_by_gene(self):
        with open(common_filepaths['best-phenos-by-gene']) as f:
            return json.load(f)

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
            fg_data = self.annotation_dao.get_variant_annotations(list_of_vars,True)
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
    
