
import abc
from importlib import import_module

from elasticsearch import Elasticsearch

class VariantDB(object):

     @abc.abstractmethod
     def get_variant_annotations(self, id_list):
         """ Retrieve variant annotations given variant id listself.
            Args: id_list list of string in format chr:pos:ref:alt
            Returns: list of dictionaries
         """
         return

class ElasticVariantDao(VariantDB):

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
        """ Retrieve variant annotations given variant id list.
            Args: id_list list of string in format chr:pos:ref:alt
            Returns: A list of dictionaries. Dictionary has 2 elemens "id" which contains the query id and "var_data" containing dictionary with all variant data.
        """
        annotation = self.elastic.search(
            index=self.index,
            body={
                "timeout": "5s",
                "size": 10000,
                "_source": "false",
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


class DataFactory(object):
    daos = {"variant.elastic":ElasticVariantDao}
    def __init__(self, config):
        self.dao_impl = {}
        for var_dbs in config["variant"].keys():
            for var_db in config["variant"].keys():
                db_id = "variant." + var_db
                if( db_id not in self.daos):
                    raise Exception( "Variant database:" "variant." + var_db + " does not exist" )
                else:
                    self.dao_impl["variant"] = self.daos[db_id]( ** config["variant"][var_db])

    def get_variant_dao(self):
        return self.dao_impl["variant"]
