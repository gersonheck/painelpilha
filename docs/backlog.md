# PilhA+ — Backlog de melhorias

Este backlog organiza as melhorias por ordem de segurança para manter a versão funcional intacta enquanto evoluímos o produto.

## Critérios de prioridade

- P0: preserva funcionamento, privacidade e dados.
- P1: entrega fundações necessárias e reduz risco técnico.
- P2: melhora produto, modularidade e operação.
- P3: evolução experimental sujeita a validação.

## Backlog ordenado

| Prioridade | Item | Motivo | Dependência | Risco |
|---|---|---|---|---|
| P0 | Congelar a versão funcional atual como baseline | Evita perda do comportamento validado na v86 | Nenhuma | Muito baixo |
| P0 | Criar backup versionado do HTML funcional | Permite rollback imediato se algo quebrar | Baseline congelado | Muito baixo |
| P0 | Mapear chaves de persistência e contratos de dados | Protege histórico, perfil e rastros por colaborador | Baseline congelado | Baixo |
| P0 | Documentar fluxo atual e pontos críticos | Facilita QA e evita alterações cegas | Baseline congelado | Baixo |
| P1 | Criar backlog técnico por módulo | Ordena a extração sem mexer no fluxo | Mapeamento de contratos | Baixo |
| P1 | Extrair helpers de armazenamento para arquivo próprio | Reduz acoplamento sem alterar regra de negócio | Mapeamento de contratos | Médio |
| P1 | Extrair constantes e templates de perfil | Diminui risco de inconsistência | Mapeamento de contratos | Médio |
| P1 | Adicionar testes manuais de regressão do fluxo principal | Garante que login, onboarding e medição continuam funcionando | Baseline congelado | Baixo |
| P2 | Separar componentes visuais do painel | Aumenta legibilidade do código | Helpers isolados | Médio |
| P2 | Isolar histórico, relatórios e painéis de inspeção | Facilita manutenção sem tocar no core | Componentes base separados | Médio |
| P2 | Modularizar o motor PPG e o cálculo de biometria | Reduz complexidade da tela principal | Testes de regressão | Alto |
| P2 | Introduzir feature flags para novas melhorias | Permite ligar/desligar mudanças com segurança | Estrutura modular mínima | Médio |
| P2 | Adicionar suíte automática mínima para funções puras | Ajuda a validar regras críticas | Código modularizado | Médio |
| P3 | Evoluir design system e UX refinada | Melhora clareza visual e consistência | Base funcional estável | Baixo |
| P3 | Expandir documentação técnica em `documentos/` | Aumenta manutenção e onboarding | Estrutura do repositório estável | Baixo |
| P3 | Automatizar geração de docs no GitHub Actions | Mantém docs atualizadas | Scripts e repositório organizados | Baixo |
| P3 | Melhorar textos de feedback, estados vazios e microcopy | Ajusta compreensão do usuário | Fluxo validado | Baixo |

## PWA e notificações

A especificação detalhada está em [`pwa-notifications.md`](pwa-notifications.md).

| Prioridade | Item | Situação | Critério de aceite |
|---|---|---|---|
| P1 | Manifesto, service worker e shell offline | Implementado no PR atual | Build publicado instalável; app abre sem rede após primeiro acesso |
| P1 | Ícones PNG 192/512, maskable e Apple Touch Icon | Próximo | Instalação validada visualmente em Android e iOS |
| P0 | Consentimento, privacidade e avaliação do provedor | Próximo | Fluxo LGPD, retenção, revogação e contrato do fornecedor aprovados |
| P1 | UI educativa de permissão | Pendente | Permissão solicitada somente após gesto explícito e com estados acessíveis |
| P1 | Assinaturas e preferências no backend | Pendente | Cadastro, renovação, revogação e múltiplos dispositivos cobertos por testes |
| P1 | Agendador com fuso, dias e horário de silêncio | Pendente | Disparos idempotentes e horários testados em mudanças de fuso |
| P1 | Deep link para check-in | Pendente | Clique abre o check-in e preserva um identificador opaco de atribuição |
| P1 | Histórico de envio, abertura e resposta | Pendente | Estados observáveis registrados; “não aberta” calculada por janela |
| P2 | Adaptador OneSignal ou FCM/Web Push | Pendente | Domínio independente do fornecedor e falhas tratadas |
| P2 | Preferências de frequência, tom e intensidade | Pendente | Alterações sincronizadas e revogáveis pela pessoa |
| P2 | Painel de métricas de engajamento | Pendente | Métricas explicam limites de entrega e não expõem conteúdo de saúde |
| P3 | Motor adaptativo | Futuro | Validações científica, clínica, ética e de privacidade concluídas |

## Sequência recomendada de execução

1. Validar a fundação PWA em HTTPS, Android e iOS.
2. Fechar consentimento, privacidade, retenção e escolha do provedor.
3. Implementar backend de assinaturas e preferências.
4. Criar a tela de permissão e preferências.
5. Implementar agendamento e histórico idempotentes.
6. Conectar o deep link ao check-in.
7. Medir o MVP antes de propor adaptação comportamental.

## Itens que não devem ser antecipados

- Solicitar permissão de notificação ao carregar a página.
- Depender de timer do navegador para lembretes com o app fechado.
- Exibir score ou indicador de saúde na tela bloqueada por padrão.
- Interpretar ausência de abertura como ação explícita de “ignorar”.
- Usar dados de saúde no motor adaptativo sem consentimento e validação.
- Refatorar o onboarding ou substituir o motor PPG antes dos respectivos testes.

## Definição de pronto

Uma melhoria só entra em pronto quando:

- mantém o fluxo funcional atual;
- não altera contratos de dados sem migração;
- tem rollback possível;
- tem QA associado;
- está documentada;
- respeita consentimento, revogação e minimização de dados.
