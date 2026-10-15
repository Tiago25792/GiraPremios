-- GiraPrêmios V2.5 — MIGRAÇÃO APLICADA NO SUPABASE DE PRODUÇÃO
-- Data: 2026-10-15
-- Projeto: osiieematlwzrvbttewu
-- Migration: girapremios_secure_verified_daily_checkin_v25
-- Objetivo: exigir e-mail confirmado e conta não anônima antes do bônus diário.
-- Preserva todos os saldos existentes e mantém 50 moedas e 1 giro por dia.
-- A atualização da carteira é atômica, com histórico no mesmo bloco transacional.
CREATE OR REPLACE FUNCTION public.claim_daily_reward()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
 v_user uuid := (select auth.uid());
 v_date date := (now() at time zone 'America/Sao_Paulo')::date;
 v_record public.member_wallets;
 v_claimed boolean := false;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Login necessário'; END IF;
 IF NOT EXISTS (
   SELECT 1 FROM auth.users
   WHERE id = v_user
     AND email_confirmed_at IS NOT NULL
     AND is_anonymous IS FALSE
 ) THEN
   RAISE EXCEPTION 'Confirme seu e-mail antes de receber o presente diário';
 END IF;
 INSERT INTO public.member_wallets(user_id,referral_code)
 VALUES(v_user,substr(md5(v_user::text),1,12))
 ON CONFLICT (user_id) DO NOTHING;
 UPDATE public.member_wallets SET
  coins=coins+50,spins=spins+1,last_daily_claim=v_date,updated_at=now()
 WHERE user_id=v_user AND (last_daily_claim IS NULL OR last_daily_claim < v_date)
 RETURNING * INTO v_record;
 IF FOUND THEN
  v_claimed:=true;
  INSERT INTO public.member_activities(user_id,kind,title,description,coins_delta)
  VALUES(v_user,'checkin','50 moedas ganhas','Bônus de visita diária',50),
        (v_user,'spin','Giro diário recebido','1 giro virtual acumulado',0);
  IF v_record.invited_by IS NOT NULL THEN
   UPDATE public.member_wallets SET coins=coins+5,updated_at=now() WHERE user_id=v_record.invited_by;
   INSERT INTO public.member_activities(user_id,kind,title,description,coins_delta)
   VALUES(v_record.invited_by,'invite_daily','Convidado voltou hoje','Bônus de participação diária de convidado',5);
  END IF;
 END IF;
 SELECT * INTO v_record FROM public.member_wallets WHERE user_id=v_user;
 RETURN jsonb_build_object('claimed',v_claimed,'coins',v_record.coins,'spins',v_record.spins,'invites',v_record.invites,'last_daily_claim',v_record.last_daily_claim);
END
$function$;
REVOKE EXECUTE ON FUNCTION public.claim_daily_reward() FROM public,anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_reward() TO authenticated;

-- VALIDAÇÃO APÓS APLICAÇÃO:
-- * claim_daily_reward: SECURITY DEFINER=true, anon EXECUTE=false, auth EXECUTE=true.
-- * Verificações de email_confirmed_at e is_anonymous presentes.
-- * 1 carteira, 50 moedas, 1 giro, 0 convites (sem alterações pelos testes).
-- * Histórico: 1 check-in, 1 giro.
-- * Não foram feitas operações de resgate nem utilizadas contas de usuário para testar.
