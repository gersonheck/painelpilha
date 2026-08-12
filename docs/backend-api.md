# Contrato inicial do backend de identidade

O frontend usará sessão em cookie `HttpOnly`, `Secure` e `SameSite`, nunca token de sessão em
`localStorage`. Operações mutáveis também enviam `X-CSRF-Token`. A organização e o papel do ator são
obtidos exclusivamente da sessão validada no servidor, não do corpo ou da URL enviados pelo cliente.

## Endpoints v1

- `GET /api/v1/organization/invitations` — lista convites sem token, digest ou link bruto.
- `POST /api/v1/organization/invitations` — recebe nome/e-mail e devolve o link bruto uma única vez.
- `POST /api/v1/organization/invitations/:id/email-prepared` — registra somente a preparação local.
- `POST /api/v1/organization/invitations/:id/revoke` — revoga um convite ainda não ativado.
- `POST /api/v1/organization/invitations/:id/resend` — rotaciona digest e devolve novo link uma vez.
- `POST /api/v1/access/activate` — consome token, define senha e ativa o vínculo atomicamente.

Criação, reenvio e ativação devem rodar em transações. Respostas de token inválido, expirado, revogado
ou inexistente devem ser indistinguíveis externamente para reduzir enumeração. Rate limiting deve usar
IP e identificadores não reversíveis, com auditoria sem e-mail, token, senha ou dados de saúde.
