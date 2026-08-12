# PilhA+ — Arquitetura

## Visão geral
PilhA+ é um app web para fluxo guiado de acesso, onboarding, perfil, medição, histórico, gestão e QA.
A proposta é manter o núcleo do fluxo claro, rastreável e simples de testar localmente.

## Princípios
- Estrutura legível.
- Fluxo de teste rápido.
- Estado previsível.
- Baixa dependência externa.
- UX orientada a tarefas.

## Camadas
### Interface
Responsável por telas, navegação, feedback visual e interações do usuário.

### Estado
Responsável por dados da sessão, perfil, etapas do onboarding, medições e exportações.

### Persistência
Responsável por guardar estado localmente quando necessário e preparar exportações para análise.

### QA
Responsável por validar acessos, estados, mensagens e consistência do fluxo.

## Componentes lógicos
- Acesso por PIN.
- Onboarding em etapas.
- Formulário de perfil.
- Módulo de medição.
- Histórico de medições.
- Painel de gestão.
- Ferramentas de exportação.

## Fluxo de dados
1. Usuário entra no app.
2. Autenticação define o papel.
3. O onboarding libera o próximo passo.
4. O perfil é preenchido ou revisado.
5. A medição gera eventos e registros.
6. O painel de gestão lê os dados consolidados.
7. As exportações servem para auditoria e validação.

## Regras de estabilidade
- Não bloquear o usuário sem feedback.
- Não perder estado sem aviso.
- Não misturar validação de UI com regra de negócio.
- Não depender de backend para testar o fluxo principal.

## Critérios de qualidade
- O app deve abrir sem erro de build.
- O fluxo principal deve funcionar em sequência.
- O estado deve ser reproduzível.
- As exportações devem refletir os dados atuais.
- O QA deve conseguir validar cada passo sem ambiguidade.
