-- GiraPrêmios • Auditoria somente-leitura para a segurança dos saldos e convites
-- DATA: 2026-10-15
-- NÃO ALTERA O BANCO. Executar no SQL Editor do projeto correto
-- https://supabase.com/dashboard/project/osiieematlwzrvbttewu/sql
--
-- 1. Confirma se as funções de negócio existem e são SECURITY DEFINER.
SELECT p.proname AS funcao,
       pg_get_function_identity_arguments(p.oid) AS parametros,
       p.prosecdef AS security_definer,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_executa,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS logado_executa
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public'
AND p.proname IN ('ensure_member_wallet','claim_daily_reward','register_invite')
ORDER BY p.proname;

-- 2. Regras de proteção e privilégios efetivos.
SELECT c.relname AS tabela, c.relrowsecurity AS rls_ativo,
       has_table_privilege('anon', c.oid, 'UPDATE') AS anon_altera,
       has_table_privilege('authenticated', c.oid, 'UPDATE') AS usuario_altera,
       has_table_privilege('authenticated', c.oid, 'INSERT') AS usuario_insere,
       has_table_privilege('authenticated', c.oid, 'DELETE') AS usuario_exclui
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public'
AND c.relname IN ('member_wallets','member_activities','admin_members','reward_redemptions');

-- 3. Inspecionar políticas de leitura e escrita por tabela.
SELECT tablename,policyname,cmd,roles,qual,with_check
FROM pg_policies
WHERE schemaname='public'
AND tablename IN ('member_wallets','member_activities','admin_members','reward_redemptions')
ORDER BY tablename,policyname;

-- 4. Confirmação de índices únicos e constraints sem expor dados pessoais.
SELECT conrelid::regclass AS tabela,conname,
       pg_get_constraintdef(oid) AS regra
FROM pg_constraint
WHERE connamespace='public'::regnamespace
AND conrelid IN ('public.member_wallets'::regclass,'public.member_activities'::regclass)
ORDER BY conrelid::text,conname;

-- 5. Verificar se a fonte SQL das RPCs implementa, NO SERVIDOR:
--    * auth.uid() verificado em cada chamada;
--    * validação de e-mail confirmado antes de premiar convites;
--    * registro único por convidado (não por clique);
--    * travamento transacional da carteira nas operações de crédito;
--    * 1 bônus diário por dia no fuso definido;
--    * ausência de bypass por contas antigas ou convites próprios;
--    * registro consistente de moedas + histórico na mesma transação.
-- IMPORTANTE: privilégios corretos, por si só, não provam que esses casos estão protegidos.
SELECT p.proname, pg_get_functiondef(p.oid) AS definicao_para_revisao
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
AND p.proname IN ('ensure_member_wallet','claim_daily_reward','register_invite')
ORDER BY p.proname;
