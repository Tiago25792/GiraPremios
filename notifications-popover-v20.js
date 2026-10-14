/* GiraPrêmios V2.0 — painel de notificações flutuante.
  Observações: usa atividades reais do Supabase e a mesma chave de leitura
  já usada pelo histórico; não oferece notificações push do sistema. */
const BR=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
const EMOJIS={checkin:'🪙',spin:'☸️',invite:'👥',invite_daily:'🎁',milestone:'🏆'};
const countFormat=x=>new Intl.NumberFormat('pt-BR').format(x);
const readKey=userId=>'gp_seen_'+userId;
const storedGet=k=>{try{return localStorage.getItem(k)}catch{return null}};
const storedSet=(k,value)=>{try{localStorage.setItem(k,value);return true}catch{return false}};

export function setupNotificationPopover({db,user,trigger}){
 if(!db||!user?.id||!trigger)return;
 if(trigger.dataset.notificationPopoverReady==='1')return;
 trigger.dataset.notificationPopoverReady='1';
 trigger.type='button';trigger.classList.add('notification-trigger');
 trigger.setAttribute('aria-controls','notificationPopover');
 trigger.setAttribute('aria-expanded','false');
 trigger.setAttribute('aria-haspopup','dialog');
 trigger.setAttribute('aria-label','Abrir notificações');
 const oldDot=trigger.querySelector('.member-alert-dot,#notificationDot');
 if(oldDot){oldDot.hidden=true;oldDot.style.display='none'}
 const countBadge=document.createElement('span');
 countBadge.className='notification-pop-badge';
 countBadge.hidden=true;
 countBadge.setAttribute('aria-hidden','true');
 trigger.append(countBadge);
 const panel=document.createElement('section');
 panel.className='notification-popover';
 panel.id='notificationPopover';
 panel.hidden=true;
 panel.setAttribute('role','dialog');
 panel.setAttribute('aria-label','Suas notificações');
 panel.setAttribute('aria-modal','false');
 const top=document.createElement('div');top.className='notification-pop-head';
 const heading=document.createElement('div');
 const title=document.createElement('h2');title.textContent='🔔 Notificações';
 const subtitle=document.createElement('small');subtitle.id='notificationPopoverSub';subtitle.textContent='Atividades recentes da sua conta';
 heading.append(title,subtitle);
 const close=document.createElement('button');close.className='notification-pop-close';close.type='button';close.textContent='×';close.setAttribute('aria-label','Fechar notificações');
 top.append(heading,close);
 const list=document.createElement('div');list.className='notification-pop-list';list.id='notificationPopoverList';
 const footer=document.createElement('div');footer.className='notification-pop-foot';
 const mark=document.createElement('button');mark.className='notification-pop-action';mark.type='button';mark.textContent='✓ Marcar como lidas';mark.disabled=true;
 const history=document.createElement('a');history.className='notification-pop-link';history.href='./atividades.html';history.textContent='Ver histórico completo ›';
 footer.append(mark,history);panel.append(top,list,footer);document.body.append(panel);
 let activities=[],fetching=false,lastError='',open=false;
 const lastSeen=()=>{const x=storedGet(readKey(user.id));const date=x?new Date(x).getTime():0;return Number.isFinite(date)?date:0};
 const unseen=item=>{const t=new Date(item.created_at).getTime();return Number.isFinite(t)&&t>lastSeen()};
 const unreadCount=()=>activities.filter(unseen).length;
 function refreshBadge(){
  const n=unreadCount();
  countBadge.hidden=n===0;countBadge.textContent=n>9?'9+':String(n);
  trigger.setAttribute('aria-label',n?'Abrir notificações, '+(n>9?'mais de 9':String(n))+' não lidas':'Abrir notificações');
  subtitle.textContent=n?(countFormat(n)+' recente(s) não lida(s)'):'Atividades recentes da sua conta';
  mark.disabled=!n||!activities.length;
 }
 function message(text){
  list.replaceChildren();
  const node=document.createElement('div');node.className='notification-pop-empty';node.textContent=text;list.append(node)
 }
 function render(){
  list.replaceChildren();
  if(lastError){message('Não foi possível carregar os avisos. Feche e abra novamente para tentar.');return}
  if(!activities.length){message('Ainda não há avisos. Seus bônus, giros e convites aparecerão aqui.');return}
  for(const item of activities.slice(0,8)){
   const row=document.createElement('article');row.className='notification-pop-entry';
   if(unseen(item))row.classList.add('is-unread');
   const icon=document.createElement('span');icon.className='notification-pop-icon';icon.setAttribute('aria-hidden','true');icon.textContent=EMOJIS[item.kind]||'🔔';
   const body=document.createElement('div');body.className='notification-pop-copy';
   const ttl=document.createElement('strong');ttl.className='notification-pop-title';ttl.textContent=item.title||'Nova atividade';
   const desc=document.createElement('span');desc.className='notification-pop-desc';desc.textContent=item.description||'Atualização da sua conta';
   const meta=document.createElement('div');meta.className='notification-pop-meta';
   const when=document.createElement('time');when.dateTime=item.created_at;
   try{when.textContent=BR.format(new Date(item.created_at))}catch{when.textContent='Recente'}
   meta.append(when);
   if(Number(item.coins_delta)>0){
    const gain=document.createElement('span');gain.className='notification-pop-gain';gain.textContent='+'+countFormat(item.coins_delta)+' moedas';meta.append(gain)
   }
   body.append(ttl,desc,meta);row.append(icon,body);
   if(unseen(item)){
    const dot=document.createElement('span');dot.className='notification-pop-unread';dot.setAttribute('aria-label','Não lida');row.append(dot)
   }
   list.append(row);
  }
 }
 async function load(){
  if(fetching)return;
  fetching=true;
  if(open)message('Carregando notificações...');
  try{
   const {data,error}=await db.from('member_activities')
     .select('id,kind,title,description,coins_delta,created_at')
     .eq('user_id',user.id)
     .order('created_at',{ascending:false})
     .limit(20);
   if(error)throw error;
   activities=data||[];lastError='';
  }catch(error){lastError=error?.message||'Falha de conexão';activities=[]}
  finally{fetching=false;refreshBadge();if(open)render()}
 }
 function position(){
  if(!open)return;
  const rect=trigger.getBoundingClientRect();
  const gutter=11;
  const topPos=Math.max(gutter,Math.min(window.innerHeight-145,rect.bottom+9));
  panel.style.top=Math.round(topPos)+'px';
  panel.style.right=Math.round(Math.max(gutter,window.innerWidth-rect.right))+'px';
  panel.style.maxHeight=Math.max(125,window.innerHeight-topPos-12)+'px';
 }
 function hide(restoreFocus=false){
  if(!open)return;
  open=false;panel.hidden=true;trigger.setAttribute('aria-expanded','false');
  if(restoreFocus)trigger.focus();
 }
 async function toggle(){
  if(open){hide(false);return}
  open=true;panel.hidden=false;trigger.setAttribute('aria-expanded','true');position();render();
  if(!fetching)await load();
 }
 trigger.addEventListener('click',toggle);
 close.addEventListener('click',()=>hide(true));
 mark.addEventListener('click',()=>{
  if(!activities.length)return;
  const newest=activities[0].created_at;
  if(!storedSet(readKey(user.id),newest)){message('Não foi possível salvar a leitura neste navegador.');return}
  refreshBadge();render();
 });
 document.addEventListener('pointerdown',event=>{
  if(open&&!panel.contains(event.target)&&!trigger.contains(event.target))hide(false);
 });
 document.addEventListener('keydown',event=>{if(open&&event.key==='Escape'){event.preventDefault();hide(true)}});
 window.addEventListener('resize',position);
 window.addEventListener('scroll',position,{passive:true});
 load().catch(()=>{});
 return {refresh:load,close:hide};
}
