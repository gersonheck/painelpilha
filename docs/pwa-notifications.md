# PWA e notificações do PilhA+

## Decisão de produto

O PilhA+ continuará sendo uma aplicação web e poderá ser instalado na tela inicial como Progressive
Web App. Não é necessário migrar de Vite para Next.js para oferecer manifesto, service worker ou Web
Push.

A entrega será incremental:

1. **Fundação PWA:** instalabilidade, identidade visual e shell offline.
2. **Push MVP:** consentimento, preferências, assinatura do navegador, agendamento e histórico.
3. **Métricas:** atribuição entre envio, abertura e check-in.
4. **Motor adaptativo:** somente após validações científica, clínica, ética e de privacidade.

## O que já está implementado

- manifesto PWA com nome, cores, ícone e execução em modo independente;
- service worker registrado somente no build de produção;
- cache restrito ao shell e a recursos estáticos da própria origem;
- fallback da navegação para o shell quando a rede falhar;
- recepção de payload Web Push e exibição de notificação genérica;
- clique na notificação capaz de focar ou abrir o app em uma URL interna segura.

A implementação não armazena páginas de API nem dados de saúde no cache do service worker.

## Limites importantes da plataforma

- O ambiente publicado precisa usar HTTPS.
- No iPhone e iPad, Web Push depende de uma Web App adicionada à tela inicial e da permissão solicitada
  a partir de uma ação explícita da pessoa, como tocar no botão “Ativar lembretes”.
- Permissão nunca deve ser solicitada automaticamente ao abrir a tela.
- O navegador não informa de forma confiável que uma notificação foi “ignorada”. O produto deve
  registrar estados observáveis e, após uma janela definida, derivar “não aberta no período”.
- Timers do navegador não são confiáveis para disparos exatos com o app fechado. O agendamento deve
  acontecer no servidor, respeitando fuso horário e horário de silêncio.
- A assinatura Web Push contém uma URL de capacidade sensível. Ela deve ser protegida contra vazamento,
  fraude e requisições forjadas.

## Fluxo do MVP

1. A pessoa instala o PilhA+ ou continua usando-o no navegador.
2. Uma tela explica benefício, privacidade e como desativar os lembretes.
3. Somente após o toque em “Ativar lembretes”, o app solicita a permissão do sistema.
4. O app cria a assinatura push e a envia ao backend autenticado.
5. A pessoa escolhe frequência, dias, horários, fuso e período de silêncio.
6. O servidor agenda o lembrete e registra o resultado de envio.
7. O clique abre `/check-in?source=push&deliveryId=<id>`.
8. A conclusão do check-in associa a resposta ao lembrete sem registrar conteúdo clínico na telemetria.

A rota dedicada de check-in e o backend de notificações ainda fazem parte do próximo incremento.

## Arquitetura proposta

### Frontend

- `manifest.webmanifest` e service worker;
- detecção de compatibilidade sem bloquear o restante do app;
- tela educativa e solicitação de permissão por gesto explícito;
- assinatura e cancelamento do Web Push;
- preferências de lembrete;
- deep link para o check-in;
- estado claro para permitido, negado, indisponível e desativado.
- tela implementada de consentimento explícito e preferências locais por pessoa (frequência, horários e silêncio); o disparo permanece bloqueado até existir backend.

### Backend

Endpoints iniciais:

- `POST /api/push/subscriptions`: registra ou atualiza uma assinatura;
- `DELETE /api/push/subscriptions/:id`: revoga uma assinatura;
- `GET /api/notification-preferences`: consulta preferências;
- `PUT /api/notification-preferences`: altera preferências;
- `POST /api/notification-deliveries/:id/open`: registra abertura idempotente;
- conclusão do check-in registra a atribuição usando o identificador de entrega.

O agendador seleciona os lembretes devidos, aplica fuso, dias e silêncio, envia pelo provedor e grava o
resultado. Todas as operações devem exigir autenticação, proteção CSRF quando aplicável e idempotência.

## Modelo de dados inicial

### `push_subscriptions`

- `id`, `user_id` e `provider`;
- endpoint e chaves `p256dh`/`auth` cifrados em repouso;
- hash do endpoint para deduplicação;
- datas de criação, última utilização e revogação;
- versão do consentimento e data do aceite.

Uma pessoa pode ter várias assinaturas, pois pode usar mais de um navegador ou dispositivo.

### `notification_preferences`

- habilitado;
- modo: intervalo ou horários fixos;
- intervalo em horas;
- horários preferidos;
- dias da semana;
- horário inicial e final de silêncio;
- fuso horário IANA;
- intensidade e estilo de linguagem;
- data de atualização.

### `notification_deliveries`

- `id`, `user_id`, tipo e versão da mensagem;
- horário programado, tentativa, envio, abertura e check-in;
- estado: `scheduled`, `sent`, `opened`, `responded`, `failed` ou `expired`;
- identificador opaco do provedor;
- código técnico de falha sem conteúdo de saúde.

“Não aberta no período” será uma métrica derivada. Não deve ser armazenada como se fosse uma ação
explícita da pessoa.

## Provedor de push

A integração deve ficar atrás de uma interface própria para permitir troca de provedor.

- **OneSignal:** caminho mais rápido para validar o MVP e operar segmentos, sujeito a avaliação
  contratual, LGPD, residência/retenção de dados e SDK.
- **FCM/Web Push:** oferece maior controle da integração, mas exige mais implementação e operação.

A escolha final depende de avaliação de privacidade e custo. O domínio do PilhA+ não deve receber IDs
específicos do fornecedor fora da camada de infraestrutura.

## Privacidade e segurança

- Não exibir ansiedade, depressão, estresse, score ou biometria na tela bloqueada por padrão.
- Usar textos neutros e configuráveis, sem inferências clínicas.
- Separar telemetria de engajamento de respostas de saúde.
- Permitir revogação simples e remoção das assinaturas.
- Aplicar retenção mínima e auditoria sem payload sensível.
- Não usar padrões de resposta para pressionar, assustar ou manipular a pessoa.
- Submeter o motor adaptativo a consentimento específico, governança e revisão clínica antes do uso.

## Mensagens iniciais

- Como está sua energia neste momento?
- Já faz algum tempo desde seu último check-in.
- Reserve um minuto para perceber como você está.
- Seu bem-estar merece atenção. Que tal fazer um check-in?

A pessoa poderá escolher linguagem acolhedora, objetiva ou técnica. Mensagens sensíveis exigem cuidado
adicional com a visibilidade na tela bloqueada.

## Métricas do MVP

- aceite = permissões concedidas / convites exibidos;
- abertura = entregas abertas / envios aceitos pelo provedor;
- resposta = check-ins atribuídos / entregas abertas;
- tempo até abertura e tempo até check-in;
- retenção e sequência de dias com uso;
- cancelamentos e permissões revogadas;
- comparação de adesão com e sem lembretes, sem afirmar causalidade indevida.

“Enviado pelo provedor” não significa necessariamente “exibido pelo dispositivo”. Os painéis devem
explicar essa diferença.

## Referências oficiais

- [Web Push no iOS e iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [Push API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Firebase Cloud Messaging para Web](https://firebase.google.com/docs/cloud-messaging/web/get-started)
- [Configuração Web Push do OneSignal](https://documentation.onesignal.com/docs/en/web-push-setup)
