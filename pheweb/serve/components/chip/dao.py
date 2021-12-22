# Created by mwm1 at 12/21/21

# Feature: data access object
import abc
import typing
from dataclasses import dataclass
from typing import NamedTuple, List, Any


class ChipData(NamedTuple):
    columns: List[str]
    data: List[Any]


class ChipDAO:
    @abc.abstractmethod
    def get_chip_data(self) -> ChipData:
        raise NotImplementedError

    @abc.abstractmethod
    def get_cluster_plot(self, variant_str: str) -> typing.Optional[bytes]:
        raise NotImplementedError


@dataclass
class JeevesContext:
    chip_dao: ChipDAO
