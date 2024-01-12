import importlib.machinery
import typing
import abc
import pymysql
from pheweb.serve.data_access.db_util import MysqlDAO
from contextlib import closing
import re
from typing import List, Dict, Union


class PqtlColocalisationDB(object):
    @abc.abstractmethod
    def get_pqtl_colocalization(self, gene_name):
        """Retrieve a given gene pqtls and disease colocalizations
        """
        return
     
    @abc.abstractmethod
    def get_gene_colocs(self, gene_name):
        """ Retrieve disease colocalizations for a given gene """
        return

class PqtlColocalisationDao(PqtlColocalisationDB, MysqlDAO):

    def __init__(self,
                 authentication_file : str,
                 pqtl: Dict[str, Union[str, List[str]]],
                 colocalization: Dict[str, Union[str, List[str]]]
     ):
        super(PqtlColocalisationDB, self).__init__(authentication_file=authentication_file)
        self._pqtl = pqtl
        self._colocalizaion = colocalization
        
    def get_pqtl_colocalization(self, gene_name: str):
        with closing(self.get_connection()) as conn:
            pqtl = self._pqtl
            colocalizaion = self._colocalizaion

            # fetch pqtls from mysql
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                table = pqtl["table"]
                columns = pqtl["columns"]
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
                    table = colocalizaion["table"]
                    columns = colocalizaion["columns"]
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
        

    def get_gene_colocalization(self, gene_name: str):

        pqtl = self._pqtl
        colocalizaion = self._colocalizaion

        with closing(self.get_connection()) as conn:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                table = colocalizaion['table']
                columns = colocalizaion['columns']
                columns = ", ".join(columns)
                sql = f"""SELECT {columns} FROM {table} WHERE 
                                phenotype2_description=%s """
                parameters = [gene_name]    
                cursor.execute(sql, parameters)
                colocs = cursor.fetchall()
        
        pheno_colocs = {}     
        for coloc in colocs:
            if coloc['phenotype1'] in pheno_colocs:
                pheno_colocs[coloc['phenotype1']]['disease_colocalizations'].append(coloc)
            else:
                pheno_colocs[coloc['phenotype1']] = {
                    'phenotype': coloc['phenotype1'], 
                    'description': coloc['phenotype1_description'],
                    'n_colocs': 0,
                    'disease_colocalizations': [coloc]
                }  
        
        result = [pheno_colocs[p] for p in pheno_colocs]
        for r in result:
            r['n_colocs'] = len(r['disease_colocalizations'])

        return result
    