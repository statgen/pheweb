import pytest
from flask import Flask
from pheweb.serve.components.model import ComponentCheck, ComponentStatus
from pheweb.serve.components.health.dao import HealthDAO, HealthSummary
from pheweb.serve.components.health.health_check import total_check, HealthSimpleDAO, HealthNotificationDAO
from pheweb.serve.components.health.service import _components_checks as components_checks, add_status_check, get_health, component


error_service_status = ComponentStatus(is_okay=False, messages=["this is an error"])
error_service_label = "error"
error_summary = HealthSummary(is_okay=False, messages={ error_service_label : error_service_status })

okay_service_status = ComponentStatus(is_okay=True, messages=["okay"])
okay_service_label = "okay" 
okay_summary = HealthSummary(is_okay=True, messages={ okay_service_label :  okay_service_status })

empty_summary=HealthSummary(is_okay=True, messages={})


def clear():
    components_checks = []
    
class ErrorCheck(ComponentCheck):
    def get_name(self,) -> str:
        return error_service_label
    def get_status(self,) -> ComponentStatus:
        raise Exception("this is an error")

class TrivalCheck(ComponentCheck):
    def get_name(self,) -> str:
        return okay_service_label
    def get_status(self,) -> ComponentStatus:
        return okay_service_status

def test_total_check_error() -> None:
    assert  (total_check(ErrorCheck())) == (error_service_label, error_service_status)

def test_okay_check_error() -> None:
    assert  (total_check(TrivalCheck())) == (okay_service_label, okay_service_status)
   
def test_get_summary_empty() -> None:
    impl=HealthSimpleDAO()
    impl.get_summary() == empty_summary
    
def test_get_messages_malformed() -> None:
    impl = HealthSimpleDAO()
    add_status_check(ErrorCheck())
    impl.get_summary() == error_summary

def test_simple_status() -> None:
    status = HealthSimpleDAO().get_status()
    expected = ComponentStatus(True, [])
    assert status == expected

def test_alterting_status() -> None:
    server_name="test_server"
    url="http://www.google.com"
    dao=HealthNotificationDAO(server_name=server_name, url=url)
    name = dao.get_name()
    expected = HealthNotificationDAO.__name__
    assert name == expected
    assert dao.send("test").is_okay == False

def test_simple_status() -> None:
    name = HealthNotificationDAO().get_name()
    expected = HealthNotificationDAO.__name__
    assert name == expected

def test_get_health() -> None:
    app = Flask(__name__)
    app.register_blueprint(component.blueprint, url_prefix='/')
    web = app.test_client()
    response = web.get("/api/health")
    assert response.status == "200 OK"

    

