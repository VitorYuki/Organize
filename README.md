# Organize

Planner pessoal instalável com tarefas, calendário, anotações e listas. A interface usa português do Brasil e o fuso `America/Sao_Paulo`. Cada conta tem seu próprio espaço e pode escolher o tema claro, escuro ou automático.

## Desenvolvimento local no Windows

Use Python 3.15, Node.js 26 e os binários do PostgreSQL 18, versões usadas na validação local. Na raiz do projeto, prepare o backend:

```powershell
py -3.15 -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.venv\Scripts\python.exe scripts/local_db.py
.venv\Scripts\python.exe manage.py migrate
.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

O script cria o cluster local em `.local/pgdata` e o `.env` na primeira execução. Se o PostgreSQL estiver em outro caminho, defina `ORGANIZE_PG_BIN` com o diretório `bin`. Para uma instância própria, use `.env.example` como referência e execute a migração após configurar a conexão.

Em outro terminal, instale e abra a interface em `http://localhost:5173`:

```powershell
Set-Location frontend
npm.cmd ci
npm.cmd run dev
```

Para testar a PWA localmente, mantenha o backend ativo e abra `http://localhost:4173` após executar os comandos abaixo. As instruções de instalação aparecem em **Ajustes → Instalar o Organize**. A aplicação usa a rede para consultar e salvar dados e exibe uma página de contingência sem conexão.

```powershell
npm.cmd run build
npm.cmd run preview
```

Em produção, sirva `frontend/dist` por HTTPS e encaminhe `/api/` para o Django na mesma origem. Configure `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS` e as variáveis `PG*` no ambiente do backend, com `DJANGO_DEBUG=0`. Se o TLS terminar no proxy, configure o Django para reconhecer o HTTPS encaminhado por esse proxy confiável.

## Verificação

Na raiz do projeto:

```powershell
.venv\Scripts\python.exe manage.py test --noinput
.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
.venv\Scripts\python.exe -m ruff check .
```

Em `frontend`:

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

Consulte o fluxo de testes no navegador e as verificações em aparelhos físicos no [guia de validação](qa/README.md).
