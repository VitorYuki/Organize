"""Prepare the dedicated E2E database and serve its API on loopback only."""

import os

import django
import psycopg
from django.conf import settings
from django.core.management import call_command


def main():
    os.environ["DJANGO_SETTINGS_MODULE"] = "qa.settings"
    django.setup()
    database = settings.DATABASES["default"]
    if database["ENGINE"] != "django.db.backends.postgresql" or database["HOST"] not in {
        "localhost",
        "127.0.0.1",
        "::1",
    }:
        raise RuntimeError("Os testes E2E exigem um PostgreSQL local.")
    if database["NAME"] != "organize_e2e":
        raise RuntimeError("Use o banco exclusivo organize_e2e para os testes.")

    with psycopg.connect(
        dbname="postgres",
        user=database["USER"],
        password=database["PASSWORD"],
        host=database["HOST"],
        port=database["PORT"],
        autocommit=True,
    ) as connection:
        exists = connection.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s", (database["NAME"],)
        ).fetchone()
        if not exists:
            connection.execute("CREATE DATABASE organize_e2e")

    call_command("migrate", interactive=False, verbosity=0)
    call_command("runserver", "127.0.0.1:8002", use_reloader=False)


if __name__ == "__main__":
    main()
