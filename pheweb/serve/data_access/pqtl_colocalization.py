import importlib.machinery
import typing
import abc
import pymysql
from pheweb.serve.data_access.db_util import MysqlDAO
from contextlib import closing


class PqtlColocalisationDB(object):
    @abc.abstractmethod
    def get_pqtl_colocalization(self, gene_name):
        """Retrieve a given gene pqtls
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

        print(f'\n[sanastas] pqtl_colocalization.py :: Called get_pqtl_colocalization of the class PqtlColocalisationDao')  

        with closing(self.get_connection()) as conn:
            fields = self._fields
            tables = [field['table'] for field in fields]
            if tables.index('colocalization') == 0:
                fields.reverse()

            # fetch pqtls from the sql server
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                table = fields[0]["table"]
                columns = fields[0]["columns"]
                columns = ", ".join(columns)
                sql = f"""SELECT {columns} FROM {table} WHERE gene_name=%s """
                parameters = [gene_name]                       
                cursor.execute(sql, parameters)
                pqtls = cursor.fetchall() # list of dict
            
            # # fetch colocalizaion
            result = []      
            for pqtl in pqtls:
                gene_name = pqtl["gene_name"]
                source = f'FinnGen {pqtl["source"]}'
                var = pqtl["v"]
                var_colocs = []
                with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                    table = fields[1]["table"]
                    columns = fields[1]["columns"]
                    columns = ", ".join(columns)
                    sql = f"""SELECT {columns} FROM {table} WHERE phenotype2_description=%s AND
                                    source2=%s AND
                                    locus_id2_chromosome=%s AND
                                    locus_id2_position=%s AND 
                                    locus_id2_ref=%s AND 
                                    locus_id2_alt=%s """
                    parameters = [gene_name, source] + var.split(':')     
                    cursor.execute(sql, parameters)
                    colocs = cursor.fetchall()
                    var_colocs.append(colocs)
                pqtl['disease_colocalizations'] = var_colocs
                result.append(pqtl)
                
            return result
    
