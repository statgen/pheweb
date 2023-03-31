import typing
import abc
from finngen_common_data_model.genomics import Variant
from dataclasses import dataclass

class SupplementaryStatisticsDB(object):
    @abc.abstractmethod
    def get_phenotype_statistics(self, phenotype : str) -> typing.Dict[str, typing.Dict[str, typing.Union[str,None,int,float]]]:
        """
        Retrieve an dictionary containing supplementary statistics

        @param phenotype
        @return: map of phenotype to pip
        """
        raise NotImplementedError

    @abc.abstractmethod
    def get_variant_statistics(self, variant : Variant) -> typing.Dict[str, typing.Dict[str, typing.Union[str,None,int,float]]]:
        """
        Retrieve an dictionary containing supplementary statistics

        @param phenotype
        @return: map of phenotype to pip
        """
        raise NotImplementedError


@dataclass
class JeevesContext:
    """
    Jeeves context.

    Type interface for the jeeves context.
    """

    supplementary_dao: typing.Optional[SupplementaryStatisticsDB]
