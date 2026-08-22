# Spec de implementação — Conselho de Classe

## 1. Finalidade deste documento

Esta spec é o documento de handoff para o agente responsável pela implementação. Ela deve ser lida em conjunto com:

- `docs/plano-modulo-conselho-de-classe.md`, que contém as decisões funcionais completas;
- `supabase/migrations/20260822010000_create_class_council_module.sql`, que contém o schema proposto;
- o relatório real de referência `/Users/misaellima/Downloads/relatorio-desempenho.xlsx`;
- o script de referência `/Users/misaellima/Projects/Personal/sigeduc-report-scripts/contar_completo.py`.

O objetivo imediato é entregar a primeira versão operacional para o Ensino Regular. Não ampliar o escopo para EJA, reimportação avançada, colaboração simultânea ou PDF antes de o fluxo principal estar funcional.

## 2. Resultado esperado

Um usuário autenticado com perfil `admin`, `gestor` ou `coordenador` deve conseguir:

1. Acessar o novo módulo pelo painel do Hub.
2. Criar um conselho Regular informando ano, bimestre e data.
3. Enviar o Relatório de Desempenho Escolar original em `.xlsx`.
4. Conferir turmas, estudantes, disciplinas, erros e avisos antes de confirmar.
5. Confirmar a importação sem expor dados parciais.
6. Navegar pelas turmas e estudantes priorizados por alertas explicáveis.
7. Registrar participantes, professores, dados coletivos e informações individuais.
8. Criar e atualizar intervenções.
9. Recarregar a página sem perder os registros.
10. Concluir uma turma somente quando houver pelo menos um participante.
11. Concluir o conselho somente quando todas as turmas estiverem concluídas.

## 3. Restrições obrigatórias

- Não criar uma tela de cadastro manual de alunos, turmas ou professores.
- Não usar `alunos_boletins` como cadastro acadêmico deste módulo.
- Não aceitar `teacher_session` como autorização para Conselho de Classe.
- Não disponibilizar arquivos ou dados do conselho em rotas públicas.
- Não usar raça/cor ou PCD para alertas ou priorização.
- Não converter `*`, `**`, `s/n`, `-` ou célula vazia em nota zero.
- Não editar manualmente `src/types/database.types.ts` antes de aplicar a migração.
- Não executar a migração automaticamente sem confirmação do usuário.
- Não implementar exclusão definitiva na interface do MVP.
- Não misturar a implementação com alterações não relacionadas no worktree.

## 4. Ordem segura de execução

### Fase A — Revisão da migração

1. Ler a migração completa.
2. Conferir se o projeto Supabase de destino possui `public.profiles` com `admin`, `gestor`, `coordenador` e `is_active`.
3. Confirmar que não existe nenhuma tabela com os mesmos nomes.
4. Fazer um dump lógico manual antes da execução; o plano Free não oferece backup automático restaurável pelo painel.
5. Preferencialmente executar a migração com `supabase db push`, para que o histórico de migrations seja registrado automaticamente. Se for necessário usar o SQL Editor do painel, executar o arquivo inteiro como uma única operação e depois reparar o histórico da CLI conforme explicado abaixo.
6. Não executar `backup.sql`; ele é uma fotografia do banco, não uma migração incremental.

#### Backup manual no plano Free

Guardar o backup fora do repositório Git e em local protegido, pois ele contém dados pessoais. Exemplo de diretório local:

```bash
mkdir -p /Users/misaellima/Backups/felixhub-supabase/2026-08-22-before-class-council
```

Autenticar e vincular o projeto:

```bash
npx supabase@latest login
npx supabase@latest link --project-ref <SUPABASE_PROJECT_REF>
```

O `db dump` da CLI usa uma imagem Docker para executar o `pg_dump`; portanto, manter o Docker Desktop aberto durante os comandos. O `SUPABASE_PROJECT_REF` aparece na URL/configuração do projeto e também na janela **Connect** do painel.

Ler a senha do banco sem escrevê-la no histórico do terminal:

```bash
read -s "FELIXHUB_DB_PASSWORD?Senha do banco Supabase: "
echo
```

Gerar três arquivos separados:

```bash
npx supabase@latest db dump --linked \
  --password "$FELIXHUB_DB_PASSWORD" \
  --role-only \
  -f /Users/misaellima/Backups/felixhub-supabase/2026-08-22-before-class-council/roles.sql

npx supabase@latest db dump --linked \
  --password "$FELIXHUB_DB_PASSWORD" \
  -f /Users/misaellima/Backups/felixhub-supabase/2026-08-22-before-class-council/schema.sql

npx supabase@latest db dump --linked \
  --password "$FELIXHUB_DB_PASSWORD" \
  --data-only \
  --use-copy \
  -f /Users/misaellima/Backups/felixhub-supabase/2026-08-22-before-class-council/data.sql

unset FELIXHUB_DB_PASSWORD
```

Confirmar que os três arquivos existem e não estão vazios:

```bash
wc -c /Users/misaellima/Backups/felixhub-supabase/2026-08-22-before-class-council/*.sql
```

O dump do banco não contém os arquivos binários guardados no Supabase Storage. Para um backup integral, baixar separadamente os objetos dos buckets existentes. A migração deste módulo apenas cria um bucket vazio, mas boletins ou outros arquivos já existentes não estarão dentro de `data.sql`.

Não testar uma restauração sobre o projeto em uso. Uma restauração deve ser ensaiada em outro projeto/banco.

#### Aplicação e histórico da migration

Opção recomendada, depois de criar e conferir o backup:

```bash
npx supabase@latest db push --linked --dry-run
npx supabase@latest db push --linked
```

O primeiro comando mostra o que seria aplicado sem alterar o banco. O segundo aplica `supabase/migrations/20260822010000_create_class_council_module.sql` e registra a versão no histórico remoto.

Se a migration for aplicada manualmente no **SQL Editor** do painel, a CLI não saberá automaticamente que ela já foi executada. Depois de confirmar que o SQL terminou sem erro, registrar a versão como aplicada:

```bash
npx supabase@latest migration repair 20260822010000 --status applied --linked
npx supabase@latest migration list --linked
```

Na listagem final, a versão `20260822010000` deve aparecer tanto no histórico local quanto no remoto. Não executar posteriormente `db push` antes dessa reparação, pois a CLI poderia tentar aplicar novamente uma migration que já está no banco.

### Fase B — Verificação no Supabase

Confirmar:

- criação das 12 tabelas do módulo;
- função `public.is_active_staff()`;
- RLS habilitado em todas as tabelas novas;
- ausência de políticas para `anon`;
- política de leitura para `authenticated` ativo;
- ausência de permissão direta de inserção, alteração ou exclusão para `authenticated`;
- escritas reservadas ao `service_role` por meio das APIs protegidas do servidor;
- bucket privado `class-council-imports`;
- ausência de policies diretas no bucket; upload e download ocorrerão pelo servidor;
- unicidade do conselho ativo por ano/bimestre/oferta;
- gatilhos de `updated_at` e ativação da importação.

Consultas de verificação sugeridas:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and (tablename like 'class_council%' or tablename = 'students')
order by tablename;

select policyname, tablename, cmd, roles
from pg_policies
where schemaname = 'public'
  and (tablename like 'class_council%' or tablename = 'students')
order by tablename, policyname;

select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'class-council-imports';
```

### Fase C — Regeneração dos tipos

Somente depois da migração aplicada:

```bash
npx supabase@latest gen types typescript \
  --project-id <SUPABASE_PROJECT_REF> \
  --schema public \
  > /tmp/felixhub-database.types.ts
```

Nunca redirecionar o comando diretamente para `src/types/database.types.ts`: uma falha de autenticação poderia truncar o arquivo atual. Primeiro validar o temporário:

```bash
test -s /tmp/felixhub-database.types.ts
rg "class_councils|class_council_results|students" /tmp/felixhub-database.types.ts
diff -u src/types/database.types.ts /tmp/felixhub-database.types.ts | less
```

Se as tabelas novas estiverem presentes e o diff corresponder ao schema aplicado, substituir o arquivo:

```bash
cp /tmp/felixhub-database.types.ts src/types/database.types.ts
```

Não acrescentar as novas tabelas manualmente, pois isso esconde divergências entre o TypeScript e o banco real.

Depois da substituição:

```bash
npm run type-check
```

Se o agente não tiver uma sessão autenticada no Supabase CLI, o usuário deverá baixar/copiar os tipos TypeScript gerados pelo painel do Supabase. A implementação não deve fingir que os tipos foram regenerados.

### Fase D — Implementação da aplicação

Só iniciar integrações tipadas com as novas tabelas após concluir a Fase C. O parser puro pode ser desenvolvido em paralelo, pois não depende dos tipos do banco.

## 5. Dependências

Adicionar uma biblioteca de leitura de `.xlsx` adequada ao runtime Node do Next.js. Recomendação: `exceljs`.

Usar a biblioteca apenas no servidor. Não enviar o relatório completo nem a biblioteca de parsing para o bundle do navegador.

Para testes automatizados do parser, adicionar `vitest` como dependência de desenvolvimento e um script `test` ou `test:class-council` no `package.json`.

Não usar os scripts Python como dependência de produção. Eles são apenas referência para regras já conhecidas.

## 6. Estrutura sugerida de arquivos

```text
src/
├─ app/
│  ├─ hub/
│  │  └─ conselhos/
│  │     ├─ page.tsx
│  │     ├─ novo/page.tsx
│  │     └─ [councilId]/
│  │        ├─ page.tsx
│  │        ├─ importar/page.tsx
│  │        └─ turmas/[classId]/page.tsx
│  └─ api/
│     └─ class-councils/
│        ├─ route.ts
│        └─ [councilId]/
│           ├─ route.ts
│           ├─ imports/preview/route.ts
│           ├─ imports/[importId]/confirm/route.ts
│           ├─ complete/route.ts
│           └─ classes/[classId]/
│              ├─ route.ts
│              ├─ complete/route.ts
│              ├─ participants/route.ts
│              ├─ subjects/[subjectId]/route.ts
│              └─ students/[enrollmentId]/route.ts
├─ components/
│  └─ class-council/
│     ├─ CouncilCard.tsx
│     ├─ ImportPreview.tsx
│     ├─ CouncilDashboard.tsx
│     ├─ ClassWorkspace.tsx
│     ├─ StudentPriorityList.tsx
│     ├─ StudentCouncilPanel.tsx
│     ├─ ParticipantsEditor.tsx
│     ├─ CollectiveNotesEditor.tsx
│     └─ InterventionEditor.tsx
├─ lib/
│  └─ class-council/
│     ├─ auth.ts
│     ├─ constants.ts
│     ├─ normalize.ts
│     ├─ parsePerformanceReport.ts
│     ├─ calculateAlerts.ts
│     └─ validation.ts
├─ services/
│  └─ server/
│     └─ classCouncilService.ts
└─ types/
   ├─ class-council.ts
   └─ database.types.ts
```

A estrutura pode ser ajustada para evitar arquivos excessivamente grandes, mas parser, cálculo, acesso a dados e apresentação devem permanecer separados.

## 7. Autenticação e autorização

### 7.1 Problema existente

`verifyApiAuth()` aceita tanto uma sessão Supabase quanto `teacher_session`. Isso é adequado para rotas de professor existentes, mas não para dados sensíveis de Conselho de Classe.

### 7.2 Requisito

Criar um guard específico, por exemplo `requireCouncilStaff(req)`, que:

1. Leia `sb_access_token`.
2. Valide o token com Supabase Auth.
3. Busque `profiles` pelo `user.id`.
4. Exija `is_active = true`.
5. Exija `role` igual a `admin`, `gestor` ou `coordenador`.
6. Retorne usuário e perfil para preenchimento de autoria.
7. Responda `401` sem sessão e `403` para perfil inativo/não autorizado.

Todas as APIs do módulo devem chamar esse guard antes de usar `supabaseAdmin`. O service role ignora RLS; portanto, a verificação no servidor é obrigatória mesmo com as políticas criadas. O navegador poderá consultar dados autorizados com RLS, mas todas as mutações e operações de Storage deverão passar pelas APIs do módulo.

## 8. Parser do Relatório de Desempenho

### 8.1 Entrada

- `Buffer` do `.xlsx`.
- Ano letivo e bimestre do conselho para validação contextual.
- Limite inicial de 25 MiB.

### 8.2 Descoberta dos blocos

- Percorrer as planilhas da pasta de trabalho.
- Localizar linhas contendo `TURMA:`.
- Associar o cabeçalho anterior com oferta, série e turno.
- Localizar a linha com `MATRÍCULA` e a linha com pares `NOTA`/`FALTA`.
- Encerrar o bloco no próximo cabeçalho de turma ou no fim da planilha.

### 8.3 Disciplinas

- Ler cada célula mesclada de disciplina.
- Associar a disciplina às duas colunas subsequentes `NOTA` e `FALTA`.
- Preservar o nome para exibição.
- Criar uma versão normalizada para comparação: espaços aparados, caixa uniforme e diacríticos normalizados somente na chave técnica.
- Não agrupar disciplinas diferentes apenas por semelhança textual.

### 8.4 Estudantes

- A primeira linha de cada estudante contém matrícula e atributos cadastrais.
- As linhas seguintes reutilizam os dados do mesmo estudante apenas enquanto o período for um bimestre válido e antes de uma nova matrícula/cabeçalho.
- Matrícula será tratada como texto, sem conversão numérica.
- Remover apenas espaços periféricos.
- Matrícula ausente é erro bloqueante.
- A mesma matrícula com nomes substancialmente diferentes é erro bloqueante.

### 8.5 Notas e faltas

- Nota numérica entre 0 e 10 é armazenada como número.
- Marcadores especiais são armazenados em `grade_marker`.
- Célula vazia produz nota e marcador nulos.
- Falta numérica não negativa é armazenada como inteiro.
- `**` ou marcador equivalente em falta produz ausência nula e aviso, nunca zero, desde que pertença ao bimestre do conselho ou a um anterior.
- O parser deve manter todos os bimestres encontrados, mesmo que o conselho esteja focado apenas em um.
- Marcadores de nota ou falta em bimestres posteriores ao conselho são preservados, mas não geram avisos de dado não lançado.

### 8.6 Frequência

- Interpretar `99%` como `99`, não como `0.99` no banco.
- Frequência ausente gera aviso.
- Associar a frequência à fotografia da importação, pois é acumulada na data do relatório.

### 8.7 Turmas

- Preservar o código oficial, como `EMMAT1A`.
- Para Regular:
  - `EMMAT1A` → `1MA`;
  - `EMVES1A` → `1TA`.
- Código desconhecido não deve ser adivinhado silenciosamente; apresentar na prévia para confirmação.

### 8.8 Saída tipada

Definir tipos de domínio em `src/types/class-council.ts`, sem depender dos tipos gerados do Supabase:

```ts
type ParsedPerformanceReport = {
  metadata: ReportMetadata;
  classes: ParsedClass[];
  issues: ImportIssue[];
  summary: ImportSummary;
};
```

`ImportIssue` deve incluir severidade, código estável, mensagem, turma, matrícula, linha e coluna quando disponíveis.

## 9. Fluxo da importação

### 9.1 Prévia

1. Receber `multipart/form-data` no servidor.
2. Validar extensão, MIME, assinatura ZIP do `.xlsx` e tamanho.
3. Calcular SHA-256.
4. Criar uma importação com a próxima versão.
5. Salvar o arquivo em bucket privado usando caminho semelhante a:
   `councilId/importId/hash.xlsx`.
6. Processar o arquivo no servidor.
7. Atualizar a importação com estado, resumo, erros e avisos.
8. Retornar somente os dados necessários para a prévia.

Não inserir resultados acadêmicos durante a prévia.

### 9.2 Confirmação

1. Revalidar autorização e estado do conselho.
2. Baixar o arquivo privado e executar novamente o parser; não confiar em payload acadêmico devolvido pelo navegador.
3. Confirmar que o hash continua igual.
4. Rejeitar se houver erro bloqueante.
5. Fazer upsert de estudantes pela matrícula.
6. Criar/atualizar turmas e disciplinas do conselho.
7. Criar participações e fotografias ligadas à versão da importação.
8. Inserir resultados em lotes controlados.
9. Reconciliar contagens gravadas com o resumo do parser.
10. Somente ao final mudar a importação para `confirmed`.

O gatilho da migração atualiza `current_import_id` apenas na confirmação. Assim, dados incompletos de uma tentativa que falhou não se tornam a fotografia ativa do conselho. Em caso de falha, marcar a importação como `failed`; nunca apontar o conselho para ela.

## 10. Cálculos e priorização

Implementar em funções puras e testáveis:

- nota baixa: nota numérica `< 6`;
- alerta acadêmico: pelo menos 4 disciplinas com nota baixa no bimestre principal;
- frequência baixa: frequência anual numérica `< 80`;
- piora: número de disciplinas baixas atual maior que no bimestre imediatamente anterior disponível;
- melhora: número menor;
- estabilidade: número igual;
- sem bimestre anterior: evolução indisponível.

Não contar marcador especial ou nota ausente como baixa. Exibir a razão textual do alerta, por exemplo: `5 disciplinas abaixo de 6; eram 2 no bimestre anterior`.

Para a ordenação inicial:

1. combinação de alerta acadêmico e baixa frequência;
2. quantidade de tipos de alerta;
3. quantidade de disciplinas baixas, decrescente;
4. nome do estudante.

Não exibir um escore numérico de risco.

## 11. Persistência pedagógica

### 11.1 Salvamento automático

- Usar debounce entre 500 e 800 ms.
- Mostrar `Salvando`, `Salvo`, `Erro ao salvar` e ação de tentar novamente.
- Não sobrescrever o estado local com resposta antiga.
- Enviar apenas campos alterados.
- Atualizar `updated_by` no servidor a partir do guard autenticado.
- Qualquer preenchimento marca `discussed = true`; permitir ajuste manual posterior.

### 11.2 Comportamentos

- Salvar uma linha por categoria selecionada.
- Permitir descrição contextual.
- Remover uma categoria explicitamente, sem apagar outras.
- Exibir orientação para registrar fatos observáveis, não diagnósticos.

### 11.3 Intervenções

- Descrição obrigatória.
- Responsável e prazo opcionais.
- Estado inicial `pending`.
- Resultado disponível para concluída.
- Motivo disponível para cancelada.
- Estrutura deve usar estudante canônico para permitir continuidade futura.

### 11.4 Participantes

- Lista pertence à turma.
- Nome obrigatório em cada item.
- Disciplina/função opcional.
- A API de conclusão da turma deve contar participantes no servidor.
- Sem participante, responder erro de domínio claro e não concluir.

## 12. Estados e transições

### Conselho

- `draft` após criação.
- `preparation` após confirmar a primeira importação.
- `in_progress` após a primeira turma entrar em andamento.
- `completed` somente quando todas as turmas estiverem concluídas.
- `reopened` reservado para a segunda entrega, mas aceito pelo banco.
- `archived` sem exclusão física.

### Turma

- `not_started` após importação.
- `in_progress` no primeiro registro pedagógico, participante, professor ou intervenção.
- `completed` por ação explícita e com ao menos um participante.

Uma turma concluída fica somente para leitura no MVP. Atualização de status/resultado de intervenção pode permanecer permitida conforme a regra funcional.

## 13. Interface

### 13.1 Painel e listagem

- Adicionar o cartão Conselho de Classe em `/hub`.
- Criar `/hub/conselhos` com cartões/linhas de conselhos.
- Mostrar estado e progresso, não dados sensíveis de estudantes na listagem.

### 13.2 Conselho

- Cabeçalho com ano, bimestre, oferta, data e estado.
- Critérios visíveis e explicados.
- Indicadores: estudantes, alerta acadêmico, baixa frequência, piora e intervenções pendentes.
- Lista de turmas com progresso e acesso à tela de trabalho.

### 13.3 Turma

- Layout de notebook em duas colunas.
- Lista persistente à esquerda e ficha à direita.
- Filtros rápidos pelos alertas e estado de discussão.
- Abas/áreas: Estudantes, Análise da turma, Participantes e Visualizações.
- Manter filtro, ordenação e rolagem ao trocar de estudante.
- Navegação anterior/próximo.

### 13.4 Visualizações da primeira entrega

Priorizar cartões, barras simples e tabelas, sem introduzir biblioteca de gráficos se não for necessária:

- totais gerais;
- progresso das turmas;
- disciplinas com mais notas baixas;
- comparação entre turmas por quantidade e percentual;
- distribuição de estudantes por número de disciplinas baixas;
- melhoraram/estáveis/pioraram.

## 14. Consultas e desempenho

- Evitar uma consulta por estudante ou disciplina.
- Carregar a turma atual com consultas agregadas/bulk.
- Sempre filtrar resultados e fotografias pelo `current_import_id` do conselho.
- Paginação não é necessária inicialmente para uma turma, mas a lista geral de conselhos deve ter limite razoável.
- Inserir resultados em lotes para evitar limites de payload.
- Selecionar somente colunas necessárias; não enviar raça/cor ou PCD para componentes que não as exibem.

## 15. Testes obrigatórios

### Parser

- Detecta as sete turmas do relatório de referência.
- Produz nomes curtos 1MA, 1MB, 1MC, 1MD, 1TA, 1TB e 1TC.
- Mantém matrícula como texto.
- Extrai corretamente uma amostra de estudantes dos bimestres 1 e 2.
- Preserva `*`, `**` e `s/n` como marcadores.
- Não transforma ausência de nota em zero.
- Detecta matrícula ausente e conflito de identidade.
- Interpreta frequência percentual corretamente.

### Regras

- Exatamente 4 disciplinas baixas gera alerta.
- Exatamente 80% não gera alerta; abaixo de 80% gera.
- Aumento 2 → 4 é piora; 4 → 2 é melhora; 3 → 3 é estabilidade.
- Sem bimestre anterior não gera alerta de piora.

### APIs

- Sem sessão retorna 401.
- `teacher_session` isolada não autoriza.
- Perfil inativo ou fora de coordenador/gestor/admin retorna 403.
- Erro bloqueante não ativa a importação.
- Turma sem participante não conclui.
- Conselho com turma pendente não conclui.

### Persistência/UI

- Recarregar preserva os campos.
- Falha de rede aparece como erro, não como salvo.
- Trocar de estudante não perde alteração pendente.
- Alertas exibem o motivo correto.

## 16. Verificação antes da entrega

Executar:

```bash
npm run type-check
npm run build
```

Executar também os testes adicionados para o parser e regras. Depois, fazer um ensaio manual completo com o relatório real:

1. Criar conselho.
2. Importar e conferir as sete turmas.
3. Validar manualmente notas/faltas de pelo menos três estudantes.
4. Confirmar importação.
5. Preencher campos individuais e coletivos.
6. Adicionar participante e intervenção.
7. Recarregar.
8. Concluir uma turma.
9. Verificar que turma sem participante é bloqueada.
10. Verificar que usuário não autenticado não acessa dados nem arquivo.

## 17. Handoff e responsabilidades

### Usuário

- Revisar e executar a migração no Supabase.
- Fornecer o project ref ou os tipos gerados, quando necessário.
- Confirmar que as variáveis do Supabase apontam para o projeto correto.
- Validar o fluxo com dados reais antes da reunião.

### Agente implementador

- Preservar alterações existentes e não modificar `backup.sql`.
- Implementar somente o escopo da primeira entrega.
- Regenerar tipos após confirmação de que a migração foi aplicada.
- Relatar qualquer diferença entre o schema remoto e a migração antes de improvisar.
- Entregar resumo dos arquivos alterados, comandos executados e limitações restantes.
- Não declarar a entrega pronta sem testar importação, persistência e autorização.

## 18. Condição de conclusão

A primeira versão está pronta quando todos os critérios de aceite da seção 10 do plano funcional e os testes prioritários desta spec passarem. Aparência refinada, EJA, reimportação avançada, PDF e colaboração simultânea não bloqueiam essa primeira entrega.
