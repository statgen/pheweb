# -*- coding: utf-8 -*-
"""
Coding data model classes.

DAO, DTO classes and interfaces.
"""
import abc
import typing
from dataclasses import dataclass
from typing import NamedTuple, List, Any


class CodingDAO:
    """
    Coding DAO.

    Abstract class for coding dao.
    """




@dataclass
class JeevesContext:
    """
    Jeeves context.

    Type interface for the jeeves context.
    """

    coding_dao: typing.Optional[CodingDAO]
