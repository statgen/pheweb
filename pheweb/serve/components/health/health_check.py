import requests
from pheweb.serve.components.model import ComponentCheck, ComponentStatus
from pheweb.serve.components.health.dao import HealthDAO, HealthSummary
from typing import Tuple
import json
from pheweb.serve.components.health.service import get_status_check
import logging
import socket

logger = logging.getLogger(__name__)
logger.addHandler(logging.NullHandler())
logger.setLevel(logging.DEBUG)

REQUEST_TIMEOUT=10 # 10 seconds

def total_check(check: ComponentCheck) -> Tuple[str, ComponentStatus]:
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
        return check.get_name(), check.get_status()
    except Exception as ex:
        logger.exception(ex)
        return check.get_name(), ComponentStatus.from_exception(ex)


class HealthSimpleDAO(HealthDAO):
    def get_summary(self, ) -> HealthSummary:
        """
        Run the health check and return
        a boolean indicating if the test
        has passed and a map with a map
        of status checks.

        :returns a dictionary with the service statuses
        """
        checks = get_status_check()
        messages = dict(map(total_check, checks))
        is_okay = all(message.is_okay for message in messages.values())
        return HealthSummary(is_okay,messages)

    def get_status(self,) -> ComponentStatus:
        return ComponentStatus(True, [])
    
class HealthNotificationDAO(HealthSimpleDAO):
    """
    Alerting health check.
    """
    def __init__(self,
                 server_name=socket.gethostname(),
                 url=None):
        """
        Make a healthcheck manager.

        """
        self.server_name=server_name
        self.url=url
        self.status=None
         
    def send(self, messages) -> ComponentStatus:
        """
        Post message with a payload of the messages
        """
        headers = {'Content-type': 'application/json'}
        json_data = { 'text' : json.dumps({"messages": messages }) }
        response = requests.post(self.url, headers=headers, json=json_data, timeout=REQUEST_TIMEOUT)
        if response.status_code == 200:
            result=ComponentStatus(True, [])
        else:
            result=ComponentStatus(False, [f"{response.status_code} {response.text}"])
        return result
    
    
    
    def get_summary(self, ) -> HealthSummary:
        summary = super(HealthNotificationDAO, self).get_summary()
        if self.status is not None and summary.is_okay is False and self.url is not None:
            logger.info(summary.to_json())
            self.send(summary.to_json())
        return summary

    def get_status(self,) -> ComponentStatus:
        """
        get the status

        send a message that the service is starting
        use the sucess of sending this message as
        the status of this component.
        """
        if self.status is None:
            if self.url is None:
                self.status=super(HealthSimpleDAO ,self).get_status()
            else:
                start_message=f"starting {self.server_name}"
                self.status=self.send(start_message)
        return self.status

def default_dao():
    return HealthSimpleDAO()
