# -*- coding: utf-8 -*-
"""
Chip data model classes.

DAO, DTO classes and interfaces.
"""
import abc
import typing
from dataclasses import dataclass
from typing import NamedTuple, List, Any


class ChipDAO:
    """
    Chip DAO.

    Abstract class for chip dao.
    """




@dataclass
class JeevesContext:
    """
    Jeeves context.

    Type interface for the jeeves context.
    """

    chip_dao: typing.Optional[ChipDAO]
