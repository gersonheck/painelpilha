# Storage Schema

## Chaves globais

- `pa_profile`
- `pa_history`
- `pa_context_traces`
- `pa_das21_history`
- `pa_scale_history`
- `pa_access_session`
- `pa_onboarded_v11`
- `pa_api_base`
- `pa_logs`
- `pa_offline_collaborators`

## Chaves por colaborador

- `pa_history_collaborator_<collaboratorId>`
- `pa_profile_collaborator_<collaboratorId>`
- `pa_context_traces_collaborator_<collaboratorId>`
- `pa_das21_history_collaborator_<collaboratorId>`
- `pa_scale_history_collaborator_<collaboratorId>`
- `pa_access_password_collaborator_<collaboratorId>`

Na base modular, `<collaboratorId>` deve ser um identificador pseudônimo SHA-256 de 64 caracteres.
Novos dados usam um envelope versionado:

```json
{
  "schemaVersion": 1,
  "kind": "profile | measurement-history | context-traces",
  "collaboratorId": "<sha256>",
  "updatedAt": "<ISO-8601>",
  "data": {}
}
```

O conteúdo de `data` é validado em runtime antes de ser aceito. Registros globais legados não devem
ser migrados implicitamente para um colaborador.

## Retenção padrão

### Registros de contexto

| Plano | Limite mensal | Janela temporal | Limite total por usuário |
|---|---:|---:|---:|
| Gratuito | 90 | 12 meses móveis | 1080 |
| Pró | Sem teto mensal | Sem expiração nesta versão | 3000 |
| Empresarial | Sem teto mensal | Sem expiração nesta versão | 3000 |

- Deduplicação de contexto por `questionId + dayKey + collaboratorId`, preservando a versão com timestamp mais recente.
- Ao exceder um limite mensal, temporal ou total, os registros elegíveis mais antigos são removidos primeiro.
- A ordenação persistida permanece do registro mais antigo para o mais recente.

### Medições

- `measurements.maxRecords = 1080`
- Deduplicação de medições por `id`, preservando a versão com timestamp mais recente.
