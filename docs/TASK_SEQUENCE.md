# Task Sequence

1. Instalar dependências e subir a base (`npm install`, `npm run dev`).
2. Validar o fluxo de acesso em `features/access`, incluindo UX de erro e troca de sessão.
3. Revisar `shared/contracts` e confirmar o contrato definitivo de perfil, sessão, medição e context trace.
4. Validar `shared/storage` com os nomes oficiais de chaves e a retenção de 1080 registros por colaborador.
5. Conectar `OnboardingFlow` ao fluxo visual definitivo e revisar os campos obrigatórios.
6. Conectar `ProfileScreen` à interface final e aos serviços reais de edição.
7. Acoplar `PPGCapture` ao fluxo de medição do produto e validar permissões de câmera em ambiente alvo.
8. Expandir o painel de gestão com filtros, detalhe de colaborador e consolidação local.
9. Publicar a base no GitHub como `Pilha+ app` e validar o primeiro ciclo local de testes.
10. Gerar builds com source maps internos e manter documentação sincronizada a cada mudança.
