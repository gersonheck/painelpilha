# Política técnica de PPG/HRV do PilhA+

**Status:** minuta para revisão científica e validação experimental<br>
**Versão:** 0.1<br>
**Escopo:** PPG pelo dedo; rPPG facial deve ter protocolo próprio<br>
**Uso pretendido:** acompanhamento de bem-estar e tendência individual, não diagnóstico

**Implementação parcial:** os contratos iniciais de postura, barreiras de qualidade, score heurístico,
mediana/MAD e seleção visual já possuem módulos testáveis. Captura de câmera, detecção de movimento e
limiares validados permanecem pendentes.

## 1. Decisão central

O PilhA+ deve interpretar cada leitura em relação ao histórico válido da própria pessoa. A referência
principal será uma **mediana móvel individual**, condicionada ao protocolo de coleta, e não uma faixa
populacional fixa. Apenas amostras aprovadas pela política de qualidade podem atualizar essa referência.

Essa decisão é coerente com a grande variação interindividual da HRV, mas ainda precisa ser validada no
produto e na população-alvo. “Coerente com a literatura” não significa que os limiares ou o score do
PilhA+ já estejam homologados clinicamente.

## 2. Separação obrigatória de conceitos

O sistema deve manter quatro resultados distintos:

1. **Qualidade do sinal:** indica se a amostra pode ser analisada.
2. **Confiabilidade da estimativa:** expressa a estabilidade da métrica na janela observada.
3. **Desvio individual:** compara a métrica válida com o baseline da própria pessoa.
4. **Interpretação de bem-estar:** combina contexto e autorrelato, sem transformar HRV isolada em diagnóstico.

Uma postura diferente pode produzir uma resposta fisiológica verdadeira. Portanto, “em pé” não deve ser
automaticamente tratado como sinal ruim. O problema de qualidade é descumprir o protocolo escolhido,
mudar de postura ou mover-se durante a coleta.

## 3. Protocolo de coleta de 60 segundos

### 3.1 Antes da captura

O aplicativo deve perguntar a postura atual:

- `lying`: deitado;
- `seated`: sentado;
- `standing`: em pé.

Cada opção deve apresentar o mesmo robô em uma pose correspondente, acompanhado de texto. Os ícones
devem ser decorativos quando o rótulo já estiver visível, ter contraste adequado e não depender apenas
de cor. O usuário deve confirmar que permanecerá nessa posição durante toda a leitura.

Também devem ser registrados, sem bloquear desnecessariamente a pessoa:

- horário e fuso da coleta;
- minutos aproximados de repouso anterior;
- exercício recente;
- cafeína, nicotina, álcool e refeição recente;
- sintomas ou mal-estar percebido;
- modo de captura e dispositivo;
- presença de fala, tosse ou movimento durante a janela.

### 3.2 Padronização sugerida

- Preferir repouso, ambiente estável e postura sentada ou deitada para construir o baseline principal.
- Apoiar braço e aparelho; manter mão, dedo e câmera imóveis.
- Não conversar durante a coleta.
- Evitar comparar diretamente medições feitas em posturas diferentes.
- Exibir uma preparação de pelo menos 30 segundos; para calibração formal, usar repouso maior.
- Capturar **60 segundos analisáveis**, sem contar preparação nem segmentos descartados.
- Se a captura for interrompida ou perder qualidade, reiniciar a janela; não concatenar trechos separados.

Sessenta segundos é uma escolha de usabilidade. Pode ser útil principalmente para frequência cardíaca e
RMSSD, mas não substitui automaticamente registros padronizados de cinco minutos. SDNN e métricas de
domínio da frequência em janelas tão curtas devem permanecer experimentais até validação específica.

## 4. Máquina de estados da captura

```text
posture-selection
  -> preparation
  -> acquiring (60 s válidos)
  -> quality-review
      -> accepted
      -> repeat-required
      -> technical-error
```

- `accepted`: salva a medição e pode atualizar o baseline.
- `repeat-required`: explica o motivo, dá orientação objetiva e inicia uma nova janela completa.
- `technical-error`: informa ausência de câmera, permissão, iluminação ou capacidade insuficiente.

Uma leitura rejeitada pode guardar telemetria técnica sem imagem e sem métricas de saúde, desde que não
contenha identificadores desnecessários. Ela não entra no histórico clínico-funcional nem no baseline.

## 5. Avaliação de qualidade

### 5.1 Barreiras obrigatórias

Antes de calcular qualquer score, a amostra deve cumprir todos os critérios:

- duração analisável de pelo menos 60 segundos;
- timestamps monotônicos e frequência efetiva de amostragem documentada;
- postura constante e igual à selecionada;
- quantidade mínima de batimentos/intervalos RR válidos definida pelo protocolo de validação;
- ausência de saturação prolongada, perda de contato ou regiões sem perfusão detectável;
- carga de artefatos abaixo do limite validado;
- estimativas fisiologicamente possíveis, sem usar plausibilidade para “corrigir” o sinal silenciosamente.

Os valores numéricos definitivos dependem de estudos com os dispositivos-alvo. Até essa validação, limites
de engenharia devem ser identificados como **provisórios**, configuráveis e versionados.

### 5.2 Score de confiança

Não chamar um score heurístico de “intervalo de confiança”. Um intervalo de confiança exige um modelo
estatístico calibrado. Durante a fase heurística, usar `sampleConfidenceScore` no intervalo `[0, 1]`:

\[
C_t = w_q Q_t + w_m M_t + w_s S_t + w_a A_t, \qquad \sum w_i = 1
\]

Onde:

- \(Q_t\): qualidade morfológica/perfusão do traçado;
- \(M_t\): ausência de movimento detectado;
- \(S_t\): estabilidade de FPS, intervalos e subjanela;
- \(A_t\): adesão ao protocolo escolhido, incluindo postura constante.

Configuração inicial **para pesquisa**, não homologada:

| Componente | Peso inicial |
|---|---:|
| Qualidade do traçado \(Q_t\) | 0,35 |
| Ausência de movimento \(M_t\) | 0,30 |
| Estabilidade \(S_t\) | 0,20 |
| Adesão ao protocolo \(A_t\) | 0,15 |

Faixas provisórias:

- \(C_t \ge 0{,}80\): elegível para aceitação, se todas as barreiras forem atendidas;
- \(0{,}65 \le C_t < 0{,}80\): solicitar nova coleta;
- \(C_t < 0{,}65\): rejeitar e orientar correção.

Esses cortes devem ser calibrados contra uma referência e avaliados por sensibilidade, especificidade,
erro absoluto e taxa de repetição. Nenhuma média ponderada pode compensar a falha de uma barreira
obrigatória.

### 5.3 Consistência interna em subjanelas

Dividir a janela em subjanelas sobrepostas permite medir estabilidade sem fingir independência estatística.
Por exemplo, calcular RMSSD em três blocos de 30 segundos, com sobreposição, e observar sua dispersão.
Essa dispersão contribui para \(S_t\), mas não deve ser apresentada ao usuário como intervalo de confiança
até que cobertura e calibração tenham sido demonstradas.

## 6. Baseline individual robusto

### 6.1 Fase de calibração

O baseline inicial não deve ser “a melhor pontuação até agora”. Isso introduziria viés de seleção e faria
o estado excepcional parecer normal. A referência inicial deve vir de várias amostras comparáveis:

1. preferencialmente, registro de referência de cinco minutos após repouso;
2. repetir em pelo menos três dias/sessões comparáveis;
3. usar a mesma postura, modo de captura e faixa horária;
4. aceitar somente amostras aprovadas pela política de qualidade;
5. se o produto limitar a captura a 60 segundos, usar várias sessões e declarar que não equivalem a uma
   gravação contínua de cinco minutos.

O “melhor score” pode aparecer como marco motivacional separado, mas não deve ancorar tolerância,
normalidade nem rejeição de amostra.

### 6.2 Mediana móvel

Para uma métrica positiva e assimétrica como RMSSD, usar preferencialmente o logaritmo natural:

\[
y_{u,t} = \ln(RMSSD_{u,t})
\]

Para cada usuário \(u\), postura \(p\) e instante \(t\), definir:

\[
M_{u,p,t}^{ref} = \operatorname{median}\{y_{u,p,i}: i \in W_t,\; quality_i = accepted\}
\]

Onde \(W_t\) é uma janela móvel versionada. Ponto inicial para avaliação: últimas 14 medições válidas,
com no mínimo 5 e no máximo 28 dias. A política definitiva deve comparar janelas por estabilidade e não
escolher a que produz melhor score.

Não misturar posturas no mesmo baseline. Se houver poucos dados em uma postura, informar baseline
insuficiente em vez de reutilizar silenciosamente outra postura.

### 6.3 Dispersão robusta e desvio normalizado

Definir:

\[
MAD_{u,p,t} = \operatorname{median}(|y_{u,p,i} - M_{u,p,t}^{ref}|)
\]

\[
\sigma_{u,p,t}^{rob} = \max(1{,}4826 \cdot MAD_{u,p,t},\; \sigma_{floor})
\]

\[
Z_{u,p,t}^{rob} = \frac{y_{u,p,t} - M_{u,p,t}^{ref}}{\sigma_{u,p,t}^{rob}}
\]

O piso \(\sigma_{floor}\) evita divisão instável quando o histórico é pequeno ou artificialmente constante.
Ele deve ser estimado por estudo de repetibilidade teste–reteste, não escolhido para melhorar o score.

Faixas exploratórias para comunicação interna:

- \(|Z^{rob}| \le 1\): próximo do padrão recente;
- \(1 < |Z^{rob}| \le 2\): desvio moderado a observar;
- \(|Z^{rob}| > 2\): desvio acentuado a confirmar com nova coleta e contexto.

Essas faixas não são diagnóstico nem, isoladamente, motivo para rejeitar uma amostra tecnicamente válida.
Uma alteração real pode ser biologicamente relevante mesmo com excelente qualidade de sinal.

### 6.4 Limites de tolerância bilaterais

A fórmula de tolerância deve ter limite inferior e superior:

\[
L_{u,p,t} = M_{u,p,t}^{ref} - k \sigma_{u,p,t}^{rob}
\]

\[
U_{u,p,t} = M_{u,p,t}^{ref} + k \sigma_{u,p,t}^{rob}
\]

Usar inicialmente \(k=2\) apenas como hipótese de pesquisa. A cobertura empírica deve ser medida por
usuário e por postura. Como a distribuição pode ser assimétrica, quantis individuais podem superar
limites simétricos quando houver histórico suficiente.

## 7. Atualização adaptativa

Uma medição só atualiza o baseline quando:

- passou por todas as barreiras de qualidade;
- possui postura e protocolo conhecidos;
- não ocorreu erro técnico;
- há contexto mínimo registrado;
- não foi marcada pelo usuário como evento excepcional para calibração.

O valor novo entra **depois** de sua comparação com o baseline anterior, evitando autoatenuação do desvio.
Manter versão do algoritmo, parâmetros e baseline usado em cada resultado para auditoria e reprocessamento.

Mudanças persistentes não devem ser descartadas como outliers indefinidamente. O sistema deve distinguir:

- artefato técnico: rejeitar;
- evento contextual transitório: preservar, mas sinalizar;
- mudança fisiológica sustentada: adaptar gradualmente após confirmação;
- dados insuficientes: não classificar.

## 8. Score PilhA+

Não mapear diretamente “HRV maior = melhor”. O score deve considerar:

- desvio individual bilateral;
- direção e persistência da mudança;
- sono, humor, carga percebida e contexto;
- qualidade/confiança da amostra;
- incerteza por baixo número de observações.

Enquanto não houver validação, apresentar linguagem descritiva (“próximo do seu padrão recente”) em vez
de afirmações clínicas. Score e confiança devem aparecer separadamente.

## 9. Critérios de repetição e mensagens

| Motivo | Ação sugerida |
|---|---|
| Movimento | Apoie braço e aparelho e permaneça imóvel por toda a janela. |
| Mudança de postura | Retorne à postura escolhida e reinicie a coleta. |
| Baixa perfusão/contato | Reposicione o dedo sem pressionar excessivamente. |
| Iluminação/saturação | Ajuste dedo, câmera ou iluminação conforme o modo. |
| FPS instável | Feche tarefas pesadas e tente novamente. |
| Poucos intervalos válidos | Repita a janela completa de 60 segundos. |

Após duas falhas consecutivas, oferecer saída sem culpa, ajuda técnica e tentativa posterior. Não inventar
um resultado substituto e não atualizar o baseline.

## 10. Dados mínimos a persistir

- `measurementId` e `collaboratorId` pseudônimo;
- início, fim, duração analisável e fuso;
- postura selecionada e adesão;
- modo de captura, versão do algoritmo e classe do dispositivo;
- métricas técnicas de qualidade e motivos de rejeição;
- número de intervalos total, válido e corrigido;
- métrica estimada e unidade;
- baseline e versão usados na comparação;
- contexto necessário à interpretação.

Não persistir frames, vídeo ou imagem por padrão. Qualquer retenção de sinal bruto para pesquisa exige
consentimento, prazo, finalidade e proteção específicos.

## 11. Plano de validação

Antes de promover os limiares para produção:

1. comparar PPG com ECG ou dispositivo de referência sincronizado;
2. estratificar por postura, movimento, dispositivo, iluminação e características da população;
3. medir erro de FC, intervalos RR, RMSSD e taxa de amostras rejeitadas;
4. avaliar repetibilidade intraindivíduo e estabilidade do baseline;
5. calibrar o score de confiança e verificar sua capacidade de prever erro real;
6. testar cobertura dos limites robustos fora da amostra de calibração;
7. avaliar vieses por tons de pele e condições de perfusão;
8. pré-registrar hipóteses e congelar parâmetros antes da validação final.

## 12. Referências iniciais para conferência

As referências abaixo apoiam princípios gerais; nenhuma valida automaticamente a fórmula proprietária.
Os artigos específicos da Nature e da Harvard Medical School mencionados pela equipe devem ser anexados
ao registro de evidências com URL, DOI, população, dispositivo e desfecho antes de serem usados como base.

1. Task Force of the European Society of Cardiology and the North American Society of Pacing and
   Electrophysiology. *Heart rate variability: standards of measurement, physiological interpretation,
   and clinical use*. Circulation, 1996. DOI: `10.1161/01.CIR.93.5.1043`.
2. Munoz ML et al. *Validity of (Ultra-)Short Recordings for Heart Rate Variability Measurements*.
   PLOS ONE, 2015. DOI: `10.1371/journal.pone.0138921`.
3. Baek HJ et al. *Reliability of Ultra-Short-Term Analysis as a Surrogate of Standard 5-Min Analysis
   of Heart Rate Variability*. Annals of Noninvasive Electrocardiology, 2015. DOI: `10.1111/anec.12243`.
4. Bent B et al. *Investigating sources of inaccuracy in wearable optical heart rate sensors*.
   npj Digital Medicine, 2020. DOI: `10.1038/s41746-020-0226-6`.
5. Fine J et al. *Sources of inaccuracy in photoplethysmography for continuous cardiovascular
   monitoring*. Scientific Reports, 2021. DOI: `10.1038/s41598-021-86967-7`.

## 13. Decisões pendentes

- Fornecer os artigos exatos da Nature e Harvard para avaliação metodológica.
- Definir dispositivo e câmera mínimos suportados.
- Definir o detector de movimento e a verdade de referência.
- Calibrar pesos, barreiras e faixas de confiança.
- Estimar \(\sigma_{floor}\) por repetibilidade.
- Decidir se o baseline principal será de cinco minutos ou múltiplas sessões de 60 segundos.
- Definir política separada para rPPG facial.
- Aprovar linguagem com especialistas clínicos, privacidade e regulação.
