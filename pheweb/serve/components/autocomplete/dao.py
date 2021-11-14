from typing import Optional                                                                                                                                                  
import json
import abc
from typing import List,Dict,Any,Optional,Iterator


class Autocompleter:


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
