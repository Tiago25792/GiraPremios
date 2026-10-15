import {db,$,identity,loadSponsors} from './app-config.js?v=17';
import {setupNotificationPopover} from './notifications-popover-v20.js?v=20';

let signedIn=null;
let notificationUI=null;
let wallet=null;
let allActivities=[];
let showingAll=false;

const brNumber=value=>new Intl.NumberFormat('pt-BR').format(Number(value)||0);
const todayInBrazil=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const notify=(id,message,bad=false)=>{const el=$(id);if(!el)return;el.textContent=message;el.classList.toggle('error',bad)};
const escapeUrlValue=str=>encodeURIComponent(str);
const accountName=name=>{const first=(name||'').trim().split(/\s+/)[0]||'amigo';return first.length>15?first.slice(0,15)+'…':first};
function showInfo(title,message){$('modalTitle').textContent=title;$('modalText').textContent=message;if(!$('informationDialog').open)$('informationDialog').showModal()}
function drawWallet(record){
 if(!record)return;
 wallet=record;
 $('coinBalance').textContent=brNumber(record.coins);
 $('spinBalance').textContent=brNumber(record.spins);
 $('inviteCount').textContent=brNumber(record.invites);
 $('referralCode').textContent=record.referral_code||'—';
 const invited=Number(record.invites)||0;
 $('inviteProgressText').textContent=brNumber(invited)+'/20';
 $('inviteBadge').textContent=brNumber(invited)+'/20';
 $('inviteFill').style.width=(Math.min(20,invited)/20*100)+'%';
 $('inviteProgress').setAttribute('aria-valuenow',String(Math.min(20,invited)));
 for(const limit of [5,10,20])$('tier'+limit).classList.toggle('done',invited>=limit);
 const completed=record.last_daily_claim===todayInBrazil();
 $('checkinBtn').disabled=completed;
 $('checkinBtn').textContent=completed?'Recebido hoje ✓':'Receber bônus';
 $('dailyHint').textContent=completed?'Bônus diário já recebido. Volte amanhã para resgatar novamente.':'Toque para receber 50 moedas e acumular 1 giro hoje.';
}
async function loadWallet(){
 const {data,error}=await db.rpc('ensure_member_wallet');
 if(error){notify('rewardStatus','Não foi possível carregar moedas e giros: '+error.message,true);return}
 drawWallet(data);
}
function viewDate(date){
 try{return new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(date))}
 catch{return ''}
}
function activityEmoji(kind){return {checkin:'🪙',spin:'☸️',spin_used:'☸️',invite:'👥',invite_daily:'🎁',milestone:'🏆'}[kind]||'🔔'}
function renderActivities(){
 const root=$('activityList');root.replaceChildren();
 const list=showingAll?allActivities:allActivities.slice(0,4);
 $('showAllActivity').textContent=showingAll?'Ver menos ↑':'Ver todas ›';
 if(!list.length){
  const no=document.createElement('p');no.className='empty-state';no.textContent='Suas atividades aparecerão aqui quando você receber moedas, giros ou convites.';root.append(no);return;
 }
 for(const item of list){
  const article=document.createElement('article');article.className='activity-row';
  const symbol=document.createElement('span');symbol.className='activity-symbol';symbol.textContent=activityEmoji(item.kind);symbol.setAttribute('aria-hidden','true');
  const body=document.createElement('div');body.className='activity-body';
  const title=document.createElement('strong');title.textContent=item.title||'Atividade';
  const description=document.createElement('span');description.textContent=(item.description||'')+(Number(item.coins_delta)>0?' • +'+brNumber(item.coins_delta)+' moedas':'');
  body.append(title,description);
  const when=document.createElement('time');when.className='activity-date';when.dateTime=item.created_at;when.textContent=viewDate(item.created_at);
  article.append(symbol,body,when);root.append(article);
 }
}
async function loadActivities(){
 if(!signedIn)return;
 const {data,error}=await db.from('member_activities').select('id,kind,title,description,coins_delta,created_at').eq('user_id',signedIn.id).order('created_at',{ascending:false}).limit(50);
 if(error){const root=$('activityList');root.textContent='Não foi possível carregar o histórico.';return}
 allActivities=data||[];renderActivities();
 /* O indicador de não lidas é controlado exclusivamente pela caixinha. */
}
function referralCodeFromUrl(){
 const query=new URLSearchParams(location.search).get('ref');
 if(query&&/^[a-f0-9]{12}$/.test(query))localStorage.setItem('gp_referral_pending',query);
 return localStorage.getItem('gp_referral_pending');
}
async function applyPendingReferral(){
 const code=referralCodeFromUrl();if(!code)return;
 const {data,error}=await db.rpc('register_invite',{p_code:code});
 if(error){notify('shareStatus','Não foi possível verificar o convite neste momento.',true);return}
 if(data?.ok){notify('shareStatus','✅ Seu convite foi registrado. Quem enviou receberá as moedas de indicação.');localStorage.removeItem('gp_referral_pending');return}
 const reason=data?.reason||'Não foi possível registrar o convite.';
 if(!reason.toLowerCase().includes('confirme seu e-mail'))localStorage.removeItem('gp_referral_pending');
 notify('shareStatus',reason,false);
}
async function checkin(){
 if(!signedIn)return;
 const button=$('checkinBtn');button.disabled=true;button.textContent='Resgatando...';notify('rewardStatus','Registrando seu bônus diário...');
 try{
  const {data,error}=await db.rpc('claim_daily_reward');
  if(error)throw error;
  drawWallet(data);
  notify('rewardStatus',data.claimed?'🎉 Bônus recebido: +50 moedas virtuais e +1 giro!':'Você já recebeu o bônus de hoje. Volte amanhã.');
  await loadActivities();
  notificationUI?.refresh();
 }catch(error){button.disabled=false;button.textContent='Tentar novamente';notify('rewardStatus','Não foi possível receber o bônus: '+(error.message||'tente novamente'),true)}
}
async function shareInvite(){
 if(!wallet?.referral_code){notify('shareStatus','Aguarde seu código de convite carregar.',true);return}
 const url=new URL('./',location.href);
 url.searchParams.set('ref',wallet.referral_code);
 const link=url.href;
 const message='Participe da comunidade GiraPrêmios! Cadastre-se gratuitamente pelo meu convite: '+link;
 try{
  if(navigator.share){await navigator.share({title:'GiraPrêmios — convite',text:message,url:link});notify('shareStatus','Convite pronto para compartilhar.');return}
  if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(message);notify('shareStatus','✅ Convite copiado. Cole no WhatsApp para compartilhar.');return}
  const input=document.createElement('textarea');input.value=message;input.style.position='fixed';input.style.opacity='0';document.body.append(input);input.select();const copied=document.execCommand('copy');input.remove();if(!copied)throw Error('Cópia não disponível');notify('shareStatus','✅ Convite copiado.');
 }catch(err){if(err.name!=='AbortError')notify('shareStatus','Não foi possível compartilhar automaticamente. Copie o endereço com seu código '+wallet.referral_code+'.',true)}
}
async function saveProfile(event){
 event.preventDefault();
 if(!signedIn)return;
 const name=$('displayName').value.trim();
 if(name.length>70){notify('profileStatus','Nome muito longo.',true);return}
 $('saveProfile').disabled=true;
 try{
  const {data,error}=await db.from('profiles').update({display_name:name,updated_at:new Date().toISOString()}).eq('id',signedIn.id).select('id');
  if(error)throw error;
  if(!data?.length)throw Error('Perfil não encontrado.');
  $('helloName').textContent=accountName(name);
  notify('profileStatus','✅ Nome atualizado com sucesso.');
 }catch(err){notify('profileStatus','Não foi possível salvar: '+(err.message||'erro'),true)}
 finally{$('saveProfile').disabled=false}
}
async function openNotifications(){
 await loadActivities();
 if(allActivities.length){
  localStorage.setItem('gp_seen_'+signedIn.id,allActivities[0].created_at);
  document.querySelector('.member-alert-dot').style.display='none';
  showInfo('Suas atividades','Você tem '+brNumber(allActivities.length)+' registro(s) recente(s). Veja a seção Atividades recentes para conferir moedas, convites e giros.');
 }else showInfo('Notificações','Ainda não há novidades em sua conta. Receba seu bônus diário para registrar sua primeira atividade.');
}
async function start(){
 const response=await identity();
 if(response.error){$('sessionStatus').textContent='Não foi possível validar seu acesso. Atualize a página.';$('noAccess').hidden=false;return}
 if(!response.user){location.replace('./#entrar');return}
 signedIn=response.user;
 notificationUI=setupNotificationPopover({db,user:signedIn,trigger:$('notifications')});
 $('sessionStatus').hidden=true;
 $('memberPanel').hidden=false;
 $('memberNav').hidden=false;
 $('userEmail').textContent=signedIn.email||'—';
 const profile=await db.from('profiles').select('display_name').eq('id',signedIn.id).maybeSingle();
 if(!profile.error){$('displayName').value=profile.data?.display_name||'';$('helloName').textContent=accountName(profile.data?.display_name||signedIn.user_metadata?.full_name||signedIn.user_metadata?.name||'amigo')}
 else notify('profileStatus','Não foi possível carregar seu nome.',true);
 await loadWallet();
 await applyPendingReferral();
 await Promise.all([
  loadActivities(),
  loadSponsors($('sponsorsGrid'),{showExamples:false,limit:6}).catch(()=>{ $('sponsorsGrid').textContent='Não foi possível carregar os apoiadores.'; })
 ]);
 if(location.hash)setTimeout(()=>document.querySelector(location.hash)?.scrollIntoView({block:'start'}),100);
}
$('checkinBtn').addEventListener('click',checkin);
$('shareInvite').addEventListener('click',shareInvite);
$('profileForm').addEventListener('submit',saveProfile);
$('showAllActivity').addEventListener('click',()=>{location.href='./atividades.html'});
$('allBenefits').addEventListener('click',()=>{location.href='./recompensas.html?v=27'});
for(const el of document.querySelectorAll('[data-benefit]'))el.addEventListener('click',()=>{location.href='./recompensas.html?v=27'});
// O botão do sino é configurado pelo componente de notificações.
$('closeDialog').addEventListener('click',()=>$('informationDialog').close());
$('signOut').addEventListener('click',async()=>{await db.auth.signOut();location.replace('./#entrar')});
for(const tab of document.querySelectorAll('.member-nav a[href^="#"]'))tab.addEventListener('click',()=>{for(const item of document.querySelectorAll('.member-nav a'))item.classList.toggle('current',item===tab)});
await start();
