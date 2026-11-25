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

## Redesign mobile-first em 24/11/2026

- A interface passou a usar fontes do sistema, superfícies neutras, verde como destaque e listas com separadores. A Home agrupa o progresso e a criação rápida. O calendário apresenta mês e agenda lado a lado no desktop. [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/color) · [Organização das listas no Things](https://culturedcode.com/things/support/articles/4001304/)
- A barra móvel mantém as quatro abas, usa uma superfície sólida quando o navegador não oferece desfoque e respeita as áreas seguras. Os formulários usam controles nativos e diálogos com foco restaurado ao fechar. [Diretrizes da Apple para barras de abas](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
- A página offline recebeu a nova paleta. O aviso de atualização passou a exigir uma versão em espera além da versão ativa, para que a primeira instalação não exiba um aviso indevido.
- A compilação de produção, o lint, os quatro testes unitários e os 36 cenários Playwright passaram. A revisão incluiu capturas em claro e escuro, retrato e paisagem, verificações de contraste com axe e os alvos de 44 px da navegação e do calendário a 320 px. A validação em aparelhos físicos continua pendente.

## Revisão de composição e navegação

- A Home reúne progresso e atalhos em uma superfície e organiza tarefas, agenda, anotações e listas em grupos com cabeçalhos externos. Hoje separa os filtros dos registros. No desktop, Hoje e Ajustes usam colunas próprias para acomodar conteúdo e ações relacionadas.
- A barra inferior ganhou um indicador deslizante. Os diálogos mantêm as ações visíveis durante a rolagem. A translucidez tem alternativa opaca e o movimento segue a preferência do sistema.
- Passaram 54 cenários Playwright e quatro testes unitários, além do lint e da compilação. Foram revisadas capturas nos perfis iPhone, Android e desktop, com os temas claro e escuro. A instalação da PWA e o teclado virtual ainda dependem de dispositivos físicos.
