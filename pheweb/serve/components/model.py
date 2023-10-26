from dataclasses import dataclass
from flask import Blueprint
from typing import List, Optional
import abc
import logging

logger = logging.getLogger(__name__)
logger.addHandler(logging.NullHandler())
logger.setLevel(logging.DEBUG)

@dataclass
class ComponentStatus:
    is_okay: bool
    messages: List[str]

    @staticmethod
    def from_exception(ex: Exception):
        logger.exception(ex)
        return ComponentStatus(is_okay=False, messages=[str(ex)])

class ComponentCheck:
    def get_name(self,) -> str:
        return self.__class__.__name__

    @abc.abstractmethod
    def get_status(self,) -> ComponentStatus:
        raise NotImplementedError


@dataclass
class ComponentDTO:
    blueprint: Blueprint
    status_check: ComponentCheck
