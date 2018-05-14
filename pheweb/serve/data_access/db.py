
import abc
from importlib import import_module

from elasticsearch import Elasticsearch
import pysam

from ...file_utils import MatrixReader, common_filepaths
from ...utils import get_phenolist


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

class ResultDB(object):

    @abc.abstractmethod
    def get_variant_results(self, variant, p_threshold):
        """ Retrieve variant association results given a variant id and p-value threshold.
            Args: variant a variant in format chr:pos:ref:alt
                  p_threshold a p-value threshold below which results are returned
            Returns: A dictionary. Dictionary has 2 elements: "rsids" which contains the rsids of the variant if any, and "significant_phenos" containing a list of phenos below the given p-value threshold.
        """
        return
    
    @abc.abstractmethod
    def get_variant_results_range(self, chrom, start, end):
        """ Retrieve variant association results given a variant id and p-value threshold.
            Args: variant a variant in format chr:pos:ref:alt
                  p_threshold a p-value threshold below which results are returned
            Returns: A list of dictionaries. Dictionary has 2 elements: "pheno" which contains a phenotype dict, and "assoc" containing a variant dict ("pval", "id", "rsids"). The list is sorted by p-value.
        """
        return

class ElasticAnnotationDao(AnnotationDB):

    def __init__(self, host, port, variant_index):

        self.index = variant_index
        self.host = host
        self.port = port

        self.phenos = {pheno['phenocode']: pheno for pheno in get_phenolist()}
        
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

    def __init__(self):

        self.phenos = {pheno['phenocode']: pheno for pheno in get_phenolist()}
        self._matrix_reader = MatrixReader()

    def get_variant_results_range(self, chrom, start, end):
        with pysam.TabixFile(common_filepaths['matrix'], parser=None) as tabix_file:
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
                    if pval is not '' and (float(pval) < pheno['assoc']['pval']):
                        pheno['assoc']['pval'] = float(pval)
                        pheno['assoc']['id'] = 'chr' + ':'.join(split[0:3])
                        pheno['assoc']['rsids'] = split[4] if split[4] is not '' else None

        for item in top:
            item.pop('p_col_idx', None)
            
        top.sort(key=lambda pheno: pheno['assoc']['pval'])
        return top

    def get_variant_results(self, variant, p_threshold):
        chrom, pos, ref, alt = variant.split(":")
        chrom = chrom.replace("chr", "")
        with self._matrix_reader.context() as mr:
            variant_res = mr.get_variant(chrom, int(pos), ref, alt)
        significant_phenos = [ v for (k, v) in variant_res["phenos"].items() if v["pval"] < p_threshold ]
        return { "rsids": variant_res["rsids"], "significant_phenos": significant_phenos }
         
   
class DataFactory(object):
    daos = {"annotation.elastic":ElasticAnnotationDao,
            "result.tabix":TabixResultDao}
    def __init__(self, config):
        self.dao_impl = {}
        for db in config:
            for db_type in db.keys():
                for db_source in db[db_type]:
                    db_id = db_type + "." + db_source
                    if( db_id not in self.daos):
                        raise Exception( "Database '" + db_id + "' does not exist" )
                    else:
                        self.dao_impl[db_type] = self.daos[db_id]( ** db[db_type][db_source])

    def get_annotation_dao(self):
        return self.dao_impl["annotation"]

    def get_result_dao(self):
        return self.dao_impl["result"]
    
