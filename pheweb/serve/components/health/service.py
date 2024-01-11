from pheweb.serve.components.model import ComponentStatus, ComponentCheck
from flask import Blueprint, current_app as app, jsonify, abort
import typing
from pheweb.serve.components.health.dao import HealthDAO
from pheweb.serve.components.model import ComponentDTO
from pheweb.serve.server_auth import is_public
import logging

logger = logging.getLogger(__name__)
logger.addHandler(logging.NullHandler())
logger.setLevel(logging.ERROR)

# stores list of check
_components_checks = []

def add_status_check(component_check: ComponentCheck) -> None:
    logger.info("status check %s", component_check.get_name())
    _components_checks.append(component_check)

def clear_status_check() -> None:
    _components_checks.clear()

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
@is_public
def get_health():
    """
    Health check flask route
    """
    dao = get_dao()
    if dao is None:
        abort(500, "Healthcheck not available")
    else:
        summary = dao.get_summary()
        return jsonify(summary)


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
