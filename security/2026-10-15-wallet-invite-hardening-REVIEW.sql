-- GiraPrêmios • Proteções de privilégios para carteiras, atividades e convites
-- PREPARADO EM 2026-10-15. NÃO EXECUTADO. Arquivo guardado para auditoria.
-- APLICAR SOMENTE APÓS REVER O RESULTADO DO ARQUIVO wallet-invite-audit.sql.
-- A segurança do saldo exige também checar a lógica INTERNA das RPCs.
--
-- MOTIVO PARA NÃO APLICAR ÀS CEGAS:
-- Algumas implementações usam funções SECURITY INVOKER, que dependem de
-- privilégios de tabela concedidos ao usuário. Se for o caso, a transação
-- abaixo falhará intencionalmente, sem revogar direitos parcialmente.
BEGIN;

-- Não executar se não existir a tríade exata de funções esperadas.
DO $gp$
DECLARE
  required_count integer;
  insecure_count integer;
BEGIN
  SELECT count(DISTINCT p.proname),
         count(*) FILTER (WHERE NOT p.prosecdef)
    INTO required_count, insecure_count
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public'
    AND p.proname IN ('ensure_member_wallet','claim_daily_reward','register_invite');

  IF required_count <> 3 THEN
    RAISE EXCEPTION 'GiraPrêmios: RPCs não encontradas; abortando sem alterações.';
  END IF;
  IF insecure_count > 0 THEN
    RAISE EXCEPTION 'GiraPrêmios: uma ou mais RPCs não usam SECURITY DEFINER; revise primeiro, sem bloquear o app.';
  END IF;
END
$gp$;

-- O saldo e o histórico só podem ser modificados por lógica server-side,
-- nunca por update direto enviado pelo navegador.
ALTER TABLE public.member_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_activities ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE
  ON TABLE public.member_wallets, public.member_activities
  FROM PUBLIC, anon, authenticated;

-- Usuários anônimos não precisam executar funções de crédito.
-- Este DO trata todas as sobrecargas existentes sem supor assinaturas.
DO $gp$
DECLARE
  f regprocedure;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.proname IN ('ensure_member_wallet','claim_daily_reward','register_invite')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;
END
$gp$;

-- NÃO concede INSERT/UPDATE direto nem faz ajustes de saldos existentes.
COMMIT;

-- OBRIGATÓRIO APÓS EXECUTAR:
-- Rodar a auditoria novamente e testar um login normal, um check-in,
-- o saldo antes/depois, convite genuíno e um membro não administrador.
-- Reexecutar testes de concorrência e idempotência das funções SQL.
