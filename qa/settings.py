"""Local PostgreSQL configuration for browser acceptance tests."""

from config.settings import *  # noqa: F403
from config.settings import DATABASES, REST_FRAMEWORK

DATABASES = {"default": {**DATABASES["default"], "NAME": "organize_e2e"}}
ALLOWED_HOSTS = ["127.0.0.1", "localhost"]
CSRF_TRUSTED_ORIGINS = ["http://127.0.0.1:4174"]
ORGANIZE_DEMO_ENABLED = True

# Hundreds of UI actions share one loopback IP. Keep throttling enabled, with
# a higher ceiling for this dedicated process. Production rates stay separate.
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "DEFAULT_THROTTLE_RATES": {
        scope: "10000/hour" for scope in REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES", {})
    },
}
