# App SaaS de Gestão de Escalas para Igrejas

Sistema multi-tenancy para gestão de escalas de departamentos de igrejas, desenvolvido com Expo, TypeScript, NativeWind e Supabase.

## 🚀 Stack Tecnológica

- **Mobile:** Expo SDK 52+, Expo Router, TypeScript
- **UI:** NativeWind v4 (TailwindCSS), Lucide Icons
- **Backend:** Supabase (Auth, Postgres, RLS, Edge Functions)

## 📋 Funcionalidades Principais

### 1. Funções/Habilidades Dinâmicas
- Cada departamento possui funções específicas (ex: Louvor > Baixo, Guitarra; Diáconos > Portaria)
- Líderes podem criar e gerenciar funções
- Membros podem ter múltiplas funções no mesmo departamento
- Filtro por função na criação de escalas

### 2. Prazo de Disponibilidade (Deadlines)
- Cada departamento tem um "Dia Limite" (1-31) para envio da disponibilidade
- O app bloqueia o envio/edição da disponibilidade após o prazo no mês corrente

### 3. Dashboard Imediata
- Home mostra "Minhas Próximas Escalas"
- Calendário visual simplificado com indicadores de escalas
- Botão de ação rápida para informar disponibilidade

### 4. Gestão de Escalas
- Criação de escalas com filtro por função
- Validação automática de disponibilidade
- Prevenção de conflitos com departamentos de maior prioridade

## 📁 Estrutura do Projeto

```
.
├── app/                    # Rotas do Expo Router
│   ├── (tabs)/            # Telas com navegação por tabs
│   │   ├── index.tsx      # Dashboard (Home)
│   │   ├── calendar.tsx   # Calendário de escalas
│   │   ├── departments.tsx # Lista de departamentos
│   │   └── settings.tsx   # Configurações
│   ├── availability.tsx   # Tela de disponibilidade
│   ├── create-roster.tsx  # Criar nova escala
│   └── department-settings.tsx # Configurações do departamento
├── src/
│   ├── hooks/
│   │   └── useDeadlineCheck.ts # Hook para verificar prazo
│   ├── lib/
│   │   └── supabase.ts    # Cliente Supabase
│   └── services/
│       └── rosterService.ts # Serviços de escalas
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql # Schema completo do banco
│       └── 002_get_available_members_by_function.sql # Função RPC
└── package.json
```

## 🗄️ Schema do Banco de Dados

### Tabelas Principais

- **organizations**: Organizações (multi-tenancy)
- **profiles**: Perfis de usuários com role na organização
- **departments**: Departamentos hierárquicos com `availability_deadline_day`
- **department_functions**: Funções/habilidades de cada departamento
- **member_functions**: Relação N:N (membros podem ter múltiplas funções)
- **department_members**: Membros de departamentos com roles (leader/member)
- **availability**: Disponibilidade dos membros por data
- **rosters**: Escalas criadas com função específica

### Row Level Security (RLS)

Todas as tabelas possuem políticas RLS configuradas:
- Usuários veem apenas dados de suas organizações
- Líderes podem gerenciar seus departamentos
- Membros podem gerenciar apenas sua própria disponibilidade

## 🔧 Configuração

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Supabase

1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute as migrations na ordem:
   ```sql
   -- Execute primeiro
   supabase/migrations/001_initial_schema.sql
   
   -- Execute depois
   supabase/migrations/002_get_available_members_by_function.sql
   ```

3. Configure as variáveis de ambiente no `app.json`:
   ```json
   "extra": {
     "supabaseUrl": "YOUR_SUPABASE_URL",
     "supabaseAnonKey": "YOUR_SUPABASE_ANON_KEY"
   }
   ```

### 3. Executar o App

```bash
npm start
```

## 📱 Principais Componentes

### Hook `useDeadlineCheck`

Verifica se o usuário ainda pode editar a disponibilidade baseado no prazo do departamento.

```typescript
const deadlineCheck = useDeadlineCheck(departmentId, organizationId);

// deadlineCheck.canEdit - se pode editar
// deadlineCheck.isPastDeadline - se passou do prazo
// deadlineCheck.daysRemaining - dias restantes
```

### Função RPC `get_available_members_by_function`

Busca membros disponíveis aplicando todas as regras:
- Membros do departamento
- Com a função especificada
- Disponíveis na data
- Sem conflito com departamentos de maior prioridade

```typescript
const members = await getAvailableMembersByFunction(
  organizationId,
  departmentId,
  functionId,
  date
);
```

## 🎯 Fluxos Principais

### 1. Informar Disponibilidade
1. Usuário acessa a tela de disponibilidade
2. Sistema verifica o deadline do departamento
3. Se dentro do prazo, permite edição
4. Se fora do prazo, bloqueia e mostra mensagem

### 2. Criar Escala (Líder)
1. Líder seleciona data e departamento
2. Seleciona a função a preencher
3. Sistema lista apenas membros:
   - Do departamento
   - Com a função selecionada
   - Disponíveis na data
   - Sem conflito de prioridade
4. Líder seleciona o membro e cria a escala

### 3. Gestão de Funções (Líder)
1. Líder acessa configurações do departamento
2. Pode adicionar/remover funções
3. Pode atribuir funções aos membros (múltiplas por membro)

## 🔐 Segurança

- **RLS (Row Level Security)**: Todas as tabelas protegidas
- **Autenticação**: Supabase Auth integrado
- **Validações**: Constraints no banco e validações no app
- **Multi-tenancy**: Isolamento completo por organização

## 📝 Próximos Passos

- [ ] Implementar seleção de data no calendário
- [ ] Adicionar notificações push
- [ ] Implementar exportação de escalas
- [ ] Adicionar relatórios e estatísticas
- [ ] Melhorar UI/UX com animações

## 📄 Licença

Este projeto é privado e proprietário.


TODO 

- [ ] Membro só preenche disponibilidade da escala para proximo mês 
- [ ] Não aparece domingo EBD no calendario
- [ ] Botões de voltar indo para tela inicial
- [ ] Melhorar UI/UX (Header, cores, etc)
- [ ] Mais de uma função por membro
- [ ] Equipes do Departamento infantil