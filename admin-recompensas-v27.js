
import {db,identity} from './app-config.js?v=27';
const $=id=>document.getElementById(id);
const format=n=>new Intl.NumberFormat('pt-BR').format(Number(n)||0);
const iconFor={spin:'☸️',coupon:'🎟️',gift:'🎁',digital:'💎'};
let items=[],partnerNames=new Map(),partnerImages=new Map(),editing=null,currentUser=null;
function message(text,error=false){
 const target=$('saveMessage');target.textContent=text;target.className='state '+(error?'error':'success')
}
function elem(tag,text,klass=''){const el=document.createElement(tag);el.textContent=text??'';if(klass)el.className=klass;return el}
function safeUrl(value){if(!value)return true;try{return new URL(value).protocol==='https:'}catch{return false}}
function reset(){
 editing=null;$('rewardForm').reset();$('rewardOrder').value='0';$('formTitle').textContent='✚ Cadastrar benefício ou brinde';$('photoPreview').replaceChildren();$('photoPreview').hidden=true;
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
 $('itemPhoto').value='';
 $('photoPreview').replaceChildren();$('photoPreview').hidden=true;
 $('formTitle').textContent='✎ Editar recompensa';
 $('cancel').hidden=false;
 $('save').textContent='Salvar alterações';
 $('editorPanel').scrollIntoView({behavior:'smooth',block:'start'});
}
async function toggleStatus(row){
 const next=row.status==='preview'?'draft':'preview';
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
 if(row.wheel_candidate)details.textContent+=' • Candidato à futura roleta (não ativo)';
 const flag=elem('span',row.status==='preview'?'Em preparação':'Rascunho','chip '+(row.status==='preview'?'public':'draft'));
 body.append(title,details,flag);
 const actions=document.createElement('div');actions.className='actions';
 const e=elem('button','Editar ›','ghost');e.type='button';e.addEventListener('click',()=>edit(row));
 const t=elem('button',row.status==='preview'?'Ocultar':'Divulgar','ghost');t.type='button';t.addEventListener('click',()=>toggleStatus(row));
 const d=elem('button','Excluir','ghost');d.type='button';d.addEventListener('click',()=>remove(row));
 actions.append(e,t,d);card.append(icon,body,actions);return card;
}
async function loadPartners(){
 const {data,error}=await db.from('sponsors').select('id,name,approved,image_url').order('name',{ascending:true}).limit(300);
 if(error)throw error;
 const root=$('partner');root.replaceChildren(new Option('Sem parceiro definido',''));
 partnerNames=new Map();partnerImages=new Map();
 for(const sponsor of data||[]){
  partnerNames.set(sponsor.id,sponsor.name);if(sponsor.image_url)partnerImages.set(sponsor.id,sponsor.image_url);
  root.add(new Option(sponsor.name+(sponsor.approved?'':' (não publicado)'),sponsor.id));
 }
}
async function loadCatalog(){
 const {data,error}=await db.from('reward_catalog').select('id,title,description,reward_type,coins_cost,stock,partner_id,image_url,terms,status,sort_order,created_at,fulfillment_method,valid_until,item_condition,wheel_candidate').order('sort_order',{ascending:true}).order('created_at',{ascending:false}).limit(200);
 if(error){$('listSummary').textContent='Falha ao carregar';$('catalog').textContent='Não foi possível carregar o catálogo: '+error.message;return}
 items=data||[];
 $('totalCount').textContent=format(items.length);
 $('previewCount').textContent=format(items.filter(x=>x.status==='preview').length);
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
 if(type==='gift'&&!partner){message('Selecione o apoiador responsável pelo brinde.',true);return}
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
  reset();message('Cadastro salvo. '+(payload.status==='preview'?'Aparece na vitrine como Em preparação.':'Está visível somente no painel administrativo.'));
  await loadCatalog();
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
 try{await loadPartners();await Promise.all([loadCatalog(),loadRedemptionCount()])}
 catch(error){message('Erro ao carregar dados: '+error.message,true)}
 $('rewardForm').addEventListener('submit',save);
 $('cancel').addEventListener('click',reset);
 $('reload').addEventListener('click',loadCatalog);
 $('partner').addEventListener('change',()=>{
  if($('rewardType').value!=='gift'&&!$('rewardImage').value&&partnerImages.get($('partner').value))$('rewardImage').value=partnerImages.get($('partner').value)
 });
 $('itemPhoto').addEventListener('change',()=>{
  const file=$('itemPhoto').files[0],root=$('photoPreview');root.replaceChildren();root.hidden=!file;
  if(file){const img=document.createElement('img');const url=URL.createObjectURL(file);img.onload=()=>URL.revokeObjectURL(url);img.src=url;img.alt='Prévia da foto selecionada';root.append(img)}
 });
}
start();
