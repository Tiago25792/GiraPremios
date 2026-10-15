import {db,identity,navigateToRole} from './app-config.js?v=22';
import {authOptions} from './auth-config-v22.js?v=22';
const $=id=>document.getElementById(id);
const page=document.body.dataset.authPage;
const MIN_PASSWORD=authOptions.minPasswordLength||8;
let captchaToken='',captchaWidget=null,captchaEnabled=Boolean(authOptions.turnstileSiteKey),captchaReady=!captchaEnabled;
const url=new URL(location.href);
const refFromUrl=url.searchParams.get('ref');
if(refFromUrl&&/^[0-9a-f]{12}$/.test(refFromUrl)){try{localStorage.setItem('gp_referral_pending',refFromUrl)}catch{}}
const safeRef=()=>{try{const val=localStorage.getItem('gp_referral_pending');return /^[0-9a-f]{12}$/.test(val||'')?val:''}catch{return''}};
const landing=()=>{
 const u=new URL('./boas-vindas.html',location.href);
 const referral=safeRef();if(referral)u.searchParams.set('ref',referral);
 return u.href;
};
const status=(message,kind='',target='feedback')=>{
 const node=$(target);if(!node)return;
 node.textContent=message;
 node.className='auth-feedback'+(kind?' '+kind:'');
 node.hidden=!message;
};
function busy(id,active,defaultText,working){
 const el=$(id);if(el){el.disabled=active;el.textContent=active?working:defaultText}
}
function showLink(name,target){
 const a=$(name);if(a)a.href=target;
}
function revealPassword(){
 for(const button of document.querySelectorAll('[data-reveal]')){
  button.addEventListener('click',()=>{
   const input=$(button.dataset.reveal);if(!input)return;
   const was=input.type==='password';input.type=was?'text':'password';
   button.textContent=was?'🙈':'👁';
   button.setAttribute('aria-label',was?'Ocultar senha':'Mostrar senha');
   button.setAttribute('aria-pressed',String(was));
  });
 }
}
function ensureCaptcha(){
 if(!captchaEnabled)return Promise.resolve();
 const box=$('turnstileSlot'),region=$('captchaRegion');
 if(!box||!region)return Promise.resolve();
 region.hidden=false;
 const preview=$('securityPreview');if(preview)preview.hidden=true;
 const key=authOptions.turnstileSiteKey;
 return new Promise((resolve)=>{
  const timeout=setTimeout(()=>{captchaReady=false;status('A proteção de segurança está demorando para carregar. Verifique a conexão e atualize a página.','error');resolve()},14000);
  function done(){clearTimeout(timeout);resolve()}
  const init=()=>{
   if(!window.turnstile){captchaReady=false;done();return}
   try{
    captchaWidget=window.turnstile.render(box,{
      sitekey:key,theme:'light',language:'pt-BR',
      callback:(token)=>{captchaToken=token;captchaReady=true},
      'expired-callback':()=>{captchaToken='';captchaReady=true},
      'error-callback':()=>{captchaToken='';captchaReady=false;status('Não foi possível verificar a segurança. Atualize a página.','error')}
    });
    captchaReady=true;
   }catch(error){captchaReady=false;status('Não foi possível carregar a verificação de segurança.','error')}
   done();
  };
  if(window.turnstile){init();return}
  const script=document.createElement('script');
  script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.async=true;script.defer=true;
  script.onload=init;script.onerror=()=>{captchaReady=false;status('Verificação indisponível. Tente novamente em alguns instantes.','error');done()};
  document.head.appendChild(script);
 });
}
function captchaSettings(){
 if(!captchaEnabled)return {};
 if(!captchaReady||!captchaToken){
  status('Conclua a verificação de segurança para continuar.','error');
  return null;
 }
 return {captchaToken};
}
function resetCaptcha(){
 if(!captchaEnabled)return;
 captchaToken='';
 try{if(window.turnstile&&captchaWidget!==null)window.turnstile.reset(captchaWidget)}catch{}
}
async function afterLogin(){
 const info=await identity();
 if(info.error||!info.role){status('Sessão iniciada, mas não foi possível verificar sua área. Atualize a página.','error');return}
 navigateToRole(info.role);
}
async function signup(event){
 event.preventDefault();
 const full_name=$('fullName').value.trim();
 const email=$('email').value.trim().toLowerCase();
 const password=$('password').value;
 if(full_name.length<2||full_name.length>70){status('Informe seu nome com 2 a 70 caracteres.','error');return}
 if(password.length<MIN_PASSWORD){status('A senha precisa ter pelo menos '+MIN_PASSWORD+' caracteres.','error');return}
 const captcha=captchaSettings();if(captcha===null)return;
 busy('signupSubmit',true,'Criar conta gratuitamente ›','Criando conta...');
 try{
  const {data,error}=await db.auth.signUp({
   email,password,options:{data:{full_name},emailRedirectTo:landing(),...captcha}
  });
  if(error)throw error;
  if(data?.session){location.assign(landing());return}
  location.assign('./boas-vindas.html?etapa=email'+(safeRef()?'&ref='+encodeURIComponent(safeRef()):''));
 }catch(error){status('Não foi possível criar a conta: '+(error.message||'tente novamente mais tarde'),'error');resetCaptcha()}
 finally{busy('signupSubmit',false,'Criar conta gratuitamente ›','Criando conta...')}
}
async function signin(event){
 event.preventDefault();
 const email=$('email').value.trim().toLowerCase(),password=$('password').value;
 const captcha=captchaSettings();if(captcha===null)return;
 busy('loginSubmit',true,'Entrar agora ›','Entrando...');
 try{
  const {error}=await db.auth.signInWithPassword({email,password,...(captchaEnabled?{options:captcha}:{})});
  if(error)throw error;
  status('Acesso confirmado. Abrindo sua área...','success');
  await afterLogin();
 }catch(error){status('Não foi possível entrar: '+(error.message||'confira seu e-mail e senha'),'error');resetCaptcha()}
 finally{busy('loginSubmit',false,'Entrar agora ›','Entrando...')}
}
async function googleSignIn(){
 if(!authOptions.googleEnabled){status('O login com Google ainda está em configuração. Use seu e-mail e senha por enquanto.');return}
 const captcha=captchaSettings();if(captcha===null)return;
 try{
  const {error}=await db.auth.signInWithOAuth({provider:'google',options:{redirectTo:landing(),...(captchaEnabled?{captchaToken:captcha.captchaToken}:{})}});
  if(error)throw error;
 }catch(error){status('Não foi possível entrar com Google: '+(error.message||'tente novamente'),'error')}
}
async function requestRecovery(event){
 event.preventDefault();
 const email=$('email').value.trim().toLowerCase();
 const captcha=captchaSettings();if(captcha===null)return;
 busy('resetSubmit',true,'Enviar instruções para meu e-mail ›','Enviando...');
 try{
  const redirectTo=new URL('./recuperar.html?modo=nova',location.href).href;
  const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo,...captcha});
  if(error)throw error;
  status('Se este e-mail tiver uma conta, enviaremos instruções para redefinir a senha. Confira também o spam.','success');
 }catch(error){status('Não foi possível solicitar recuperação: '+(error.message||'tente novamente'),'error');resetCaptcha()}
 finally{busy('resetSubmit',false,'Enviar instruções para meu e-mail ›','Enviando...')}
}
async function newPassword(event){
 event.preventDefault();
 const password=$('password').value;
 if(password.length<MIN_PASSWORD){status('Use uma senha com pelo menos '+MIN_PASSWORD+' caracteres.','error');return}
 busy('savePassword',true,'Salvar nova senha ›','Salvando...');
 try{
  const {error}=await db.auth.updateUser({password});
  if(error)throw error;
  status('Senha alterada com sucesso. Você pode continuar na sua conta.','success');
  $('newPasswordForm').hidden=true;
  $('afterRecovery').hidden=false;
 }catch(error){status('Não foi possível mudar sua senha: '+(error.message||'tente novamente'),'error')}
 finally{busy('savePassword',false,'Salvar nova senha ›','Salvando...')}
}
async function welcome(){
 const account=await identity();
 const confirmed=Boolean(account.user);
 const emailPending=url.searchParams.get('etapa')==='email';
 const confirm=$('confirmTitle'),description=$('confirmDescription'),button=$('startButton');
 const icon=$('successIcon'),notes=$('successNote');
 const artworkMark=$('welcomeMark');
 if(confirmed){
  const name=(account.user.user_metadata?.full_name||'').trim().split(/\s+/)[0];
  confirm.textContent=name?'Conta confirmada, '+name+'!':'Sua conta está pronta!';
  description.textContent='Agora você já pode aproveitar todos os benefícios disponíveis do GiraPrêmios!';
  button.textContent='Ir para minha área ›';
  button.href=account.role==='admin'?'./admin.html':'./usuario.html';
  icon.textContent='✓';
  if(artworkMark){artworkMark.hidden=false;artworkMark.classList.remove('waiting');artworkMark.textContent='✓'}
  notes.textContent='Os prêmios e as trocas de moedas ainda estão em preparação.';
 }else{
  confirm.textContent=emailPending?'Confira seu e-mail!':'Confirme seu cadastro';
  description.textContent='Enviamos, quando disponível, uma mensagem para confirmar seu e-mail. Abra o link de confirmação para ativar sua conta.';
  button.href='./entrar.html';
  button.textContent='Ir para o login ›';
  icon.textContent='✉';
  if(artworkMark){artworkMark.hidden=false;artworkMark.classList.add('waiting');artworkMark.textContent='✉'}
  notes.textContent='A confirmação de e-mail depende da entrega de mensagens configurada no Supabase.';
 }
}
function setGoogle(){
 const btn=$('googleLogin');if(!btn)return;
 if(!authOptions.googleEnabled){
  btn.disabled=true;
  btn.setAttribute('title','Google ainda não foi ativado no Supabase');
  btn.classList.add('is-pending');
  btn.innerHTML='<span class="google-g" aria-hidden="true">G</span> Entrar com Google';
 }else btn.addEventListener('click',googleSignIn);
}
async function init(){
 revealPassword();setGoogle();
 if(page==='welcome'){await welcome();return}
 if(page==='reset'){
  const mode=url.searchParams.get('modo');
  const change=()=>{$('resetRequestForm').hidden=true;$('newPasswordForm').hidden=false;$('resetHeading').textContent='Escolha uma nova senha'};
  if(mode==='nova'){
   db.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY')change()});
   const {data}=await db.auth.getSession();
   if(data?.session)change();
   else status('Abra o link de recuperação recebido no seu e-mail. Se o link expirou, solicite outro.');
  }
  $('resetRequestForm')?.addEventListener('submit',requestRecovery);
  $('newPasswordForm')?.addEventListener('submit',newPassword);
  $('afterRecovery')?.addEventListener('click',async e=>{e.preventDefault();await afterLogin()});
  await ensureCaptcha();
  return;
 }
 if(page==='signup'){$('signupForm')?.addEventListener('submit',signup)}
 if(page==='login'){
  // Conta com sessão válida não precisa ver o formulário novamente.
  // Primeiro confira o papel no Supabase; não redirecione com base apenas
  // em armazenamento local.
  const info=await identity();
  if(info.user&&info.role&&!info.error){
   navigateToRole(info.role);
   return;
  }
  $('loginForm')?.addEventListener('submit',signin);
 }
 await ensureCaptcha();
}
init().catch(err=>status('Não foi possível inicializar esta página: '+(err.message||'erro'),'error'));
