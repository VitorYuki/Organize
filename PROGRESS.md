# Diário de desenvolvimento

## Ponto de partida
O único commit versionava o .gitignore. A estrutura Django em disco ainda não estava versionada. O SQLite local tinha zero bytes. O PostgreSQL 18 respondia na porta 5432, sem credenciais de projeto no ambiente.

## Plano
1. Configurar um banco PostgreSQL local dedicado, migrações, sessão por cookie e testes de autenticação.
2. Implementar tarefas, calendário, notas e listas com consultas limitadas ao proprietário.
3. Integrar a interface mobile-first, os temas e a instalação da PWA.
4. Validar em banco e navegadores reais, revisar as telas, registrar medições e instruções.

## Em andamento
Fundação e módulos. Os resultados de verificação serão registrados após a execução.
