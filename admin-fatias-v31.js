import {db,identity} from './app-config.js?v=31';
import {renderWheel,desiredRotation} from './wheel-visual-v31.js?v=31';
const $=id=>document.getElementById(id);
const EMOJIS='🎁 🎀 🎟️ 🎫 🏆 🥇 🥈 🥉 🎉 🎊 🎈 🧧 🪄 📦 💝 🧸 🛍️ 🛒 📱 💻 🎮 🎧 ⌚ 📷 🎤 🎬 🍕 🍔 🍟 🥤 ☕ 🍫 🍬 🍭 🍩 🍪 🎂 🧁 🥗 🍎 🍓 🍇 🍉 🍍 🌹 💐 🪴 🌈 💖 ❤️ 💚 💙 🩷 💎 ⭐ 🌟 ✨ 🍀 🔥 ⚡ 🎯 🎲 🪙 💰 💵 💳 🏠 🚗 🚲 🛵 ⛽ 🧳 ✈️ 🛳️ 🏖️ 🎵 🎸 🎨 📚 🎓 🩺 💊 💪 🏋️ 🐣 🐧 🐥 🦜 🐶 🐱 🐼 🥳 😎 😁 😊 😍 🍯 🎗️ 🎁'.split(' ');
const PALETTE=['#118aee','#f3c858','#1690e7','#f4d26b','#0a75cd','#fff2be','#28c6db','#ffad58','#3d8cf5','#f28cb4','#63caaa','#9275f0'];
const state=$('state'),root=$('slices'),preview=$('wheelPreview');
let user=null,items=[],angle=0,saving=false,spinning=false,serial=0;
const format=n=>new Intl.NumberFormat('pt-BR').format(Number(n)||0);
const make=(tag,value='',cls='')=>{const n=document.createElement(tag);n.textContent=String(value??'');if(cls)n.className=cls;return n};
const safeURL=url=>{try{return new URL(url).protocol==='https:'}catch{return false}};
const normalize=x=>({key:++serial,title:String(x.title??''),emoji:String(x.emoji??'🎁'),
 description:String(x.description??''),color:String(x.color??'#168aee'),weight:Number(x.weight??1),
 enabled:x.enabled!==false,image_url:x.image_url||'',file:null});
const serialize=x=>({title:x.title.trim(),emoji:x.emoji.trim(),description:x.description.trim(),
 color:x.color,weight:Number(x.weight),enabled:x.enabled,image_url:x.image_url||null});
const active=()=>items.filter(x=>x.enabled);
const totalWeight=()=>active().reduce((sum,x)=>sum+(Number(x.weight)||0),0);
function show(message,bad=false){state.textContent=message;state.className='slice-state'+(bad?' error':'')}
function updatePreview(){
 const enabled=active();const weight=totalWeight();
 if(enabled.length>=4)renderWheel(preview,items,{small:true});
 else preview.textContent='Ative ao menos 4 fatias para mostrar a roleta.';
 $('weightSummary').textContent=enabled.length+' fatias visíveis • Peso total '+format(weight)+
 ' • O peso define somente resultados ilustrativos. Não libera moedas nem brindes.';
 root.querySelectorAll('[data-key]').forEach(card=>{
  const item=items.find(x=>String(x.key)===card.dataset.key);
  if(!item)return;
  const p=card.querySelector('.slice-prob');
  if(p)p.textContent=!item.enabled?'Inativa — fora da roda':
   weight>0?'Frequência relativa aproximada: '+((Number(item.weight)||0)*100/weight).toFixed(2)+'%':'Defina ao menos um peso positivo';
  const dot=card.querySelector('.slice-dot');if(dot)dot.style.backgroundColor=/^#[a-f\d]{6}$/i.test(item.color)?item.color:'#1690e7';
 });
}
function field(label,tag,initial,change,{wide=false,attr={},helper=''}={}){
 const wrap=make('label',label,wide?'wide':'');
 const element=document.createElement(tag);
 if(tag==='textarea')element.rows=2;
 if(tag==='input')element.type='text';
 if(initial!=null)element.value=String(initial);
 for(const [k,v] of Object.entries(attr))element.setAttribute(k,v);
 element.addEventListener('input',()=>change(element));
 element.addEventListener('change',()=>change(element));
 wrap.append(element);
 if(helper)wrap.append(make('small',helper));
 return{wrap,element};
}
function picker(item){
 const wrap=make('div','','slice-palette');
 wrap.append(make('div','Escolha um emoji — brindes, serviços, moedas, lazer, comida e mais','slice-palette-title'));
 const grid=make('div','','slice-palette-grid');
 for(const emoji of EMOJIS){
  const b=make('button',emoji);b.type='button';b.title='Usar '+emoji;
  b.addEventListener('click',()=>{item.emoji=emoji;wrap.closest('.slice-entry').querySelector('.slice-emoji-row input').value=emoji;
    wrap.hidden=true;updatePreview()});
  grid.append(b);
 }
 wrap.append(grid);wrap.hidden=true;return wrap;
}
function renderList(){
 root.replaceChildren();
 items.forEach((item,index)=>{
  const card=make('article','','slice-entry');card.dataset.key=String(item.key);
  const header=make('div','','slice-entry-header');
  const number=make('div','','slice-num');const dot=make('span','','slice-dot');
  number.append(dot,make('span','Fatia '+(index+1)));header.append(number);
  const actions=make('div','','slice-actions');
  for(const [icon,verb] of [['↑','up'],['↓','down'],['✕','delete']]){
   const b=make('button',icon,verb==='delete'?'delete':'');b.type='button';
   b.title=verb==='up'?'Mover para cima':verb==='down'?'Mover para baixo':'Excluir fatia';
   b.disabled=(verb==='up'&&index===0)||(verb==='down'&&index===items.length-1);
   b.addEventListener('click',()=>{
    if(verb==='delete'){
     if(items.length<=4){show('Mantenha pelo menos 4 fatias cadastradas.',true);return}
     if(!confirm('Excluir a fatia '+(index+1)+'? A alteração só ficará pública depois de salvar.'))return;
     items.splice(index,1);
    }else{
     const next=verb==='up'?index-1:index+1;
     [items[index],items[next]]=[items[next],items[index]];
    }
    angle=0;preview.style.transform='rotate(0deg)';
    renderList();
   });actions.append(b);
  }
  header.append(actions);card.append(header);
  const controls=make('div','','slice-fields');
  controls.append(field('Nome exibido na fatia','input',item.title,el=>{item.title=el.value;updatePreview()},{attr:{maxlength:28,placeholder:'Ex.: Brinde surpresa'}}).wrap);
  const emojiWrap=make('label','Emoji da fatia');
  const emojiRow=make('div','','slice-emoji-row');
  const emojiInput=document.createElement('input');emojiInput.value=item.emoji;emojiInput.maxLength=32;emojiInput.setAttribute('aria-label','Emoji da fatia '+(index+1));
  emojiInput.addEventListener('input',()=>{item.emoji=emojiInput.value;updatePreview()});
  const emojiButton=make('button','🎨 Escolher');emojiButton.type='button';
  emojiRow.append(emojiInput,emojiButton);emojiWrap.append(emojiRow);
  const palette=picker(item);
  emojiButton.addEventListener('click',()=>{palette.hidden=!palette.hidden});
  emojiWrap.append(palette);controls.append(emojiWrap);
  controls.append(field('Cor da fatia','input',item.color,el=>{item.color=el.value;updatePreview()},{attr:{type:'color'}}).wrap);
  controls.append(field('Peso ilustrativo','input',item.weight,el=>{item.weight=el.value===''?0:Number(el.value);updatePreview()},{attr:{type:'number',min:0,max:1000,step:1},helper:'0 = aparece, mas não sai no giro. A % calculada será mostrada abaixo.'}).wrap);
  const checked=make('label','','slice-checkbox wide');
  const box=document.createElement('input');box.type='checkbox';box.checked=item.enabled;
  box.addEventListener('change',()=>{item.enabled=box.checked;updatePreview()});
  checked.append(box,make('span','Fatia ativa — aparece na roleta principal'));controls.append(checked);
  controls.append(field('Descrição do setor (apenas informativa)','textarea',item.description,el=>{item.description=el.value},{wide:true,attr:{maxlength:240,placeholder:'Detalhes do setor, sem prometer premiação.'}}).wrap);
  controls.append(field('Imagem da fatia (URL HTTPS opcional)','input',item.image_url,el=>{item.image_url=el.value.trim();updatePreview()},{wide:true,attr:{type:'url',placeholder:'https://...'}}).wrap);
  const photo=make('label','Ou enviar uma foto pelo celular (JPG, PNG, WebP — até 5 MB)','wide');
  const upload=document.createElement('input');upload.type='file';upload.accept='image/jpeg,image/png,image/webp';
  upload.addEventListener('change',()=>{
   const f=upload.files?.[0];if(!f){item.file=null;return}
   if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>5*1024*1024){
    upload.value='';item.file=null;show('Envie uma imagem JPG, PNG ou WebP de até 5 MB.',true);return
   }
   item.file=f;
   show('Imagem escolhida. Será enviada ao Supabase quando você salvar.');
  });
  photo.append(upload);controls.append(photo);
  const label=make('div','','slice-prob');controls.append(label);
  card.append(controls);root.append(card);
 });
 updatePreview();
}
function verify(){
 if(items.length<4||items.length>12)throw Error('Cadastre entre 4 e 12 fatias.');
 if(active().length<4)throw Error('Ative pelo menos 4 fatias.');
 if(totalWeight()<=0)throw Error('Pelo menos uma fatia ativa precisa ter peso acima de zero.');
 for(let i=0;i<items.length;i++){
  const x=items[i];
  if(!x.title.trim()||x.title.trim().length>28)throw Error('Confira o nome da fatia '+(i+1));
  if(!x.emoji.trim()||Array.from(x.emoji.trim()).length>32)throw Error('Confira o emoji da fatia '+(i+1));
  if(!/^#[a-fA-F0-9]{6}$/.test(x.color))throw Error('A cor da fatia '+(i+1)+' é inválida.');
  if(!Number.isInteger(Number(x.weight))||x.weight<0||x.weight>1000)throw Error('Peso inválido na fatia '+(i+1));
  if(x.image_url&&!safeURL(x.image_url))throw Error('Use um endereço HTTPS na fatia '+(i+1));
  if(x.description.length>240)throw Error('Descrição muito longa na fatia '+(i+1));
 }
}
async function load(){
 const {data,error}=await db.rpc('admin_get_main_wheel');
 if(error)throw error;
 items=(data||[]).map(normalize);angle=0;preview.style.transform='rotate(0deg)';
 renderList();
}
async function save(){
 if(saving||spinning)return;
 try{verify()}catch(e){show(e.message,true);return}
 saving=true;$('save').disabled=true;show('Salvando fatias e enviando imagens...');
 try{
  for(const item of items){
   if(!item.file)continue;
   const ext=item.file.type==='image/png'?'png':item.file.type==='image/webp'?'webp':'jpg';
   const path=user.id+'/fatias-'+crypto.randomUUID()+'.'+ext;
   const res=await db.storage.from('reward-images').upload(path,item.file,{contentType:item.file.type,upsert:false});
   if(res.error)throw res.error;
   item.image_url=db.storage.from('reward-images').getPublicUrl(path).data.publicUrl;
   item.file=null;
  }
  const {data,error}=await db.rpc('admin_save_main_wheel',{p_slices:items.map(serialize)});
  if(error)throw error;
  show('✅ '+data.active+' fatias ativas foram salvas na roleta principal. Atualize a página pública para conferir.');
  await load();
 }catch(e){show('Não foi possível salvar: '+(e?.message||'erro de conexão'),true)}
 finally{saving=false;$('save').disabled=false}
}
async function trySpin(){
 if(spinning||saving)return;
 try{verify()}catch(e){show(e.message,true);return}
 const candidates=active(),weight=totalWeight(),ticket=Math.random()*weight;
 let acc=0,index=0;
 for(let i=0;i<candidates.length;i++){acc+=Number(candidates[i].weight);if(ticket<acc){index=i;break}}
 spinning=true;$('tryPreview').disabled=true;$('tryResult').textContent='🎡 Girando prévia...';
 angle=desiredRotation(angle,index,candidates.length,5);
 preview.style.transform='rotate('+angle+'deg)';
 await new Promise(ok=>setTimeout(ok,window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?70:4000));
 $('tryResult').textContent='Prévia: '+candidates[index].emoji+' '+candidates[index].title+' — resultado ilustrativo, sem prêmio.';
 spinning=false;$('tryPreview').disabled=false;
}
async function start(){
 try{
  const who=await identity();
  if(who.error||!who.user||who.role!=='admin'){$('restricted').hidden=false;show('Entre com seu acesso administrativo.',true);return}
  user=who.user;$('editor').hidden=false;await load();
  $('addSlice').addEventListener('click',()=>{
   if(items.length>=12){show('O limite é de 12 fatias. Você pode desativar ou excluir uma.',true);return}
   items.push(normalize({title:'Nova fatia',emoji:'🎁',color:PALETTE[items.length],weight:1,enabled:true}));
   renderList();root.lastElementChild?.scrollIntoView({behavior:'smooth',block:'nearest'});
  });
  $('save').addEventListener('click',save);
  $('reset').addEventListener('click',()=>{if(confirm('Descartar alterações não salvas e recarregar a configuração pública?'))load().catch(e=>show(e.message,true))});
  $('tryPreview').addEventListener('click',trySpin);
  show('Editor pronto. Configure as fatias e salve para atualizar a roleta principal.');
 }catch(e){show('Falha ao carregar fatias: '+(e?.message||'erro'),true)}
}
start();
