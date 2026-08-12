# Rastreamento de padrões de sono

Este documento consolida o material técnico recebido para transformar o registro de sono do PilhA+ em um módulo progressivo de rastreamento de padrões. A diretriz central é começar com registro manual assistido e evoluir para inferência passiva com confiança explícita, sem linguagem diagnóstica.

## Escopo do MVP

- Registrar noites de sono por colaborador com `dayKey`, horário de dormir, horário de acordar, duração, fonte e confiança.
- Sugerir horários a partir do histórico recente antes de cair para média de duração ou valor padrão.
- Classificar duração com a mesma linguagem visual do fluxo v87: vermelho abaixo de 5h, amarelo de 5h a 7h, verde de 7h a 9h e azul acima de 9h.
- Detectar valores implausíveis como alerta de confirmação, não como bloqueio definitivo.
- Calcular dívida de sono e padrões semanais básicos.
- Persistir os dados de sono em envelope versionado, escopado por colaborador e com retenção limitada.

## Modelo de dados inicial

Arquivo de contrato: `src/shared/contracts/sleep.ts`.

Campos principais:

- `id`: identificador local do registro.
- `collaboratorId`: identificador pseudonimizado SHA-256 em hexadecimal.
- `dayKey`: dia civil do registro, em `YYYY-MM-DD`, validado por round-trip.
- `timestamp`: instante ISO UTC de criação/atualização.
- `sleepHours`: duração de 0,5h a 16h; valores abaixo de 3h ou acima de 12h são implausíveis e devem exigir confirmação na UI.
- `bedTime` e `wakeTime`: par opcional em `HH:mm`; se um existir, o outro também precisa existir.
- `source`: `manual`, `passive-smartphone`, `wearable` ou `hybrid`.
- `confidence`: número de 0 a 1 para indicar a confiabilidade da origem.
- `perceivedQuality`: escala subjetiva opcional de 1 a 5.
- `notes`: metadados técnicos não sensíveis, por exemplo cobertura de sensores ou indicação de estimativa aproximada.

## Regras de sugestão

Arquivo de domínio: `src/features/sleep/domain/sleepTracking.ts`.

Prioridade:

1. Usar os últimos 14 registros com horário de dormir e acordar.
2. Se não houver histórico de horários suficiente, usar os últimos 7 registros com duração.
3. Se não houver histórico suficiente, sugerir `23:00` a `06:30`, totalizando 7,5h.

A média de horário de dormir trata horários após meia-noite como continuação da noite anterior para evitar distorções em rotinas que cruzam o dia civil.

## Política de vigília passiva

O material de limiares e vigília estabelece uma postura conservadora: vigília precisa ser demonstrada, não presumida.

Regras implementadas como base:

- Probabilidade mínima de vigília confirmada: `0.70`.
- Evidência isolada moderada: `0.55`, usada com cautela.
- Persistência mínima para vigília confirmada: `60s`.
- Durante uma janela provável de sono, um único sinal vira `micro-arousal`, não vigília plena.
- Uso ativo do aparelho pode elevar a decisão para vigília provável/confirmada, pois é um sinal comportamental forte.
- Múltiplos sinais concordantes e persistentes autorizam `confirmed-wake`.

Na evolução com sensores, esta camada deve receber features calculadas em janelas de 30 a 60 segundos e depois passar por suavização temporal ou HMM/Viterbi antes da apresentação ao usuário.

## Evolução técnica

Fase 1 — já preparada nesta PR:

- Contrato runtime seguro.
- Repositório local escopado por colaborador.
- Sugestões de sono baseadas em histórico.
- Dívida de sono, irregularidade e decisão conservadora de vigília.
- Testes unitários do domínio, contrato e persistência.

Fase 2 — conexão com UI v87:

- Conectar o novo visual de registro de sono ao `sleepRecordRepository`.
- Reutilizar `getSuggestedSleepTimes` no estado inicial do componente.
- Exibir aviso de confirmação para `<3h` ou `>12h`.
- Gravar `bedTime`, `wakeTime`, `sleepHours`, `source: manual` e `confidence: 1`.
- Incluir o resumo semanal em card dedicado.

Fase 3 — inferência passiva:

- Capturar sinais de smartphone ou wearable somente após consentimento claro.
- Criar feature engineering para movimento, luz, áudio ambiente agregado, uso/touch, frequência cardíaca e HRV quando disponíveis.
- Manter confiança reduzida em estimativas apenas por smartphone.
- Exibir rótulos como “estimado” e “aproximado”, evitando precisão falsa.
- Calibrar o padrão individual por 5 a 7 noites antes de personalizar limiares.

## Privacidade e linguagem

- O módulo não deve prometer diagnóstico de insônia, apneia, depressão, ansiedade ou qualquer condição clínica.
- Dados brutos sensíveis de áudio, biometria ou saúde não devem ser persistidos em logs de auditoria.
- Métricas agregadas devem preservar o escopo por colaborador e evitar exposição desnecessária em URLs, histórico de navegação ou payloads de listagem.
- Recomendações devem ser orientativas: “padrão”, “tendência”, “estimativa”, “sugestão”.


## Fluxo manual entregue

O MVP do aplicativo agora oferece um fluxo completo de registro manual, persistido localmente e isolado pelo identificador pseudônimo do colaborador:

1. Sugere horários a partir do histórico; quando não há dados suficientes, usa uma sugestão inicial de 23:00–06:30.
2. Permite informar horário de deitar, horário de acordar e qualidade percebida.
3. Calcula a duração, classifica a faixa e solicita uma segunda confirmação para valores abaixo de 3 h ou acima de 12 h.
4. Mantém uma única versão por noite no fluxo da interface: ao registrar novamente no mesmo dia, a versão mais recente substitui a anterior.
5. Apresenta padrão das últimas sete noites, média, dívida estimada, recomendação e histórico recente.

### Critérios de aceite do MVP

- Um registro manual válido permanece disponível ao recarregar o aplicativo no mesmo dispositivo e colaborador.
- O histórico é isolado entre colaboradores.
- O resumo semanal considera noites distintas; edições da mesma noite não contam como dias adicionais.
- Uso ativo do aparelho por pelo menos 30 segundos é tratado como vigília provável; a confirmação requer 60 segundos e evidências suficientes.
- A tela comunica tendências de bem-estar sem realizar diagnóstico ou recomendação clínica.

### Fora do escopo desta entrega

- Captura de acelerômetro, microfone, iluminação, frequência cardíaca ou HRV.
- Permissões de sensores e processamento em segundo plano.
- Diagnóstico, predição clínica ou alteração automática de notificações.
- Sincronização em nuvem e compartilhamento organizacional.

Esses itens exigem consentimento específico, política de privacidade, avaliação de LGPD e uma arquitetura de backend antes de qualquer ativação.
