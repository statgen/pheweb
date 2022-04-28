import importlib.machinery
import typing
import abc
import pymysql
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


def load_mysql_authentication(obj : object, authentication_file : str) -> object:
    loader = importlib.machinery.SourceFileLoader('mysql_auth', authentication_file)
    auth_module = loader.load_module()
    obj.user = getattr(auth_module, 'mysql')['user']
    obj.password = getattr(auth_module, 'mysql')['password']
    obj.host = getattr(auth_module, 'mysql')['host']
    obj.db = getattr(auth_module, "mysql")['db']
    return obj


class MysqlDAO:
    def __init__(self, authentication_file : str):
            self.authentication_file = authentication_file
            load_mysql_authentication(self, self.authentication_file)

    def get_connection(self):
        return pymysql.connect(
            host=self.host, user=self.user, password=self.password, db=self.db
        )


class VariantPhenotypePipDao(VariantPhenotypePipDB, MysqlDAO):
    """
        Variant Phenotype DAO.

        DAO for fetch drug data from open targets.
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