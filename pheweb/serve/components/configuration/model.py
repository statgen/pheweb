# -*- coding: utf-8 -*-
"""
Coding data model classes.

DAO, DTO classes and interfaces.
"""
import abc
import typing
from dataclasses import dataclass
from typing import NamedTuple, List, Any


class ConfigurationDAO:
    """
    Coding DAO.

    Abstract class for configuration dao.
    """




@dataclass
class JeevesContext:
    """
    Jeeves context.

    Type interface for the jeeves context.
    """

    configuration_dao: typing.Optional[ConfigurationDAO]
