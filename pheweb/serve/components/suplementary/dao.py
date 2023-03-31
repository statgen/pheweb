import importlib.machinery
import typing
import abc
import pymysql
from contextlib import closing
from .model import SupplementaryStatisticsDB
from pheweb.serve.data_access.db_util import MysqlDAO
from finngen_common_data_model.genomics import Variant

class SupplementaryStatisticsDB(object):
    @abc.abstractmethod
    def get_phenotype_statistics(self, phenotype : str) -> typing.Dict[str, typing.Dict[str, typing.Union[str,None,int,float]]]:
        """
        Retrieve an dictionary containing supplementary statistics

        @param phenotype
        @return: map of phenotype to pip
        """
        raise NotImplementedError

class SupplementaryStatisticsDao(SupplementaryStatisticsDB, MysqlDAO):
    """
        Supplementary Statistics DAO.

        DAO for fetch drug data from open targets.
    """
    def __init__(self, authentication_file : str):
        super(SupplementaryStatisticsDB, self).__init__(authentication_file=authentication_file)

    def get_phenotype_statistics(self, phenocode : str) -> typing.Dict[str, typing.Dict[str, typing.Union[str,None,int,float]]]:
        with closing(self.get_connection()) as conn:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                sql = """SELECT * FROM supplementary_statistics
                         WHERE phenocode=%s """
                parameters = [phenocode]
                cursor.execute(sql, parameters)
                phenocode_pip = dict([(MysqlDAO.format_cpra_row(data), data['statistics']) for data in cursor.fetchall()])
                return phenocode_pip

    def get_variant_statistics(self, variant : Variant) -> typing.Dict[str, typing.Dict[str, typing.Union[str,None,int,float]]]:
        with closing(self.get_connection()) as conn:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                sql = """SELECT * FROM supplementary_statistics
                         WHERE chromosome=%s
                           and position=%s
                           and reference=%s
                           and alternate=%s
                """
                parameters = [variant.chromosome,
                              variant.position,
                              variant.reference,
                              variant.alternate]
                cursor.execute(sql, parameters)
                phenocode_pip = { MysqlDAO.format_cpra_row(data):data['statistics'] for data in cursor.fetchall() }
                return phenocode_pip


