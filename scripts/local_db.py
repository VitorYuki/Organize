"""Start the project's private PostgreSQL cluster or initialize it on first use."""

import os
import secrets
import shutil
import subprocess
from pathlib import Path

import psycopg
from dotenv import dotenv_values
from psycopg import sql

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / ".local"
DATA = STATE / "pgdata"
ENV = ROOT / ".env"
ADMIN = "organize_admin"
ROLE = "organize"
PORT = 55432


def binary(name):
    folder = os.getenv("ORGANIZE_PG_BIN")
    if folder:
        return str(Path(folder) / name)
    if found := shutil.which(name):
        return found
    base = Path(os.environ.get("ProgramFiles", "C:/Program Files")) / "PostgreSQL"
    installed = sorted(base.glob(f"*/bin/{name}.exe"), reverse=True)
    if installed:
        return str(installed[0])
    raise SystemExit("Indique o diretório bin do PostgreSQL em ORGANIZE_PG_BIN.")


def run(name, *args, **kwargs):
    return subprocess.run([binary(name), *args], check=True, **kwargs)


def main():
    STATE.mkdir(exist_ok=True, mode=0o700)
    marker = STATE / "pg-admin"
    if ENV.exists() and not marker.exists():
        raise SystemExit("Existe um .env externo. Use o PostgreSQL configurado nele.")
    if not marker.exists():
        with marker.open("x", encoding="ascii") as stream:
            stream.write(secrets.token_urlsafe(48))
        marker.chmod(0o600)
    if not (DATA / "PG_VERSION").exists():
        run(
            "initdb",
            "-D",
            DATA,
            "-U",
            ADMIN,
            "--pwfile",
            marker,
            "--auth=scram-sha-256",
            "--encoding=UTF8",
            "--locale=C",
        )
    if subprocess.run([binary("pg_ctl"), "-D", DATA, "status"], capture_output=True).returncode:
        run(
            "pg_ctl",
            "-D",
            DATA,
            "-l",
            STATE / "postgres.log",
            "-w",
            "-o",
            f"-p {PORT} -c listen_addresses=127.0.0.1",
            "start",
        )
    if not ENV.exists():
        with ENV.open("x", encoding="ascii") as stream:
            stream.write(
                f"DJANGO_DEBUG=1\nDJANGO_SECRET_KEY={secrets.token_urlsafe(64)}\n"
                f"PGHOST=127.0.0.1\nPGPORT={PORT}\nPGDATABASE=organize\n"
                f"PGUSER={ROLE}\nPGPASSWORD={secrets.token_urlsafe(48)}\n"
            )
        ENV.chmod(0o600)
    cfg = dotenv_values(ENV)
    if (cfg.get("PGPORT"), cfg.get("PGHOST"), cfg.get("PGUSER"), cfg.get("PGDATABASE")) != (
        str(PORT),
        "127.0.0.1",
        ROLE,
        "organize",
    ):
        raise SystemExit("O .env aponta para outra instância. Confira sua configuração.")
    with psycopg.connect(
        host="127.0.0.1",
        port=PORT,
        dbname="postgres",
        user=ADMIN,
        password=marker.read_text().strip(),
        autocommit=True,
    ) as conn:
        if not conn.execute("SELECT 1 FROM pg_roles WHERE rolname=%s", (ROLE,)).fetchone():
            conn.execute(
                sql.SQL("CREATE ROLE {} LOGIN CREATEDB PASSWORD {}").format(
                    sql.Identifier(ROLE), sql.Literal(cfg["PGPASSWORD"])
                )
            )
        if not conn.execute("SELECT 1 FROM pg_database WHERE datname='organize'").fetchone():
            conn.execute("CREATE DATABASE organize OWNER organize")
    print(f"PostgreSQL de desenvolvimento disponível em 127.0.0.1:{PORT}.")


if __name__ == "__main__":
    main()
