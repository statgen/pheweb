import abc
import attr
from importlib import import_module
from collections import defaultdict
from elasticsearch import Elasticsearch
import pysam
import re
import threading
from typing import List, Tuple, Dict
from ...file_utils import MatrixReader, common_filepaths
from ...utils import get_phenolist, get_gene_tuples

from collections import namedtuple
import requests
import importlib
import gzip
import subprocess
import time
import io
import os
import subprocess

from pathlib import Path


class JSONifiable(object):
     @abc.abstractmethod
     def json_rep(self):
         """
            Return an object that can be jsonencoded.
         """

class Variant(JSONifiable):
    def __init__(self, chr, pos,ref,alt):
        try:
            self.chr=int(chr)
        except:
            raise Exception("Chromosome can be only numeric! Use x=23, y=24 and MT=25")
        
        self.pos=int(pos)
        self.ref=ref
        self.alt=alt
        self.varid = "{}:{}:{}:{}".format(self.chr,self.pos,self.ref,self.alt)
        self.annotation = {}
        

    def add_annotation(self, name, value):
        self.annotation[name]=value

    @property
    def id(self):
        return self.varid

    @property
    def rsids(self):
        if "rsids" in self.annotation:
            return self.annotation["rsids"]
        else:
            return None
    
    @rsids.setter
    def rsids(self, value):
        self.annotation['rsids'] = value


    def get_annotation(self, name):
        if name in self.annotation:
            return self.annotation[name]
        else:
            return None
    
    def get_annotations(self):
        return self.annotation

    def merge_annot(self, other, overwrite=True):
        """
            Merges annotations from another Variant object. overwrite determines if annotation with the same name is overwritten or kept 
        """
        for k,v in other.get_annotations():
            if k not in self.annotation or overwrite:
                self.add_annotation(k,v)

    def __eq__(self, other):
        return self.chr == other.chr and self.pos==other.pos and self.ref==other.ref and self.alt==other.alt
    
    def __hash__(self):
        return hash(self.varid)
    def __repr__(self):
        return self.varid

    def json_rep(self):
        return {'chr':self.chr,'pos':self.pos,'ref':self.ref, 'alt':self.alt, "id":self.varid, **self.annotation }
    
        
class PhenoResult(JSONifiable):

    def __init__(self, phenocode,phenostring, category_name,pval,beta, maf_case,maf_control, n_case,n_control):
        self.phenocode = phenocode
        self.phenostring = phenostring
        self.pval = float(pval) if pval is not None and pval!='NA' else None
        self.beta = float(beta) if beta is not None and beta!='NA' else None
        self.maf_case = float(maf_case) if maf_case is not None and maf_case!='NA' else None
        self.maf_control = float(maf_control) if maf_control is not None and maf_control!='NA' else None
        self.matching_results = {}
        self.category_name = category_name
        self.n_case = n_case
        self.n_control = n_control

    def add_matching_result(self, resultname, result):
        self.matching_results[resultname] = result

    def get_matching_result(self, resultname):
        return self.matching_results[resultname] if resultname in self.matching_results else None
    
    def json_rep(self):
        return {'phenocode':self.phenocode,'phenostring':self.phenostring, 'pval':self.pval, 'beta':self.beta, "maf_case":self.maf_case,
                "maf_control":self.maf_control, 'matching_results':self.matching_results, 'category':self.category_name, "n_case":self.n_case, "n_control":self.n_control}

@attr.s
class PhenoResults( JSONifiable):
    pheno = attr.ib( attr.validators.instance_of( Dict) )
    assoc = attr.ib( attr.validators.instance_of( PhenoResult ) )
    variant= attr.ib( attr.validators.instance_of( List )  )
    def json_rep(self):
        return {'pheno':self.pheno, "assoc":self.assoc, "variant":self.variant}

class GeneInfoDB(object):

    @abc.abstractmethod
    def get_gene_info(self, symbol):
        """ Retrieve gene basic info given gene symbol.
            Args: symbol gene symbol
            Returns: dictionary with elements 'description': short desc, 'summary':extended summary, 'maploc':chrmaplos   'start': startpb 'stop': stopbp
        """
        return

class ExternalResultDB(object):

    @abc.abstractmethod
    def get_matching_results(self, phenotype:str, var_list:List[Variant]) -> Dict[Variant,Dict]:
        """ Given a phenotype name and variant list returns a list of matching results.
        Args: phenotype phenotype names
              var_list list of Variant objects
            returns dictionary keyd by Variant and values are dictionary or result elements
        """
        return

    @abc.abstractmethod
    def get_results_region(self, phenotype, chr, start, stop):
        """ Given a phenotype name and coordinates returns all results .
        Args: phenotype phenotype names
              var_list var_list list of tuples with CHR POS:int REF ALT
            returns list of namedtuples with elements effect_size, pvalue, study_name, n_cases, n_controls
        """
        return

    @abc.abstractmethod
    def getNs(self, phenotype):
        """ Given a phenotype name returns tuple with ncases,nconrols. .
            Args: phenotype phenotype names
            returns tuple with ncase and ncontrols
        """
        return

    @abc.abstractmethod
    def get_multiphenoresults(self, varphenodict:Dict[Variant,List[str]], known_range=None) -> Dict[Variant,Dict[str,Dict]]:
        """ Given a dictionary with Variant as keys  and list of phenocodes as values returns corresponding geno pheno results.
            This interface allows implementations to optimize queries if multiple phenotype results for same variant are co-located
            known_range: tuple of 3 elements (chr,start,end) giving contiguous region in chromosome to restrict the search to e.g. improve performance by reading one contiguous region. 
            Implementations are free to ignore this parameter

            returns dictionary of dictionaries first keyed by variant and then by phenocode
        """
class AnnotationDB(object):

    @abc.abstractmethod
    def get_variant_annotations(self, variants:List[Variant] ) -> List[Variant]:
        """ Retrieve variant annotations given a list of Variants.
            Returns a list of Variant objects with new annotations with id 'annot' and with all annotations that existed in the search Variant
        """
        return

    @abc.abstractmethod
    def get_single_variant_annotations(self, variant:Variant) -> Variant:
        """
            Retrieve variant annotations for a single variant. Returns a variant with annotations in id 'annot'  and including all old annotations
        """

    @abc.abstractmethod
    def get_gene_functional_variant_annotations(self, gene):
        """ Retrieve annotations of functional variants for a given gene.
            Args: gene gene symbol
            Returns: A list of dictionaries. Dictionary has 2 elements:
                     "id" - variant id chrN:pos:ref:alt
                     "var_data" - a dictionary with variant annotations
        """
        return

class GnomadDB(object):

    @abc.abstractmethod
    def get_variant_annotations(self, id_list):
        """ Retrieve variant annotations given variant id list.
            Args: id_list list of string in format chr:pos:ref:alt
            Returns: A list of dictionaries. Dictionary has 2 elements "id" which contains the query id and "var_data" containing dictionary with all variant data.
        """
        return

class LofDB(object):
    @abc.abstractmethod
    def get_all_lofs(self, p_threshold):
        """ Retrieve all loss of function burden test results
            Returns: A list of dictionaries. Dictionary has 2 elements "id" which contains the gene id and "gene_data" containing dictionary with all gene data.
        """
        return

    @abc.abstractmethod
    def get_lofs(self, gene):
        """ Retrieve all loss of function burden test results for a given gene
            Returns: A list of dictionaries. Dictionary has 2 elements "id" which contains the gene id and "gene_data" containing dictionary with all gene data.
        """
        return

class KnownHitsDB(object):
    @abc.abstractmethod
    def get_hits_by_loc(self, chr, start, stop):
        """ Retrieve known hits in GWAS catalog and UKBB for a region
            Args: chr
                  start
                  stop
            Returns: A list of dictionaries. Dictionary has x elements: "pheno" which contains a phenotype dict, and "assoc" containing a variant dict ("pval", "id", "rsids"). The list is sorted by p-value.
        """

class ResultDB(object):
    @abc.abstractmethod
    def get_variant_results_range(self, chrom, start, end)->  List[Tuple[Variant, List[PhenoResult]]]:
        """ Return associations of all phenotypes in given range
            Returns a list of variants and results in chromosomal order. Each element contains tuple of 2 elements: Variant object and a list of PhenoResult objects
        """
        return

    @abc.abstractmethod
    def get_top_per_pheno_variant_results_range(self, chrom, start, end) -> List[ PhenoResults ]:
        """ Retrieves top variant for each phenotype in a given range
            Returns: A list of PhenoResults "pheno" which contains a phenotype dict, and "assoc" containing PhenoResult object, 'variant' contains Variant object. The list is sorted by p-value.
        """
        return

    def get_variants_results(self, variants:List[Variant]) -> List[Tuple[Variant,List[PhenoResult]]]:
        """
            Returns all results and annotations for given variant list. Returns empty list if no results found
        """

    def get_single_variant_results(self, variant: Variant ) -> Tuple[Variant, List[PhenoResult]]:
        """
            Returns all results and annotations for given variant. Returns tuple of Variant (including updated annotations if any) and phenotype results. 
            Returns None if variant does not exist.
        """
    

class DrugDB(object):
    @abc.abstractmethod
    def get_drugs(self, gene):
        """ Retrieve drugs
            Args: gene name
            Returns: drugs targeting the gene
        """
        return

class MichinganGWASUKBBCatalogDao(KnownHitsDB):

    build38ids="1,4"

    def get_hits_by_loc(self, chr, start, stop):

        r = requests.get("https://portaldev.sph.umich.edu/api/v1/annotation/gwascatalog/results/?format=objects&filter=id in " + MichinganGWASUKBBCatalogDao.build38ids   +
                " and chrom eq  '" + str(chr) + "'" +
                " and pos ge " + str(start) +
                " and pos le " + str(stop))

        rep = r.json()

        return rep["data"]


class NCBIGeneInfoDao(GeneInfoDB):

    def __init__(self):
        pass

    def get_gene_info(self, symbol):
        r = requests.get("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=gene&term=" + symbol + "[gene])%20AND%20(Homo%20sapiens[orgn])%20AND%20alive[prop]%20NOT%20newentry[gene]&sort=weight&retmode=json")

        ret = r.json()["esearchresult"]
        if("ERROR" in ret):
            raise Exception("Error querying NCBI. Error:" + ret["esearchresult"]["ERROR"])
        if( ret["count"] ==0):
            raise Exception("Gene: "+ symbol +" not found in NCBI db")
        id =ret["idlist"][0]
        r = requests.get("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=gene&id="+ id + "&retmode=json")
        rep = r.json()
        if( "result" not in rep):
            raise Exception("Could not access NCBI gene summary. Response:" + str(rep))
        data = rep["result"][id]
        ## chr stop seems to be missing from top level annotation
        loc = list(filter( lambda x: x["annotationrelease"]=="109", data["locationhist"]))[0]
        return { "description":data["description"], "summary":data["summary"], "start":data["chrstart"], "stop":loc["chrstop"], "maploc":data["maplocation"]   }

class DrugDao(DrugDB):

    def __init__(self):
        pass

    def get_drugs(self, gene):
        r = requests.get("http://rest.ensembl.org/xrefs/symbol/human/" + gene + "?content-type=application/json")
        dat = r.json()
        if len(dat)==0:
            return []
        ensg = dat[0]['id']
        drugfields = ['target.gene_info.symbol',
                      'target.target_class',
                      'evidence.target2drug.action_type',
                      'evidence.drug2clinic.max_phase_for_disease.label',
                      'disease.efo_info.label',
                      'drug']
        payload = {'target':[ensg], 'datatype':['known_drug'], 'fields':drugfields}

        r = requests.post('https://api.opentargets.io/v3/platform/public/evidence/filter',
                          json=payload)
        data = r.json()['data']
        for d in data:
            d['disease']['efo_info']['label'] = d['disease']['efo_info']['label'].capitalize()
            d['drug']['molecule_type'] = d['drug']['molecule_type'].capitalize()
            d['evidence']['target2drug']['action_type'] = d['evidence']['target2drug']['action_type'].capitalize()

        return data

class ElasticAnnotationDao(AnnotationDB):

    def __init__(self, host, port, variant_index):

        self.index = variant_index
        self.host = host
        self.port = port

        self.elastic = Elasticsearch(host + ':' + str(port))
        if not self.elastic.ping():
            raise ValueError("Could not connect to elasticsearch at " + host + ":" + str(port))

        if not self.elastic.indices.exists(index=variant_index):
            raise ValueError("Elasticsearch index does not exist:" + variant_index)

    def get_variant_annotations(self, variant_list):
        annotation = self.elastic.search(
            index=self.index,
            body={
                "timeout": "5s",
                "size": 10000,
                "_source": False,
                "stored_fields" : "*",
                "query" : {
                    "constant_score" : {
                        "filter" : {
                            "terms" : {
                                "_id" : [ v.id for v in variant_list]
                            }
                        }
                    }
                }
            }
        )

        print('ELASTIC FINNGEN get_variant_annotations hits ' + str(annotation['hits']['total']))
        print('ELASTIC FINNGEN get_variant_annotations took ' + str(annotation['took']))
        return [ {"id": anno["_id"], "var_data": { k:v[0] for (k,v) in anno["fields"].items() }  } for anno in annotation['hits']['hits'] ]

    def get_gene_functional_variant_annotations(self, gene):
        annotation = self.elastic.search(
            index=self.index,
            body={
                 "timeout": "5s",
                 "size": 10000,
                 "_source": True,
                 "stored_fields" : "*",
                 "query" : {
                      "bool" : {
                           "filter" : [
                                { "term": { "gene" : gene } },
                                { "bool": {
                                     "should": [
                                          { "term": { "most_severe": "missense_variant" } },
                                          { "term": { "most_severe": "frameshift_variant" } },
                                          { "term": { "most_severe": "splice_donor_variant" } },
                                          { "term": { "most_severe": "stop_gained" } },
                                          { "term": { "most_severe": "splice_acceptor_variant" } },
                                          { "term": { "most_severe": "start_lost" } },
                                          { "term": { "most_severe": "stop_lost" } },
                                          { "term": { "most_severe": "TFBS_ablation" } },
                                          { "term": { "most_severe": "protein_altering_variant" } }
                                     ]
                                }}
                           ]
                      }
                 }
            }
        )

        # maf annotation is not correct - get af from _source
        for anno in annotation['hits']['hits']:
            anno["fields"]["af"] = [anno["_source"]["af"]]

        print('ELASTIC FINNGEN get_gene_functional_variant_annotations hits ' + str(annotation['hits']['total']))
        print('ELASTIC FINNGEN get_gene_functional_variant_annotations took ' + str(annotation['took']))

        return [ {"id": anno["_id"],
                  "var_data": { k:v[0] for (k,v) in anno["fields"].items() }
                 } for anno in annotation['hits']['hits']
               ]

class ElasticGnomadDao(GnomadDB):

    def __init__(self, host, port, variant_index):

        self.index = variant_index
        self.host = host
        self.port = port

        self.elastic = Elasticsearch(host + ':' + str(port))
        if not self.elastic.ping():
            raise ValueError("Could not connect to elasticsearch at " + host + ":" + str(port))

        if not self.elastic.indices.exists(index=variant_index):
            raise ValueError("Elasticsearch index does not exist:" + variant_index)

    def _variant_id_to_gnomad_id(self, id):
        return id.replace('chr', '').replace(':', '-')

    def get_variant_annotations(self, id_list):
        gnomad_ids = [self._variant_id_to_gnomad_id(id) for id in id_list]
        annotation = self.elastic.search(
            index=self.index,
            body={
                "timeout": "5s",
                "size": 10000,
                "_source": True,
                "stored_fields" : "*",
                "query" : {
                    "constant_score" : {
                        "filter" : {
                            "terms" : {
                                "genomes_variantId" : gnomad_ids
                            }
                        }
                    }
                }
            }
        )
        print('ELASTIC GNOMAD get_variant_annotations hits ' + str(annotation['hits']['total']))
        print('ELASTIC GNOMAD get_variant_annotations took ' + str(annotation['took']))
        return [ {"id": anno["_source"]["genomes_variantId"],
                  "var_data": { k:v for (k,v) in anno["_source"].items() if re.match("genomes_AF_[A-Z]{3}", k) or k == 'genomes_POPMAX' } }
                 for anno in annotation['hits']['hits'] ]

class TabixGnomadDao(GnomadDB):

    def __init__(self, matrix_path):
        self.matrix_path = matrix_path
        self.tabix_file =pysam.TabixFile(self.matrix_path, parser=None)
        self.tabix_handles = defaultdict( lambda: pysam.TabixFile(self.matrix_path, parser=None))
        self.headers = self.tabix_file.header[0].split('\t')

    def get_variant_annotations(self, var_list):
        annotations = []
        t = time.time()
        ##print("There are {} active tabix handles for gnomad".format( len(self.tabix_handles)))
        for var_i, variant in enumerate(var_list):
            #print("There are {} active tabix handles for gnomad. Current pid {}".format( len(self.tabix_handles), os.getpid()))

            ### TODO get rid of this chr shit once the annotation files have been fixed
            fetch_chr = str(variant.chr).replace("23","X").replace("24","Y").replace("25","Y")
            tabix_iter = self.tabix_handles[ threading.get_ident() ].fetch(fetch_chr, variant.pos-1, variant.pos)
            for row in tabix_iter:
                split = row.split('\t')
                if split[3] == variant.ref and split[4] == variant.alt:
                    for i, s in enumerate(split):
                        if (self.headers[i].startswith('AF') and split[i] != 'NaN' and split[i] != '.'):
                            split[i] = float(s)
                    annotations.append({'variant': variant, 'var_data': {self.headers[i]: split[i] for i in range(0,len(split))}})
                else:
                    #print(split[3] + ' - ' + variant['ref'] + ' / ' + split[4] + ' - ' + variant['alt'])
                    pass

        print('TABIX GNOMAD get_variant_annotations ' + str(round(10 *(time.time() - t)) / 10))
        return annotations

class TabixResultDao(ResultDB):

    def __init__(self, phenos, matrix_path):

        self.matrix_path = matrix_path
        self.pheno_map = phenos(0)
        self.tabix_file = pysam.TabixFile(self.matrix_path, parser=None)
        self.headers=self.tabix_file.header[0].split('\t')
        self.phenos = [ (header.split('@')[1], p_col_idx)
                for p_col_idx, header in enumerate(self.headers) if header.startswith('pval')
        ]

        self.tabix_files = defaultdict( lambda: pysam.TabixFile(self.matrix_path, parser=None))
        self.tabix_files[threading.get_ident()]=self.tabix_file

    def get_variant_results_range(self, chrom, start, end):
        try:
            tabix_iter = self.tabix_files[threading.get_ident()].fetch(chrom, start-1, end)
        except ValueError:
            print("No variants in the given range. {}:{}-{}".format(chrom, start-1,end) )
            return []

        result = []
        for variant_row in tabix_iter:

            split = variant_row.split('\t')
            chrom = split[0].replace("chr","").replace("X","23").replace("Y","24").replace("MT","25")
            v = Variant( chrom,split[1],split[2],split[3])
            if split[4] is not '':v.rsids = split[4]
            v.add_annotation('nearest_gene', split[5])
            phenores = []
            for pheno in self.phenos:
                pval = split[pheno[1]]
                beta = split[pheno[1]+1]
                maf_case = split[pheno[1]+4]
                maf_control = split[pheno[1]+5]
                pr = PhenoResult(pheno[0], self.pheno_map[pheno[0]]['phenostring'],self.pheno_map[pheno[0]]['category'],pval , beta, maf_case, maf_control, 
                        self.pheno_map[pheno[0]]['num_cases'],  self.pheno_map[pheno[0]]['num_controls'] )
                phenores.append(pr)
            result.append((v,phenores))
        return result
   
    def get_single_variant_results(self, variant: Variant ) -> Tuple[Variant, PhenoResult]:
        
        res = self.get_variants_results([variant])
        for r in res:
            if r[0]==variant:
                return r
        return None 
        
    def get_variants_results(self, variants: List[Variant]) -> List[ Tuple[Variant, PhenoResult] ]:
        if type(variants) is not list:
            variants = [variants]
        results = []
        for v in variants:
            res = self.get_variant_results_range(v.chr, v.pos, v.pos)
            for r in res:
                if r[0]==v:
                    results.append(r)
        return results

    def get_top_per_pheno_variant_results_range(self, chrom, start, end):
        try:
            tabix_iter = self.tabix_files[threading.get_ident()].fetch(chrom, start-1, end)
        except ValueError:
            print("No variants in the given range. {}:{}-{}".format(chrom, start-1,end) )
            return []
        #print("WE HAVE {} TABIX FILES OPEN".format(  len(list(self.tabix_files.keys()) )))
        top = defaultdict( lambda: defaultdict(dict))

        for variant_row in tabix_iter:
            split = variant_row.split('\t')
            for pheno in self.phenos:
                pval = split[pheno[1]]
                beta = split[pheno[1]+1]
                maf_case = split[pheno[1]+4]
                maf_control = split[pheno[1]+5]
                if pval is not '' and pval != 'NA' and ( pheno[0] not in top or (float(pval)) < top[pheno[0]][1].pval ):            
                    pr = PhenoResult(pheno[0], self.pheno_map[pheno[0]]['phenostring'],self.pheno_map[pheno[0]]['category'],pval , beta, maf_case, maf_control,
                            self.pheno_map[pheno[0]]['num_cases'],  self.pheno_map[pheno[0]]['num_controls'] )
                    v=  Variant( split[0], split[1], split[2], split[3])
                    if split[4]!='':  v.add_annotation("rsids",split[4])
                    v.add_annotation('nearest_gene', split[5])
                    top[pheno[0]] = (v,pr)
                     
        top = [ PhenoResults(pheno=self.pheno_map[pheno], assoc=dat, variant=v ) for pheno,(v,dat) in top.items()]
        top.sort(key=lambda pheno: pheno.assoc.pval)

        return top

class ExternalMatrixResultDao(ExternalResultDB):

    def __init__(self, matrix, metadatafile):
        self.matrix = matrix
        self.metadatafile = metadatafile
        self.meta = {}

        self.res_indices = defaultdict(lambda: {})

        with open( self.metadatafile, 'r') as meta:
            header = meta.readline().rstrip("\n").split("\t")
            req_headers = ["NAME","ncases","ncontrols"]
            if not all( [ h in header for h in req_headers]):
                raise Exception("External result meta-data must be tab separated and must have columns: " + ",".join(req_headers) )

            name_idx = header.index("NAME")
            ncase_idx = header.index("ncases")
            ncontrol_idx = header.index("ncontrols")

            for p in meta:
                p = p.rstrip("\n").split("\t")
                self.meta[p[name_idx]] = { "ncases":p[ncase_idx], "ncontrols":p[ncontrol_idx] }

        self.tabixfiles = defaultdict( lambda: pysam.TabixFile( self.matrix, parser=None))

        with gzip.open( self.matrix,"rt") as res:
            header = res.readline().rstrip("\n").split("\t")
            comp_header = ["#chr","pos","ref","alt"]
            if not all( [comp_header[i]==header[i] for i in [0,1,2,3]]):
                raise Exception("External result data must be tab separated and must begin with columns: " + ",".join(req_headers) +
                    " followed by individual result fields" )

            for i,field in enumerate(header[4:]):
                elem,pheno = field.split("@")
                self.res_indices[pheno][elem] = i+4

    def __get_restab(self):
        if self.tabixfile is None:
            self.tabixfile = pysam.TabixFile( self.matrix, parser=None)

        return self.tabixfile

    def getNs(self, phenotype):

        res = None
        if( phenotype in self.meta ):
            m = self.meta[phenotype]
            res = (m["ncases"],m["ncontrol"])

        return res

    def get_matching_results(self, phenotype, var_list):
        ##TODO: refactor all variant lists everywhere to use Variant objects
        res = {}
        if( type(var_list) is not list ):
            var_list = [var_list]

        if( phenotype in self.res_indices ):
            manifestdata = self.res_indices[phenotype]
            per_variant = []
            for var in var_list:
                t = time.time()

                try:
                    iter = self.tabixfiles[ threading.get_ident() ].fetch(var.chrom , var.pos-1, var.pos)
                    for ext_var in iter:
                        ext_var = ext_var.split("\t")
                        ext_v = Variant(ext_var[0],ext_var[1], ext_var[2], ext_var[3])
                        if ext_v==var:
                            datapoints = { elem:ext_var[i] for elem,i in manifestdata.items() }
                            datapoints.update({ "var":ext_v,
                                "n_cases": self.meta[phenotype]["ncases"], "n_controls": self.meta[phenotype]["ncontrol"] })
                            res[var]=datapoints

                except ValueError as e:
                    print("Could not tabix variant. " + str(e) )
        return res

    def get_multiphenoresults(self, varphenodict, known_range=None):
        '''
            varphenodict: dictionary keyed by Variant and values are a list of phenocodes to look for
            known_range: only searches this range for matching variants. This speeds up the query if it is known that all variants reside close to each other in a contiguous block of results
            returns dictionary of dictionaries first keyed by Variant and then by phenocode
        '''

        res = defaultdict(lambda: defaultdict( lambda: dict()))
        t = time.time()
        
        if known_range is not None:
             iter = self.tabixfiles[ threading.get_ident() ].fetch("chr" +known_range[0], known_range[1]-1, known_range[2]) 
             for ext_var in iter:
                 ext_var = ext_var.split("\t")
                 ## TODO remove all chr from annotation files and remove this replace so that error will be thrown if wrong chr type is attemptent
                 chrom = ext_var[0].replace('chr','').replace("X","23").replace("Y","24").replace("MT","25")
                 var = Variant( chrom ,  ext_var[1], ext_var[2], ext_var[3])
                 if var in varphenodict:
                     phenos = varphenodict[var]
                     for p in phenos:
                        if p not in self.res_indices:
                            continue
                        manifestdata = self.res_indices[p]
                        datapoints = { elem:ext_var[i] for elem,i in manifestdata.items() }
                        datapoints.update({ "chr":ext_var[0], "varid":var.id, "pos":ext_var[1],"ref":ext_var[2],"alt":ext_var[3],
                            "n_cases": self.meta[p]["ncases"], "n_controls": self.meta[p]["ncontrols"] })
                        res[var][p]=datapoints
        else:
            for var, phenos in varphenodict.items():
                try:
                    ## todo remove CHR when annotations fixed
                    iter = self.tabixfiles[ threading.get_ident() ].fetch( "chr" +str(var.chr), var.pos-1, var.pos)
                    for ext_var in iter:
                        ext_var = ext_var.split("\t")
                        chrom = ext_var[0].replace("chr","").replace("X","23").replace("Y","24").replace("MT","25")
                        ext_v = Variant( chrom,ext_var[1],ext_var[2],ext_var[3])
                        if var == ext_v:
                            for p in phenos:
                                if p not in self.res_indices:
                                    continue
                                manifestdata = self.res_indices[p]
                                datapoints = { elem:ext_var[i] for elem,i in manifestdata.items() }
                                datapoints.update({ 'var':var,
                                    "n_cases": self.meta[p]["ncases"], "n_controls": self.meta[p]["ncontrols"] })
                                res[var][p]=datapoints

                except ValueError as e:
                    print("Could not tabix variant. " + str(e) )
        print("TABIX GET MULTIPHENORESULTS TOOK {} seconds".format(time.time()-t ) )
        return res


class ExternalFileResultDao(ExternalResultDB):
    FILE_REQ_HEADERS = ["achr38","apos38","REF","ALT","beta","pval"]
    ResRecord = namedtuple('ResRecord', 'name, ncases, ncontrols, file, achr38_idx, apos38_idx, REF_idx, ALT_idx, beta_idx, pval_idx')
    VarRecord = namedtuple('VarRecord','origvariant,variant,chr,pos,ref,alt,beta, pval, study_name, n_cases, n_controls')

    def __init__(self, manifest):

        self.manifest = manifest
        self.results = {}
     
        if manifest is None:
            ## initialize with none and never returns any results
            return

        with open( self.manifest, 'r') as mani:
            header = mani.readline().rstrip("\n").split("\t")

            req_headers = ["NAME","ncases","ncontrols","file"]
            if not all( [ h in header for h in req_headers]):
                raise Exception("External result file must be tab separated and must have columns: " + ",".join(req_headers) )

            name_idx = header.index("NAME")
            ncase_idx = header.index("ncases")
            ncontrol_idx = header.index("ncontrols")
            file_idx = header.index("file")

            for line in mani:
                line = line.rstrip("\n").split("\t")
                filename = line[file_idx]

                fopen = open
                if filename.endswith(".gz"):
                    fopen = gzip.open

                with fopen(line[file_idx],'rt') as f:
                    header = f.readline().rstrip("\n").split("\t")

                    if not all( [ h in header for h in self.FILE_REQ_HEADERS ]):
                        raise Exception("All required headers not found in external result file:" + line[file_idx] + ". Required fields: " +
                         ",".join(self.FILE_REQ_HEADERS))

                    self.results[ line[name_idx] ] = ExternalFileResultDao.ResRecord( line[name_idx], line[ncase_idx], line[ncontrol_idx],
                        line[file_idx] ,header.index("achr38"), header.index("apos38"), header.index("REF") ,header.index("ALT") ,
                        header.index("beta"), header.index("pval") )


    def get_results_region(self, phenotype, chr, start, stop):

        res = []
        if( phenotype in self.results ):
            manifestdata = self.results[phenotype]

            tabix_iter = self._get_rows(manifestdata.file, "chr" + chrom, start-1, stop)
            for var in tabix_iter:
                var = var.split("\t")
                varid = [ var[manifestdata.achr38_idx],  var[manifestdata.apos38_idx], var[manifestdata.REF_idx], var[manifestdata.ALT_idx]].join(":")
                res.append(  {"varid":varid, "chr":var[manifestdata.achr38_idx], "pos":var[manifestdata.apos38_idx],
                        "ref":var[manifestdata.REF_idx],"alt":var[manifestdata.ALT_idx] ,"beta":var[manifestdata.beta_idx],
                        "pval":var[manifestdata.pval_idx],  "n_cases":manifestdata.ncases, "n_controls":manifestdata.ncontrols } )

        return res

    def _get_rows(self, file, chrom, start, end ):

        cmd = "tabix {} {}:{}-{}".format(file, chrom, start, end)
        try:
            res = subprocess.run("tabix {} {}:{}-{}".format(file, chrom, start, end),shell=True, stdout=subprocess.PIPE, universal_newlines = True )
        except Exception as e:
            ## tabix throws filenotfoundexception when no variants are found even though the file exist.
            print("exc thrown" + str(e))
            return None

        if(len(res.stdout)==0):
            return None

        res = io.StringIO(res.stdout)
        for var in res:
            ext_var = var.rstrip("\n").split("\t")
            yield ext_var


    def get_matching_results(self, phenotype, var_list):
        res = {}

        allt = time.time()

        if( type(var_list) is not list ):
            var_list = [var_list]

        if( phenotype in self.results ):
            manifestdata = self.results[phenotype]
            tabf = pysam.TabixFile(manifestdata.file, parser=None)
            for var in var_list:
                ## here we are running tabix for multiple files and storing all Tabix objects would consume too much memory.
                ## Running external tabix commands is way too slow!
                
                ### TODO: remove the chr once the datafiles have been regenerated
                fetch_chr =("chr"+ str(var.chr)).replace("23","X").replace("24","Y").replace("25","MT")
                iterator= tabf.fetch( fetch_chr, var.pos-1, var.pos)
                for ext_var in iterator:
                    ext_split = ext_var.split("\t")
                     ### TODO: remove this once the datafiles have been regenerated

                    chrom = ext_split[manifestdata.achr38_idx].replace("chr","").replace("X","23").replace("Y","24").replace("MT","25")
                    ext_var = Variant( chrom,ext_split[manifestdata.apos38_idx],  ext_split[manifestdata.REF_idx],ext_split[manifestdata.ALT_idx])
                    if ext_var==var:
                            res[var] = {"var":var,"beta":ext_split[manifestdata.beta_idx],"pval":ext_split[manifestdata.pval_idx],
                                    "n_cases":manifestdata.ncases, "n_controls":manifestdata.ncontrols }
            tabf.close()
        return res

    def get_multiphenoresults(self, varphenodict):
        res = defaultdict(lambda: defaultdict( lambda: dict()))
        for var, phenolist in varphenodict.items():
            for p in phenolist:
                r = self.get_matching_results(p, [var])
                if len(r)>0:
                    res[var][p] = r
        return res

    def getNs(self, phenotype):
        if(phenotype in self.results ):
            manifest = self.results[phenotype]
            return (manifest.ncases, manifest.ncontrols)
        else:
            return None


class ConfigurationException(Exception):
    def __init__(self, *p,**kw):
        super().__init__(*p,*kw)

class TabixAnnotationDao(AnnotationDB):

    ACCEPT_MISSING = {"nan":1,"none":1,"":1,"na":1}
  
    
    # float gets special treatment to nan so it automatically works in json/javascript. Nobody knows my sorrow...
    DATA_CONVS = {"uint32":lambda x: None if x.lower() in TabixAnnotationDao.ACCEPT_MISSING else int(x),
            "float": lambda x: float("nan") if x.lower() in TabixAnnotationDao.ACCEPT_MISSING else float(x),
            "bool": lambda x: None if x.lower() in TabixAnnotationDao.ACCEPT_MISSING else bool(x),
            "string": lambda x: x}

    def __init__(self, matrix_path):
        self.matrix_path = matrix_path
        self.gene_region_mapping = {genename: (chrom, pos1, pos2) for chrom, pos1, pos2, genename in get_gene_tuples()}
        self.tabix_file = pysam.TabixFile(self.matrix_path, parser=None) 
        self.headers = [ s for s in self.tabix_file.header[0].split('\t')]

        self.header_i = {header: i for i, header in enumerate(self.headers)}
        self.tabix_files = defaultdict( lambda: pysam.TabixFile(self.matrix_path, parser=None))
        self.tabix_files[threading.get_ident()] = self.tabix_file
        self.n_calls =0
        self.functional_variants = set(["missense_variant",
                                    "frameshift_variant",
                                    "splice_donor_variant",
                                    "stop_gained",
                                    "splice_acceptor_variant",
                                    "start_lost",
                                    "stop_lost",
                                    "TFBS_ablation",
                                    "protein_altering_variant"])
        
        datatypesf = Path(self.matrix_path + ".datatypes")
        
        def f(x):
            return x

        self.dconv = defaultdict( lambda: f )

        print("Checking if type config exists {}".format( datatypesf ))
        if ( datatypesf.is_file()):
            print("Annotation datatype configuration file found. Using datatypes from {}".format(datatypesf) )
            with datatypesf.open() as dtf:
                # skip header.
                l=dtf.readline()
                for l in dtf:
                    df = l.rstrip("\n").split()
                    col = df[0]
                    dtype = df[1]
                    if dtype.lower() not in TabixAnnotationDao.DATA_CONVS:
                        raise ConfigurationException("Unkown datatype given in datatype configuration file. Type given {}. Accepted types: {}".format(dtype, ",".join(list(TabixAnnotationDao.DATA_CONVS.keys()))) )
                    self.dconv[col]=TabixAnnotationDao.DATA_CONVS[dtype]
        else:
            print("No annotation datatype configuration found. Data will be stored as is.")
    def get_single_variant_annotations(self, variant:Variant) -> Variant:
        res = self.get_variant_annotations([variant])
        for r in res:
            if r==variant:
                return r
        return None

    def get_variant_annotations(self, variants:List[Variant]):
        annotations = []
        t = time.time()
       
        for variant in variants:
            tabix_iter = self.tabix_files[threading.get_ident()].fetch( variant.chr, variant.pos-1, variant.pos, parser=None)
            row = next(tabix_iter)
            if row is not None:
                split = row.split('\t')
                v = split[0].split(":")
                v[0] = v[0].replace("chr","").replace("X","23").replace("Y","24").replace("MT","25")
                v = Variant(v[0],v[1],v[2],v[3])
                if variant == v:
                    ## keeps all old annotations in the returned variant.
                    for k,anno in  variant.get_annotations().items():
                        v.add_annotation(k,anno)
                    v.add_annotation("annot",{self.headers[i]: self.dconv[self.headers[i]](split[i]) for i in range(0,len(split)) } )
                    annotations.append(v)

        print('TABIX get_variant_annotations ' + str(round(10 *(time.time() - t)) / 10))
        return annotations
    
    def _get_tabix_data(self, chr, start, stop):
        cmd = "tabix {} {}:{}-{}".format(self.matrix, chr, start, end)
        try:
            res = subprocess.run("tabix {} {}:{}-{}".format(file, chrom, start, end),shell=True, stdout=subprocess.PIPE, universal_newlines = True )
        except Exception as e:
            ## tabix throws filenotfoundexception when no variants are found even though the file exist.
            print("exc thrown" + str(e))
            return None

        if(len(res.stdout)==0):
            return None
            res = io.StringIO(res.stdout)
            for var in res:
                ext_var = var.rstrip("\n").split("\t")
                yield ext_var
        

    def get_gene_functional_variant_annotations(self, gene):
        if gene not in self.gene_region_mapping:
            return []
        chrom, start, end = self.gene_region_mapping[gene]
        annotations = []
        t = time.time()

        if self.n_calls ==0:
            self.start = time.time()
            self.last_time = time.time()
        try:
            tabix_iter = self.tabix_files[threading.get_ident()].fetch(chrom, start-1, end)
            #self._get_tabix_data('chr' + chrom, start-1, end)           
        except Exception as e:
            ## tabix_file stupidly throws an error when no results are found in the region. Just return empty list
            print("Error occurred {}".format(e))
            return annotations
        for row in tabix_iter:
            split = row.split('\t')
            chrom,pos,ref,alt = split[0].split(":")
            if split[self.header_i['most_severe']] in self.functional_variants and split[self.header_i["gene"]].upper()==gene.upper():
                v = Variant( chrom, pos, ref, alt)
                var_dat = {self.headers[i]:(self.dconv[self.headers[i]])(split[i]) for i in range(0,len(split))}
                v.add_annotation( 'annot',  {self.headers[i]:(self.dconv[self.headers[i]])(split[i]) for i in range(0,len(split))} )
                annotations.append(v)
        self.n_calls +=1
        if self.n_calls %100==0:
            print ("last 100 in {} seconds. {} calls in {} seconds".format(time.time()-self.last_time, self.n_calls, time.time()-self.start) )
            self.last_time=time.time()
        #print('TABIX get_gene_functional_variant_annotations ' + str(round(10 *(time.time() - t)) / 10))
        return annotations

class ElasticLofDao(LofDB):

    def __init__(self, host, port, gene_index):

        self.index = gene_index
        self.host = host
        self.port = port

        self.elastic = Elasticsearch(host + ':' + str(port))
        if not self.elastic.ping():
            raise ValueError("Could not connect to elasticsearch at " + host + ":" + str(port))

        if not self.elastic.indices.exists(index=gene_index):
            raise ValueError("Elasticsearch index does not exist:" + gene_index)

    def get_all_lofs(self, p_threshold):
        t = time.time()
        result = self.elastic.search(
            index=self.index,
            body={
                "timeout": "5s",
                "size": 10000,
                "_source": True,
                "stored_fields" : "*",
                "query" : {
                    'range' : {
                        'p_value': {
                            'lt': p_threshold
                        }
                    }
                }
            }
        )
        print('ELASTIC get_all_lofs hits ' + str(result['hits']['total']))
        print('ELASTIC get_all_lofs took ' + str(result['took']))
        print('ELASTIC get_all_lofs ' + str(round(10 *(time.time() - t)) / 10))
        return [ {"id": r["_id"],
                  "gene_data": r["_source"] }
                 for r in result['hits']['hits'] ]

    def get_lofs(self, gene):
        t = time.time()
        result = self.elastic.search(
            index=self.index,
            body={
                "timeout": "5s",
                "size": 10000,
                "_source": True,
                "stored_fields" : "*",
                "query" : {
                    "constant_score" : {
                        "filter" : { "term": { "gene" : gene } }
                    }
                }
            }
        )
        print('ELASTIC get_lofs hits ' + str(result['hits']['total']))
        print('ELASTIC get_lofs took ' + str(result['took']))
        print('ELASTIC get_lofs ' + str(round(10 *(time.time() - t)) / 10))
        return [ {"id": r["_id"],
                  "gene_data": r["_source"] }
                 for r in result['hits']['hits'] ]

class DataFactory(object):
    arg_definitions = {"PHEWEB_PHENOS": lambda _: {pheno['phenocode']: pheno for pheno in get_phenolist()},
                       "MATRIX_PATH": common_filepaths['matrix'],
                       "ANNOTATION_MATRIX_PATH": common_filepaths['annotation-matrix'],
                       "GNOMAD_MATRIX_PATH": common_filepaths['gnomad-matrix']}

    def __init__(self, config):
        self.dao_impl = {}
        for db in config:
            for db_type in db.keys():
                for db_source in db[db_type]:
                    db_id = db_type + "." + db_source
                    daomodule = importlib.import_module(".db", __package__)
                    daoclass = getattr(daomodule, db_source)
                    if 'const_arguments' in db[db_type][db_source]:
                        for a, b in db[db_type][db_source]['const_arguments']:
                            if b not in self.arg_definitions:
                                raise Exception(b + " is an unknown argument")
                            db[db_type][db_source][a] = self.arg_definitions[b]
                        db[db_type][db_source].pop('const_arguments', None)
                    self.dao_impl[db_type] = daoclass( ** db[db_type][db_source] )

        self.dao_impl["geneinfo"] = NCBIGeneInfoDao()
        self.dao_impl["catalog"] = MichinganGWASUKBBCatalogDao()
        self.dao_impl["drug"] = DrugDao()

        if "externalresult" not in self.dao_impl:
            ## if external results not configured initialize dao always returning empty results
            self.dao_impl["externalresult"] = ExternalFileResultDao(None)


    def get_annotation_dao(self):
        return self.dao_impl["annotation"]

    def get_gnomad_dao(self):
        return self.dao_impl["gnomad"]

    def get_lof_dao(self):
        return self.dao_impl["lof"]

    def get_result_dao(self):
        return self.dao_impl["result"]

    def get_geneinfo_dao(self):
        return self.dao_impl["geneinfo"]

    def get_knownhits_dao(self):
        return self.dao_impl["catalog"]

    def get_drug_dao(self):
        return self.dao_impl["drug"]

    def get_UKBB_dao(self, singlematrix=False):
        if singlematrix and "externalresultmatrix" in self.dao_impl:
            return self.dao_impl["externalresultmatrix"]
        else:
            return self.dao_impl["externalresult"]
