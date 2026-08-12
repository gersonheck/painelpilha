# Arquitetura do PilhA+

## Contexto

A versão v86 foi entregue como um HTML autocontido. Esse formato foi útil para validar o produto,
mas reúne apresentação, autenticação, persistência, processamento PPG e relatórios em um único
artefato. A migração será incremental para preservar os fluxos existentes enquanto cada domínio
ganha contratos e testes próprios.

## Camadas-alvo

```text
src/
  app/                 composição, rotas e providers
  features/            módulos orientados a casos de uso
    access/
    onboarding/
    profile/
    measurement/
    history/
    management/
  shared/
    api/               cliente HTTP e erros
    contracts/         tipos e validação de dados
    storage/           adaptadores, chaves e migrações
    ui/                componentes reutilizáveis
```

## Regras de dependência

- `shared` não importa módulos de `features`.
- Uma feature não acessa diretamente o armazenamento de outra feature.
- Componentes visuais não decidem autorização.
- Chamadas HTTP passam pelo cliente de API compartilhado.
- Dados persistidos possuem versão e migração antes de qualquer mudança incompatível.
- Algoritmos de medição permanecem independentes de React para permitir testes determinísticos.

## Estratégia para o legado

O protótipo está em `legacy/pilha-plus-v86-onboarding-objetivos-acompanhamento.html`. Ele permanece
disponível durante a migração como baseline visual e funcional, mas não deve receber novas regras de
negócio. Uma feature só substitui seu equivalente legado quando tiver contrato documentado, testes e
roteiro de regressão.

## Segurança e privacidade

- PINs e credenciais reais nunca serão embutidos no frontend.
- Autorização de gestão será validada pelo backend.
- Tokens não serão persistidos em armazenamento legível por JavaScript quando houver backend real.
- Dados de saúde e bem-estar terão finalidade, retenção e exclusão documentadas.
- O modo demonstrativo será explicitamente separado do ambiente de produção.

### Serviço de acesso organizacional

O caso de uso de convites depende de um contrato de repositório transacional. A implementação em
memória serializa operações para testar concorrência, sequência única por organização, autorização,
unicidade de e-mail ativo e consumo único do token. Ela não é persistência de produção: o adaptador
definitivo deve cumprir o mesmo contrato usando transações, índices únicos e bloqueio no banco.

### Identidade local transitória

Durante a migração, o cadastro local aceita e-mail sem confirmação remota. O endereço é normalizado e
transformado por SHA-256 com namespace da aplicação; apenas esse identificador pseudônimo é usado nas
chaves por colaborador. A senha é derivada com PBKDF2-SHA-256, 210.000 iterações e salt aleatório.
Nenhum dos dois valores originais é persistido.

Hash não é criptografia reversível: essa escolha é intencional porque a aplicação não precisa recuperar
o e-mail nem a senha. Como todo o verificador ainda reside no navegador, esse acesso protege contra
exposição casual, mas não substitui autenticação, rate limiting e autorização de um backend.

## Contrato de persistência

Dados modulares são gravados em envelopes com `schemaVersion`, `kind`, `collaboratorId`, `updatedAt`
e `data`. A leitura valida tanto o envelope quanto seu conteúdo e falha de forma segura quando o JSON,
o domínio ou o proprietário não conferem. Coleções rejeitam registros de outro colaborador antes de
gravar e aplicam deduplicação e retenção aos dados validados.

O perfil v1 anteriormente armazenado sem envelope é migrado somente quando já está em uma chave
isolada e seu `collaboratorId` coincide com o usuário ativo. Dados globais do protótipo não são
atribuídos automaticamente a uma nova conta, evitando vazamento entre pessoas no mesmo navegador.

## Medição

PPG pelo dedo e rPPG facial serão tratados como pipelines distintos. A migração inicial preservará o
algoritmo apenas para regressão; qualquer afirmação de precisão dependerá de protocolo de validação
contra equipamento de referência.
