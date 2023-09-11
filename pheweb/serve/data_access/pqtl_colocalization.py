import importlib.machinery
import typing
import abc
import pymysql
from pheweb.serve.data_access.db_util import MysqlDAO
from contextlib import closing
import re


class PqtlColocalisationDB(object):
    @abc.abstractmethod
    def get_pqtl_colocalization(self, gene_name):
        """Retrieve a given gene pqtls and disease colocalizations
        """
        return

class PqtlColocalisationDao(PqtlColocalisationDB, MysqlDAO):

    def __init__(self,
                 authentication_file : str,
                 fields,
     ):
        super(PqtlColocalisationDB, self).__init__(authentication_file=authentication_file)
        self._fields = fields
        
    def get_pqtl_colocalization(self, gene_name: str):

        with closing(self.get_connection()) as conn:
            fields = self._fields
            tables = [field['table'] for field in fields]
            coloc_table_id = tables.index([t for t in tables if 'coloc' in t][0])

            # fetch pqtls from mysql
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                table = fields[:-coloc_table_id][0]["table"]
                columns = fields[:-coloc_table_id][0]["columns"]
                columns = ", ".join(columns)
                sql = f"""SELECT {columns} FROM {table} WHERE gene_name=%s """
                parameters = [gene_name]                       
                cursor.execute(sql, parameters)
                pqtls = cursor.fetchall() 

            # fetch colocalizaion from mysql
            result = []      
            for pqtl in pqtls:
                gene_name = pqtl["gene_name"]
                source = pqtl["source"]
                v = pqtl['trait'].split(' ')
                trait =  re.sub("[\(\)]", "", v[1]) if len(v) > 1 else v[0]
                var = pqtl["v"]
                var_colocs = []
                with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                    table = fields[coloc_table_id]["table"]
                    columns = fields[coloc_table_id]["columns"]
                    columns = ", ".join(columns)
                    sql = f"""SELECT {columns} FROM {table} WHERE 
                                    phenotype2_description=%s AND
                                    phenotype2=%s AND
                                    source2=%s AND
                                    locus_id2_chromosome=%s AND
                                    locus_id2_position=%s AND 
                                    locus_id2_ref=%s AND 
                                    locus_id2_alt=%s """
                    parameters = [gene_name, trait, source] + var.split(':')     
                    cursor.execute(sql, parameters)
                    colocs = cursor.fetchall()
                    var_colocs.append(colocs)
                pqtl['disease_colocalizations'] = var_colocs
                result.append(pqtl)
                
            return result
    