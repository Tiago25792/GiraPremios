/* Preview of sponsor gifts planned for the wheel. NO prize is awarded here. */
import {db} from './app-config.js?v=28';
const root=document.getElementById('plannedGifts');
const cards=document.getElementById('plannedGiftCards');
const intro=document.getElementById('plannedGiftIntro');
const safeImage=url=>{try{return new URL(url).protocol==='https:'}catch{return false}};
const text=(tag,value,className='')=>{const node=document.createElement(tag);node.textContent=String(value??'');if(className)node.className=className;return node};
async function load(){
 if(!root||!cards)return;
 const {data,error}=await db.from('reward_catalog')
  .select('id,title,description,image_url,partner_id,wheel_starts_at,wheel_ends_at,valid_until')
  .eq('status','preview').eq('wheel_candidate',true)
  .order('sort_order',{ascending:true}).limit(30);
 if(error){intro.textContent='Não foi possível carregar os brindes planejados.';root.hidden=false;return}
 if(!data?.length)return;
 const approved=await db.from('sponsors').select('id,name').eq('approved',true).limit(200);
 if(approved.error){intro.textContent='Brindes temporariamente indisponíveis.';root.hidden=false;return}
 const partners=new Map((approved.data||[]).map(x=>[x.id,x.name]));
 const items=data.filter(x=>x.partner_id&&partners.has(x.partner_id));
 if(!items.length)return;
 for(const item of items){
  const card=document.createElement('article');card.className='gift-preview';
  if(safeImage(item.image_url)){
   const img=document.createElement('img');img.src=item.image_url;img.loading='lazy';img.alt='Imagem de '+item.title;
   img.onerror=()=>img.replaceWith(text('span','🎁','gift-emoji'));card.append(img);
  }else card.append(text('span','🎁','gift-emoji'));
  const content=document.createElement('div');content.className='gift-preview-copy';
  content.append(text('strong',item.title),text('small','Apoiador: '+partners.get(item.partner_id)));
  if(item.description)content.append(text('p',item.description));
  if(item.wheel_starts_at){
   const date=new Date(item.wheel_starts_at);
   if(Number.isFinite(date.getTime()))content.append(text('small','Início planejado: '+date.toLocaleString('pt-BR')));
  }
  content.append(text('span','Premiação ainda não habilitada','gift-status'));
  card.append(content);cards.append(card);
 }
 intro.textContent='Itens cadastrados pelos apoiadores para uma futura promoção. As datas são apenas previsões, não garantem que o prêmio será distribuído.';
 root.hidden=false;
}
load().catch(()=>{if(intro)intro.textContent='Falha ao consultar os brindes previstos.'});
