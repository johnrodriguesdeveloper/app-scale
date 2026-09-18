# Foto de perfil (avatar) — upload e exibição

## Contexto

O schema `profiles` já tem a coluna `avatar_url` (nullable) e vários hooks de
departamento (`useDepartmentDetails`, `useMemberList`, `useDepartmentLeaders`,
`useDepartmentRosterGrid`) já buscam esse campo do banco, mas nenhuma tela
usa o valor — todas mostram só a inicial do nome num círculo colorido. A
página de perfil já tem a UI de avatar (via `next/image`) só que o botão de
troca está desabilitado ("Alteração de foto temporariamente indisponível").

Uma versão anterior deste projeto (Expo/React Native, commit `65e60ab`) já
implementou upload de avatar usando um bucket do Supabase Storage chamado
`avatars`, com caminho `<user_id>/<timestamp>.<ext>`. O usuário confirmou que
esse bucket **já existe** no projeto Supabase atual. O `next.config.ts` já
libera `remotePatterns` para esse domínio de storage, confirmando que isso
foi planejado.

## Objetivo

1. Permitir que a pessoa logada troque sua foto de perfil pela página
   `/profile`.
2. Mostrar essa foto (em vez da inicial) em qualquer lugar do app que hoje
   exibe o círculo de inicial de outro membro: prévia de membros do
   departamento, lista completa de membros, e lista de líderes.

## Fora de escopo

- Recorte/zoom interativo da imagem — o círculo do avatar já corta
  visualmente com `object-cover`; redimensionar no navegador é suficiente.
- Exibir avatares no grid de escala (roster) ou no `AddMemberModal` — essas
  telas hoje não exibem nem inicial, não vamos introduzir isso agora.
- Remover a foto (voltar para inicial) — pode ser um pedido futuro; hoje só
  cobrimos "trocar" a foto.

## Arquitetura

```
[profile/page.tsx]
   clica no avatar → <input type="file"> → arquivo selecionado
        │
        ▼
[useProfile.ts: uploadAvatarMutation]
   1. valida tipo (jpeg/png/webp) e tamanho bruto (≤ 8MB)
   2. resizeImage(file) → canvas, maior lado ≤ 512px, export JPEG q=0.8
   3. supabase.storage.from("avatars").upload(
        `${user.id}/avatar.jpg`, blob, { upsert: true, contentType: "image/jpeg" })
   4. publicUrl = getPublicUrl(...) + "?v=" + Date.now()   // cache-busting
   5. update profiles.avatar_url = publicUrl where user_id = user.id
        │
        ▼
   invalidateQueries(["profile"]) → UI re-renderiza com a nova foto
```

Como `avatar_url` já é selecionado pelos hooks de departamento, nenhuma
query precisa mudar — só o markup que renderiza o círculo.

## Storage: bucket e políticas

O bucket `avatars` já existe. Antes de escrever a migration, o primeiro
passo da implementação é inspecionar as políticas atuais de
`storage.objects` para esse bucket (via SQL/dashboard do Supabase) para não
duplicar o que já existe — mesmo cuidado tomado em
`20260825_push_notifications.sql`.

A migration (idempotente, só adiciona o que faltar) deve garantir:

- **Leitura pública**: qualquer pessoa (mesmo anônima) pode ler objetos do
  bucket `avatars` — necessário para as fotos aparecerem para outros
  membros via URL pública.
- **Escrita restrita ao dono**: `insert`/`update`/`delete` em
  `storage.objects` do bucket `avatars` só é permitido quando
  `auth.uid()::text = (storage.foldername(name))[1]` — ou seja, cada
  usuário só mexe em `avatars/<seu_user_id>/...`.

## Estratégia de arquivo

Nome fixo por usuário: `avatars/<user_id>/avatar.jpg`, sempre com
`upsert: true`. Trocar a foto sobrescreve o arquivo anterior — não acumula
lixo no storage. Como a URL pública não muda de nome, usamos um parâmetro
`?v=<timestamp>` salvo junto no `avatar_url` para evitar que o navegador
sirva uma versão em cache do arquivo antigo.

## Upload — implementação

- **`src/lib/image.ts`** (novo): `resizeImage(file: File): Promise<Blob>` —
  carrega a imagem num `<canvas>`, redimensiona mantendo proporção (maior
  lado ≤ 512px), exporta como JPEG qualidade 0.8. Função pura, sem
  dependência do React, fácil de testar isoladamente.
- **`useProfile.ts`**: novo `uploadAvatarMutation` (mesmo padrão do
  `saveMutation` existente):
  - valida tipo (`image/jpeg`, `image/png`, `image/webp`) e tamanho bruto
    (≤ 8MB) antes de processar; erro claro via `showModal("error", ...)` se
    falhar.
  - chama `resizeImage`, faz upload, atualiza `avatar_url`.
  - `onSuccess`: invalida `["profile"]` (mesma queryKey do save de perfil).
  - expõe `uploadingAvatar` (estado de loading) e `handleAvatarChange(file)`.
- **`profile/page.tsx`**: substitui o texto "(Alteração de foto
  temporariamente indisponível)" por um botão com ícone de câmera
  sobreposto ao avatar, que abre um `<input type="file" accept="image/*"
  className="hidden">`. Ao selecionar um arquivo, chama
  `handleAvatarChange`; mostra spinner enquanto `uploadingAvatar` for
  `true`.

## Exibição — componente compartilhado

Novo componente **`src/components/MemberAvatar.tsx`**, construído sobre as
primitivas shadcn/radix já existentes e não usadas em
`src/components/ui/avatar.tsx` (`Avatar`, `AvatarImage`, `AvatarFallback`):

```tsx
<MemberAvatar avatarUrl={...} name={...} size="sm" | "default" | "lg" />
```

Renderiza a foto quando `avatarUrl` existe; cai para a inicial do `name`
(mesma lógica hoje duplicada em cada tela) quando não existe ou a imagem
falha ao carregar. Substitui o círculo manual de inicial em:

- [`profile/page.tsx`](../../../src/app/(authenticated)/(member)/profile/page.tsx) — já tem lógica própria de avatar; passa a usar o componente.
- [`(tabs)/page.tsx`](../../../src/app/(authenticated)/(member)/(tabs)/page.tsx) — header da home.
- [`departments/[id]/page.tsx`](../../../src/app/(authenticated)/(member)/departments/[id]/page.tsx) — prévia de membros.
- [`departments/[id]/members/page.tsx`](../../../src/app/(authenticated)/(member)/departments/[id]/members/page.tsx) — lista completa de membros.
- [`departments/[id]/leaders/page.tsx`](../../../src/app/(authenticated)/(member)/departments/[id]/leaders/page.tsx) — lista de possíveis líderes e líderes atuais.

Cada tela só troca o markup do círculo — tamanhos, cores de fundo e layout
ao redor continuam os mesmos.

## Erros e casos de borda

- Upload falho (rede, tipo inválido, arquivo grande demais): mostra alerta,
  `avatar_url` não é alterado.
- Membro sem `avatar_url`: sempre cai no fallback de inicial.
- `next.config.ts` já libera o domínio de storage para `next/image`, então
  nenhuma mudança de config é necessária.

## Testes

- Verificação manual do fluxo de upload no navegador, se houver credencial
  de teste disponível (login real necessário — Supabase Auth).
- Checagem visual do fallback (sem `avatar_url`) e do estado de erro com
  dados simulados, como feito na correção de responsividade anterior nesta
  mesma sessão (repro isolado com Tailwind).
- `tsc --noEmit` e `eslint` nos arquivos alterados antes de finalizar.
