
import {db,identity} from './app-config.js?v=27';
import {setupNotificationPopover} from './notifications-popover-v20.js?v=20';
const $=id=>document.getElementById(id);
const format=n=>new Intl.NumberFormat('pt-BR').format(Number(n)||0);
function setStatus(message,bad=false){const node=$('authStatus');node.textContent=message;node.className='state'+(bad?' error':'')}
function make(tag,value,cls=''){const el=document.createElement(tag);el.textContent=value??'';if(cls)el.className=cls;return el}
const icons={spin:'☸️',coupon:'🎟️',gift:'🎁',digital:'💎'};
async function getCatalog(){
 const res=await db.from('reward_catalog').select('id,title,description,reward_type,coins_cost,stock,partner_id,image_url,terms,status,sort_order').eq('status','preview').order('sort_order',{ascending:true}).order('created_at',{ascending:false}).limit(50);
 if(res.error)throw res.error;
 const items=res.data||[];
 if(!items.length)return [];
 const sponsorResult=await db.from('sponsors').select('id,name').eq('approved',true).limit(100);
 const names=new Map((sponsorResult.data||[]).map(row=>[row.id,row.name]));
 return items.filter(row=>!row.partner_id||names.has(row.partner_id)).map(row=>({...row,partnerName:names.get(row.partner_id)||''}));
}
function rewardCard(item){
 const el=document.createElement('article');el.className='partner-card';
 const image=document.createElement('div');
 const validImg=(()=>{try{return item.image_url&&new URL(item.image_url).protocol==='https:'}catch{return false}})();
 if(validImg){
  const img=document.createElement('img');img.src=item.image_url;img.alt='Imagem de '+item.title;img.loading='lazy';
  img.onerror=()=>img.replaceWith(make('span',icons[item.reward_type]||'🎁','emoji'));
  image.append(img);
 }else image.append(make('span',icons[item.reward_type]||'🎁','emoji'));
 const title=make('strong',item.title);
 const desc=make('p',item.description||'Informações e condições em definição.');
 const partner=item.partnerName?make('p','Apoiador: '+item.partnerName):null;
 const price=item.coins_cost?make('p','Custo em moedas (não ativo): '+format(item.coins_cost)):make('p','Condições de acesso: em definição');
 const badge=make('span','Em preparação','chip');
 el.append(image,title,desc);
 if(partner)el.append(partner);
 el.append(price,badge);
 return el;
}
async function loadPublished(){
 const grid=$('partnerGrid');
 try{
  const catalog=await getCatalog();
  if(!catalog.length){
   $('partnerStatus').textContent='Novas recompensas aparecerão aqui quando os apoiadores forem cadastrados.';
   return;
  }
  grid.replaceChildren();
  for(const item of catalog)grid.append(rewardCard(item));
  $('partnerStatus').textContent=catalog.length+' benefício(s) anunciado(s) — nenhum está disponível para resgate ainda.';
 }catch(error){
  $('partnerStatus').textContent='Não foi possível carregar o catálogo neste momento. Confira a conexão.';
  $('partnerStatus').className='state error';
 }
}
async function loadRedemptions(user){
 if(!user){$('redemptionsList').textContent='Entre na sua conta para consultar o histórico de resgates.';return}
 const {data,error}=await db.from('reward_redemptions').select('id,reward_title,coins_spent,status,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(15);
 if(error){$('redemptionsList').textContent='Histórico indisponível no momento.';return}
 const root=$('redemptionsList');if(!data?.length)return;
 root.className='catalog-list';root.replaceChildren();
 for(const row of data){
  const card=document.createElement('div');card.className='reward-item';
  const name=make('strong',row.reward_title);
  const info=make('small','Moedas: '+format(row.coins_spent)+' • '+row.status);
  const entry=document.createElement('div');entry.className='reward-info';entry.append(name,info);
  card.append(make('span','🎁','reward-icon'),entry);root.append(card);
 }
}
async function start(){
 await loadPublished();
 let account;
 try{account=await identity()}catch{setStatus('Verificação de acesso temporariamente indisponível.',true);return}
 if(account.error){setStatus('Falha na autenticação. Volte à página de login.',true);return}
 if(!account.user){
  $('coinsValue').textContent='—';$('spinsValue').textContent='—';
  setStatus('Entre na sua conta para ver suas moedas e histórico.');
  await loadRedemptions(null);return
 }
 try{
  const {data,error}=await db.rpc('ensure_member_wallet');
  if(error)throw error;
  $('coinsValue').textContent=format(data?.coins);
  $('spinsValue').textContent=format(data?.spins);
  setStatus('Seu saldo foi carregado diretamente da sua conta.');
 }catch(error){setStatus('Não foi possível carregar seu saldo. Atualize a página para tentar novamente.',true)}
 await loadRedemptions(account.user);
 setupNotificationPopover({db,user:account.user,trigger:$('noticeButton')});
}
start();
