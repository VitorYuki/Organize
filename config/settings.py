"""Django configuration shared by development and production."""

import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv
from psycopg import ProgrammingError
from psycopg.conninfo import conninfo_to_dict

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY")
DEBUG = os.getenv("DJANGO_DEBUG") == "1"
if not SECRET_KEY or (not DEBUG and len(SECRET_KEY) < 50):
    raise ImproperlyConfigured("Configure uma DJANGO_SECRET_KEY forte no ambiente.")
ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

if not DEBUG and (render_host := os.getenv("RENDER_EXTERNAL_HOSTNAME")):
    ALLOWED_HOSTS.append(render_host)
CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("DJANGO_CSRF_TRUSTED_ORIGINS", "").split(",")
    if origin.strip()
]

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "rest_framework",
    "accounts",
    "tasks",
    "events",
    "notes",
    "custom_lists",
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "config.middleware.private_api",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "accounts.demo.guest_session",
    "config.middleware.expected_account",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
AUTH_USER_MODEL = "accounts.User"
database_url = os.getenv("DATABASE_URL") if not DEBUG else None
if database_url:
    try:
        database_options = conninfo_to_dict(database_url)
    except ProgrammingError:
        raise ImproperlyConfigured("Configure uma DATABASE_URL PostgreSQL válida.") from None
    database = {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": database_options.pop("dbname", ""),
        "USER": database_options.pop("user", ""),
        "PASSWORD": database_options.pop("password", ""),
        "HOST": database_options.pop("host", ""),
        "PORT": database_options.pop("port", "5432"),
    }
    database_options.update(sslmode="verify-full", sslrootcert="system")
    database["OPTIONS"] = database_options
elif not DEBUG and os.getenv("RENDER") == "true":
    raise ImproperlyConfigured("Configure DATABASE_URL no Render.")
else:
    database = {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ["PGDATABASE"],
        "USER": os.environ["PGUSER"],
        "PASSWORD": os.environ["PGPASSWORD"],
        "HOST": os.getenv("PGHOST", "127.0.0.1"),
        "PORT": os.getenv("PGPORT", "5432"),
    }
DATABASES = {"default": database}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": f"django.contrib.auth.password_validation.{name}"}
    for name in (
        "UserAttributeSimilarityValidator",
        "MinimumLengthValidator",
        "CommonPasswordValidator",
        "NumericPasswordValidator",
    )
]
LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = CSRF_COOKIE_SECURE = SECURE_SSL_REDIRECT = not DEBUG
if not DEBUG and os.getenv("RENDER") == "true":
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_HSTS_SECONDS = 0 if DEBUG else 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = SECURE_HSTS_PRELOAD = not DEBUG
CSRF_FAILURE_VIEW = "config.middleware.csrf_failure"
DATA_UPLOAD_MAX_MEMORY_SIZE = 512 * 1024
ORGANIZE_DEMO_ENABLED = os.getenv("ORGANIZE_DEMO_ENABLED", "0") == "1"
DEMO_MAX_ACCOUNTS = 250
DEMO_RECORD_LIMIT = 40
DEMO_ITEM_LIMIT = 100
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.SessionAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["config.parsers.LimitedJSONParser"],
    "DEFAULT_THROTTLE_RATES": {"auth": "30/min", "demo": "10/hour"},
    "NUM_PROXIES": 0,
}
