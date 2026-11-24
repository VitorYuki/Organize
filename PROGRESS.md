# Diário de desenvolvimento

## Ponto de partida
O único commit versionava o .gitignore. A estrutura Django em disco ainda não estava versionada. O SQLite local tinha zero bytes. O PostgreSQL 18 respondia na porta 5432, sem credenciais de projeto no ambiente.

## Plano
1. Configurar um banco PostgreSQL local dedicado, migrações, sessão por cookie e testes de autenticação.
2. Implementar tarefas, calendário, notas e listas com consultas limitadas ao proprietário.
3. Integrar a interface mobile-first, os temas e a instalação da PWA.
4. Validar em banco e navegadores reais, revisar as telas, registrar medições e instruções.

## Retomada em 24/11/2026

- Fundação Django e PostgreSQL concluída. A API usa sessão por cookie e limita tarefas, eventos, anotações, listas e seus itens à conta proprietária.
- Interface React mobile-first integrada aos módulos, com temas claro, escuro e automático. A PWA tem manifesto, ícones, atualização por service worker e página de contingência offline. O cache do worker contém somente a página pública de contingência.
- Corrigidos o import de DM Sans na compilação e o tratamento de sessão expirada ou substituída. A API rejeita uma gravação iniciada em um editor de outra conta, e a interface carrega a conta ativa ou volta ao login.

## Verificação local

- PostgreSQL 18, Django e Ruff. Passaram os 24 testes do backend, a verificação de migrações e o lint Python.
- Node.js 26. Passaram os quatro testes unitários de datas, incluindo viradas de dia em São Paulo, e o lint do frontend.
- Playwright. Passaram 36 cenários em seis perfis Chromium, WebKit e Firefox. A matriz exercitou os módulos com PostgreSQL, os temas, a troca e a expiração de sessão, a contingência offline e as verificações automatizadas do axe.
- Compilação de produção. O JavaScript tem 270,8 KiB (83,2 KiB em gzip) e o CSS tem 26,8 KiB (7,3 KiB em gzip). Os valores medem os arquivos gerados, sem fontes e imagens.
- Revisão visual das capturas de login e Home escura no desktop, formulário de tarefa no iPhone e calendário na horizontal. O relatório HTML e as capturas são gerados localmente pelo Playwright.

## Validação em hardware pendente

Instalação pelo menu do navegador, VoiceOver ou TalkBack, teclado virtual e áreas seguras precisam de aparelhos físicos. Os perfis automatizados usam Chromium, WebKit e Firefox com dimensões e parâmetros de emulação.

Os comandos de execução estão no [README](README.md), e a matriz e as evidências estão descritas no [guia de validação](qa/README.md).
