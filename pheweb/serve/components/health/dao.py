
import abc
from typing import Dict
from dataclasses import dataclass
from pheweb.serve.components.model import ComponentCheck, ComponentStatus

@dataclass
class HealthSummary:
    is_okay: bool
    messages: Dict[str, ComponentStatus]

    def to_json(self):
        return {
            'is_okay': self.is_okay,
            'messages' : {k: v.__dict__ for k, v in self.messages.items()}
        }
    
class HealthDAO(ComponentCheck,):

    @abc.abstractmethod
    def get_summary(self, ) -> HealthSummary:
        """
        Return matches
        """
        raise NotImplementedError
