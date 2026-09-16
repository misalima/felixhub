# FélixHub

FélixHub é uma plataforma de gestão escolar desenvolvida para centralizar dados pedagógicos, registros de estudantes, avaliações, ocorrências e processos de acompanhamento da equipe escolar em um único ambiente.

## Visão geral

O projeto é composto por duas frentes principais:

- Landing page pública em `/main`: apresentação da escola, estrutura e serviços.
- Hub interno em `/hub`: área restrita com módulos operacionais para coordenação, gestão e professores.

A aplicação usa Next.js com App Router, Supabase como backend e autenticação, Tailwind para interfaces e um conjunto de módulos focados em gestão pedagógica.

## Módulos atuais

### 1. Hub escolar

A área principal do sistema está em `src/app/hub` e reúne os workflows de rotina escolar:

- `/hub` — painel central com acesso aos módulos disponíveis
- `/hub/dashboard` — dashboard pedagógico com indicadores de risco, fluxo e qualidade de dados
- `/hub/alunos` — consulta de estudantes e prontuários
- `/hub/conselhos` — gestão de conselhos de classe, importação de relatórios e acompanhamento por turma
- `/hub/ocorrencias` — registro e consulta de ocorrências individuais, coletivas e de turma
- `/hub/simulados` — criação e gestão de simulados e banco de questões
- `/hub/intervencoes` — acompanhamento de intervenções pedagógicas e relatórios
- `/hub/relatorios` — exportação e geração de relatórios
- `/hub/perfil` — perfil do usuário
- `/hub/usuarios` — administração de usuários
- `/hub/professor-mentor/*` — fluxos de apoio ao professor, como geração de folhas de frequência e recomposição

### 2. Landing page pública

A página pública em `src/app/main` é uma apresentação institucional com seções de:

- hero e apresentação
- sobre a escola
- números e indicadores
- estrutura da instituição
- projetos e equipe
- contato

## Stack e tecnologias

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Supabase (PostgreSQL + Auth)
- TanStack Query
- Radix UI
- Vitest
- ESLint

## Estrutura do repositório

```text
.
├── src/
│   ├── app/
│   │   ├── main/              # landing page pública
│   │   ├── hub/               # área administrativa do sistema
│   │   ├── api/               # APIs internas do Next.js
│   │   └── ...
│   ├── components/            # componentes reutilizáveis
│   ├── hooks/                 # hooks do React
│   ├── lib/                   # utilitários, regras de negócio e integração
│   ├── services/              # serviços do servidor
│   ├── types/                 # tipos TypeScript
│   ├── providers/             # providers de contexto
│   ├── config.ts
│   ├── middleware.ts
│   └── ...
├── supabase/
│   ├── migrations/            # migrações do banco
│   └── ...
├── docs/                      # documentação e planos de implementação
├── public/                    # assets públicos
├── .env.example               # variáveis de ambiente de exemplo
├── package.json               # scripts e dependências
├── next.config.ts
├── tsconfig.json
├── vitest.config.mts
├── eslint.config.mjs
├── components.json
├── README.md
└── ...
```

## Requisitos

- Node.js 18+ (recomendado 20 LTS)
- npm
- Conta Supabase configurada

## Configuração local

1. Clone o repositório:

```bash
git clone https://github.com/misalima/felixhub.git
cd felixhub
```

2. Instale as dependências:

```bash
npm install
```

3. Configure as variáveis de ambiente:

```bash
cp .env.example .env.local
```

Edite o arquivo `.env.local` com os valores corretos do seu projeto Supabase:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
NEXT_PUBLIC_SUPABASE_URL="SUPABASE-URL"
NEXT_PUBLIC_SUPABASE_ANON_KEY="SUPABASE_ANON_KEY"
NEXT_SUPABASE_SERVICE_ROLE_KEY="SUPABASE_SERVICE_ROLE_KEY"
TEACHER_ACCESS_PASSWORD="password"
```

4. Inicie o ambiente de desenvolvimento:

```bash
npm run dev
```

5. Acesse a aplicação em:

```text
http://localhost:3000
```

## Scripts disponíveis

```bash
npm run dev          # inicia o app em desenvolvimento
npm run build        # build de produção
npm run start        # inicia a versão compilada
npm run lint         # valida lint do projeto
npm run lint:fix     # corrige problemas de lint
npm run type-check   # valida TypeScript
npm run test         # executa a suíte de testes Vitest
npm run test:class-council  # subset específico de testes do módulo de conselho
```

## Fluxos de acesso

### Área administrativa

- Login interno em `/hub/login`
- A autenticação usa Supabase e perfis armazenados em `profiles`
- Rotas sensíveis estão protegidas via `src/middleware.ts`

### Fluxos de professor

Existem rotas de uso específico do professor, como:

- `/hub/professor-mentor/gerar-folha-de-frequencia`
- `/hub/professor-mentor/recomposicao`
- `/hub/simulados/professor/*`

Essas áreas têm validações especiais de sessão e proteção por middleware.

## Banco de dados e migrações

O projeto usa Supabase e mantém a estrutura das tabelas nas migrações em `supabase/migrations/`.

A organização do banco reflete a operação real do sistema escolar, com foco em:

- perfis de usuários
- estudantes e matrículas
- conselhos de classe
- relatórios acadêmicos
- ocorrências
- intervencções
- indicadores pedagógicos
- simulados e questões

## Documentação adicional

A pasta `docs/` contém materiais de planejamento e implementação do sistema, incluindo:

- dashboard pedagógico
- gestão de usuários
- módulo de conselho de classe
- prompts e especificações de implementação

## Observações importantes

- Este README representa o estado atual do projeto e não a versão inicial do módulo VQDT.
- O foco atual é a gestão escolar, acompanhamento pedagógico e operação de coordenação.
- Novos módulos e regras podem mudar com o tempo; a estrutura real do código deve ser considerada como fonte de verdade.

## Licença

Este projeto não define uma licença específica no repositório no momento. Consulte o proprietário do repositório para confirmar o uso e distribuição do código.


