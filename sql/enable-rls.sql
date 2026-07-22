-- =============================================================================
-- Situação A — Habilitar Row-Level Security (RLS) em todas as tabelas do schema
-- public, SEM policies (nega todo acesso pela API de dados do Supabase / anon key).
--
-- POR QUE ISSO É SEGURO PARA O APP:
-- O servidor Express conecta no banco como o papel `postgres` (via DATABASE_URL),
-- que tem o atributo BYPASSRLS e IGNORA o RLS. Todo o acesso a dados do sistema
-- passa por ele. O RLS só bloqueia os papéis públicos `anon` e `authenticated`,
-- que são justamente os que um atacante usaria com a anon key — e o app não usa.
--
-- COMO RODAR: Supabase → SQL Editor → cole tudo → Run. É idempotente (pode rodar
-- de novo sem erro).
-- =============================================================================

-- ── 1. Habilita RLS nas 12 tabelas do projeto ────────────────────────────────
alter table public.organizations   enable row level security;
alter table public.users           enable row level security;
alter table public.people          enable row level security;
alter table public.intermediaries  enable row level security;
alter table public.vehicles        enable row level security;
alter table public.vehicle_images  enable row level security;
alter table public.expenses        enable row level security;
alter table public.store_expenses  enable row level security;
alter table public.coupons         enable row level security;
alter table public.support_tickets enable row level security;
alter table public.audit_logs      enable row level security;
alter table public.app_settings    enable row level security;

-- ── 2. Rede de segurança: habilita RLS em QUALQUER tabela do public ───────────
-- Pega qualquer tabela que tenha escapado da lista acima (ou criada no futuro).
-- Rodar isto sozinho já resolveria tudo; a lista explícita acima é só para
-- deixar claro o que está sendo protegido.
do $$
declare r record;
begin
  for r in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security;', r.tablename);
  end loop;
end $$;

-- ── 3. VERIFICAÇÃO: nenhuma linha pode vir com rls_enabled = false ────────────
-- Rode isto depois e confira: todas as tabelas devem aparecer com TRUE.
select tablename, rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
order by rowsecurity asc, tablename;
