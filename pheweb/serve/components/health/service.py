from pheweb.serve.components.model import ComponentStatus, ComponentCheck
from flask import Blueprint, current_app as app, jsonify, abort, make_response
import typing
from pheweb.serve.components.health.dao import HealthDAO
from pheweb.serve.components.model import ComponentDTO
import logging

logger = logging.getLogger(__name__)
logger.addHandler(logging.NullHandler())
logger.setLevel(logging.DEBUG)

# stores list of check
_components_checks = []

def add_status_check(component_check: ComponentStatus) -> None:
    logger.info(f"status check {component_check.get_name()}")
    _components_checks.append(component_check)

def get_status_check():
    return _components_checks

def get_dao(current_app=app) -> typing.Optional[HealthDAO]:
    """
    Get health check DAO
    """
    dao: typing.Optional[HealthDAO] = current_app.jeeves.health_dao
    return dao

health = Blueprint("health", __name__)

@health.route("/api/health", methods=["GET"])
def get_health():
    """
    Health check flask route
    """
    dao = get_dao()
    if dao is None:
        abort(500, "Healthcheck not available")
    else:
        summary = dao.get_summary()
        status_code = 200 if summary.is_okay else 503
        return jsonify(summary.messages), status_code

class HealthCheck(ComponentCheck):
    def get_name(self,) -> str:
        return "health"
    
    def get_status(self,) -> ComponentStatus:
        dao = get_dao()
        if dao is None:
            result = ComponentStatus(False, ["dao is not available"])
        else:
            result = dao.get_status()
        return result

component = ComponentDTO(health, HealthCheck())
