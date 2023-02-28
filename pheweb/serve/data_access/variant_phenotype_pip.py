import importlib.machinery
import typing
import abc
import pymysql
from pheweb.serve.data_access.db_util import MysqlDAO
from contextlib import closing

class VariantPhenotypePipDB(object):
    @abc.abstractmethod
    def get_variant_phenotype_pip(self,
                                  chromosome : int,
                                  position: int,
                                  reference : str,
                                  alternative : str) -> typing.Dict[str, float]:
        """
        Retrieve drugs for a given gene

        @param chromosome: number representing chromosome
        @param position: position
        @param reference : reference allele
        @param alternative : alternative allele
        @return: map of phenotype to pip
        """
        raise NotImplementedError


class VariantPhenotypePipDao(VariantPhenotypePipDB, MysqlDAO):
    """
        Variant Phenotype PIP DAO.

        DAO to get pip data.
    """
    def __init__(self, authentication_file : str):
        super(VariantPhenotypePipDB, self).__init__(authentication_file=authentication_file)

    def get_variant_phenotype_pip(self, chromosome: int, position : int, reference: str, alternative: str) -> typing.Dict[str, float]:
        with closing(self.get_connection()) as conn:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                sql = """SELECT * FROM variant_phenotype_pip 
                         WHERE chromosome=%s AND
                               position=%s AND 
                               reference=%s AND 
                               alternate=%s """
                parameters = [chromosome, position, reference, alternative]
                cursor.execute(sql, parameters)
                phenocode_pip = dict([(data['phenocode'], data['pip']) for data in cursor.fetchall()])
                return phenocode_pip
