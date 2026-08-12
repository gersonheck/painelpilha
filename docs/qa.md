# PilhA+ — QA

## Objetivo
Garantir que o app esteja testável, compreensível e estável em cada entrega.

## Casos de teste essenciais
### Acesso
- PIN válido de colaborador.
- PIN válido de gestão.
- PIN inválido.
- Reação visual ao erro.

### Onboarding
- Avançar etapa por etapa.
- Recarregar e verificar estado.
- Validar limite final.

### Perfil
- Salvar campos vazios.
- Salvar campos preenchidos.
- Alterar dados e confirmar atualização.

### Medição
- Executar captura.
- Verificar registro no histórico.
- Confirmar feedback após cada ação.

### Gestão
- Abrir painel sem travar.
- Exportar dados atuais.
- Conferir consistência com o estado da sessão.

## UX checks
- Texto legível.
- Botões com rótulos claros.
- Estados vazios com orientação.
- Erros com mensagem objetiva.
- Fluxo sem excesso de cliques.

## Critérios de aceite
- Nenhuma ação principal deve falhar silenciosamente.
- O usuário deve sempre saber o próximo passo.
- O painel de gestão deve refletir o estado atual.
- A exportação deve corresponder ao conteúdo exibido.

## Registro de defeitos
Cada bug deve conter:
- Passo a passo.
- Resultado esperado.
- Resultado obtido.
- Ambiente.
- Evidência visual.
- Severidade.

## Prioridade de correção
1. Quebra de fluxo.
2. Perda de dados.
3. Inconsistência de tela.
4. Problema visual.
5. Ajuste fino de texto.
