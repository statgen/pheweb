import json
import abc
from typing import List,Dict,Any,Optional,Iterator
from dataclasses import dataclass

class AutocompleterDAO:


    @abc.abstractmethod
    def autocomplete(self, query:str) -> List[Dict[str,str]]:
        """
        Return matches
        """
        raise NotImplementedError


    @abc.abstractmethod
    def get_best_completion(self, query:str) -> Optional[Dict[str,str]]:
        """
        Return matches
        """
        raise NotImplementedError

"""Max number of results to return"""
QUERY_LIMIT : int = 10
