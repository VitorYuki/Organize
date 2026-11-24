# Validação no navegador

Os testes abrem a compilação de produção do React e exercitam a API Django com sessões, CSRF e PostgreSQL reais. Cada cenário cria um usuário com e-mail exclusivo no banco local `organize_e2e`.

## Executar no Windows

Com o ambiente Python instalado e o PostgreSQL de desenvolvimento ativo, execute na raiz do projeto:

```powershell
Set-Location frontend
npm.cmd ci
$env:PLAYWRIGHT_BROWSERS_PATH = [IO.Path]::GetFullPath('../.local/playwright')
npx.cmd playwright install chromium webkit firefox
npm.cmd run test:e2e
```

O Playwright inicia a API de teste na porta 8002, compila o frontend, abre a prévia na porta 4174 e encerra os dois processos ao terminar. O usuário do PostgreSQL precisa ter acesso a `organize_e2e` ou permissão para criá-lo. As migrações são aplicadas antes do primeiro acesso. Os registros de teste ficam nesse banco para investigação. A suíte recusa conexões com bancos fora do computador local.

Para executar um perfil específico ou abrir as evidências da última execução:

```powershell
npm.cmd run test:e2e -- --project=iphone
npx.cmd playwright show-report
```

## Cobertura

| Perfil | Motor | Área em pixels CSS |
| --- | --- | --- |
| Compacto | Chromium | 360 × 800 |
| iPhone | WebKit | 390 × 844 |
| iPhone grande | WebKit | 430 × 932 |
| Tablet | WebKit | 768 × 1024 |
| Desktop | Chromium e Firefox | 1440 × 900 |

A suíte verifica cadastro, login, logout, persistência, tarefas, eventos, notas, itens, ordenação e confirmação de exclusão. Os testes de apresentação verificam os temas, o tamanho dos alvos da navegação móvel, a orientação horizontal e a largura do documento. O axe inspeciona as regras automatizáveis de WCAG A/AA nas telas de autenticação, Home, calendário e formulário. Os cenários de sessão verificam o carregamento, a nova tentativa após uma falha temporária, o retorno ao login após expiração e a rejeição de gravações de um editor aberto quando outra conta assume a sessão.

O teste da PWA lê o manifesto da compilação, espera o navegador ativar o service worker, verifica a ausência de respostas da API no Cache Storage e navega sem rede. No Firefox, o teste desconecta um servidor de prévia temporário porque o worker pode continuar conectado quando apenas o contexto de página do Playwright entra em modo offline.

Capturas das telas ficam em `frontend/test-results/` e no relatório HTML local de `frontend/playwright-report/`. Somente as execuções com falha guardam o trace. Desconsidere arquivos de execuções anteriores ao interpretar um teste filtrado.

## Dispositivos físicos

A instalação pelo menu do Safari ou Chrome, a interação com VoiceOver ou TalkBack, o teclado virtual e as áreas seguras reais de aparelhos com recorte de tela precisam de validação em hardware. Os perfis de navegador e os testes com teclado de desktop exercitam apenas os comportamentos emulados.
