import {db,identity} from './app-config.js?v=30';
const $=id=>document.getElementById(id);
const fmt=n=>new Intl.NumberFormat('pt-BR').format(Number(n)||0);
const sec=(tag,value='',cls='')=>{const n=document.createElement(tag);n.textContent=String(value??'');if(cls)n.className=cls;return n};
const safeImg=url=>{try{return url&&new URL(url).protocol==='https:'}catch{return false}};
const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
let admin=null,busy=false,angle=0,gifts=[],totalCount=0;
const wheel=$('testWheel'),spinOnce=$('spinOnce'),batch25=$('batch25'),batch100=$('batch100'),reset=$('resetTests');
const pendingKey=()=>admin?'gp_lab_spin_pending_'+admin.id:null;
function getPending(){
 if(!admin)return null;
 try{
  const p=JSON.parse(sessionStorage.getItem(pendingKey())||'null');
  return p&&/^[0-9a-f-]{36}$/.test(p.id)&&Number.isInteger(p.player)&&p.player>=1&&p.player<=10000?p:null;
 }catch{return null}
}
function setPending(data){try{sessionStorage.setItem(pendingKey(),JSON.stringify(data));return true}catch{return false}}
function clearPending(){try{sessionStorage.removeItem(pendingKey())}catch{}}
function status(message,err=false){
 const n=$('status');n.textContent=message;n.className='lab-status'+(err?' is-error':'');
}
function result(message){$('spinResult').textContent=message}
function setBusy(value){
 busy=value;
 for(const btn of [spinOnce,batch25,batch100,reset])btn.disabled=value;
 spinOnce.textContent=value?'⏳ Processando...':getPending()?'🔁 Recuperar giro':'🎡 Girar 1 vez';
 batch25.textContent=value?'Aguarde...':'⚡ Simular 25 giros';
 batch100.textContent=value?'Aguarde...':'⚡ Simular 100 giros';
}
function photo(target,url,alt){
 if(!safeImg(url))return target.append(sec('span','🎁','event-icon'));
 const img=document.createElement('img');img.loading='lazy';img.alt=alt;img.src=url;
 img.onerror=()=>img.replaceWith(sec('span','🎁','event-icon'));
 target.append(img);
}
function getPlayer(){
 const n=Number($('player').value);
 if(!Number.isInteger(n)||n<1||n>10000)throw Error('O número do participante fictício deve estar entre 1 e 10.000.');
 return n;
}
function getDate(){
 const raw=$('testAt').value;
 if(!raw)return null;
 const d=new Date(raw);
 if(!Number.isFinite(d.getTime()))throw Error('Informe uma data e hora de teste válidas.');
 return d.toISOString();
}
function displayGift(){
 const root=$('giftPreview');root.replaceChildren();
 const selected=gifts.find(g=>g.id===$('giftSelect').value);
 if(!selected){
  root.append(sec('span','🧰 Ainda não há brinde selecionado. Cadastre um item, marque como candidato à roleta e salve.','lab-no-gift'));
  return;
 }
 photo(root,selected.image_url,'Foto de '+selected.title);
 const info=sec('div','','lab-gift-desc');
 info.append(sec('strong',selected.title));
 const line=[
  'Chance planejada: '+((Number(selected.wheel_chance_bps)||0)/100).toFixed(2)+'%',
  'Estoque do catálogo: '+fmt(selected.stock),
  'Após '+fmt(selected.wheel_min_prior_spins)+' giro(s) globais',
  'Máximo por dia: '+(selected.wheel_daily_cap??'sem limite cadastrado'),
  'Por participante: '+fmt(selected.wheel_per_user_cap)
 ];
 for(const l of line)info.append(sec('small',l));
 if(selected.wheel_starts_at)info.append(sec('small','Começa: '+new Date(selected.wheel_starts_at).toLocaleString('pt-BR')));
 if(selected.wheel_ends_at)info.append(sec('small','Termina: '+new Date(selected.wheel_ends_at).toLocaleString('pt-BR')));
 info.append(sec('small','⚠️ Apenas simulação. O brinde não é entregue.'));
 root.append(info);
}
async function loadGifts(){
 const {data,error}=await db.from('reward_catalog')
  .select('id,title,image_url,stock,status,reward_type,wheel_candidate,partner_id,wheel_chance_bps,wheel_min_prior_spins,wheel_daily_cap,wheel_per_user_cap,wheel_starts_at,wheel_ends_at')
  .eq('reward_type','gift').eq('wheel_candidate',true)
  .order('sort_order',{ascending:true}).limit(100);
 if(error)throw error;
 gifts=data||[];
 const select=$('giftSelect');const prev=select.value;select.replaceChildren();
 if(!gifts.length){select.add(new Option('Nenhum brinde candidato cadastrado',''));select.disabled=true}
 else{
  select.disabled=false;
  for(const item of gifts)select.add(new Option(item.title+' • '+((item.wheel_chance_bps||0)/100).toFixed(2)+'%',item.id));
  if(gifts.some(g=>g.id===prev))select.value=prev;
 }
 displayGift();
}
async function loadStatsAndHistory(){
 const table=db.from('admin_wheel_test_plays');
 const a=await Promise.all([
  table.select('request_id',{count:'exact',head:true}),
  db.from('admin_wheel_test_plays').select('request_id',{count:'exact',head:true}).eq('result_kind','gift'),
  db.from('admin_wheel_test_plays').select('request_id',{count:'exact',head:true}).not('simulated_delivery_at','is',null),
  db.from('admin_wheel_test_plays')
   .select('request_id,test_player,draw_at,sector_index,result_kind,sample_coins,gift_title,gift_image_url,simulated_delivery_at,created_at')
   .order('created_at',{ascending:false}).limit(40)
 ]);
 for(const item of a)if(item.error)throw item.error;
 totalCount=a[0].count||0;
 $('statTotal').textContent=fmt(totalCount);
 $('statGifts').textContent=fmt(a[1].count||0);
 $('statDelivered').textContent=fmt(a[2].count||0);
 const list=$('testHistory');list.replaceChildren();
 if(!a[3].data?.length){list.append(sec('p','Nenhum teste registrado. Faça um giro ou simule um lote para começar.'));return}
 for(const evt of a[3].data){
  const card=sec('article','','lab-history-row');
  card.append(sec('span',evt.result_kind==='gift'?'🎁':'🪙','event-icon'));
  const body=sec('div','','event-description');
  const title=evt.result_kind==='gift'?'BRINDE SIMULADO: '+evt.gift_title:'Moedas ilustrativas: '+fmt(evt.sample_coins);
  body.append(sec('strong',title));
  body.append(sec('small','Participante fictício #'+evt.test_player+' • '+new Date(evt.draw_at).toLocaleString('pt-BR')));
  card.append(body);
  if(evt.result_kind==='gift'){
   if(evt.simulated_delivery_at)card.append(sec('span','Entrega simulada ✓','lab-sim-delivery'));
   else{
    const b=sec('button','📦 Simular entrega');b.type='button';
    b.addEventListener('click',()=>markDelivery(evt.request_id,b));card.append(b);
   }
  }
  list.append(card);
 }
}
async function animate(sector){
 const wanted=(360-60*sector)%360;
 const current=((angle%360)+360)%360;
 angle+=360*5+(wanted-current+360)%360;
 wheel.style.transform='rotate('+angle+'deg)';
 await new Promise(resolve=>setTimeout(resolve,reduced()?60:3500));
}
function showResult(data){
 const block=$('prizeVisual');block.replaceChildren();
 if(data.result_kind==='gift'){
  result('🎁 Saiu um BRINDE NA SIMULAÇÃO! Nenhum prêmio real foi concedido.');
  photo(block,data.gift_image_url,'Foto de '+data.gift_title);
  const info=sec('div');info.append(sec('strong',data.gift_title||'Brinde do apoiador'));
  info.append(sec('small','TESTE: resultado virtual, sem sorteio ou entrega real. Use “Simular entrega” no histórico.'));
  block.append(info);block.hidden=false;
 }else{
  result('🪙 Resultado do teste: '+fmt(data.coins)+' moedas ilustrativas. Nenhuma moeda foi creditada.');
  block.hidden=true;
 }
}
async function singleSpin(){
 if(!admin||busy)return;
 let pending=getPending();
 if(!pending){
  let player,at;
  try{player=getPlayer();at=getDate()}catch(e){status(e.message,true);return}
  if(!crypto?.randomUUID){status('Atualize o navegador para gerar identificadores seguros para o teste.',true);return}
  pending={id:crypto.randomUUID(),player,at};
  if(!setPending(pending)){status('Seu navegador precisa permitir armazenamento temporário para evitar testes duplicados.',true);return}
 }
 setBusy(true);
 status('Registrando giro de teste com as regras de disponibilidade e probabilidade...');
 try{
  const {data,error}=await db.rpc('admin_test_wheel_spin',{
   p_request_id:pending.id,p_test_player:pending.player,p_at:pending.at
  });
  if(error)throw error;
  if(!data?.ok)throw Error('O banco não confirmou este teste');
  await animate(Number(data.sector_index));
  showResult(data);
  clearPending();
  status((data.replayed?'Jogada recuperada sem duplicar. ':'Giro de teste concluído. ')+
    'Não alterou saldo, estoque nem entregou prêmios.');
  await loadStatsAndHistory();
 }catch(e){
  status('Não foi possível confirmar o giro: '+(e?.message||'falha')+
  '. Toque em “Recuperar giro” para consultar o mesmo teste.',true);
 }finally{setBusy(false)}
}
async function runBatch(count){
 if(!admin||busy)return;
 if(getPending()){status('Recupere o giro individual pendente antes de executar um lote.',true);return}
 let player,at;
 try{player=getPlayer();at=getDate()}catch(e){status(e.message,true);return}
 const start=((player+totalCount-1)%10000)+1;
 setBusy(true);result('⏳ Simulando '+count+' giros no servidor, com participantes fictícios distintos...');
 status('Processando '+count+' giros de teste, sem consumir giros reais...');
 try{
  const {data,error}=await db.rpc('admin_test_wheel_batch',{
   p_count:count,p_start_player:start,p_at:at
  });
  if(error)throw error;
  if(!data?.ok)throw Error('O lote não foi confirmado');
  result('✅ '+fmt(count)+' testes concluídos • '+fmt(data.simulated_gifts)+' brindes simulados • '+
     fmt(data.simulated_coins)+' resultados de moedas ilustrativas.');
  $('prizeVisual').hidden=true;
  status('Lote registrado somente no laboratório. Consulte abaixo os resultados e os limites aplicados.');
  await loadStatsAndHistory();
 }catch(e){status('Falha no lote: '+(e?.message||'erro')+'. Confira o histórico antes de tentar novamente.',true)}
 finally{setBusy(false)}
}
async function markDelivery(id,button){
 if(!admin||busy)return;
 if(!confirm('Marcar este brinde como ENTREGA SIMULADA? Nada será enviado ou entregue a ninguém.'))return;
 setBusy(true);button.disabled=true;
 try{
  const {data,error}=await db.rpc('admin_test_wheel_mark_delivery',{p_request_id:id});
  if(error)throw error;
  if(!data?.ok)throw Error('Registro não encontrado');
  status('✅ Entrega simulada registrada no laboratório. Nenhuma entrega real foi executada.');
  await loadStatsAndHistory();
 }catch(e){status('Falha ao simular entrega: '+(e?.message||'erro'),true)}
 finally{setBusy(false)}
}
async function resetTests(){
 if(!admin||busy)return;
 if(!confirm('Apagar apenas o histórico e as entregas SIMULADAS deste laboratório? Os brindes, saldos e giros reais não serão alterados.'))return;
 setBusy(true);
 try{
  const {data,error}=await db.rpc('admin_test_wheel_reset');
  if(error)throw error;
  clearPending();$('prizeVisual').hidden=true;
  result('Laboratório reiniciado. Faça novos giros para testar outras configurações.');
  status('✅ '+fmt(data?.deleted_test_rows||0)+' registro(s) de teste apagado(s). Dados reais preservados.');
  await loadStatsAndHistory();
 }catch(e){status('Não foi possível zerar os testes: '+(e?.message||'erro'),true)}
 finally{setBusy(false)}
}
async function start(){
 try{
  const session=await identity();
  if(session.error||!session.user||session.role!=='admin'){
   $('blocked').hidden=false;status('Entre com sua conta de administrador para acessar o laboratório.',true);return;
  }
  admin=session.user;$('labMain').hidden=false;
  await Promise.all([loadGifts(),loadStatsAndHistory()]);
  $('giftSelect').addEventListener('change',displayGift);
  spinOnce.addEventListener('click',singleSpin);
  batch25.addEventListener('click',()=>runBatch(25));
  batch100.addEventListener('click',()=>runBatch(100));
  reset.addEventListener('click',resetTests);
  status('Laboratório pronto. '+fmt(gifts.length)+' brinde(s) para planejamento.'+
   (gifts.length?' Use as configurações salvas no painel.':' Os giros já podem ser testados; cadastre um brinde para testar a chance de prêmio.'));
  if(getPending())status('Há uma tentativa interrompida: toque em “Recuperar giro” para evitar duplicação.');
  setBusy(false);
 }catch(e){status('Falha ao carregar laboratório: '+(e?.message||'verifique sua conexão'),true)}
}
start();
