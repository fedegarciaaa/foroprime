# ForoPrime

> Comunidad moderna de subforos al estilo Reddit. **Next.js 15 + Supabase + TailwindCSS**, lista para producción en Vercel.

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%2017-3ECF8E)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6)](https://www.typescriptlang.org)

## Características

- **Auth** — Email + password y Google OAuth via Supabase Auth (cookies httpOnly, SSR).
- **Subforos, posts y comentarios anidados** — hasta 8 niveles, ordenados con `ltree`.
- **Votos** con UI optimista (`useOptimistic` + Server Actions) y trigger SQL que mantiene `score` denormalizado.
- **Búsqueda full-text en español** vía `tsvector` + GIN, con highlight (`ts_headline`).
- **Modo oscuro** (`next-themes`) con preferencia del sistema.
- **Seguridad por defecto** — Row Level Security en todas las tablas, sanitización HTML server-side, rate limiting con Upstash, headers CSP/HSTS.
- **Roles** — `user`, `moderator`, `admin` con políticas RLS basadas en función `is_moderator`.
- **Markdown básico** seguro: negrita, cursiva, código, listas, citas, enlaces (sin scripts).
- **Responsive** y **accesible** (Radix UI primitives, focus visible, aria labels).

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 · React 19 · TypeScript strict |
| Estilos | TailwindCSS v4 + tokens OKLCH |
| Componentes | Radix UI primitives + estética shadcn/ui |
| Base de datos | Supabase Postgres 17 (citext, ltree, pg_trgm, FTS) |
| Auth | Supabase Auth (`@supabase/ssr`) |
| Validación | Zod (compartido cliente/servidor) |
| Sanitización | isomorphic-dompurify + parser markdown propio |
| Rate limiting | Upstash Redis (HTTP, serverless-friendly) |
| Despliegue | Vercel |

## Decisiones técnicas clave

1. **Server Actions + RLS, no API Routes.** Toda mutación pasa por una Server Action server-side y la autorización vive en políticas RLS de Postgres. Resultado: imposible saltarse permisos desde el cliente, una única fuente de verdad de seguridad, menos boilerplate.
2. **Sanitización en `INSERT`, no en render.** El `body_html` se sanitiza con allowlist estricta antes de persistir; al renderizar se confía en el contenido ya seguro. Esto evita re-procesar en cada lectura y blinda contra XSS.
3. **`comment_count` y `score` denormalizados.** Triggers SQL los recalculan en cada INSERT/UPDATE/DELETE. Permite ordenar por populares sin agregaciones costosas.
4. **`ltree` para árbol de comentarios.** Una sola query devuelve el hilo completo ordenado y permite contraer subárboles sin queries recursivas.
5. **Sin Docker local.** El dev server local apunta directamente a la Supabase online — evita drift de schema y refleja exactamente producción.
6. **Tipos generados desde la DB** son la fuente de verdad. `npm run db:types` regenera `types/database.ts`.

---

## Setup local

### 1. Requisitos
- Node.js 20+
- Cuenta Supabase (free tier basta) — ya hay un proyecto creado: `foroprime`.
- Cuenta Upstash (opcional en dev, obligatorio en producción).

### 2. Clonar e instalar

```bash
git clone <url-del-repo> ForoPrime
cd ForoPrime
npm install
```

### 3. Variables de entorno

```bash
cp .env.local.example .env.local
```

Rellenar con los valores del proyecto Supabase (Dashboard → Project Settings → API):

```env
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...   # SOLO server-side, nunca exponer
SUPABASE_PROJECT_ID=<ref>

UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...

NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> Sin Upstash: el rate limiting funcionará en modo no-op (siempre permite). Útil en local; obligatorio en producción.

### 4. Aplicar migraciones (si es un entorno nuevo)

Las migraciones SQL están en `supabase/migrations/`. Aplicarlas en orden:

```bash
# Opción A: Supabase CLI
npx supabase link --project-ref <ref>
npx supabase db push

# Opción B: copiar/pegar cada .sql en Dashboard → SQL Editor
```

### 5. Configurar Google OAuth

1. Crear OAuth client en [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Authorized redirect URI: `https://<ref>.supabase.co/auth/v1/callback`.
3. Pegar `Client ID` y `Client Secret` en Supabase Dashboard → Authentication → Providers → Google.
4. En Supabase Dashboard → Authentication → URL Configuration:
   - Site URL: `http://localhost:3000` (o el dominio de producción)
   - Additional redirect URLs: añadir `http://localhost:3000/auth/callback` y el equivalente de producción.

### 6. Generar tipos (cuando cambies el schema)

```bash
npm run db:types
```

### 7. Levantar dev server

```bash
npm run dev
```

→ http://localhost:3000

---

## Scripts

| Script | Descripción |
|---|---|
| `npm run dev` | Dev server con HMR |
| `npm run build` | Build de producción |
| `npm run start` | Servir build local |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier write |
| `npm run db:push` | Aplicar migraciones a Supabase |
| `npm run db:types` | Regenerar `types/database.ts` |

---

## Despliegue en Vercel

1. Push a GitHub.
2. **Import project** en [vercel.com/new](https://vercel.com/new), seleccionar el repo.
3. Framework preset: **Next.js** (autodetectado).
4. **Environment Variables** — copiar las del `.env.local` (Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `NEXT_PUBLIC_SITE_URL` → tu dominio Vercel (`https://foroprime.vercel.app`)
5. Deploy.
6. **Volver a Supabase Dashboard → Auth → URL Configuration**:
   - Site URL: `https://foroprime.vercel.app`
   - Redirect URLs: añadir `https://foroprime.vercel.app/auth/callback`.

---

## Estructura del proyecto

```
ForoPrime/
├── app/
│   ├── (app)/                    # Rutas del foro (con navbar/sidebar)
│   │   ├── layout.tsx            # Navbar + Sidebar + Footer
│   │   ├── page.tsx              # Home / hero para no autenticados
│   │   ├── s/[slug]/             # Subforo + crear post
│   │   ├── p/[id]/[slug]/        # Detalle de post + comentarios
│   │   ├── u/[username]/         # Perfil público
│   │   ├── ajustes/              # Editar perfil propio
│   │   └── buscar/               # Búsqueda FTS
│   ├── (auth)/                   # Auth pages (sin navbar)
│   │   ├── login/
│   │   ├── registro/
│   │   └── auth/callback/        # OAuth callback (route handler)
│   ├── globals.css               # Tokens OKLCH + tipografía prose-fp
│   └── layout.tsx                # ThemeProvider, Toaster, metadata
├── components/
│   ├── ui/                       # Primitives (Button, Input, Card, …)
│   ├── nav/                      # Navbar, Sidebar, ThemeToggle, UserMenu
│   ├── post/                     # PostCard, VoteButtons, loader
│   ├── comment/                  # CommentTree (recursivo), CommentForm
│   └── theme-provider.tsx
├── lib/
│   ├── supabase/                 # client / server / middleware / admin
│   ├── actions/                  # Server Actions: auth, posts, comments, votes, profile
│   ├── validators/               # Esquemas Zod
│   ├── ratelimit.ts              # Upstash + modo no-op en dev
│   ├── sanitize.ts               # markdown → HTML safe (allowlist)
│   └── utils.ts                  # cn, slugify, formatRelativeEs, getClientIp
├── supabase/migrations/
│   ├── 0001_init_schema.sql      # tablas + índices (FTS, ltree, trigram)
│   ├── 0002_rls_policies.sql     # políticas RLS por tabla
│   ├── 0003_functions_triggers.sql # handle_new_user, scores, vote_post, search_posts
│   └── 0004_seed_subforums.sql
├── types/database.ts             # Tipos generados desde la DB
├── middleware.ts                 # Refresca sesión Supabase en cada request
├── next.config.ts                # Headers de seguridad (CSP/HSTS/Permissions-Policy)
├── tailwind.config.ts            # (auto en v4 vía PostCSS)
└── tsconfig.json                 # strict + noUncheckedIndexedAccess
```

---

## Modelo de datos

```
auth.users  ─1:1─►  profiles (username único, role, bio, avatar)
                         │
                         ├──► posts        (subforum_id, author_id, body_md/html, score, search_vector)
                         │       │
                         │       └──► comments  (parent_id, path ltree, depth, score)
                         │
                         └──► votes        (user_id × (post_id XOR comment_id), value ∈ {-1,1})

subforums (slug único, role-gated insert/update via RLS)
```

**Índices clave**: GIN en `search_vector`, GIST en `path` (ltree), parciales `WHERE deleted_at IS NULL` en hot paths.

---

## Seguridad

| Riesgo | Mitigación |
|---|---|
| XSS | Sanitización server-side con DOMPurify + allowlist estricta. `body_html` se calcula al insertar y nunca confía en cliente. |
| CSRF | Server Actions de Next.js validan origin. Cookies de sesión `SameSite=Lax httpOnly Secure`. |
| SQL injection | Solo queries parametrizadas via Supabase JS o RPC. Nada de string concat. |
| Autorización | RLS en cada tabla. Sin policy = sin acceso. Service role key nunca expuesta al cliente. |
| Rate limiting | Upstash sliding-window: login 5/min, post 10/h, comment 30/h, vote 60/min, search 30/min. |
| Auto-voto | Policy en `votes` cruza con autor del target y rechaza `user_id = author_id`. |
| Username squatting | `citext` único + regex; trigger maneja colisiones OAuth con sufijo numérico. |
| Headers | CSP, X-Frame-Options DENY, HSTS preload, Referrer-Policy, Permissions-Policy en `next.config.ts`. |

---

## Verificación end-to-end

1. **Auth**: registrar email → confirmar → login. Login con Google → callback OK → perfil creado.
2. **Crear post** desde `/s/general/crear` → aparece en listado y detalle.
3. **Comentario anidado**: comentar → responder → ver árbol.
4. **Voto**: arriba/abajo en post y comentario → score actualiza optimistic y persiste.
5. **Búsqueda**: `/buscar?q=palabra` → resultados con highlight.
6. **RLS**: intentar editar post de otro usuario via DevTools → 403/policy violation.
7. **Auto-voto**: votar tu propio post → policy rechaza.
8. **Rate limit**: 11 posts seguidos → la #11 muestra "demasiado rápido".
9. **Modo oscuro**: toggle persiste.
10. **Responsive**: 375px y 1440px.
11. **XSS**: pegar `<script>alert(1)</script>` en un post → render no ejecuta.
12. `npm run typecheck` y `npm run build` sin errores.

---

## Roadmap (fase 2)

- Notificaciones realtime (Supabase Realtime)
- Reputación calculada
- Reportes y cola de moderación
- Sistema de baneos
- Follow de usuarios y subforos
- Feed personalizado y trending (hot score)
- Mensajes directos
- i18n
- PWA / instalable

## Licencia

MIT
