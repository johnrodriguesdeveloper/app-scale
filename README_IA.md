# 📱 PROJETO: APP ESCALA (Contexto Mestre)

**Instrução para IA:** Este documento contém a verdade absoluta sobre o projeto. Use-o para entender a estrutura de arquivos, stack e status atual.

## 1. Stack Tecnológica
* **Framework:** React Native (Expo SDK 52)
* **Plataforma:** Web (Foco atual em dev), Android e iOS.
* **Roteamento:** Expo Router (File-based).
* **Estilo:** NativeWind (Tailwind CSS).
* **Backend:** Supabase (Auth, DB, Storage).
* **Libs Importantes:** `lucide-react-native`, `date-fns`, `expo-image-picker`.

## 2. Estrutura de Arquivos Atual (Mapeada via Print)
```text
/
├── app/
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (tabs)/
│   │   ├── departments/
│   │   │   ├── [id].tsx
│   │   │   └── member-list.tsx
│   │   ├── settings/
│   │   │   ├── _layout.tsx
│   │   │   ├── departments.tsx
│   │   │   ├── index.tsx
│   │   │   ├── my-scales.tsx
│   │   │   ├── schedule.tsx
│   │   │   └── settings.tsx
│   │   ├── availability/
│   │   │   └── routine.tsx
│   │   └── _layout.tsx (Configuração das Tabs)
│   ├── departments/  (Rotas fora das tabs?)
│   │   ├── _layout.tsx
│   │   ├── availability.tsx
│   │   ├── create-department.tsx
│   │   ├── create-roster.tsx
│   │   ├── department-leaders.tsx
│   │   ├── department-roster.tsx
│   │   ├── department-settings.tsx
│   │   ├── login.tsx
│   │   ├── onboarding.tsx
│   │   ├── profile.tsx (Edição de perfil)
│   │   ├── roster.tsx
│   │   └── signup.tsx
│   └── _layout.tsx (Root Layout)
├── src/
│   ├── hooks/
│   ├── lib/
│   │   └── supabase.ts (Config Auth Híbrida)
│   ├── services/
│   ├── types/
│   └── supabase/
├── assets/
├── components/
└── package.json
3. Status das Funcionalidades
✅ Funcionando:
Autenticação: Login e Cadastro via Supabase Auth.

Navegação: Abas e rotas configuradas.

Perfil: Leitura de dados e atualização de nome (profiles table).

Supabase Client: Configurado em src/lib/supabase.ts com persistência de sessão (LocalStorage na Web / AsyncStorage no Mobile).

🚧 Em Andamento / Pendente:
Escalas e Departamentos: Estrutura de arquivos criada, lógica sendo implementada.

🛑 Pausado / Problemas Conhecidos:
Upload de Foto de Perfil (profile.tsx):

Situação: O código de upload foi comentado/desativado.

Motivo: Erro persistente de CORS na Web (Access-Control-Allow-Origin), mesmo após adicionar localhost:8081 em Authentication > URL Configuration. O erro de rede mostra falha no método POST para o Storage.

Decisão: Funcionalidade congelada para focar no core business (escalas) e não travar o desenvolvimento. Retomar futuramente.

4. Configuração do Supabase
Tabela profiles: user_id (PK), full_name, avatar_url.

Bucket avatars: Público. Policies de SELECT, INSERT e UPDATE criadas.

Auth URL: http://localhost:8081 configurado como Site URL e Redirect URL.

5. Próximos Passos
Focar no desenvolvimento das telas de Departamentos e Escalas (app/departments/*).

Implementar a lógica de criação de escalas (create-roster.tsx).