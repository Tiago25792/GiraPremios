/* GiraPrêmios authentication integrations.
 * To enable Turnstile: configure the SECRET KEY in Supabase Auth CAPTCHA,
 * then add the matching PUBLIC site key below.
 * To enable Google: configure Google OAuth in Supabase and the
 * Google Cloud redirect URL, then change googleEnabled to true.
 * Never place CAPTCHA secret, OAuth client secret or service_role key here.
 */
export const authOptions={
 turnstileSiteKey:'',
 googleEnabled:false,
 minPasswordLength:8
};
