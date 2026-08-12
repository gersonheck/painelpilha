# Melhorias pendentes de programação e interface

## Prioridade 0 — segurança e identidade

- Implementar backend com autenticação, autorização por função e separação entre colaborador e gestão.
- [Concluído no protótipo] Integrar a interface ao contrato transacional e validar sequência concorrente, autorização e unicidade; ainda implementar o adaptador de banco com restrições únicas.
- [Concluído no domínio] Validar token de uso único, expiração e revogação; ainda criar a rota no backend, confirmar a organização e definir a senha.
- Integrar provedor transacional de e-mail por fila, com retry, webhook e auditoria sem conteúdo sensível.
- [Concluído no protótipo] Modelar revogação, expiração e reenvio com rotação de token; ainda implementar essas transições no backend, com rate limiting e proteção contra enumeração.
- Remover definitivamente PINs e tokens demonstrativos do legado antes de produção.

## Prioridade 1 — dados e privacidade

- Formalizar consentimento, finalidade, retenção, exportação e exclusão conforme LGPD.
- Aplicar limiar mínimo também a totais, filtros e exportações e avaliar risco de reidentificação.
- Criptografar dados sensíveis no backend e usar cookies de sessão HttpOnly, Secure e SameSite.
- Registrar auditoria de ações administrativas e separar suporte técnico de gestão de pessoas.

## Prioridade 1 — medição

- Implementar captura PPG real de 60 segundos, detecção de movimento e critérios de repetição.
- Validar FC/RMSSD contra referência sincronizada e congelar parâmetros antes do estudo final.
- Separar PPG pelo dedo de rPPG facial e não reutilizar o mesmo pipeline silenciosamente.
- Persistir postura, qualidade, versão do algoritmo, baseline usado e motivo de rejeição.

## Prioridade 2 — engenharia

- Versionar `package-lock.json` e adicionar ESLint, formatação e auditoria de dependências.
- [Concluído parcialmente] Playwright cobre fluxos e snapshots desktop/mobile; axe cobre acesso e painel, mas ainda exige expansão e testes manuais com leitor de tela.
- Criar CI com typecheck, testes, build, E2E e artefatos visuais por pull request.
- Dividir o CSS global em tokens, componentes e features e documentar o design system.
- Adicionar roteamento, boundaries por feature, telemetria sem dados de saúde e estados offline explícitos.

## Prioridade 2 — experiência

- Criar navegação empresarial dedicada para panorama, pessoas, convites, relatórios e configurações.
- Implementar busca e filtros sem permitir coortes abaixo do limite de privacidade.
- Projetar ativação de conta acessível, definição de senha e confirmação de vínculo organizacional.
- Testar teclado, leitor de tela, zoom a 200%, contraste, toque e mensagens de erro com pessoas usuárias.
- [Em andamento] A interface já diferencia convite pendente, e-mail preparado, ativado, expirado e revogado; enfileiramento, entrega e ativação real dependem do backend.
