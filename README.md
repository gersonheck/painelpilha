# PilhA+

Aplicação web para acompanhamento de energia, equilíbrio e evolução. Este repositório está em
migração incremental do protótipo funcional v86 para uma base modular, tipada e testável.

## Estado atual

- A nova entrada usa React, TypeScript e Vite.
- O protótipo original foi preservado em `legacy/` para comparação e rollback.
- O acesso local cria um identificador pseudônimo a partir do e-mail e deriva a senha com PBKDF2.
- Perfil e sessão já são isolados por colaborador; medição, histórico e gestão serão migrados em etapas.
- Perfil, medições e rastros contextuais possuem contratos runtime e envelopes persistidos versionados.
- Coleções isoladas aplicam deduplicação e retenção de até 1.080 registros por colaborador.
- A fundação PWA já inclui manifesto, ícone, service worker, shell offline e tratamento inicial de Web Push.
- Permissão, preferências, agendamento e histórico de notificações ainda dependem do backend e do fluxo de consentimento.
- O módulo de medição já possui seleção de postura, qualidade heurística e baseline robusto testáveis;
  a captura PPG real e seus limiares ainda dependem de validação experimental.
- O painel empresarial inicial apresenta apenas indicadores agregados demonstrativos e protege grupos
  com menos de cinco participantes; autorização e dados reais ainda dependem do backend.

> **Importante:** o PilhA+ está em desenvolvimento e não deve ser usado para diagnóstico médico ou
> tomada de decisão clínica.

## Requisitos

- Node.js 20 ou superior;
- npm 10 ou superior.

## Desenvolvimento

```bash
npm install
npm run dev
```

O Vite exibirá o endereço local da aplicação. O protótipo preservado em `legacy/` é mantido para comparação no repositório e não integra o build de produção.

O service worker é registrado somente no build de produção. Para testar a instalação PWA localmente,
execute `npm run build`, depois `npm run preview`, e abra o endereço informado. Em produção, o app
precisa ser publicado em HTTPS.

## Acesso local nesta etapa

O cadastro não envia mensagem de confirmação. O e-mail normalizado é transformado por SHA-256 em um
identificador de 64 caracteres e o valor original não é persistido. A senha passa por PBKDF2-SHA-256
com salt aleatório e também não é armazenada. A sessão fica neste navegador até o logout.

Essa proteção reduz exposição acidental, mas não transforma armazenamento local em autenticação de
produção. Um usuário com controle do navegador ainda pode alterar dados locais. A autorização real
deverá ser implementada no backend antes do uso com dados sensíveis.

## Verificações

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:a11y
```

Para gerar ou revisar baselines visuais com Playwright:

```bash
npx playwright install chromium
npm run test:visual:update
npm run test:visual
```

Os testes de acessibilidade combinam navegação por teclado, link de salto e auditoria automática WCAG
A/AA com axe. A auditoria automática complementa, mas não substitui, testes com leitor de tela.

## Estrutura

```text
public/                 manifesto, ícones e service worker do PWA
src/
  app/                  composição da aplicação
  shared/contracts/     contratos tipados do domínio
  shared/pwa/           integração do PWA com o frontend
  shared/storage/       persistência e chaves oficiais
  styles/               estilos globais da nova interface
tests/                  testes automatizados
legacy/                 protótipo funcional preservado
docs/                   documentação técnica
```

Consulte [`docs/architecture.md`](docs/architecture.md) para as decisões da migração,
[`docs/roadmap.md`](docs/roadmap.md) para a sequência planejada e
[`docs/pwa-notifications.md`](docs/pwa-notifications.md) para a arquitetura de notificações.

A política científica em elaboração para coleta PPG/HRV, postura, qualidade e baseline individual está
em [`documentos/politica-ppg-hrv.md`](documentos/politica-ppg-hrv.md).

## Princípios da migração

1. Preservar o comportamento validado antes de extrair um fluxo.
2. Não alterar contratos persistidos sem migração explícita.
3. Separar autenticação e autorização reais do modo demonstrativo.
4. Adicionar testes para regras de domínio antes de trocar o legado.
5. Tratar privacidade, acessibilidade e segurança como critérios de aceite.
