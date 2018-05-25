
import abc
from importlib import import_module

from elasticsearch import Elasticsearch
import pysam

from ...file_utils import MatrixReader, common_filepaths
from ...utils import get_phenolist

import requests


class GeneInfoDB(object):

    @abc.abstractmethod
    def get_gene_info(self, symbol):
        """ Retrieve gene basic info given gene symbol.
            Args: symbol gene symbol
            Returns: dictionary with elements 'description': short desc, 'summary':extended summary, 'maploc':chrmaplos   'start': startpb 'stop': stopbp
        """
        return


class AnnotationDB(object):

    @abc.abstractmethod
    def get_variant_annotations(self, id_list):
        """ Retrieve variant annotations given variant id list.
            Args: id_list list of string in format chr:pos:ref:alt
            Returns: A list of dictionaries. Dictionary has 2 elements "id" which contains the query id and "var_data" containing dictionary with all variant data.
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
        print(rep)
        if( "result" not in rep):
            raise Exception("Could not access NCBI gene summary. Response:" + str(rep))
        data = rep["result"][id]
        ## chr stop seems to be missing from top level annotation
        loc = list(filter( lambda x: x["annotationrelease"]=="109", data["locationhist"]))[0]
        return { "description":data["description"], "summary":data["summary"], "start":data["chrstart"], "stop":loc["chrstop"], "maploc":data["maplocation"]   }

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

        return [ {"id": anno["_id"],
                  "var_data": { k:v[0] for (k,v) in anno["fields"].items() }
                 } for anno in annotation['hits']['hits']
               ]

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


class DataFactory(object):
    daos = {"annotation.elastic":ElasticAnnotationDao,
            "result.tabix":TabixResultDao}
    arg_definitions = {"PHEWEB_PHENOS": lambda _: {pheno['phenocode']: pheno for pheno in get_phenolist()},
                       "MATRIX_PATH": common_filepaths['matrix']}

    def __init__(self, config):
        self.dao_impl = {}
        for db in config:
            for db_type in db.keys():
                for db_source in db[db_type]:
                    print(db_type, db_source)
                    db_id = db_type + "." + db_source
                    if( db_id not in self.daos):
                        raise Exception( "Database '" + db_id + "' does not exist" )
                    if 'const_arguments' in db[db_type][db_source]:
                        for a, b in db[db_type][db_source]['const_arguments']:
                            if b not in self.arg_definitions:
                                raise Exception(b + " is an unknown argument")
                            db[db_type][db_source][a] = self.arg_definitions[b]
                        db[db_type][db_source].pop('const_arguments', None)
                    self.dao_impl[db_type] = self.daos[db_id]( ** db[db_type][db_source] )

        self.dao_impl["geneinfo"] = NCBIGeneInfoDao()
        self.dao_impl["catalog"] = MichinganGWASUKBBCatalogDao()

    def get_annotation_dao(self):
        return self.dao_impl["annotation"]

    def get_result_dao(self):
        return self.dao_impl["result"]

    def get_geneinfo_dao(self):
        return self.dao_impl["geneinfo"]

    def get_knownhits_dao(self):
        return self.dao_impl["catalog"]
