# Plano do módulo Conselho de Classe

> Documento de trabalho. As decisões serão consolidadas durante o planejamento. Nenhuma seção deste documento representa implementação concluída.

## 1. Objetivo

Adicionar ao Felix Hub um módulo chamado **Conselho de Classe**, ao lado do módulo de Simulados. O módulo deverá importar o Relatório de Desempenho Escolar do SIGEduc, preparar indicadores acadêmicos, apoiar o preenchimento durante a reunião e preservar observações e intervenções para acompanhamento futuro.

## 2. Decisões confirmadas

### 2.1 Organização do conselho

- Um conselho representa um **evento geral**, contendo várias turmas.
- O evento é identificado por ano letivo, bimestre, oferta e data.
- A oferta será, inicialmente, Regular ou EJA.
- Cada conselho acontece em uma única data geral.
- Cada turma dentro do conselho terá situação própria: não iniciada, em andamento ou concluída.
- O conselho geral poderá passar pelos estados rascunho, preparação, em andamento, concluído e reaberto.

### 2.2 Cadastro de turmas e estudantes

- Não haverá, inicialmente, um fluxo manual separado para cadastrar turmas, estudantes ou professores.
- Turmas e estudantes serão criados ou reconhecidos durante a importação do relatório.
- A matrícula será o identificador estável do estudante.
- Para o usuário, o cadastro será percebido como pertencente ao conselho.
- Internamente, o estudante será reconhecido entre conselhos para permitir histórico e evolução.
- Os dados de participação do estudante no conselho formarão uma fotografia daquele momento, sem alterar retrospectivamente conselhos anteriores.

### 2.3 Fonte de dados

- O **Relatório de Desempenho Escolar** será a fonte acadêmica principal.
- Um único arquivo poderá conter todas as turmas da oferta.
- O Mapa Geral de Notas poderá ser usado futuramente como fonte alternativa ou de conferência.
- Serão importados matrícula, nome, turma, série, turno, oferta, situação da matrícula, raça/cor, PCD, notas, faltas e frequência.
- Identidade de gênero ficará fora do MVP.
- Raça/cor e PCD não poderão gerar alertas nem alterar a priorização automática.
- Dados sensíveis deverão ter acesso restrito e visualizações agregadas deverão evitar identificação indevida.

### 2.4 Bimestres e fotografia acadêmica

- O conselho terá um bimestre principal.
- A importação guardará todos os bimestres disponíveis no relatório.
- O bimestre principal será o foco da reunião.
- Os bimestres anteriores serão usados para comparações.
- A importação de dados anteriores não criará conselhos retroativos automaticamente.
- A frequência anual será registrada como fotografia vinculada à data de geração/importação do relatório.

### 2.5 Reimportação

- Será permitida enquanto o conselho estiver em preparação ou andamento.
- Antes da confirmação, o sistema mostrará as diferenças encontradas.
- Cada reimportação gerará uma nova versão e preservará o arquivo e o resumo anteriores.
- A reimportação atualizará apenas dados oriundos do SIGEduc.
- Observações, comportamentos e intervenções nunca serão apagados pela reimportação.
- Um conselho concluído precisará ser reaberto antes de receber uma nova importação.

### 2.6 Professor da disciplina

- Não haverá cadastro de professores no MVP.
- Cada combinação de turma e disciplina poderá receber o nome do professor em um campo de texto opcional.
- O nome será uma fotografia daquele conselho, sem tentar identificar ou relacionar professores entre eventos.
- Nomes já digitados no mesmo conselho poderão aparecer como sugestões.
- Professor da disciplina e responsável por intervenção serão campos diferentes.

### 2.7 Critérios e alertas

- Nota baixa: nota menor que 6.
- Alerta acadêmico: quatro ou mais disciplinas com nota baixa no bimestre principal.
- Baixa frequência: frequência anual menor que 80%.
- Piora acadêmica: aumento na quantidade de disciplinas abaixo de 6 em relação ao bimestre anterior.
- A média geral poderá ser exibida como informação complementar, mas não gerará sozinha um alerta de piora.
- Valores especiais do SIGEduc, como `*`, `**`, `s/n` e `-`, não serão convertidos em nota zero.
- Alertas serão independentes e explicáveis; não haverá inicialmente um índice de risco oculto.
- Todos os estudantes serão exibidos, com destaque e ordenação para quem apresentar alertas.
- O preenchimento individual será opcional, inclusive para estudantes destacados.
- A interface deverá explicar os critérios e mostrar a causa concreta de cada alerta.
- Os critérios utilizados deverão ficar registrados no conselho para preservar a interpretação histórica.
- Na primeira versão, os limites serão fixos; configuração por conselho ficará para uma fase posterior.

### 2.8 Registro pedagógico individual

- Qualquer preenchimento marcará automaticamente o estudante como discutido.
- Também será possível marcar ou desmarcar manualmente que o estudante foi discutido.
- Realização de atividades terá as opções: não informado, regular, irregular e não realiza.
- Comportamento usará um modelo misto de categorias e descrição livre.
- Categorias iniciais sugeridas:
  - conversas excessivas;
  - uso inadequado de celular;
  - conflitos com colegas;
  - desrespeito ou dificuldade de convivência;
  - baixa participação;
  - atrasos recorrentes;
  - não realização de atividades;
  - outro.
- A interface deverá orientar o registro de fatos observáveis e contexto, evitando diagnósticos e rótulos pessoais.
- Haverá campo opcional para observação pedagógica.
- Haverá campo opcional para pontos positivos.

### 2.9 Intervenções

- Um estudante poderá ter uma ou mais intervenções.
- A descrição da intervenção será o conteúdo central do registro.
- Responsável será opcional.
- Prazo será opcional.
- Toda nova intervenção começará como pendente.
- Situações possíveis: pendente, em andamento, concluída e cancelada.
- Intervenções concluídas poderão receber um resultado ou retorno opcional.
- Intervenções canceladas poderão receber um motivo opcional.
- Intervenções anteriores pendentes poderão gerar destaque em conselhos futuros.

### 2.10 Explicabilidade na interface

- A interface exibirá um bloco com os critérios do conselho.
- Indicadores e alertas terão explicações acessíveis.
- Alertas de evolução informarão os valores comparados, por exemplo: cinco disciplinas abaixo de 6 no bimestre atual e duas no anterior.
- Haverá legenda para valores especiais do SIGEduc.
- A ordenação por prioridade nunca esconderá os motivos do destaque.

### 2.11 Registro coletivo da turma

- A ficha coletiva será curta e todos os campos serão opcionais.
- Campos previstos:
  - pontos positivos da turma;
  - dificuldades gerais observadas;
  - aspectos de comportamento e convivência;
  - aspectos de aprendizagem;
  - estratégias ou intervenções coletivas.
- Não haverá um campo separado de observações finais.
- Intervenções coletivas poderão ser registradas separadamente, com descrição, responsável opcional, prazo opcional e situação.
- A turma terá situação própria: não iniciada, em andamento ou concluída.

### 2.12 Faltas e frequência

- Frequência anual inferior a 80% gerará alerta e influenciará a priorização.
- As faltas serão exibidas por disciplina e bimestre.
- O total de faltas e sua evolução entre bimestres serão informações contextuais.
- Não haverá, no MVP, um limite absoluto de faltas para gerar alerta.
- Visualizações poderão destacar a concentração de faltas por disciplina sem classificá-la automaticamente como crítica.
- A interface explicará que disciplinas possuem cargas horárias diferentes e, portanto, números absolutos de faltas não são diretamente equivalentes.

### 2.13 Visualizações do MVP

#### Visão geral do conselho

- Cartões com total de estudantes, alerta acadêmico, frequência anual inferior a 80%, piora acadêmica e intervenções pendentes.
- Progresso das turmas: não iniciadas, em andamento e concluídas.
- Ranking de disciplinas por quantidade e percentual de estudantes com nota abaixo de 6.
- Comparação entre turmas pelo percentual de estudantes com quatro ou mais disciplinas abaixo de 6.
- Comparações entre turmas deverão mostrar percentuais e quantidades para considerar diferenças de tamanho.

#### Visão da turma

- Lista priorizada de estudantes com os motivos de cada alerta.
- Distribuição por quantidade de disciplinas abaixo de 6.
- Comparação entre estudantes que melhoraram, permaneceram estáveis ou pioraram.
- Notas baixas e faltas por disciplina.
- Resumo de estudantes discutidos e intervenções registradas.

#### Visão individual

- Evolução da quantidade de disciplinas abaixo de 6 por bimestre.
- Tabela ou mapa visual de notas por disciplina e bimestre.
- Faltas por disciplina e bimestre.
- Histórico de alertas, discussões e intervenções.

#### Fora do MVP

- Cruzamentos entre raça/cor e desempenho.
- Análises específicas de PCD.
- Mapas de calor gerais e comparações entre anos letivos.
- Essas análises dependerão de validação de utilidade, privacidade e tamanho mínimo dos grupos.

### 2.14 Validação da importação

- A importação será transacional: após confirmada, será salva integralmente; uma falha técnica não poderá deixar dados parciais.
- Antes de salvar, a interface apresentará uma prévia organizada por turma e estudante.

#### Erros bloqueantes

- Relatório sem blocos de turma reconhecíveis.
- Estudante sem matrícula.
- Mesma matrícula associada a estudantes diferentes.
- Estrutura de disciplinas ou pares de nota/falta não reconhecida.
- Oferta incompatível com o conselho.
- Arquivo inválido ou formato não suportado.
- Tentativa de misturar anos letivos diferentes na mesma importação.

#### Avisos confirmáveis

- Nota ainda não lançada, considerando somente o bimestre do conselho e os anteriores.
- Frequência ausente.
- PCD ou raça/cor não informados.
- Disciplina marcada como `s/n`.
- Situação de matrícula diferente de matriculado.
- Bimestre atual ou anterior ainda sem dados completos; bimestres posteriores ao conselho não geram aviso.
- Estudante presente na versão anterior e ausente na nova.
- Mudança de nome ou turma para matrícula conhecida.

#### Comparação em reimportações

- Estudantes adicionados ou removidos.
- Mudanças de turma, nome ou situação.
- Notas e faltas alteradas.
- Frequências atualizadas.
- Disciplinas adicionadas ou removidas.

### 2.15 Acesso, autoria e auditoria

- Somente usuários autenticados do Felix Hub com perfil administrativo, gestor ou coordenador poderão acessar o módulo.
- No MVP, esses usuários poderão visualizar e editar todos os conselhos.
- Não haverá permissão por turma no MVP.
- Importações registrarão usuário, data e hora.
- Observações, comportamentos e intervenções registrarão autoria, criação e última alteração.
- Conclusão, reabertura e reimportação serão registradas no histórico.
- Nenhuma página ou arquivo do conselho poderá ter acesso público.
- A autoria será exibida de maneira discreta na interface.
- Exclusões materiais deverão ser evitadas; registros serão arquivados ou cancelados quando aplicável.

### 2.16 Unicidade do conselho

- Haverá apenas um conselho ativo para cada combinação de ano letivo, bimestre e oferta.
- Ao tentar criar uma combinação existente, a interface oferecerá acesso ao conselho já criado.
- Correções serão feitas por reabertura e reimportação, preservando o histórico.
- Conselhos criados por engano poderão ser arquivados.
- Um conselho arquivado continuará preservado para auditoria e não será tratado como exclusão definitiva.

### 2.16.1 Identificação e nome de exibição das turmas

- O código oficial da turma será preservado exatamente como vier do SIGEduc.
- A interface usará um nome curto de exibição.
- Para as turmas regulares conhecidas, o nome curto será formado por:
  - número da série;
  - `M` para turno matutino ou `T` para turno vespertino/tarde;
  - letra final da turma.
- Exemplos: `EMMAT1A` se torna `1MA`; `EMVES1A` se torna `1TA`.
- A prévia da importação permitirá corrigir o nome curto antes da confirmação.
- Reimportações reconhecerão a turma pelo código oficial, nunca apenas pelo nome curto.
- Códigos que não correspondam à regra conhecida exigirão confirmação do nome de exibição.

### 2.17 Participantes da reunião por turma

- Cada turma terá sua própria lista de participantes do conselho.
- O foco inicial será registrar os professores da turma que participaram da discussão daquela turma.
- Cada participante terá nome em texto livre e poderá ter disciplina ou função opcional.
- Os participantes não precisarão de cadastro nem serão vinculados a contas do Felix Hub.
- Nomes preenchidos como professor da disciplina serão oferecidos como sugestões para inclusão rápida entre os participantes.
- Também será possível adicionar manualmente participantes que não estejam associados a uma disciplina.
- A lista não afetará permissões, autoria, professor da disciplina ou responsável por intervenção.
- A autoria dos registros continuará vinculada exclusivamente ao usuário autenticado que realizou a ação.
- Pelo menos um participante será obrigatório para concluir a turma.

### 2.18 Conclusão, proteção e acompanhamento

- A turma passará automaticamente para em andamento no primeiro registro feito nela.
- A conclusão da turma será manual.
- Os registros pedagógicos continuarão opcionais, mas pelo menos um participante será obrigatório para concluir uma turma.
- Antes da conclusão, a interface mostrará quantos estudantes tinham alertas, quantos foram discutidos e quantas intervenções foram criadas.
- Estudantes com alerta e sem registro gerarão aviso, mas não bloquearão a conclusão.
- O conselho geral poderá ser concluído quando todas as turmas estiverem concluídas.
- Após a conclusão, dados importados, participantes, registros individuais e conteúdo coletivo ficarão somente para leitura.
- Status, resultado e retorno das intervenções continuarão atualizáveis sem reabrir o conselho.
- Reabertura será necessária para reimportar ou alterar o conteúdo da reunião.
- Conclusões e reaberturas registrarão usuário, data e hora.

### 2.19 Experiência de importação

- O usuário enviará diretamente o arquivo `.xlsx` original do Relatório de Desempenho Escolar do SIGEduc.
- Não será necessário executar scripts Python nem produzir arquivos intermediários.
- O Felix Hub fará internamente a leitura, normalização, validação, prévia e persistência.
- A estrutura normalizada será uma representação interna e não uma exigência operacional para o usuário.
- Os scripts existentes poderão orientar as regras de interpretação e servir para validação de resultados, mas não farão parte do fluxo cotidiano.
- A primeira versão aceitará apenas relatórios do Ensino Regular.
- O modelo de dados continuará preparado para a oferta EJA.
- A opção EJA só será liberada após análise e teste com um relatório real dessa oferta.
- Cada importação receberá um único arquivo contendo todas as turmas do relatório.

### 2.19.1 Guarda do arquivo original

- Cada versão do relatório original será preservada em armazenamento privado no Supabase.
- O arquivo nunca terá acesso público.
- Downloads exigirão usuário autenticado e autorizado.
- Serão registrados nome, tamanho, data, autor e resumo da importação.
- Uma impressão digital do arquivo ajudará a detectar o reenvio exato da mesma versão.
- Reimportações manterão as versões anteriores para auditoria.
- Não serão criadas URLs públicas permanentes para os relatórios.

### 2.20 Impressão e PDF

- O MVP terá uma visualização de impressão do resumo de cada turma.
- O resumo da turma incluirá indicadores, análise coletiva, estudantes discutidos e intervenções.
- O MVP terá uma visualização de impressão do conselho geral.
- O resumo geral incluirá identificação do evento, participantes, progresso, síntese por turma e intervenções pendentes.
- A geração de PDF poderá usar o recurso de impressão/salvamento do navegador.
- Raça/cor e PCD serão omitidos dos documentos por padrão.
- Não haverá exportação para Excel no MVP.
- Uma exportação estruturada poderá ser avaliada futuramente se houver necessidade operacional concreta e controles adequados de privacidade.

### 2.21 Concorrência de edição

- Vários usuários poderão acessar e consultar o mesmo conselho.
- O MVP assumirá apenas um editor ativo por turma.
- Ao entrar no modo de edição, a turma receberá um bloqueio preventivo associado ao usuário.
- Outro usuário poderá visualizar a turma e será avisado de que há uma edição em andamento.
- Não haverá edição colaborativa em tempo real no estilo Google Docs.
- O bloqueio terá expiração para não permanecer preso após o fechamento inesperado da página.
- Um usuário autorizado poderá assumir a edição após confirmação, com registro no histórico.
- Alterações também deverão usar controle de versão para impedir sobrescrita silenciosa de dados mais recentes.

### 2.22 Salvamento

- Registros pedagógicos serão salvos automaticamente após uma pequena pausa na edição.
- A interface mostrará estados claros: salvando, salvo, erro e tentativa de novo envio.
- Ao sair da página, o sistema verificará se existem alterações pendentes.
- Falhas de salvamento não poderão ser ocultadas nem apresentadas como sucesso.
- Ações formais continuarão exigindo confirmação explícita: confirmar importação, concluir turma, concluir conselho, reabrir e assumir edição.
- Não será necessário pressionar um botão Salvar em cada ficha individual.

### 2.22.1 Dispositivo principal

- A experiência principal de preenchimento será otimizada para notebook/computador.
- A interface deverá funcionar adequadamente em tablet para consulta e edição básica.
- Celular terá responsividade básica, mas não será prioridade do MVP.
- Tabelas, filtros e navegação entre estudantes poderão aproveitar a largura de telas de notebook.

### 2.22.2 Tela de trabalho da turma

- A tela usará uma composição lado a lado otimizada para notebook.
- A lista de estudantes permanecerá visível à esquerda.
- A ficha do estudante selecionado será exibida à direita.
- Trocar de estudante preservará filtros, ordenação e posição da lista.
- Haverá navegação para estudante anterior e próximo.
- A lista destacará alertas e estudantes já discutidos.
- A turma terá áreas para Estudantes, Análise da turma, Participantes e Visualizações.
- A ficha individual poderá usar seções recolhíveis para alertas, notas e faltas, comportamento, observações e intervenções.

### 2.23 Continuidade das intervenções

- Intervenções não serão copiadas ao criar um conselho posterior.
- Uma intervenção individual será um registro contínuo reconhecido pelo estudante/matrícula.
- Conselhos posteriores mostrarão intervenções anteriores pendentes ou em andamento.
- A atualização continuará no mesmo registro e preservará o conselho de origem e o histórico de mudanças.
- Intervenções novas ficarão vinculadas ao conselho em que foram criadas.
- Intervenções coletivas poderão continuar entre conselhos da mesma turma e ano letivo.
- O modelo de dados do primeiro lançamento deverá permitir essa continuidade, mesmo que a interface completa de acompanhamento seja entregue posteriormente.

## 3. Fluxo geral acordado

1. Acessar o módulo Conselho de Classe no painel do Felix Hub.
2. Criar o evento geral, informando ano letivo, bimestre, oferta e data.
3. Importar o Relatório de Desempenho Escolar com todas as turmas.
4. Conferir a prévia, inconsistências e resumo da importação.
5. Confirmar a criação/atualização de turmas, estudantes e dados acadêmicos.
6. Preparar os nomes opcionais dos professores por turma e disciplina.
7. Realizar o conselho turma por turma.
8. Registrar dados individuais e coletivos quando necessário.
9. Criar e acompanhar intervenções.
10. Consultar visualizações e comparações entre bimestres.
11. Concluir o conselho, preservando a possibilidade controlada de reabertura.

## 4. Escopo da primeira versão para a reunião

Existe necessidade operacional de uma primeira versão funcional para o conselho do dia seguinte. Essa entrega será uma fatia vertical: deverá permitir criar, importar, analisar, preencher e recuperar os dados depois de recarregar a página.

### 4.1 Incluído

- Cartão Conselho de Classe no painel do Hub.
- Lista de conselhos e criação de um conselho do Ensino Regular.
- Campos de criação: ano letivo, bimestre e data; a oferta será Regular nesta versão.
- Um conselho ativo por ano, bimestre e oferta.
- Upload direto do Relatório de Desempenho Escolar original em `.xlsx`.
- Armazenamento privado do arquivo original.
- Leitura de todas as turmas regulares encontradas no relatório.
- Prévia com total de turmas, estudantes, disciplinas, notas, faltas, erros e avisos.
- Confirmação transacional da primeira importação.
- Criação/reconhecimento interno dos estudantes pela matrícula.
- Preservação do código oficial e geração do nome curto da turma.
- Persistência de notas e faltas de todos os bimestres disponíveis.
- Cálculo dos alertas de nota, frequência e piora.
- Painel geral com indicadores simples em cartões e tabelas.
- Tela da turma em duas colunas, com lista priorizada e ficha individual.
- Registro individual de atividades, comportamentos, descrição, observação, pontos positivos e intervenções.
- Registro dos cinco campos coletivos da turma.
- Professor opcional por disciplina.
- Lista de participantes por turma; pelo menos um participante para concluir.
- Salvamento automático com indicação de estado.
- Estados básicos do conselho e das turmas.
- Conclusão manual de turma e conselho.
- Acesso apenas para perfis autenticados de coordenador/gestor/admin.
- Autoria e datas essenciais nos registros criados ou alterados.

### 4.2 Adiado para a segunda entrega

- Importação de relatórios da EJA.
- Reimportação com comparação completa entre versões.
- Bloqueio preventivo entre editores e tomada de edição.
- Interface completa de auditoria.
- Continuidade visual das intervenções em conselhos futuros; o banco já deverá suportá-la.
- Gráficos e comparações analíticas mais elaborados.
- Visualizações de impressão e PDF.
- Sugestões e reaproveitamento avançado de nomes de professores.
- Configuração dos limites de alerta por conselho.
- Exportação para Excel.

## 5. Modelo conceitual de dados

Os nomes definitivos das tabelas poderão seguir a convenção do projeto, mas o modelo deverá representar as entidades abaixo.

### 5.1 Conselho

- Identificador.
- Ano letivo, bimestre, oferta e data do conselho.
- Estado: rascunho, preparação, em andamento, concluído, reaberto ou arquivado.
- Critérios utilizados: nota mínima, quantidade de disciplinas para alerta e frequência mínima.
- Importação acadêmica atual.
- Criado por/em, atualizado por/em e concluído por/em.
- Restrição de unicidade para ano letivo, bimestre e oferta entre conselhos ativos.

### 5.2 Importação

- Conselho e número da versão.
- Nome, tamanho, hash e caminho privado do arquivo original.
- Data de geração detectada no relatório, quando disponível.
- Usuário e data da importação.
- Situação: enviada, validada, confirmada ou falhou.
- Resumo de quantidades e relatório estruturado de erros/avisos.
- Versões antigas preservadas para auditoria.

### 5.3 Estudante

- Identificador interno.
- Matrícula como identificador único estável.
- Nome canônico mais recente.
- Datas de criação e atualização.

Não haverá tela de cadastro manual no MVP. A entidade existe internamente para relacionar o mesmo estudante entre conselhos.

### 5.4 Turma do conselho

- Conselho.
- Código oficial do SIGEduc.
- Nome curto de exibição.
- Série, turno e oferta.
- Estado: não iniciada, em andamento ou concluída.
- Campos coletivos definidos neste documento.
- Dados de conclusão e campos futuros de controle de edição.
- Unicidade do código oficial dentro do conselho.

### 5.5 Participação do estudante no conselho

- Turma do conselho e estudante.
- Fotografia do nome, raça/cor, PCD, situação da matrícula e frequência na importação atual.
- Situação de realização das atividades.
- Indicador de discutido.
- Observação pedagógica e pontos positivos.
- Criado/atualizado por e datas.

Os dados contextuais serão fotografias do conselho; atualizações futuras não alterarão retrospectivamente esse registro.

### 5.6 Disciplina e resultados acadêmicos

- Disciplina no contexto da turma, com nome vindo do relatório e professor opcional.
- Resultado por estudante, disciplina e bimestre.
- Nota numérica opcional.
- Marcador original opcional para `*`, `**`, `s/n`, `-` ou outros valores não numéricos.
- Quantidade de faltas opcional.
- Referência à versão da importação que produziu o resultado.

### 5.7 Comportamentos

- Estudante no conselho.
- Categoria definida no requisito funcional.
- Descrição contextual opcional.
- Autoria e datas.
- Possibilidade de mais de uma categoria por estudante.

### 5.8 Participantes por turma

- Turma do conselho.
- Nome em texto livre.
- Disciplina ou função opcional.
- Autoria e datas.

### 5.9 Intervenções

- Tipo de alvo: estudante ou turma.
- Estudante ou turma relacionada.
- Conselho de origem.
- Descrição.
- Responsável e prazo opcionais.
- Estado: pendente, em andamento, concluída ou cancelada.
- Resultado/retorno e motivo de cancelamento opcionais.
- Autoria e datas.
- Estrutura preparada para histórico de mudanças e consulta em conselhos futuros.

## 6. Contrato do importador do SIGEduc

### 6.1 Identificação estrutural

- Examinar a planilha sem depender de posições absolutas únicas.
- Encontrar cada bloco pelos textos de oferta/série/turno e `TURMA:`.
- Reconhecer o cabeçalho iniciado por `MATRÍCULA`, `ESTUDANTE`, `RAÇA/COR/ETNIA`, `PCD` e `PERÍODO`.
- Reconhecer disciplinas e seus pares de colunas `NOTA` e `FALTA`.
- Agrupar as linhas de bimestres do mesmo estudante, preenchendo os dados mesclados apenas dentro do bloco correto.
- Preservar valores especiais em vez de convertê-los em zero.

### 6.2 Normalização

- Aparar espaços e normalizar apenas o necessário para comparação.
- Preservar nome e matrícula originais para exibição/auditoria.
- Normalizar `1° BIM`, `1º BIM` e variações equivalentes para bimestres 1 a 4.
- Gerar `1MA` a partir de `EMMAT1A` e `1TA` a partir de `EMVES1A`.
- Exigir confirmação para códigos de turma que não correspondam às regras conhecidas.
- Interpretar percentuais de frequência como valores numéricos sem perder a representação original.

### 6.3 Saída interna

O importador produzirá uma estrutura normalizada com:

- metadados do relatório;
- turmas;
- estudantes;
- disciplinas;
- resultados por estudante, disciplina e bimestre;
- frequência e situação;
- erros bloqueantes e avisos confirmáveis;
- resumo de contagens para reconciliação.

### 6.4 Segurança e consistência

- Definir limites de tamanho e extensão do arquivo.
- Validar o conteúdo real do `.xlsx`, não apenas o nome.
- Não executar macros ou conteúdo incorporado.
- Calcular o hash antes de confirmar a importação.
- Salvar dados confirmados em transação no banco.
- Não criar registros acadêmicos quando houver erro bloqueante.

## 7. Telas e navegação

### 7.1 Painel do Hub

- Novo cartão Conselho de Classe ao lado de Simulados.
- Acesso visível apenas a usuários autorizados.

### 7.2 Lista de conselhos

- Ano, bimestre, oferta, data, estado e progresso das turmas.
- Ação para criar conselho.
- Ação para abrir conselho existente.
- Conselhos arquivados fora da listagem principal.

### 7.3 Criação

- Ano letivo.
- Bimestre de 1 a 4.
- Oferta Regular na primeira versão.
- Data única do conselho.
- Verificação imediata de combinação já existente.

### 7.4 Importação e prévia

- Seleção ou arraste do `.xlsx`.
- Progresso de envio e processamento.
- Resumo por turma.
- Lista separada de erros e avisos.
- Prévia dos nomes curtos das turmas.
- Confirmação explícita antes de persistir.

### 7.5 Visão geral do conselho

- Identificação e critérios usados.
- Indicadores gerais.
- Progresso por turma.
- Lista de turmas com estado e alertas.
- Acesso ao arquivo/importação para usuários autorizados.

### 7.6 Trabalho da turma

- Cabeçalho com nome, progresso, indicadores e ação de conclusão.
- Áreas Estudantes, Análise da turma, Participantes e Visualizações.
- Lista de estudantes e ficha lado a lado.
- Filtros: todos, alerta acadêmico, baixa frequência, pioraram, discutidos e com intervenção.
- Ordenação inicial pela combinação de alertas, sempre exibindo os motivos.
- Salvamento automático dos campos pedagógicos.

### 7.7 Ficha individual

- Identificação e alertas explicados.
- Evolução acadêmica e faltas.
- Situação das atividades.
- Categorias e descrição de comportamento.
- Observação pedagógica e pontos positivos.
- Intervenções.
- Marcação manual de discutido.
- Navegação anterior/próximo.

## 8. Regras de cálculo

- Uma disciplina conta como nota baixa somente quando há nota numérica inferior a 6 no bimestre analisado.
- Valores especiais e notas ausentes não contam como zero nem como nota baixa.
- O alerta acadêmico existe quando há pelo menos quatro disciplinas com nota baixa no bimestre principal.
- Baixa frequência existe quando a fotografia de frequência anual é numericamente inferior a 80%.
- Piora existe quando a quantidade de disciplinas com nota baixa é maior que no bimestre imediatamente anterior disponível.
- Sem bimestre anterior, não se calcula melhora ou piora.
- Melhora significa redução da quantidade; estabilidade significa quantidade igual.
- Faltas são somadas apenas para exibição contextual e também permanecem disponíveis por disciplina.
- Ordenação por prioridade poderá considerar a quantidade de alertas e de disciplinas baixas, mas nunca exibirá um escore opaco.

## 9. Segurança e privacidade

- Aplicar RLS às novas tabelas.
- Permitir acesso somente a usuários autenticados ativos com perfil coordenador/gestor/admin.
- Usar bucket privado para os relatórios.
- Gerar downloads temporários somente após autorização no servidor.
- Não registrar conteúdo sensível em logs de aplicação.
- Omitir raça/cor e PCD de impressões por padrão.
- Não usar raça/cor ou PCD em alertas, prioridade ou pontuação.
- Arquivar em vez de apagar sempre que a preservação do histórico for necessária.

## 10. Critérios de aceite da primeira versão

1. Um gestor autenticado consegue criar um conselho Regular sem duplicar ano/bimestre/oferta.
2. O relatório de exemplo é reconhecido como sete turmas: 1MA, 1MB, 1MC, 1MD, 1TA, 1TB e 1TC.
3. Matrículas, nomes, disciplinas, notas, faltas, frequência e situação são extraídos corretamente em amostras conferidas manualmente.
4. `*`, `**`, `s/n` e `-` nunca são gravados como zero.
5. Um erro bloqueante impede toda a confirmação, sem persistência parcial.
6. Depois da confirmação, recarregar a página preserva turmas e dados acadêmicos.
7. Alertas de quatro ou mais disciplinas, frequência anual abaixo de 80% e piora correspondem ao cálculo documentado.
8. A lista da turma explica os motivos de cada destaque.
9. Campos individuais, coletivos, professores, participantes e intervenções persistem após recarregar.
10. O salvamento mostra sucesso ou falha claramente.
11. A turma não pode ser concluída sem participante.
12. Alertas sem registro não impedem a conclusão depois da confirmação do aviso.
13. O conselho só pode ser concluído quando todas as turmas estiverem concluídas.
14. Usuários não autenticados não acessam páginas, dados ou arquivos do módulo.
15. O fluxo principal funciona adequadamente em notebook.

## 11. Sequência de implementação

### Etapa 1 — Fundação

- Criar migrações, índices, restrições e políticas de acesso.
- Criar o bucket privado e as regras de acesso aos arquivos.
- Adicionar tipos e contratos internos.

### Etapa 2 — Importador

- Implementar leitura e normalização do relatório original.
- Criar testes com o relatório de exemplo e casos reduzidos/anônimos.
- Implementar validações, avisos, hash e resumo.

### Etapa 3 — Fluxo do conselho

- Adicionar o módulo ao Hub.
- Criar listagem, formulário de criação, upload, prévia e confirmação.
- Persistir a importação em transação.

### Etapa 4 — Experiência da turma

- Construir lista priorizada e ficha individual.
- Adicionar campos coletivos, professores e participantes.
- Implementar intervenções e salvamento automático.
- Implementar conclusão de turma e conselho.

### Etapa 5 — Verificação para uso real

- Reconciliar contagens com o Excel de exemplo.
- Testar recarga, falha de rede, permissões e conclusão.
- Executar verificação de tipos, lint e build.
- Fazer um ensaio completo: criar conselho, importar, preencher uma turma, concluir e reabrir a aplicação.

### Etapa 6 — Segunda entrega

- Reimportação versionada e comparação.
- Bloqueio de edição.
- Auditoria detalhada.
- Gráficos, impressão/PDF e acompanhamento entre conselhos.
- Validação e liberação da EJA.

## 12. Pendências não bloqueantes

- Obter um relatório real da EJA antes de liberar essa oferta.
- Avaliar limites configuráveis após uso real dos critérios fixos.
- Avaliar exportação estruturada somente se surgir necessidade operacional.
- Refinar categorias de comportamento com base no uso da equipe.
