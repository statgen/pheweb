# -*- coding: utf-8 -*-
"""
Chip data model classes.

DAO, DTO classes and interfaces.
"""
import abc
import typing
from dataclasses import dataclass
from typing import NamedTuple, List, Any


@dataclass
class ChipData:
    """
    Chip Data DTO.

    DTO for that chip data that
    is returned.
    """

    columns: List[str]
    data: List[Any]


class ChipDAO:
    """
    Chip DAO.

    Abstract class for chip dao.
    """

    @abc.abstractmethod
    def get_chip_data(self) -> ChipData:
        """
        Get the chip data.

        :return: returns a dto with chip data.
        """
        raise NotImplementedError

    @abc.abstractmethod
    def get_cluster_plot(self, variant: str) -> typing.Optional[bytes]:
        """
        Get a cluster plot of the variant.

        :param variant: variant
        :return: bytes of the cluster plot image
        """
        raise NotImplementedError


@dataclass
class JeevesContext:
    """
    Jeeves context.

    Type interface for the jeeves context.
    """

    chip_dao: typing.Optional[ChipDAO]
