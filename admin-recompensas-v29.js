
import {db,identity} from './app-config.js?v=29';
const $=id=>document.getElementById(id);
const format=n=>new Intl.NumberFormat('pt-BR').format(Number(n)||0);
const iconFor={spin:'☸️',coupon:'🎟️',gift:'🎁',digital:'💎'};
let items=[],partnerNames=new Map(),partnerImages=new Map(),partnerApproved=new Map(),editing=null,currentUser=null,globalSpins=null;
const formatLocalDate=iso=>{if(!iso)return'';const d=new Date(iso);if(!Number.isFinite(d.getTime()))return'';const pad=n=>String(n).padStart(2,'0');return [d.getFullYear(),pad(d.getMonth()+1),pad(d.getDate())].join('-')+'T'+pad(d.getHours())+':'+pad(d.getMinutes())};
const isoOrNull=id=>{const v=$(id).value;if(!v)return null;const date=new Date(v);if(!Number.isFinite(date.getTime()))throw Error('Informe uma data válida em '+id);return date.toISOString()};
async function refreshWheelStats(){
 const {data,error}=await db.rpc('get_admin_wheel_plan_stats');
 if(error){$('wheelProgress').textContent='Não foi possível verificar a quantidade de giros da comunidade.';return}
 globalSpins=Number(data?.total_spins)||0;
 $('wheelProgress').textContent='Giros da comunidade já registrados: '+format(globalSpins)+' • '+format(data?.planned_items)+' item(ns) planejado(s) para futura roleta. Premiação ainda bloqueada.';
}
function message(text,error=false){
 const target=$('saveMessage');target.textContent=text;target.className='state '+(error?'error':'success')
}
function elem(tag,text,klass=''){const el=document.createElement(tag);el.textContent=text??'';if(klass)el.className=klass;return el}
function safeUrl(value){if(!value)return true;try{return new URL(value).protocol==='https:'}catch{return false}}
function reset(){
 editing=null;$('rewardForm').reset();
 $('wheelStart').value='';$('wheelEnd').value='';
 $('wheelMinSpins').value='0';$('wheelChance').value='0';
 $('wheelDailyCap').value='';$('wheelPerUserCap').value='1';$('wheelNotes').value='';
 $('rewardOrder').value='0';$('formTitle').textContent='✚ Cadastrar benefício ou brinde';$('photoPreview').replaceChildren();$('photoPreview').hidden=true;
 $('cancel').hidden=true;$('save').textContent='Salvar recompensa';$('saveMessage').textContent='';
}
function edit(row){
 editing=row.id;
 $('rewardTitle').value=row.title||'';
 $('costCoins').value=row.coins_cost??'';
 $('stock').value=row.stock??'';
 $('rewardType').value=row.reward_type;
 $('partner').value=row.partner_id||'';
 $('details').value=row.description||'';
 $('terms').value=row.terms||'';
 $('rewardImage').value=row.image_url||'';
 $('rewardOrder').value=row.sort_order??0;
 $('rewardStatus').value=row.status||'draft';
 $('fulfillmentMethod').value=row.fulfillment_method||'to_define';
 $('validUntil').value=row.valid_until||'';
 $('itemCondition').value=row.item_condition||'new';
 $('wheelCandidate').checked=Boolean(row.wheel_candidate);
 $('wheelStart').value=formatLocalDate(row.wheel_starts_at);
 $('wheelEnd').value=formatLocalDate(row.wheel_ends_at);
 $('wheelMinSpins').value=row.wheel_min_prior_spins??0;
 $('wheelChance').value=((row.wheel_chance_bps||0)/100).toFixed(2);
 $('wheelDailyCap').value=row.wheel_daily_cap??'';
 $('wheelPerUserCap').value=row.wheel_per_user_cap??1;
 $('wheelNotes').value=row.wheel_notes||'';
 $('itemPhoto').value='';
 $('photoPreview').replaceChildren();$('photoPreview').hidden=true;
 $('formTitle').textContent='✎ Editar recompensa';
 $('cancel').hidden=false;
 $('save').textContent='Salvar alterações';
 $('editorPanel').scrollIntoView({behavior:'smooth',block:'start'});
}
async function toggleStatus(row){
 const next=row.status==='preview'||row.status==='active'?'draft':'preview';
 if(next==='preview'&&row.reward_type==='gift'&&(!row.partner_id||!partnerApproved.get(row.partner_id))){message('Brindes só podem ser divulgados com um apoiador aprovado.',true);return}
 if(next==='preview'&&!confirm('Divulgar '+row.title+' como “Em preparação”? Nenhum resgate será habilitado.'))return;
 const {error}=await db.from('reward_catalog').update({status:next,updated_at:new Date().toISOString()}).eq('id',row.id);
 if(error){message('Erro ao alterar situação: '+error.message,true);return}
 message(next==='preview'?'Recompensa divulgada como Em preparação.':'Recompensa retirada da vitrine.');
 await loadCatalog();
}
async function remove(row){
 if(!confirm('Excluir definitivamente o cadastro “'+row.title+'”?'))return;
 const {error}=await db.from('reward_catalog').delete().eq('id',row.id);
 if(error){message('Não foi possível excluir: '+error.message,true);return}
 if(editing===row.id)reset();
 message('Cadastro excluído.');await loadCatalog();
}
function makeEntry(row){
 const card=document.createElement('article');card.className='catalog-entry';
 const icon=elem('span',iconFor[row.reward_type]||'🎁','reward-icon');
 const body=document.createElement('div');body.className='reward-info';
 const title=elem('strong',row.title);
 const details=elem('p',(row.coins_cost?format(row.coins_cost)+' moedas':'Moedas a definir')+' • '+(row.stock===null?'estoque a definir':format(row.stock)+' unidades'));
 const name=partnerNames.get(row.partner_id);
 if(name)details.textContent+=' • '+name;
 if(row.wheel_candidate){
  details.textContent+=' • Programação preparada (premiação bloqueada)';
  if(row.wheel_starts_at)details.textContent+=' • Início: '+new Date(row.wheel_starts_at).toLocaleString('pt-BR');
  if(row.wheel_ends_at)details.textContent+=' • Fim: '+new Date(row.wheel_ends_at).toLocaleString('pt-BR');
  details.textContent+=' • Após '+format(row.wheel_min_prior_spins||0)+' giros globais';
  details.textContent+=' • Chance planejada: '+((row.wheel_chance_bps||0)/100).toFixed(2)+'%';
  if(row.wheel_daily_cap)details.textContent+=' • Limite diário: '+format(row.wheel_daily_cap);
 }
 const flag=elem('span',row.status==='active'?'Garantido disponível':row.status==='preview'?'Em preparação':'Rascunho','chip '+(row.status!=='draft'?'public':'draft'));
 body.append(title,details,flag);
 const actions=document.createElement('div');actions.className='actions';
 const e=elem('button','Editar ›','ghost');e.type='button';e.addEventListener('click',()=>edit(row));
 const t=elem('button',row.status==='preview'||row.status==='active'?'Ocultar':'Divulgar','ghost');t.type='button';t.addEventListener('click',()=>toggleStatus(row));
 const d=elem('button','Excluir','ghost');d.type='button';d.addEventListener('click',()=>remove(row));
 actions.append(e,t,d);card.append(icon,body,actions);return card;
}
async function loadPartners(){
 const {data,error}=await db.from('sponsors').select('id,name,approved,image_url').order('name',{ascending:true}).limit(300);
 if(error)throw error;
 const root=$('partner');root.replaceChildren(new Option('Sem parceiro definido',''));
 partnerNames=new Map();partnerImages=new Map();partnerApproved=new Map();
 for(const sponsor of data||[]){
  partnerNames.set(sponsor.id,sponsor.name);partnerApproved.set(sponsor.id,Boolean(sponsor.approved));if(sponsor.image_url)partnerImages.set(sponsor.id,sponsor.image_url);
  root.add(new Option(sponsor.name+(sponsor.approved?'':' (não publicado)'),sponsor.id));
 }
}
async function loadCatalog(){
 const {data,error}=await db.from('reward_catalog').select('id,title,description,reward_type,coins_cost,stock,partner_id,image_url,terms,status,sort_order,created_at,fulfillment_method,valid_until,item_condition,wheel_candidate,wheel_starts_at,wheel_ends_at,wheel_min_prior_spins,wheel_chance_bps,wheel_daily_cap,wheel_per_user_cap,wheel_notes').order('sort_order',{ascending:true}).order('created_at',{ascending:false}).limit(200);
 if(error){$('listSummary').textContent='Falha ao carregar';$('catalog').textContent='Não foi possível carregar o catálogo: '+error.message;return}
 items=data||[];
 $('totalCount').textContent=format(items.length);
 $('previewCount').textContent=format(items.filter(x=>x.status==='preview'||x.status==='active').length);
 $('listSummary').textContent=format(items.length)+' cadastro(s)';
 const list=$('catalog');list.replaceChildren();
 if(!items.length){list.append(elem('p','Nenhuma recompensa cadastrada. Use o formulário para criar o primeiro rascunho.','empty'));return}
 for(const row of items)list.append(makeEntry(row));
}
async function loadRedemptionCount(){
 const {count,error}=await db.from('reward_redemptions').select('id',{count:'exact',head:true});
 $('redemptionCount').textContent=error?'—':format(count||0);
}
async function save(event){
 event.preventDefault();
 const title=$('rewardTitle').value.trim();
 const description=$('details').value.trim();
 const terms=$('terms').value.trim();
 const image=$('rewardImage').value.trim();
 const rawCost=$('costCoins').value.trim(),rawStock=$('stock').value.trim();
 const cost=rawCost===''?null:Number(rawCost),stock=rawStock===''?null:Number(rawStock);
 const order=Number($('rewardOrder').value);
 const type=$('rewardType').value,partner=$('partner').value;
 const photo=$('itemPhoto').files[0];
 const wheelCandidate=$('wheelCandidate').checked;
 let startAt,endAt;
 try{startAt=isoOrNull('wheelStart');endAt=isoOrNull('wheelEnd')}
 catch(error){message(error.message,true);return}
 const minSpins=Number($('wheelMinSpins').value);
 const chance=Number($('wheelChance').value);
 const dailyRaw=$('wheelDailyCap').value.trim();
 const dailyLimit=dailyRaw===''?null:Number(dailyRaw);
 const userLimit=Number($('wheelPerUserCap').value);
 const wheelNotes=$('wheelNotes').value.trim();
 if(startAt&&endAt&&new Date(startAt)>=new Date(endAt)){message('A data de encerramento deve ser posterior ao início.',true);return}
 if(!Number.isInteger(minSpins)||minSpins<0||minSpins>10000000){message('O mínimo de giros deve ficar entre 0 e 10 milhões.',true);return}
 if(!Number.isFinite(chance)||chance<0||chance>100||Math.abs(Math.round(chance*100)-chance*100)>0.000001){message('Use uma chance planejada entre 0% e 100%, com até duas casas decimais.',true);return}
 if(dailyLimit!==null&&(!Number.isInteger(dailyLimit)||dailyLimit<1||dailyLimit>1000000)){message('O limite diário deve ser um número positivo.',true);return}
 if(!Number.isInteger(userLimit)||userLimit<1||userLimit>1000){message('O limite por usuário deve ficar entre 1 e 1000.',true);return}
 if(wheelNotes.length>1200){message('As observações podem ter até 1.200 caracteres.',true);return}
 if(wheelCandidate&&stock!==null&&dailyLimit!==null&&dailyLimit>stock){message('Limite diário não pode ultrapassar o estoque cadastrado.',true);return}
 if(type==='gift'&&!partner){message('Selecione o apoiador responsável pelo brinde.',true);return}
 const guaranteed=$('rewardStatus').value==='active';
 if(guaranteed){
  if(!['coupon','digital'].includes(type)){message('Benefícios garantidos são apenas cupons ou benefícios digitais, sem sorteio.',true);return}
  if(!partner||!partnerApproved.get(partner)){message('Escolha um apoiador aprovado para conceder o benefício garantido.',true);return}
  if(wheelCandidate){message('Para disponibilizar um benefício garantido, desmarque a participação na roleta.',true);return}
  if(cost!==null||stock!==null){message('Benefício garantido precisa ter moedas e estoque em branco, pois deve estar disponível a todos os elegíveis.',true);return}
  if(terms.length<10){message('Descreva regras e como utilizar o benefício (mínimo 10 caracteres).',true);return}
  if(!['digital','pickup'].includes($('fulfillmentMethod').value)){message('Informe entrega digital ou retirada para o cupom garantido.',true);return}
  if($('validUntil').value&&$('validUntil').value<new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())){message('A validade do benefício deve ser hoje ou uma data futura.',true);return}
 }
 if(type==='gift'&&$('rewardStatus').value==='preview'&&!partnerApproved.get(partner)){message('Para divulgar um brinde, o apoiador precisa estar aprovado. Você pode salvar como rascunho.',true);return}
 if(type==='gift'&&(stock===null||stock<1)){message('Informe a quantidade de itens do apoiador (no mínimo 1).',true);return}
 if(wheelCandidate&&type!=='gift'){message('A reserva para futura roleta é exclusiva de itens do tipo brinde.',true);return}
 if(photo&&(!['image/jpeg','image/png','image/webp'].includes(photo.type)||photo.size>5*1024*1024)){message('A foto deve ser JPG, PNG ou WebP com até 5 MB.',true);return}
 if(title.length<2){message('Informe um título válido.',true);return}
 if(cost!==null&&(!Number.isInteger(cost)||cost<1||cost>1000000)){message('Custo deve ser um número inteiro positivo.',true);return}
 if(stock!==null&&(!Number.isInteger(stock)||stock<0||stock>1000000)){message('Estoque deve ser um número inteiro positivo ou zero.',true);return}
 if(!Number.isInteger(order)||order<0||order>9999){message('Ordem deve ser um número entre 0 e 9999.',true);return}
 if(!safeUrl(image)){message('Use HTTPS na URL da imagem.',true);return}
 const payload={
  title,description,terms,reward_type:$('rewardType').value,coins_cost:cost,stock,
  partner_id:partner||null,image_url:image||null,
  fulfillment_method:$('fulfillmentMethod').value,valid_until:$('validUntil').value||null,
  item_condition:$('itemCondition').value,wheel_candidate:wheelCandidate,
  wheel_starts_at:startAt,wheel_ends_at:endAt,wheel_min_prior_spins:minSpins,
  wheel_chance_bps:Math.round(chance*100),wheel_daily_cap:dailyLimit,
  wheel_per_user_cap:userLimit,wheel_notes:wheelNotes,
  status:$('rewardStatus').value,sort_order:order,updated_at:new Date().toISOString()
 };
 const button=$('save');button.disabled=true;button.textContent='Salvando...';
 try{
  if(photo){
    if(!currentUser)throw new Error('Sessão expirada; entre como administrador novamente.');
    const extension=photo.type==='image/png'?'png':photo.type==='image/webp'?'webp':'jpg';
    const uuid=crypto.randomUUID();
    const path=currentUser.id+'/'+uuid+'.'+extension;
    const uploaded=await db.storage.from('reward-images').upload(path,photo,{contentType:photo.type,upsert:false});
    if(uploaded.error)throw uploaded.error;
    payload.image_url=db.storage.from('reward-images').getPublicUrl(path).data.publicUrl;
  }
  const result=editing?await db.from('reward_catalog').update(payload).eq('id',editing):await db.from('reward_catalog').insert(payload);
  if(result.error)throw result.error;
  reset();message('Cadastro salvo. '+(payload.status==='active'?'Cupom garantido disponível aos participantes elegíveis.':payload.status==='preview'?'Aparece como Em preparação.':'Visível somente no painel administrativo.'));
  await Promise.all([loadCatalog(),refreshWheelStats()]);
 }catch(error){message('Não foi possível salvar: '+error.message,true)}
 finally{button.disabled=false;button.textContent=editing?'Salvar alterações':'Salvar recompensa'}
}
async function start(){
 let session;
 try{session=await identity()}catch(error){$('authStatus').textContent='Não foi possível verificar seu acesso.';$('accessDenied').hidden=false;return}
 if(session.error||!session.user||session.role!=='admin'){
  $('authStatus').textContent='Faça login como administrador para continuar.';$('accessDenied').hidden=false;return
 }
 currentUser=session.user;
 $('authStatus').textContent='Painel conectado • '+(session.user.email||'administrador');
 $('editor').hidden=false;
 try{await loadPartners();await Promise.all([loadCatalog(),loadRedemptionCount(),refreshWheelStats()])}
 catch(error){message('Erro ao carregar dados: '+error.message,true)}
 $('rewardForm').addEventListener('submit',save);
 $('cancel').addEventListener('click',reset);
 $('reload').addEventListener('click',loadCatalog);
 $('rewardStatus').addEventListener('change',()=>{
  if($('rewardStatus').value==='active'&&['coupon','digital'].includes($('rewardType').value)){
   $('costCoins').value='';$('stock').value='';$('wheelCandidate').checked=false;
   if($('fulfillmentMethod').value==='to_define')$('fulfillmentMethod').value='digital';
   message('Modo garantido: grátis, sem sorteio e disponível a todos os elegíveis (uma emissão por conta).');
  }
 });
  $('partner').addEventListener('change',()=>{
  if($('rewardType').value!=='gift'&&!$('rewardImage').value&&partnerImages.get($('partner').value))$('rewardImage').value=partnerImages.get($('partner').value)
 });
 $('itemPhoto').addEventListener('change',()=>{
  const file=$('itemPhoto').files[0],root=$('photoPreview');root.replaceChildren();root.hidden=!file;
  if(file){const img=document.createElement('img');const url=URL.createObjectURL(file);img.onload=()=>URL.revokeObjectURL(url);img.src=url;img.alt='Prévia da foto selecionada';root.append(img)}
 });
}
start();
