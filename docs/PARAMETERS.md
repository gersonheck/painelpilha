# PARAMETERS

## Finalidade

Este documento concentra parâmetros padrão, limites operacionais, defaults e regras configuráveis do PilhA+. Seu objetivo é impedir que travas e números importantes fiquem implícitos no código sem registro de intenção de produto.

## Parâmetros padrão atuais

| Parâmetro | Valor padrão | Contexto |
|---|---:|---|
| `profile.targetSleep` | 7.5 | Meta inicial de sono no template de perfil. [file:215] |
| `profile.targetMeasures` | 5 | Meta inicial de medições no template de perfil. [file:215] |
| `profile.notifications` | `true` | Estado inicial de notificações no template de perfil. [file:215] |
| `profile.occupationCount` | 1 | Quantidade inicial de papéis ocupacionais. [file:215] |
| `profile.leaveStatus` | `none` | Estado inicial de afastamento. [file:215] |
| `profile.newJobStatus` | `no` | Estado inicial de mudança recente de trabalho. [file:215] |
| `profile.routineStart` | `''` | Estado inicial de rotina no template mínimo. [file:215] |
| `profile.configured` | `false` | Perfil mínimo antes do onboarding. [file:215] |
| `contextTraces.deduplicationKey` | `questionId + dayKey + collaboratorId` | Chave de deduplicação do rastro inicial no onboarding. [file:215][file:225] |
| `contextTraces.free.monthlyLimit` | 90 | Teto mensal da versão gratuita por colaborador. |
| `contextTraces.free.retentionMonths` | 12 | Janela móvel da versão gratuita. |
| `contextTraces.free.maxRecords` | 1080 | Teto agregado gratuito: 90 × 12 meses. |
| `contextTraces.pro.maxRecords` | 3000 | Teto total por usuário Pró, sem teto mensal nesta versão. |
| `contextTraces.enterprise.maxRecords` | 3000 | Teto total por usuário Empresarial, configurável futuramente. |
| `contextTraces.pruningStrategy` | `keep-latest` | Ao exceder qualquer teto, remover primeiro os registros mais antigos. |
| `storage.primary` | `localStorage` | Primeira tentativa do `SafeStorage`. [file:215][file:225] |
| `storage.secondary` | `sessionStorage` | Segunda tentativa do `SafeStorage`. [file:215][file:225] |
| `storage.tertiary` | `inMemory` | Terceira tentativa do `SafeStorage`. [file:215][file:225] |

## Decisão sobre registros de contexto

O comportamento documentado anteriormente mantinha até 21 rastros de contexto em um ponto do fluxo de onboarding. Essa regra deixa de ser a referência padrão do produto e passa a ser considerada um legado observado na reconstrução. [file:215][file:225]

A política implementada diferencia planos. No Gratuito, são mantidos até 90 registros por mês durante uma janela móvel de 12 meses, respeitando o teto agregado de 1080 por colaborador. Nos planos Pró e Empresarial, são mantidos até 3000 registros totais por usuário. Antes da contagem, os registros são deduplicados por `questionId + dayKey + collaboratorId`; ao exceder qualquer limite, os registros mais antigos são removidos progressivamente.

## Critérios para alterar parâmetros

Um parâmetro só deve ser alterado quando houver pelo menos um destes motivos:
- Evidência de produto ou uso real.
- Necessidade de performance ou armazenamento.
- Exigência regulatória, clínica ou organizacional.
- Mudança de UX que afete comportamento ou expectativa do usuário.

Toda alteração deve atualizar este arquivo e gerar um registro em `CHANGELOG_PRODUCT.md`.

## Parâmetros pendentes de formalização

Os materiais atuais não documentam em nível de política todos os thresholds internos de scoring, IPC, biometria, humor, motores auxiliares e escalas; eles devem ser auditados e acrescentados progressivamente em revisões futuras, sempre com origem, racional e impacto registrados. [file:225]
