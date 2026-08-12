# Modulo de sono v87 - baseline de analise

Data da analise: 2026-08-10
Fonte local analisada: `pilha-plus-v87-interacao-sono 2.1.html`

## Objetivo

Registrar os achados da versao v87 antes de receber as novas orientacoes de implementacao do modulo de sono. O HTML local tem aproximadamente 14 MB por conter assets e codigo empacotado, entao esta etapa documenta o baseline tecnico sem incorporar o artefato inteiro ao repositorio.

## Achados principais

- O fluxo de check-in ja possui uma etapa dedicada a sono, identificada pelo passo `sleep`.
- O onboarding/profile ja coleta `targetSleep`, com opcoes de 6h a 9h por noite e default de 7.5h.
- A tela de sono combina entrada por horario de dormir/acordar, calculo de duracao e selecao rapida por chips de 4h a 10h.
- Existe um componente visual `SleepGauge` com semicírculo/mostrador digital e estados por faixa: insuficiente, abaixo do ideal, ideal e acima do ideal.
- O valor de sono aparece no historico como `sleepHours` e tambem pode existir em `biometryData.sleep`.
- O sono ja influencia score composto, IPC, plano de recuperacao, distribuicao de vida/rotina e relatorios.
- O painel empresarial ja usa sono medio e alertas agregados, incluindo sinalizacao de sono insuficiente por equipe.
- O texto de produto posiciona sono, humor e recuperacao como uma leitura rapida e integrada.

## Contratos observados

- `profile.targetSleep`: meta individual de sono, em horas.
- `measurement.sleepHours`: sono autorreferido registrado no check-in.
- `measurement.biometryData.sleep`: fallback/compatibilidade para leituras historicas.
- `contextData` e rastros contextuais: usados para relacionar sono com cafeina, alcool, pressao, trabalho tardio, doenca, exercicio e recuperacao.
- `calculateIPC(history, contextTraces)`: usa sono curto recorrente como fator de risco contextual.

## Regras e sinais inferidos

- Sono abaixo de 6h ativa recomendacoes de recuperacao no plano do usuario.
- Sono recorrente abaixo de aproximadamente 6.5h contribui para risco no IPC.
- A meta individual (`targetSleep`) deve orientar a avaliacao, nao apenas limites fixos globais.
- Relatorios devem diferenciar dado autorreferido de qualquer estimativa derivada da biometria.

## Pontos de atencao para a modularizacao

- Extrair o registro de sono para contrato proprio antes de acoplar novas regras.
- Persistir horarios e duracao de forma auditavel, evitando depender apenas de texto exibido.
- Validar horario de dormir/acordar com virada de dia e duracoes plausiveis.
- Manter compatibilidade com historicos que usam `sleepHours` ou `biometryData.sleep`.
- Separar visual (`SleepGauge`) de regra de dominio para permitir testes determinísticos.
- Tratar dados de sono como dado sensivel de bem-estar/saude para consentimento, retencao e relatorios.

## Proxima etapa

Receber as novas orientacoes e codigo do modulo de sono, comparar com este baseline e implementar a versao modular em pequenos incrementos testaveis.
