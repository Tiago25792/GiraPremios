import {db,identity,loadSponsors} from './app-config.js?v=19';
import {setupNotificationPopover} from './notifications-popover-v20.js?v=20';

/* Áreas internas GiraPrêmios — só exibe dados reais da conta autenticada.
   Produtos e benefícios ainda indisponíveis são identificados como planos. */
const $=id=>document.getElementById(id);
const page=(document.body.dataset.page||'perfil').toLowerCase();
const allowed=['perfil','beneficios','convites','atividades','notificacoes','ajuda'];
const section=allowed.includes(page)?page:'perfil';
const number=x=>new Intl.NumberFormat('pt-BR').format(Number(x)||0);
const localDate=d=>new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(d));
const timeEmoji=kind=>({checkin:'🪙',spin:'☸️',spin_used:'☸️',invite:'👥',invite_daily:'🎁',milestone:'🏆'})[kind]||'🔔';
const navIcon={
 home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>',
 benefits:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10h18v11H3zM2 7h20v4H2zM12 7v14M12 7c-7-1-7-6-4-6 2 0 4 3 4 6 0-3 2-6 4-6 3 0 3 5-4 6z"/></svg>',
 person:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M4 22v-2c0-5 3-7 8-7s8 2 8 7v2z"/></svg>',
 bell:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>'
};
const titles={
 perfil:['Meu <em>perfil</em>','Personalize sua experiência e cuide da sua conta.','👤','PERFIL DO PARTICIPANTE'],
 beneficios:['Seus <em>benefícios</em>','Confira recompensas, novidades e parceiros da comunidade.','🎁','BENEFÍCIOS'],
 convites:['Convide e <em>ganhe</em>','Compartilhe a comunidade e acumule moedas virtuais.','👥','CONVITES E MOEDAS'],
 atividades:['Suas <em>atividades</em>','Acompanhe moedas, giros e convites registrados.','🕒','HISTÓRICO DE ATIVIDADES'],
 notificacoes:['Suas <em>novidades</em>','Avisos da sua conta e recompensas recebidas.','🔔','NOTIFICAÇÕES'],
 ajuda:['Central de <em>ajuda</em>','Entenda as regras da GiraPrêmios e tire suas dúvidas.','💬','DÚVIDAS E SUPORTE']
};
const quick=[
 ['🎁','Benefícios','./beneficios.html','beneficios'],
 ['👥','Convites','./convites.html','convites'],
 ['🕒','Atividades','./atividades.html','atividades'],
 ['🔔','Avisos','./notificacoes.html','notificacoes'],
 ['👤','Perfil','./perfil.html','perfil'],
 ['❓','Ajuda','./ajuda.html','ajuda']
];
let user=null,wallet=null,profile=null;
let notificationUI=null;
const status=(id,msg,type='')=>{const el=$(id);if(!el)return;el.textContent=msg;el.className='status '+type};
function shell(){
 const meta=titles[section];
 const tab=section==='beneficios'?'beneficios':section==='perfil'||section==='notificacoes'||section==='ajuda'?'perfil':'inicio';
 $('app').innerHTML='<div class="shell">'+
  '<header class="top"><a href="./usuario.html" class="brand" aria-label="GiraPrêmios — início"><img src="./roleta-marinha.svg" alt="" width="49" height="49"><span>Gira<strong>Prêmios</strong></span></a>'+
  '<div class="head-actions"><a class="head-link" href="./usuario.html" title="Voltar ao painel" aria-label="Voltar ao painel">←</a><button type="button" class="head-link" id="notificationTrigger" aria-label="Abrir notificações" title="Notificações" style="position:relative">'+navIcon.bell+'<i id="notificationDot" hidden></i></button></div></header>'+
  '<nav class="crumbs" aria-label="Você está aqui"><a href="./usuario.html">Minha área</a><span>›</span><span>'+meta[3]+'</span></nav>'+
  '<section class="page-hero"><div class="hero-copy"><span class="eyebrow">'+meta[2]+' '+meta[3]+'</span><h1>'+meta[0]+'</h1><p>'+meta[1]+'</p></div><span class="hero-decoration" aria-hidden="true">✨ ☁️</span><img class="hero-bird" src="./mascote-hd.svg?v=14" alt="" width="205" height="234"></section>'+
  '<nav class="quick-links" aria-label="Outras áreas">'+quick.filter(item=>item[3]!==section).slice(0,3).map(item=>'<a class="quick-link" href="'+item[2]+'"><span>'+item[0]+'</span>'+item[1]+'</a>').join('')+'</nav>'+
  '<div id="pageContent"><section class="panel"><p role="status">Carregando suas informações...</p></section></div>'+
  '<footer class="footer">© GiraPrêmios Solidária • Sua comunidade de benefícios</footer></div>'+
  '<nav class="bottom-nav" aria-label="Navegação do participante">'+
  '<a href="./usuario.html"'+(tab==='inicio'?' aria-current="page"':'')+'><span class="nav-icon">'+navIcon.home+'</span>Início</a>'+
  '<a href="./roleta.html"><span class="nav-icon"><img src="./roleta-marinha.svg" alt=""></span>Roleta</a>'+
  '<a href="./beneficios.html"'+(tab==='beneficios'?' aria-current="page"':'')+'><span class="nav-icon">'+navIcon.benefits+'</span>Benefícios</a>'+
  '<a href="./perfil.html"'+(tab==='perfil'?' aria-current="page"':'')+'><span class="nav-icon">'+navIcon.person+'</span>Perfil</a></nav>';
}
function errorPage(message){
 $('pageContent').innerHTML='<section class="panel"><h2>Não foi possível abrir sua área</h2><p id="errorReason"></p><div class="actions"><a class="gold-button" href="./#entrar">Entrar na minha conta ↗</a><a class="ghost-button" href="./usuario.html">Voltar</a></div></section>';
 $('errorReason').textContent=message;
}
async function walletData(){
 const {data,error}=await db.rpc('ensure_member_wallet');
 if(error)throw error;return data||null;
}
async function getProfile(){
 const {data,error}=await db.from('profiles').select('display_name,whatsapp').eq('id',user.id).maybeSingle();
 if(error)throw error;return data||{display_name:'',whatsapp:''};
}
function templatePerfil(){return '<section class="panel">'+
 '<div class="panel-heading"><h2>👤 Informações pessoais</h2><span class="pill good">Conta conectada</span></div>'+
 '<p>Seu nome aparece na saudação da área do participante. Apenas você e a administração têm acesso aos dados privados.</p>'+
 '<form id="profileForm"><label class="field" for="nickname">Nome de exibição</label><input id="nickname" type="text" maxlength="70" autocomplete="name" placeholder="Como você gostaria de ser chamado?">'+
 '<label class="field" for="email">E-mail cadastrado</label><input id="email" type="email" readonly>'+
 '<div class="actions"><button class="gold-button" type="submit" id="saveProfile">Salvar alterações</button></div><p class="status" id="profileStatus" role="status"></p></form>'+
 '</section><section class="grid2"><div class="stat"><span class="emoji">🪙</span><strong id="profileCoins">—</strong><small>Moedas virtuais</small></div><div class="stat"><span class="emoji">☸️</span><strong id="profileSpins">—</strong><small>Giros acumulados</small></div></section>'+
 '<section class="panel"><h2>🔐 Segurança da conta</h2><p>Não compartilhe sua senha nem seu código de confirmação. Se precisar trocar a senha, solicite as instruções no seu e-mail cadastrado.</p>'+
 '<div class="actions"><button type="button" class="ghost-button" id="passwordReset">Solicitar troca de senha</button><button type="button" class="blue-button" id="logout">Sair da minha conta</button></div><p id="passwordStatus" class="status" role="status"></p></section>'+
 '<section class="panel"><h2>⚙️ Minha comunidade</h2>'+
 '<div class="info-row"><span class="info-icon">👥</span><span class="info-body"><strong>Meus convites</strong><small>Seu link de indicação e suas metas</small></span><a class="ghost-button" href="./convites.html">Ver ›</a></div>'+
 '<div class="info-row"><span class="info-icon">🔔</span><span class="info-body"><strong>Notificações</strong><small>Avisos e histórico de novidades da conta</small></span><a class="ghost-button" href="./notificacoes.html">Abrir ›</a></div>'+
 '<div class="info-row"><span class="info-icon">❓</span><span class="info-body"><strong>Ajuda e suporte</strong><small>Perguntas e orientações</small></span><a class="ghost-button" href="./ajuda.html">Ajuda ›</a></div></section>';
}
function templateBeneficios(){return '<section class="highlight"><h2>🎁 Recompensas e vantagens</h2><p>Conheça as modalidades planejadas. Novas recompensas serão mostradas quando houver parceiros e regras definidas.</p><span class="pill">Nenhum resgate disponível agora</span></section>'+
 '<section class="panel"><a class="gold-button" href="./recompensas.html?v=29">🎁 Abrir Central de Recompensas ›</a></section>'+ 
 '<section class="panel"><div class="panel-heading"><h2>Benefícios da comunidade</h2><span class="pill">Em preparação</span></div>'+
 '<div class="grid3" id="benefitCards">'+
 '<article class="benefit-card"><span class="emoji">🎟️</span><strong>Cupom 10%</strong><p>Desconto ilustrativo em produtos selecionados, dependendo de parceiros futuros.</p><span class="pill">Em preparação</span></article>'+
 '<article class="benefit-card"><span class="emoji">🎁</span><strong>Brindes</strong><p>Brindes de apoiadores, quando houver campanhas e condições publicadas.</p><span class="pill">Em preparação</span></article>'+
 '<article class="benefit-card"><span class="emoji">👑</span><strong>Acesso VIP</strong><p>Conteúdos e vantagens especiais a serem definidos futuramente.</p><span class="pill">Em preparação</span></article></div></section>'+
 '<section class="panel"><h2>🪙 Suas moedas</h2><div class="info-row"><span class="info-icon">🪙</span><span class="info-body"><strong id="benefitCoins">—</strong><small>Saldo gratuito de moedas virtuais acumuladas</small></span><a class="ghost-button" href="./convites.html">Ganhar mais ›</a></div>'+
 '<p>As moedas não têm valor em reais, não podem ser compradas ou transferidas e ainda não são aceitas para resgatar benefícios reais.</p></section>'+
 '<section class="panel"><div class="panel-heading"><h2>🤝 Apoiadores da comunidade</h2><a class="ghost-button" href="./#apoiadores">Ver vitrine</a></div><p>Estas empresas apoiam a comunidade. A presença na vitrine não implica que oferecem os benefícios ilustrativos acima.</p><div id="partnerList" class="empty">Carregando apoiadores...</div></section>';
}
function templateConvites(){return '<section class="highlight"><h2>👥 Convide e ganhe moedas!</h2><p>Compartilhe seu link. Um amigo novo com e-mail confirmado pode gerar moedas gratuitas para você.</p><div class="balance" id="inviteTotal">— <span style="font-size:15px;color:#fff">convites</span></div>'+
 '<div class="actions"><button class="gold-button" id="shareReferral">↗ Compartilhar convite</button><button class="ghost-button" id="copyReferral">Copiar link</button></div><p id="shareFeedback" style="color:#f1fcff;margin:0" role="status"></p></section>'+
 '<section class="panel"><h2>🎯 Suas metas</h2><div class="progress-area"><div class="progress-track" role="progressbar" aria-label="Convites para a meta de 20" aria-valuemin="0" aria-valuemax="20" aria-valuenow="0" id="progress"><div class="progress-fill" id="progressBar"></div></div><strong class="counter" id="progressCount">0 / 20</strong></div>'+
 '<div class="grid3"><div class="milestone" id="milestone5"><span class="emoji">🎁</span><strong>5 convites</strong><small>+250 moedas</small></div>'+
 '<div class="milestone" id="milestone10"><span class="emoji">🎁</span><strong>10 convites</strong><small>+500 moedas</small></div>'+
 '<div class="milestone" id="milestone20"><span class="emoji">🏆</span><strong>20 convites</strong><small>+1.000 moedas</small></div></div></section>'+
 '<section class="panel"><h2>🔗 Seu convite exclusivo</h2><p>Compartilhe o link, em vez de divulgar somente o código. Assim o cadastro pode reconhecer quem convidou.</p><span class="referral-code" id="code">Carregando...</span>'+
 '<label class="field" for="referralLink">Link de indicação</label><input type="text" readonly id="referralLink" aria-label="Seu link de convite">'+
 '<p class="small-note">+10 moedas virtuais por cadastro novo confirmado. +5 moedas quando esse convidado resgatar o bônus diário. As metas de 5, 10 e 20 convites concedem bônus adicionais uma única vez.</p></section>'+
 '<section class="panel"><h2>💡 Como funciona?</h2>'+
 '<div class="info-row"><span class="info-icon">1️⃣</span><span class="info-body"><strong>Envie seu link</strong><small>Compartilhe com amigos por WhatsApp ou outro aplicativo.</small></span></div>'+
 '<div class="info-row"><span class="info-icon">2️⃣</span><span class="info-body"><strong>O amigo cria uma conta nova</strong><small>Precisa confirmar o e-mail. Convites são aceitos apenas nos primeiros 14 dias da criação da conta.</small></span></div>'+
 '<div class="info-row"><span class="info-icon">3️⃣</span><span class="info-body"><strong>Você acumula moedas</strong><small>Os bônus virtuais aparecem no saldo e nas atividades da sua conta.</small></span></div></section>'+
 '<div class="actions"><a class="blue-button" href="./atividades.html">Ver minhas atividades ›</a></div>';
}
function templateAtividades(){return '<section class="panel"><div class="panel-heading"><h2>🕒 Histórico da sua conta</h2><span class="pill">Dados reais</span></div>'+
 '<p>Confira registros de bônus diário, giros virtuais e convites. O histórico é privado e vinculado ao seu login.</p>'+
 '<div class="filter-line"><label for="activityFilter">Filtrar por</label><select id="activityFilter"><option value="all">Todas as atividades</option><option value="checkin">Bônus diário</option><option value="spin">Giros</option><option value="invites">Convites e metas</option></select></div>'+
 '<div id="activityList" aria-live="polite"><div class="empty">Carregando seu histórico...</div></div>'+
 '<div class="actions"><button class="ghost-button" id="loadMore" type="button" hidden>Carregar mais atividades</button></div><p id="activityStatus" class="status" role="status"></p></section>';
}
function templateNotificacoes(){return '<section class="panel"><div class="panel-heading"><h2>🔔 Novidades da sua conta</h2><span class="pill">Avisos no aplicativo</span></div>'+
 '<p>Estes avisos são gerados pelas atividades reais da sua conta. Ainda não enviamos notificações automáticas para o celular.</p>'+
 '<div class="actions"><button id="markRead" class="blue-button" type="button">Marcar como vistas</button><a class="ghost-button" href="./atividades.html">Histórico completo ›</a></div>'+
 '<p class="status" id="noticeStatus" role="status"></p><div id="noticeList"><div class="empty">Carregando avisos...</div></div></section>'+
 '<section class="panel"><h2>📢 Comunicados da comunidade</h2><p>A área de recados dos parceiros e novas promoções está sendo preparada. Comunicados serão exibidos aqui quando houver publicação oficial.</p><span class="pill">Em preparação</span></section>';
}
function templateAjuda(){return '<section class="panel"><h2>❓ Perguntas frequentes</h2>'+
 '<details open><summary>Como ganho moedas virtuais?</summary><p>Você recebe 50 moedas gratuitas e 1 giro virtual ao resgatar seu presente diário. Convites confirmados também geram moedas, conforme as regras exibidas na área Convites.</p></details>'+
 '<details><summary>As moedas podem ser compradas ou sacadas?</summary><p>Não. As moedas virtuais não têm valor em dinheiro, não podem ser compradas, vendidas, sacadas nem transferidas. Ainda não há troca por recompensas reais ativada.</p></details>'+
 '<details><summary>Os giros estão valendo prêmios reais?</summary><p>Não. A roleta disponível neste momento é demonstrativa. O número de giros acumulados é registrado na conta, mas a animação não entrega brindes ou dinheiro.</p></details>'+
 '<details><summary>Como funciona a indicação de amigos?</summary><p>Você compartilha seu link, e o amigo cria uma conta nova e confirma o e-mail. O sistema atribui moedas por convites aceitos e quando o convidado volta para resgatar o bônus diário. Confira todas as condições em Convites.</p></details>'+
 '<details><summary>Preciso contribuir para participar?</summary><p>O cadastro e a acumulação de moedas virtuais são gratuitos. Contribuições solidárias, quando estiverem disponíveis, serão opcionais e separadas das moedas e de eventuais promoções.</p></details>'+
 '<details><summary>Onde vejo meus benefícios?</summary><p>Acesse a área Benefícios. Cupons, brindes e vantagens VIP só serão liberados quando houver parceiros, estoque e regras verificadas. Os exemplos atuais aparecem como “Em preparação”.</p></details>'+
 '<details><summary>Como altero meus dados ou minha senha?</summary><p>Abra Meu Perfil para mudar seu nome. Para alterar sua senha, solicite um e-mail de recuperação. Não compartilhe links ou códigos de redefinição.</p></details>'+
 '<details><summary>Não recebi um e-mail de confirmação. O que fazer?</summary><p>Confira as pastas Spam e Promoções. O envio depende da configuração de e-mails do Supabase; se continuar sem chegar, aguarde a regularização do serviço antes de tentar repetidamente.</p></details>'+
 '</section><section class="panel"><h2>🛟 Precisa de orientação?</h2><p>Você pode consultar suas atividades e as informações da sua conta pelos atalhos abaixo. Um canal de atendimento individual ainda não foi configurado.</p>'+
 '<div class="actions"><a class="blue-button" href="./perfil.html">Meu perfil ›</a><a class="ghost-button" href="./atividades.html">Atividades ›</a><a class="ghost-button" href="./#apoiadores">Ver apoiadores ›</a></div></section>';
}
const templates={perfil:templatePerfil,beneficios:templateBeneficios,convites:templateConvites,atividades:templateAtividades,notificacoes:templateNotificacoes,ajuda:templateAjuda};
function updateNotificationDot(newest){
 const dot=$('notificationDot');
 if(!dot||!user)return;
 const prior=localStorage.getItem('gp_seen_'+user.id);
 dot.hidden=!(newest&&(!prior||new Date(newest)>new Date(prior)));
}
async function latestNotification(){
 if(!user)return;
 const {data,error}=await db.from('member_activities').select('created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(1);
 if(!error&&data?.length)updateNotificationDot(data[0].created_at);
}
function makeRow(activity){
 const row=document.createElement('article');row.className='info-row';
 const emoji=document.createElement('span');emoji.className='info-icon';emoji.textContent=timeEmoji(activity.kind);
 const body=document.createElement('div');body.className='info-body';
 const strong=document.createElement('strong');strong.textContent=activity.title||'Atividade';
 const note=document.createElement('small');note.textContent=activity.description||'Registro da sua conta';body.append(strong,note);
 const aside=document.createElement('div');
 aside.style.textAlign='right';
 const time=document.createElement('time');time.className='info-time';time.dateTime=activity.created_at;time.textContent=localDate(activity.created_at);aside.append(time);
 if(Number(activity.coins_delta)>0){const gain=document.createElement('div');gain.className='info-gain';gain.textContent='+'+number(activity.coins_delta)+' moedas';aside.append(gain)}
 row.append(emoji,body,aside);return row;
}
async function activityQuery(opts={}){
 let q=db.from('member_activities').select('id,kind,title,description,coins_delta,created_at').eq('user_id',user.id);
 const type=opts.kind||'all';
 if(type==='invites')q=q.in('kind',['invite','invite_daily','milestone']);
 else if(type!=='all')q=q.eq('kind',type);
 return q.order('created_at',{ascending:false}).range(opts.offset||0,(opts.offset||0)+(opts.limit||20)-1);
}
function shareLink(){
 const url=new URL('./',location.href);url.search='';url.hash='';url.searchParams.set('ref',wallet?.referral_code||'');
 return url.href;
}
async function shareInvite(){
 if(!wallet?.referral_code){status('shareFeedback','Não foi possível carregar seu código.','error');return}
 const link=shareLink();
 const text='Participe gratuitamente da comunidade GiraPrêmios com meu convite: '+link;
 try{
  if(navigator.share){await navigator.share({title:'Convite GiraPrêmios',text,url:link});status('shareFeedback','Convite pronto para compartilhar.','success');return}
  await navigator.clipboard.writeText(text);
  status('shareFeedback','Convite copiado. Envie para seus amigos!','success');
 }catch(error){if(error.name==='AbortError')return;status('shareFeedback','Não foi possível compartilhar automaticamente. Copie o link abaixo.','error')}
}
async function copyInvite(){
 try{await navigator.clipboard.writeText(shareLink());status('shareFeedback','Link de convite copiado!','success')}
 catch{const input=$('referralLink');input.select();try{document.execCommand('copy');status('shareFeedback','Link copiado!','success')}catch{status('shareFeedback','Selecione e copie o link no campo abaixo.','error')}}
}
function openPerfil(){
 $('nickname').value=profile?.display_name||user.user_metadata?.full_name||'';
 $('email').value=user.email||'';
 $('profileCoins').textContent=number(wallet?.coins);
 $('profileSpins').textContent=number(wallet?.spins);
 $('profileForm').addEventListener('submit',async e=>{
  e.preventDefault();const name=$('nickname').value.trim();
  if(name.length<2){status('profileStatus','Informe um nome com pelo menos 2 caracteres.','error');return}
  const btn=$('saveProfile');btn.disabled=true;
  try{
   const {data,error}=await db.from('profiles').update({display_name:name,updated_at:new Date().toISOString()}).eq('id',user.id).select('id');
   if(error)throw error;
   if(!data?.length)throw Error('Não foi possível localizar seu perfil.');
   profile.display_name=name;status('profileStatus','Nome atualizado! Ele aparecerá na sua tela inicial.','success')
  }catch(error){status('profileStatus','Erro ao salvar: '+error.message,'error')}
  finally{btn.disabled=false}
 });
 $('passwordReset').addEventListener('click',async ()=>{
  const btn=$('passwordReset');btn.disabled=true;
  const redirect=new URL('./',location.href).href+'#entrar';
  const {error}=await db.auth.resetPasswordForEmail(user.email,{redirectTo:redirect});
  status('passwordStatus',error?'Não foi possível solicitar: '+error.message:'Se o envio estiver configurado, você receberá instruções por e-mail.',error?'error':'success');
  btn.disabled=false;
 });
 $('logout').addEventListener('click',async ()=>{const {error}=await db.auth.signOut();if(!error)location.replace('./#entrar');else status('passwordStatus','Não foi possível sair: '+error.message,'error')});
}
async function openBeneficios(){
 $('benefitCoins').textContent=number(wallet?.coins)+' moedas';
 const root=$('partnerList');
 root.textContent='Carregando apoiadores...';
 const {data,error}=await db.from('sponsors').select('name,description,website_url').eq('approved',true).order('featured',{ascending:false}).order('sort_order',{ascending:true}).limit(4);
 root.className='';
 root.replaceChildren();
 if(error){root.className='empty';root.textContent='Não foi possível carregar apoiadores agora.';return}
 if(!data?.length){root.className='empty';root.textContent='Apoiadores aparecerão aqui quando forem publicados.';return}
 for(const p of data){
  const row=document.createElement('div');row.className='info-row';
  const ico=document.createElement('span');ico.className='info-icon';ico.textContent='🤝';
  const body=document.createElement('span');body.className='info-body';
  const title=document.createElement('strong');title.textContent=p.name;
  const note=document.createElement('small');note.textContent=p.description||'Apoiador da comunidade';
  body.append(title,note);row.append(ico,body);
  root.append(row)
 }
}
function openConvites(){
 const count=Number(wallet?.invites)||0;
 $('inviteTotal').textContent=number(count)+' convites';
 $('progressCount').textContent=number(count)+' / 20';
 $('progressBar').style.width=Math.min(100,100*count/20)+'%';
 $('progress').setAttribute('aria-valuenow',String(Math.min(20,count)));
 for(const x of [5,10,20])$('milestone'+x).classList.toggle('completed',count>=x);
 $('code').textContent=wallet?.referral_code||'Código indisponível';
 $('referralLink').value=wallet?.referral_code?shareLink():'';
 $('shareReferral').addEventListener('click',shareInvite);
 $('copyReferral').addEventListener('click',copyInvite);
}
async function openAtividades(){
 const list=$('activityList'),loadMore=$('loadMore');
 let offset=0,busy=false;const pageSize=20;
 const filter=$('activityFilter');
 async function fetchPage(reset){
  if(busy)return;
  busy=true;loadMore.disabled=true;
  if(reset){offset=0;list.replaceChildren();list.textContent='Carregando registros...'}
  const {data,error}=await activityQuery({kind:filter.value,offset,limit:pageSize});
  if(reset)list.replaceChildren();
  if(error){status('activityStatus','Falha ao carregar atividades: '+error.message,'error');busy=false;loadMore.disabled=false;return}
  if(!data?.length&&offset===0){list.innerHTML='<div class="empty">Nenhuma atividade registrada neste filtro.</div>'}
  else for(const act of data||[])list.append(makeRow(act));
  offset+=(data||[]).length;
  loadMore.hidden=(data||[]).length<pageSize;
  loadMore.disabled=false;busy=false;
  status('activityStatus',offset?number(offset)+' atividade(s) exibida(s).':'');
 }
 filter.addEventListener('change',()=>fetchPage(true));
 loadMore.addEventListener('click',()=>fetchPage(false));
 await fetchPage(true);
}
async function openNotificacoes(){
 const root=$('noticeList');
 const {data,error}=await activityQuery({limit:30,offset:0});
 root.replaceChildren();
 if(error){root.className='empty';root.textContent='Não foi possível carregar seus avisos.';return}
 const seen=localStorage.getItem('gp_seen_'+user.id);
 if(!data?.length){root.className='empty';root.textContent='Ainda não há avisos. Quando você receber moedas, giros ou indicações, eles aparecerão aqui.'}
 else for(const act of data)root.append(makeRow(act));
 if(!seen)status('noticeStatus','Você ainda não marcou seus avisos como vistos.');
 else status('noticeStatus','Avisos consultados anteriormente nesta conta.');
 $('markRead').addEventListener('click',()=>{
  if(data?.[0]){localStorage.setItem('gp_seen_'+user.id,data[0].created_at);updateNotificationDot(data[0].created_at);notificationUI?.refresh()}
  status('noticeStatus','Avisos marcados como vistos neste aparelho.','success');
 });
}
async function start(){
 shell();
 let info;
 try{info=await identity()}catch{errorPage('Não foi possível verificar seu login.');return}
 if(info.error){errorPage('Falha temporária na autenticação. Tente novamente pelo site.');return}
 if(!info.user){errorPage('Você precisa entrar na sua conta antes de continuar.');return}
 user=info.user;
 notificationUI=setupNotificationPopover({db,user,trigger:$('notificationTrigger')});
 try{
  const [w,p]=await Promise.all([walletData(),getProfile()]);
  wallet=w;profile=p;
  $('pageContent').innerHTML=templates[section]();
  await ({
   perfil:openPerfil,beneficios:openBeneficios,convites:openConvites,
   atividades:openAtividades,notificacoes:openNotificacoes,ajuda:async()=>{}
  })[section]();
  // Os avisos do sino são mantidos pela caixinha flutuante.
 }catch(error){
  $('pageContent').innerHTML='<section class="panel"><h2>Não foi possível carregar esta seção</h2><p id="loadError"></p><div class="actions"><a class="gold-button" href="./usuario.html">Voltar à área inicial</a></div></section>';
  $('loadError').textContent='Verifique sua conexão e tente novamente. '+(error?.message||'');
 }
}
start();
