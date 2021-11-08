from typing import Optional
import json
import abc

class ConfigUIDB:


    @abc.abstractmethod
    def get_config_ui(self):
        """
        Return the ui config object
        """
        raise NotImplementedError


class ConfigUIDAO(ConfigUIDB):
    
    def __init__(self, path : Optional[str] , parameters=dict(), verbose=False):
        if path:
            with open(path, 'r') as f:
                json_parameters = json.load(f)
        else:
            json_parameters = dict()

        self.config_ui = { **json_parameters,
                           **parameters }
        if verbose:
            print(self.config_ui)
        
    def get_config_ui(self):
        return {**self.config_ui}
