import importlib.machinery
import typing
import abc
import pymysql
from pheweb.serve.data_access.db_util import MysqlDAO
from contextlib import closing

# adapted from 
# https://stackoverflow.com/questions/7204805/how-to-merge-dictionaries-of-dictionaries
def merge_dictionary(accumulator : typing.Dict[str,typing.Dict[str,typing.Union[int, str, float]]],
                     value : typing.Dict[str,typing.Dict[str,typing.Union[int, str, float]]]) -> None:
    """
    merge value dictionary into the accumulator dictionary
    """
    for k in set(accumulator.keys()).union(value.keys()):
        if k in accumulator and k in value:
            accumulator[k]={**accumulator[k], **value[k]}
        elif k in value:
            accumulator[k]=value[k]

class VariantPhenotypeDB(object):
    @abc.abstractmethod
    def get_variant_phenotype(self,
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
        @return: map of phenotype
        """
        raise NotImplementedError


class VariantPhenotypeDao(VariantPhenotypeDB, MysqlDAO):
    """
        Variant Phenotype DAO.

        DAO to get data.

        The configruation of the form

        { "authentication_file": <authentication file> ,
          "fields" : [ { "table" : <table name> ,
                         "columns" : [ <list of columns>] }, 
                       ... ] 
        }

        @param authentication_file: path to authentication file
        @fields: the fields object of configuration
    """
    def __init__(self,
                 authentication_file : str,
                 fields,
     ):
        super(VariantPhenotypeDB, self).__init__(authentication_file=authentication_file)
        self._fields = fields
        
    def get_variant_phenotype(self,
                              chromosome: int,
                              position : int,
                              reference: str,
                              alternative: str) -> typing.Dict[str,typing.Dict[str,typing.Union[int, str, float]]]:
        """
        Given cpra value return the matches using
        the tables and columns specified in the 
        configruation.

        the tables used have to the the columns

        phenocode                 VARCHAR(255) NOT NULL,
        chromosome                TINYINT NOT NULL,
        position                  INT NOT NULL,
        identitier                varchar(2000) NOT NULL,
        reference                 varchar(1000) NOT NULL,
        alternate                 varchar(1000) NOT NULL,

        along with what ever additional columns needed.
               
        
        @param: chromosome
        @param: position
        @param: reference
        @param: alternative
        """
        with closing(self.get_connection()) as conn:
            result = {}
            fields = self._fields
            for field in fields:
                with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                    table = field["table"]
                    columns = field["columns"] + ["phenocode"]
                    columns = ", ".join(columns)
                    sql = f"""SELECT {columns} FROM {table}
                              WHERE chromosome=%s AND
                                    position=%s AND 
                                    reference=%s AND 
                                    alternate=%s """
                    parameters = [chromosome, position, reference, alternative]
                    cursor.execute(sql, parameters)
                    phenotype_data = { data['phenocode']:data for data in cursor.fetchall() }
                    merge_dictionary(result,phenotype_data)
            return result
