# Painel empresarial — indicadores iniciais

## Estado

A interface atual é uma demonstração visual com dados estáticos agregados. Ela não concede acesso de
gestão, não consulta dados reais e não deve orientar decisões sobre pessoas. A autorização empresarial
será implementada exclusivamente no backend.

## Indicadores

- **Participação:** participantes divididos pelas pessoas elegíveis no período.
- **PilhA Score médio:** média ponderada pelo número de participantes apenas entre grupos visíveis.
- **Amostras aceitas:** amostras tecnicamente aceitas divididas pelo total dos grupos visíveis.
- **Equipes em atenção:** grupos visíveis com score demonstrativo inferior a 65.

O corte 65 é apenas uma hipótese de interface. Antes de usar dados reais, ele deverá ser substituído por
uma regra validada, versionada e contextual, sem confundir score de bem-estar com diagnóstico.

## Privacidade

- Grupos com menos de cinco participantes são suprimidos da tabela e dos cálculos por equipe.
- O painel não apresenta nomes, e-mails, identificadores ou medições individuais.
- Filtros futuros não podem permitir reconstruir um grupo abaixo do limiar mínimo.
- Totais empresariais só devem aparecer quando a coorte global também cumprir o limiar.
- Exportações devem aplicar as mesmas regras da tela.

O limiar de cinco é uma proteção inicial, não uma garantia completa de anonimato. Antes da produção,
deve haver avaliação de risco de reidentificação, autorização por função, auditoria de acesso e revisão
de finalidade conforme LGPD.

## Convites de usuários

A organização inicial é `PILHA-00001`. Cada usuário recebe um código público sequencial no formato
`PILHA-00001-000001`, composto pelo prefixo de cinco letras, número da organização e sequência de seis
dígitos. O código identifica o vínculo, mas não autentica nem ativa a conta.

O formulário exige apenas nome e e-mail. A ativação utiliza um token aleatório de 256 bits, distinto do
código público, com validade de 48 horas. Somente o hash do token deve permanecer no backend; o valor
original deve ser enviado uma única vez no link. A sequência precisa ser atômica no banco de dados para
evitar duplicação em convites simultâneos.

Na demonstração atual, o repositório transacional em memória armazena somente o registro do convite e o hash do token.
O link bruto existe apenas na resposta efêmera de criação ou reenvio e na memória da tela atual; `list()` nunca o devolve.
Se a tela perder esse valor, é necessário gerar um novo link, invalidando o anterior. “Preparar e-mail” abre o cliente de e-mail
do dispositivo com assunto e mensagem preenchidos. Isso não comprova o envio. Em produção, um endpoint
autorizado deverá registrar o convite, enfileirar um provedor transacional, registrar entrega sem guardar
o conteúdo da mensagem e permitir revogação ou reenvio com novo token.

A interface bloqueia submissões concorrentes na mesma tela e usa um contador dedicado para evitar seriais
duplicados durante a operação assíncrona. Isso é apenas proteção de UX: em produção, a unicidade precisa
ser garantida por transação e restrição no banco.

As seções Panorama e Pessoas permanecem montadas ao alternar a navegação, preservando convites ainda não
persistidos. A área inativa usa `hidden`, ficando fora da navegação e da árvore de acessibilidade. O app
também oferece link de salto para o conteúdo principal e auditoria axe inicial em desktop e mobile.
