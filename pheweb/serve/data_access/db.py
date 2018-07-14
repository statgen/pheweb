
import abc
from importlib import import_module
from collections import defaultdict
from elasticsearch import Elasticsearch
import pysam
import re

from ...file_utils import MatrixReader, common_filepaths
from ...utils import get_phenolist, get_gene_tuples

from collections import namedtuple
import requests
import importlib
import gzip
import subprocess
import time
import io

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
    def get_matching_results(self, phenotype, var_list):
        """ Given a phenotype name and variant list returns a list of matching results.
        Args: phenotype phenotype names
              var_list list of tuples with CHR POS:int REF ALT
            returns list of namedtuples with elements effect_size, pvalue, study_name, n_cases, n_controls
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
    def get_multiphenoresults(self, varphenodict):
        """ Given a dictionary with variant ids as keys (chr:pos:reg:alt) and list of phenocodes as values returns corresponding geno pheno results.
            This interface allows implementations to optimize queries if multiple phenotype results for same variant are co-located
            Args: dicitionary with varian ids as keys and list of pheno codes as values
            returns dictionary with variant ids as keys and result dictionary as values
        """
class AnnotationDB(object):

    @abc.abstractmethod
    def get_variant_annotations(self, id_list):
        """ Retrieve variant annotations given variant id list.
            Args: id_list list of string in format chr:pos:ref:alt
            Returns: A list of . Dictionary has 2 elements "id" which contains the query id and "var_data" containing dictionary with all variant data.
        """
        return

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
    def get_variant_results_range(self, chrom, start, end):
        """ Retrieve variant association results given a variant id and p-value threshold.
            Args: variant a variant in format chr:pos:ref:alt
                  p_threshold a p-value threshold below which results are returned
            Returns: A list of dictionaries. Dictionary has 2 elements: "pheno" which contains a phenotype dict, and "assoc" containing a variant dict ("pval", "id", "rsids"). The list is sorted by p-value.
        """
        return

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
        ensg = r.json()[0]['id']
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

    def get_variant_annotations(self, id_list):
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
                                "_id" : id_list
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

    def get_variant_annotations(self, id_list):
        split = [id.split(':') for id in id_list]
        variants = [{'chrom': s[0].replace('chr', ''), 'pos': int(s[1]), 'ref': s[2], 'alt': s[3]} for s in split]
        annotations = []
        t = time.time()
        with pysam.TabixFile(self.matrix_path, parser=None) as tabix_file:
            #headers = [s.lower() for s in tabix_file.header[0].split('\t')]
            headers = tabix_file.header[0].split('\t')
            for var_i, variant in enumerate(variants):
                tabix_iter = tabix_file.fetch(variant['chrom'], variant['pos']-1, variant['pos'], parser=None)
                for row in tabix_iter:
                    split = row.split('\t')
                    if split[3] == variant['ref'] and split[4] == variant['alt']:
                        for i, s in enumerate(split):
                            if (headers[i].startswith('AF') and split[i] != 'NaN'):
                                split[i] = float(s)
                        annotations.append({'id': id_list[var_i], 'var_data': {headers[i]: split[i] for i in range(0,len(split))}})
                    else:
                        #print(split[3] + ' - ' + variant['ref'] + ' / ' + split[4] + ' - ' + variant['alt'])
                        pass

        print('TABIX GNOMAD get_variant_annotations ' + str(round(10 *(time.time() - t)) / 10))
        return annotations

class TabixResultDao(ResultDB):

    def __init__(self, phenos, matrix_path):

        self.matrix_path = matrix_path
        self.phenos = phenos(0)

    def get_variant_results_range(self, chrom, start, end):
        with pysam.TabixFile(self.matrix_path, parser=None) as tabix_file:
            headers = tabix_file.header[0].split('\t')
            tabix_iter = tabix_file.fetch(chrom, start-1, end, parser=None)
            top = [ { 'pheno': self.phenos[header.split('@')[1]],
                      'p_col_idx': i,
                      'assoc': { 'pval': 1, 'id': None, 'rsids': None }
                    }
                    for i, header in enumerate(headers) if header.startswith('pval')
            ]
            for variant_row in tabix_iter:
                split = variant_row.split('\t')
                for pheno in top:
                    pval = split[pheno['p_col_idx']]
                    beta = split[pheno['p_col_idx']+1]
                    maf_case = split[pheno['p_col_idx']+4]
                    maf_control = split[pheno['p_col_idx']+5]
                    if pval is not '' and (float(pval) < pheno['assoc']['pval']):
                        pheno['assoc']['pval'] = float(pval)
                        pheno['assoc']['beta'] = float(beta)
                        pheno['assoc']['maf_case'] = float(maf_case)
                        pheno['assoc']['maf_control'] = float(maf_control)
                        pheno['assoc']['id'] = 'chr' + ':'.join(split[0:4])
                        pheno['assoc']['rsids'] = split[4] if split[4] is not '' else None


        for item in top:
            item.pop('p_col_idx', None)

        top.sort(key=lambda pheno: pheno['assoc']['pval'])
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
                self.meta[p[name_idx]] = { "ncases":p[ncase_idx], "ncontrol":p[ncontrol_idx] }

        self.tabixfile = pysam.TabixFile( self.matrix, parser=None)

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
        res = {}
        if( type(var_list) is not list ):
            var_list = [var_list]

        if( phenotype in self.res_indices ):
            manifestdata = self.res_indices[phenotype]
            per_variant = []
            for var in var_list:
                t = time.time()

                try:
                    iter = self.__get_restab().fetch(var[0], var[1]-1, var[1], parser=None)
                    for ext_var in iter:
                        ext_var = ext_var.split("\t")
                        varid = "{}:{}:{}:{}".format(var[0],var[1],var[2],var[3])
                        if var[2] == ext_var[2] and var[3]==ext_var[3]:

                            datapoints = { elem:ext_var[i] for elem,i in manifestdata.items() }
                            datapoints.update({ "chr":var[0], "varid":varid, "pos":var[1],"ref":var[2],"alt":var[3],
                                "n_cases": self.meta[phenotype]["ncases"], "n_controls": self.meta[phenotype]["ncontrol"] })
                            res[varid]=datapoints

                except ValueError as e:
                    print("Could not tabix variant. " + str(e) )
        return res

    def get_multiphenoresults(self, varphenodict):
        res = defaultdict(lambda: defaultdict( lambda: dict()))
        for var, phenos in varphenodict.items():
            var = var.split(":")
            var[1]=int(var[1])
            try:
                iter = self.__get_restab().fetch(var[0], var[1]-1, var[1], parser=None)
                for ext_var in iter:
                    ext_var = ext_var.split("\t")
                    varid = "{}:{}:{}:{}".format(var[0],var[1],var[2],var[3])
                    if var[2] == ext_var[2] and var[3]==ext_var[3]:

                        for p in phenos:
                            if p not in self.res_indices:
                                continue
                            manifestdata = self.res_indices[p]
                            datapoints = { elem:ext_var[i] for elem,i in manifestdata.items() }
                            datapoints.update({ "chr":var[0], "varid":varid, "pos":var[1],"ref":var[2],"alt":var[3],
                                "n_cases": self.meta[p]["ncases"], "n_controls": self.meta[p]["ncontrol"] })
                            res[varid][p]=datapoints

            except ValueError as e:
                print("Could not tabix variant. " + str(e) )
        return res


class ExternalFileResultDao(ExternalResultDB):
    FILE_REQ_HEADERS = ["achr38","apos38","REF","ALT","beta","pval"]
    ResRecord = namedtuple('ResRecord', 'name, ncase, ncontrol, file, achr38_idx, apos38_idx, REF_idx, ALT_idx, beta_idx, pval_idx')
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
                        line[file_idx], header.index("achr38"), header.index("apos38"), header.index("REF") ,header.index("ALT") ,
                        header.index("beta"), header.index("pval") )


    def get_results_region(self, phenotype, chr, start, stop):

        res = []
        if( phenotype in self.results ):
            manifestdata = self.results[phenotype]
            with pysam.TabixFile( manifestdata.file, parser=None) as tabix_file:
                headers = tabix_file.header[0].split('\t')
                tabix_iter = tabix_file.fetch("chr" + chrom, start-1, stop, parser=None)
                varid = [ var[manifestdata.achr38_idx],  var[manifestdata.apos38_idx], var[manifestdata.REF_idx], var[manifestdata.ALT_idx]].join(":")
                for var in tabix_iter:
                    var = var.split("\t")
                    res.append(  {"varid":varid, "chr":var[manifestdata.achr38_idx], "pos":var[manifestdata.apos38_idx],
                            "ref":var[manifestdata.REF_idx],"alt":var[manifestdata.ALT_idx] ,"beta":var[manifestdata.beta_idx],
                            "pval":var[manifestdata.pval_idx],  "n_cases":manifestdata.ncase, "n_controls":manifestdata.ncontrol } )

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
            with pysam.TabixFile( manifestdata.file, parser=None) as tabix_file:
                for var in var_list:
                    iter = tabix_file.fetch(var[0], var[1]-1, var[1], parser=None)
                    for ext_var in iter:
                        ext_var = ext_var.split("\t")
                        varid = "{}:{}:{}:{}".format(var[0],var[1],var[2],var[3])

                        if var[2] == ext_var[manifestdata.REF_idx] and var[3]==ext_var[manifestdata.ALT_idx]:
                                res[varid] = {"varid":varid, "chr":ext_var[manifestdata.achr38_idx], "pos":ext_var[manifestdata.apos38_idx],"ref":ext_var[manifestdata.REF_idx],
                                "alt":ext_var[manifestdata.ALT_idx],"beta":ext_var[manifestdata.beta_idx],"pval":ext_var[manifestdata.pval_idx],
                                "n_cases":manifestdata.ncase, "n_controls":manifestdata.ncontrol }

        return res

    def get_multiphenoresults(self, varphenodict):
        res = defaultdict( lambda: [] )
        for var, phenolist in varphenodict.items():
            for p in phenolist:
                r = self.get_matching_results(p, [var.split(":")])
                if len(r)>0:
                    res[var].append(r)
        return res

    def getNs(self, phenotype):
        if(phenotype in self.results ):
            manifest = self.results[phenotype]
            return (manifest.ncase, manifest.ncontrol)
        else:
            return None

class TabixAnnotationDao(AnnotationDB):

    def __init__(self, matrix_path):
        self.matrix_path = matrix_path
        self.gene_region_mapping = {genename: (chrom, pos1, pos2) for chrom, pos1, pos2, genename in get_gene_tuples()}
        self.functional_variants = set(["missense_variant",
                                    "frameshift_variant",
                                    "splice_donor_variant",
                                    "stop_gained",
                                    "splice_acceptor_variant",
                                    "start_lost",
                                    "stop_lost",
                                    "TFBS_ablation",
                                    "protein_altering_variant"])

    def get_variant_annotations(self, id_list):
        split = [id.split(':') for id in id_list]
        variants = [{'chrom': s[0], 'pos': int(s[1])} for s in split]
        annotations = []
        t = time.time()
        with pysam.TabixFile(self.matrix_path, parser=None) as tabix_file:
            headers = [s.lower() for s in tabix_file.header[0].split('\t')]
            for variant in variants:
                tabix_iter = tabix_file.fetch(variant['chrom'], variant['pos']-1, variant['pos'], parser=None)
                row = next(tabix_iter)
                if row is not None:
                    split = row.split('\t')
                    for i, s in enumerate(split):
                        if (headers[i].startswith('af') or headers[1].startswith('maf') or headers[i].startswith('ac') or headers[i].startswith('info')):
                            split[i] = float(s)
                    annotations.append({'id': split[0], 'var_data': {headers[i]: split[i] for i in range(0,len(split))}})
        print('TABIX get_variant_annotations ' + str(round(10 *(time.time() - t)) / 10))
        return annotations

    def get_gene_functional_variant_annotations(self, gene):
        chrom, start, end = self.gene_region_mapping[gene]
        annotations = []
        t = time.time()
        with pysam.TabixFile(self.matrix_path, parser=None) as tabix_file:
            headers = [s.lower() for s in tabix_file.header[0].split('\t')]
            header_i = {header: i for i, header in enumerate(headers)}
            tabix_iter = tabix_file.fetch('chr' + chrom, start-1, end, parser=None)
            for row in tabix_iter:
                split = row.split('\t')
                if split[header_i['most_severe']] in self.functional_variants:
                    for i, s in enumerate(split):
                        if (headers[i].startswith('af') or headers[i].startswith('maf') or headers[i].startswith('ac') or headers[i].startswith('info')):
                            split[i] = float(s)
                    annotations.append({'id': split[0], 'var_data': {header: split[i] for i, header in enumerate(headers)}})
        print('TABIX get_gene_functional_variant_annotations ' + str(round(10 *(time.time() - t)) / 10))
        return annotations

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
