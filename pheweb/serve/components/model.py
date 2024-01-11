from dataclasses import dataclass, field, replace
from flask import Blueprint
from typing import List, Optional, Dict
import abc
import logging

logger = logging.getLogger(__name__)
logger.addHandler(logging.NullHandler())
logger.setLevel(logging.DEBUG)

@dataclass
class ComponentStatus:
    is_okay : bool
    messages : List[str] = field(default_factory=list)
    details : Dict[str,'ComponentStatus'] = field(default_factory=dict)

    @staticmethod
    def from_exception(ex: Exception):
        return ComponentStatus(is_okay=False, messages=[str(ex)])

class ComponentCheck:
    def get_name(self,) -> str:
        return self.__class__.__name__

    @abc.abstractmethod
    def get_status(self,) -> ComponentStatus:
        raise NotImplementedError


def total_check(check: ComponentCheck) -> ComponentStatus:
    """
    Make checks are total with respect
    to exceptions.

    If there is an exception a failed status
    is created with the name of the check and
    a message with exception is returned.

    :param check check to run

    :returns a tuple containing (name of check, result of check)
    """
    try:
        status=check.get_status()
    except Exception as ex:
        logger.exception(ex)
        logger.error(ex)
        status=ComponentStatus.from_exception(ex)
    return status
    
class CompositeCheck(ComponentCheck):
    
    def __init__(self, checks : Optional[List[ComponentCheck]]=None):
        self.checks=checks if checks is not None else []

    def get_name(self,) -> str:
        return ",".join(map(lambda check : check.get_name(),self.checks))

    def add_check(self,check: ComponentCheck):
        self.checks.append(check)

    def clear_checks(self):
        self.checks.clear()
    
    def get_status(self,) -> ComponentStatus:
        result=ComponentStatus(is_okay=True)
        failure_names = []
        for check in self.checks:
            status = total_check(check)
            result.is_okay = status.is_okay and result.is_okay
            if status.is_okay is False:
                failure_names.append(check.get_name())
            result.details[check.get_name()] = replace(status)
        names=",".join(failure_names)
        count=len(failure_names)
        result.messages = [f"""{count} failures : [{names}]"""]
        return result

    
@dataclass
class ComponentDTO:
    blueprint: Blueprint
    status_check: ComponentCheck
