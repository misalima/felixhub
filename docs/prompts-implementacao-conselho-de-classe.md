# Prompts para implementação — Conselho de Classe

## Configuração recomendada no Codex

- Modelo: `GPT-5.6 Sol` (`gpt-5.6-sol`).
- Esforço de raciocínio: `high`. Subir para `xhigh` apenas se o agente encontrar ambiguidade relevante no parser, autorização ou consistência transacional.
- Pasta de trabalho: `/Users/misaellima/Projects/Personal/felixhub`.
- Estratégia: usar uma única tarefa longa com o Prompt Mestre. Se a tarefa parar em um checkpoint, enviar os prompts de continuação na mesma conversa, em ordem.
- Não executar as fases em paralelo: importação, persistência e interface dependem dos contratos definidos nas fases anteriores.

## Prompt Mestre — implementação completa do MVP

```text
Implemente o MVP do módulo Conselho de Classe no projeto Felix Hub, trabalhando diretamente em:

/Users/misaellima/Projects/Personal/felixhub

Este é um pedido de implementação, não apenas de planejamento. Trabalhe de forma autônoma até entregar o fluxo funcional e verificado. Antes de editar, leia integralmente e trate como fonte de verdade:

1. docs/plano-modulo-conselho-de-classe.md
2. docs/spec-implementacao-conselho-de-classe.md
3. supabase/migrations/20260822010000_create_class_council_module.sql
4. src/types/database.types.ts
5. o AGENTS.md aplicável ao repositório

Use como dados reais de referência, sem modificá-los:

- /Users/misaellima/Downloads/relatorio-desempenho.xlsx
- /Users/misaellima/Projects/Personal/sigeduc-report-scripts/contar_completo.py

Contexto já concluído pelo usuário:

- o backup do banco foi realizado;
- a migration foi aplicada no Supabase;
- src/types/database.types.ts já foi regenerado a partir do schema remoto.

Portanto, não reaplique a migration, não regenere os tipos e não execute nem altere backup.sql. Comece verificando se os tipos gerados contêm as tabelas class_councils, class_council_classes, class_council_results e students. Se houver divergência entre tipos, migration e spec, pare e relate a divergência concreta antes de improvisar.

Preserve todas as alterações preexistentes e não relacionadas no worktree. Não reverta arquivos do usuário. Não faça commit nem push sem solicitação.

Implemente o escopo da primeira entrega para Ensino Regular. Não inclua EJA na interface, PDF, exclusão definitiva, cadastro geral de alunos/professores, colaboração simultânea nem reimportação avançada.

Ordem de trabalho obrigatória:

1. Faça um reconhecimento curto da arquitetura existente, scripts, padrões visuais, autenticação, Supabase e componentes reutilizáveis. Registre um plano operacional breve e prossiga sem aguardar confirmação, exceto se surgir bloqueio material.
2. Adicione apenas as dependências necessárias. Use exceljs somente no servidor para ler XLSX e Vitest para testes puros, salvo incompatibilidade técnica demonstrada.
3. Crie os tipos de domínio, normalização, parser do Relatório de Desempenho e cálculos de alertas como módulos puros e testáveis.
4. Crie requireCouncilStaff ou equivalente. Conselho de Classe deve aceitar somente sessão Supabase de perfil ativo admin/gestor/coordenador; teacher_session isolada nunca autoriza. Toda API deve executar o guard antes de usar supabaseAdmin.
5. Implemente o fluxo servidor de criação/listagem do conselho, upload privado, prévia da importação, confirmação reprocessada no servidor, persistência em lotes e ativação atômica da importação.
6. Implemente as APIs de leitura e persistência pedagógica: turma, professores por disciplina, participantes, dados coletivos, estudante, comportamentos e intervenções. Preencha created_by/updated_by no servidor, nunca a partir do navegador.
7. Implemente a interface integrada ao Hub: cartão do módulo, listagem, criação, importação/prévia, painel do conselho e workspace de turma em layout de notebook. Todos ficam visíveis, o preenchimento pedagógico é opcional, mas participantes por turma são essenciais para concluir.
8. Implemente visualizações simples sem adicionar biblioteca de gráficos se cartões, barras em CSS e tabelas forem suficientes.
9. Faça testes automatizados do parser, regras e autorização/APIs viáveis. Use o relatório real nos testes de integração do parser sem copiar dados pessoais para fixtures versionadas.
10. Execute type-check, testes e build. Corrija os problemas que estiverem dentro do escopo. Faça também uma inspeção final de segurança e de exposição de dados pessoais.

Regras funcionais e técnicas que não podem ser flexibilizadas:

- nota baixa é nota numérica menor que 6;
- alerta acadêmico ocorre com 4 ou mais disciplinas baixas;
- baixa frequência anual é menor que 80%; exatamente 80% não alerta;
- piora compara a quantidade de disciplinas baixas com o bimestre anterior disponível;
- *, **, s/n, -, vazio e outros marcadores nunca viram nota zero;
- matrícula é texto e é a identidade canônica do aluno;
- raça/cor e PCD podem ser persistidos conforme o relatório, mas não participam de alertas, ordenação ou priorização;
- o código da turma deve preservar o oficial e derivar corretamente os nomes 1MA, 1MB, 1MC, 1MD, 1TA, 1TB e 1TC para o relatório de referência;
- a prévia não insere resultados acadêmicos;
- a confirmação baixa/reabre o arquivo privado, recalcula o hash, executa novamente o parser e não confia em dados acadêmicos enviados pelo cliente;
- arquivos ficam no bucket privado class-council-imports e nunca recebem URL pública;
- consultas acadêmicas sempre respeitam current_import_id;
- evitar N+1 e inserir resultados em lotes;
- autosave entre 500 e 800 ms, com estados Salvando, Salvo e Erro ao salvar, sem perder alterações ao trocar de estudante;
- responsável e prazo de intervenção são opcionais;
- professor da disciplina é texto opcional, sem cadastro de professores;
- participantes pertencem à turma; nome é obrigatório e disciplina/função é opcional;
- turma sem participante não conclui;
- conselho só conclui quando todas as turmas estiverem concluídas;
- campos pedagógicos opcionais não bloqueiam a conclusão;
- turma concluída fica somente para leitura no MVP;
- não exibir escore numérico de risco; mostrar razões explicáveis para cada alerta.

Critérios mínimos de aceite:

- usuário admin/gestor/coordenador ativo cria um conselho Regular com ano, bimestre e data;
- relatório real gera prévia com sete turmas e nomes curtos corretos;
- erros bloqueantes e avisos aparecem antes da confirmação;
- confirmação persiste estudantes, turmas, disciplinas, snapshots e resultados sem expor tentativa parcial;
- lista prioriza e explica alunos com alertas;
- participantes, professores, dados coletivos, registros individuais e intervenções persistem após recarregar;
- visualizações gerais e por turma funcionam com os dados importados;
- conclusão respeita as regras de turma e conselho;
- usuário sem sessão, teacher_session isolada, perfil inativo ou papel não autorizado não acessa APIs nem arquivos;
- npm run type-check, os testes adicionados e npm run build terminam com sucesso.

Ao concluir, entregue:

1. resumo objetivo do que funciona;
2. lista dos principais arquivos criados/alterados;
3. comandos e resultados de verificação;
4. limitações restantes e riscos conhecidos;
5. roteiro curto de ensaio manual usando relatorio-desempenho.xlsx.

Não declare conclusão se importação, persistência, autorização ou recarga não tiverem sido efetivamente verificadas. Se credenciais ou acesso ao Supabase impedirem um teste real, implemente e teste tudo que for possível localmente, identifique exatamente o teste pendente e forneça o procedimento manual correspondente.
```

## Prompts de continuação por checkpoint

Use estes prompts somente se o agente encerrar antes de concluir o Prompt Mestre. Envie-os na mesma tarefa para preservar o contexto.

### Continuação 1 — fundação, parser e regras

```text
Continue a implementação do Conselho de Classe. Agora concentre-se em concluir e verificar a fundação técnica, o parser do relatório real e as regras puras.

Releia as seções 7, 8, 10 e 15 da spec. Inspecione primeiro o que já foi alterado e não refaça trabalho concluído. Entregue tipos de domínio separados dos tipos Supabase, normalização, parser server-only, cálculo de alertas e testes automatizados.

Use /Users/misaellima/Downloads/relatorio-desempenho.xlsx como teste real. O resultado esperado contém sete turmas regulares com nomes curtos 1MA, 1MB, 1MC, 1MD, 1TA, 1TB e 1TC. Valide matrícula como texto, bimestres, notas, faltas, frequência e marcadores especiais. Não versione uma cópia contendo dados pessoais.

Implemente também o guard exclusivo de admin/gestor/coordenador ativo e testes que demonstrem que teacher_session isolada não autoriza.

Finalize esta etapa executando os testes relevantes e npm run type-check. Corrija falhas antes de responder. Depois informe os contratos públicos criados e o que a próxima etapa deve consumir.
```

### Continuação 2 — importação e APIs

```text
Continue a partir dos contratos e testes existentes. Implemente agora toda a camada servidor do módulo Conselho de Classe conforme as seções 7, 9, 11, 12 e 14 da spec.

Inclua criação/listagem do conselho, upload privado, prévia, confirmação reprocessada no servidor, hash SHA-256, persistência em lotes, current_import_id, consultas agregadas e APIs pedagógicas. Todas as rotas devem usar o guard específico antes de supabaseAdmin. Não aceite autoria, IDs de conselho relacionados ou dados acadêmicos confiáveis vindos do cliente sem revalidação.

Não crie URLs públicas de Storage. Não ative importações com erros bloqueantes. Evite N+1. Preserve tentativas falhas sem torná-las a fotografia corrente. Implemente erros de domínio claros para conclusão sem participantes e conselho com turmas pendentes.

Adicione testes úteis para autorização, transições e validações. Execute testes e npm run type-check. Ao terminar, descreva os endpoints e payloads que a interface deverá usar.
```

### Continuação 3 — interface e experiência de preenchimento

```text
Continue o MVP integrando a interface às APIs já implementadas. Siga a seção 13 da spec e os padrões visuais existentes do Felix Hub.

Adicione o módulo ao /hub e implemente listagem, criação, importação/prévia, painel do conselho e workspace de turma para notebook. Priorize clareza e velocidade de uso amanhã: lista persistente de alunos à esquerda, ficha à direita, filtros de alertas, razões explicáveis, navegação anterior/próximo e manutenção de filtro/rolagem.

Implemente autosave robusto entre 500 e 800 ms com Salvando, Salvo, Erro ao salvar e repetição. Trocar de aluno não pode perder alteração pendente nem permitir que resposta antiga sobrescreva estado novo.

Todos os alunos devem ficar visíveis; destaque os alertas sem exigir preenchimento individual. Participantes são por turma e essenciais para conclusão. Professor por disciplina e responsável pela intervenção são textos opcionais. Não inclua observações finais, EJA, PDF ou exclusão definitiva.

Implemente as visualizações do MVP com cartões, tabelas e barras simples, evitando nova biblioteca de gráficos. Verifique responsividade para notebook, acessibilidade básica, estados vazios, carregamento e erros. Execute testes, npm run type-check e npm run build, corrigindo o que estiver no escopo.
```

### Continuação 4 — auditoria final e ensaio

```text
Faça a revisão final do MVP de Conselho de Classe; não acrescente escopo novo.

Compare a implementação inteira com docs/plano-modulo-conselho-de-classe.md e docs/spec-implementacao-conselho-de-classe.md. Procure especialmente:

- APIs sem requireCouncilStaff;
- uso de supabaseAdmin antes da autorização;
- aceitação indevida de teacher_session;
- URLs públicas ou vazamento de arquivo/dados pessoais;
- consultas sem current_import_id;
- marcadores convertidos em zero;
- N+1;
- perda ou corrida no autosave;
- possibilidade de concluir turma sem participantes ou conselho incompleto;
- uso de raça/cor ou PCD na priorização;
- exposição de EJA na interface;
- divergências entre tipos de domínio e database.types.ts.

Corrija todos os achados dentro do escopo. Execute a suíte relevante, npm run type-check e npm run build. Quando possível, ensaie o fluxo com relatorio-desempenho.xlsx. Entregue um relatório final honesto: o que foi verificado automaticamente, o que foi verificado manualmente, o que depende de credenciais/ambiente e o roteiro exato para validação pelo usuário.
```

## Prompt curto para retomada após erro ou interrupção

```text
Retome o trabalho do ponto atual. Primeiro inspecione git status e o diff para entender exatamente o que já foi feito, preservando alterações do usuário. Releia a spec apenas nas seções relacionadas à etapa atual. Não recomece do zero, não reaplique a migration, não regenere database.types.ts e não altere backup.sql. Resolva a causa da interrupção, execute as verificações proporcionais e continue até o próximo critério de aceite objetivo.
```
