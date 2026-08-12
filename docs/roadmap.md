# Roadmap de migração

## Etapa 1 — Fundação

- [x] Preservar o protótipo funcional.
- [x] Criar a aplicação Vite, React e TypeScript.
- [x] Extrair contrato inicial de perfil e chaves de armazenamento.
- [x] Criar o primeiro teste do `SafeStorage`.
- [ ] Habilitar lint e auditoria de dependências no ambiente com acesso ao npm.

## Etapa 2 — Persistência e contratos

- [x] Versionar perfil, histórico de medições e rastros contextuais com envelopes persistidos.
- [x] Implementar validação em runtime para perfil, medição, contexto e envelopes.
- [x] Criar migração segura do perfil isolado e política inicial de retenção.
- [x] Criar identificador pseudônimo a partir do e-mail.
- [x] Isolar perfil por colaborador e rejeitar identificadores inválidos.
- [x] Testar migração de perfil, retenção, envelopes inválidos e mistura de colaboradores.
- Migrar e validar os contratos das escalas psicométricas.

## Etapa 3 — Acesso e onboarding

- [x] Criar cadastro e acesso local transitório, sem armazenar e-mail ou senha em texto aberto.
- Separar definitivamente o modo local de autenticação real no backend.
- Remover PINs administrativos do cliente.
- Migrar acesso, sessão, onboarding e perfil.
- Cobrir os fluxos com testes de integração.

## Etapa 4 — Medição e histórico

- [x] Formalizar a política técnica inicial de PPG/HRV, postura, qualidade e baseline robusto.
- [x] Implementar domínio inicial de qualidade, repetição e baseline individual robusto.
- Extrair o motor PPG como módulo independente.
- Separar captação por dedo e captação facial.
- Criar fixtures de sinais e critérios de rejeição.
- [x] Implementar seleção visual de postura com robôs deitado, sentado e em pé.
- Implementar janela de 60 segundos analisáveis e repetição orientada por qualidade.
- Validar os limiares provisórios contra ECG ou referência sincronizada.
- Migrar histórico, contexto e escalas.

## Etapa 5 — Gestão e entrega

- [x] Criar a primeira interface empresarial com indicadores agregados demonstrativos.
- [x] Suprimir grupos com menos de cinco participantes na visão por equipe.
- [x] Prototipar convite de usuários com código organizacional e link de ativação seguro.
- [Concluído no protótipo] Modelar ativação de uso único, expiração, revogação e reenvio com rotação de link; persistir essas transições no backend com sequência atômica e entrega de e-mail.
- Integrar autorização de gestão ao backend.
- Aplicar anonimização e limites mínimos de coorte.
- Migrar relatórios e exportações.
- Ampliar axe/E2E, executar testes manuais com leitor de tela e criar pipeline de CI.
- [x] Adicionar primeiro fluxo E2E e regressão visual desktop/mobile com Playwright.
- [x] Adicionar link de salto, teste de teclado e auditoria axe inicial.
- Remover o legado após paridade e aceite.
