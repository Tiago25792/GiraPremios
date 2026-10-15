/* Roleta principal V3.1. Visuais editáveis e débito idempotente no servidor.
 * RESULTADO ILUSTRATIVO: jamais gera brindes, moedas extras ou valores reais. */
import {db,identity} from './app-config.js?v=31';
import {renderWheel,desiredRotation} from './wheel-visual-v31.js?v=31';
const btn=document.getElementById('spin');
const wheel=document.getElementById('wheel');
const out=document.getElementById('output');
const indicator=document.getElementById('remainingSpins');
const back=document.getElementById('goBack');
const illustration=document.getElementById('sliceResultVisual');
const fmt=n=>new Intl.NumberFormat('pt-BR').format(Number(n)||0);
let user=null,busy=false,angle=0,spins=0,slices=[],wheelReady=false;
const pendingKey=uid=>'gp_pending_demo_spin_'+uid;
const pendingGet=()=>{if(!user)return null;try{const value=sessionStorage.getItem(pendingKey(user.id));return value&&/^[a-f0-9-]{36}$/.test(value)?value:null}catch{return null}};
const pendingSet=value=>{try{sessionStorage.setItem(pendingKey(user.id),value);return true}catch{return false}};
const pendingClear=()=>{try{sessionStorage.removeItem(pendingKey(user.id))}catch{}};
const reducedMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const urlOK=url=>{try{return new URL(url).protocol==='https:'}catch{return false}};
function output(message,failed=false){out.textContent=message;out.style.color=failed?'#af2b32':'#0754a8'}
function display(){
 if(indicator)indicator.textContent='Giros disponíveis: '+fmt(spins);
 const pending=pendingGet();
 btn.disabled=busy||!user||!wheelReady||(!pending&&spins<=0);
 btn.textContent=busy?'Girando...':!user?'Faça login':!wheelReady?'Roleta indisponível':pending?'Recuperar giro':spins>0?'Girar':'Sem giros';
}
async function loadSlices(){
 const {data,error}=await db.from('main_wheel_slices')
  .select('slot,title,emoji,description,color,weight,image_url,enabled')
  .eq('enabled',true).order('slot',{ascending:true}).limit(12);
 if(error)throw error;
 const a=data||[];
 if(a.length<4||a.length>12)throw Error('Configuração de fatias indisponível.');
 slices=a;
 renderWheel(wheel,slices);
 angle=0;wheel.style.transform='rotate(0deg)';
 wheelReady=true;display();
}
function resultImage(data){
 if(!illustration)return;
 illustration.replaceChildren();illustration.hidden=true;
 if(!urlOK(data.sector_image_url))return;
 const img=document.createElement('img');img.src=data.sector_image_url;img.alt='Imagem ilustrativa do setor '+(data.sector_title||'');
 img.loading='lazy';img.onerror=()=>{illustration.hidden=true};
 const box=document.createElement('div');
 const name=document.createElement('strong');name.textContent=(data.sector_emoji||'🎁')+' '+(data.sector_title||'Setor');
 const warning=document.createElement('small');warning.textContent='Ilustração: nenhuma moeda, produto ou prêmio foi concedido.';
 box.append(name,warning);illustration.append(img,box);illustration.hidden=false;
}
async function spinAnimation(index,count){
 const target=desiredRotation(angle,index,count,5);angle=target;
 wheel.style.transform='rotate('+angle+'deg)';
 await new Promise(resolve=>setTimeout(resolve,reducedMotion()?70:4450));
}
async function loadWallet(){
 const {data,error}=await db.rpc('ensure_member_wallet');
 if(error)throw error;
 spins=Math.max(0,Number(data?.spins)||0);display();
}
async function play(){
 if(!user||busy||!wheelReady)return;
 const existing=pendingGet();
 if(!existing&&spins<1){
  output('Você não tem giros disponíveis. Visite sua área para receber o bônus diário.',true);
  display();return;
 }
 if(!existing&&!confirm('Usar 1 giro virtual para girar a roleta PERSONALIZADA, ainda demonstrativa? O resultado não credita moedas nem concede brindes.'))return;
 if(!existing&&typeof crypto?.randomUUID!=='function'){
  output('O navegador não oferece identificadores seguros. Atualize o navegador para continuar.',true);return;
 }
 const requestId=existing||crypto.randomUUID();
 if(!existing&&!pendingSet(requestId)){
  output('Não foi possível proteger esta tentativa contra duplicação. Verifique o armazenamento do navegador.',true);return;
 }
 busy=true;display();if(illustration)illustration.hidden=true;
 output(existing?'Recuperando a mesma jogada com segurança...':'Confirmando 1 giro virtual com o servidor...');
 try{
  const {data,error}=await db.rpc('consume_demo_spin',{p_request_id:requestId});
  if(error)throw error;
  if(!data?.ok){
   if(data?.reason==='no_spins'){
    spins=Number(data.spins)||0;pendingClear();
    output('Giros esgotados. Volte à sua área para receber o bônus diário.',true);
   }else{pendingClear();output('A jogada não pôde ser registrada.',true)}
   return;
  }
  const index=Number(data.sector_index),count=Number(data.sector_count);
  spins=Math.max(0,Number(data.spins)||0);
  if(!Number.isInteger(index)||index<0||index>=12)throw Error('Resultado do servidor inválido.');
  let matching=count===slices.length && index<slices.length &&
    slices[index].title===data.sector_title&&slices[index].emoji===data.sector_emoji;
  if(!matching){
   try{await loadSlices()}catch(e){/* preserva resultado do servidor */}
   matching=count===slices.length && index<slices.length &&
    slices[index].title===data.sector_title&&slices[index].emoji===data.sector_emoji;
  }
  output('🎡 Giro registrado! Confira o setor apontado...');
  if(matching)await spinAnimation(index,slices.length);
  clearPendingWhenConfirmed();
  resultImage(data);
  const label=(data.sector_emoji||'🎡')+' '+(data.sector_title||('Setor '+(index+1)));
  output((matching?'✨ Resultado ilustrativo: ':'✨ Resultado registrado em uma configuração anterior: ')+
    label+'. Nenhuma moeda ou prêmio foi creditado. Giros restantes: '+fmt(spins)+'.');
 }catch(error){
  output('Não foi possível confirmar a mesma tentativa. Toque em “Recuperar giro” para consultar sem novo débito.',true);
 }finally{busy=false;display()}
}
function clearPendingWhenConfirmed(){pendingClear()}
async function start(){
 busy=true;display();
 try{
  await loadSlices();
  const auth=await identity();
  if(auth.error)throw auth.error;
  if(!auth.user){
   output('Faça login para usar os giros virtuais. A roleta acima já mostra as fatias configuradas.');
   const a=document.createElement('a');a.href='./entrar.html';a.textContent=' Entrar ›';a.style.fontWeight='900';out.append(a);return;
  }
  user=auth.user;
  back.href=auth.role==='admin'?'./admin.html':'./usuario.html';
  if(auth.role==='admin'){
   document.getElementById('testLabLink')?.removeAttribute('hidden');
   document.getElementById('sliceEditorLink')?.removeAttribute('hidden');
  }
  await loadWallet();
  if(pendingGet())output('Uma tentativa anterior pode ter sido interrompida. Toque em “Recuperar giro” para recuperar o mesmo resultado sem novo desconto.');
  else if(spins<1)output('Você não possui giros disponíveis. Volte à área do participante para o bônus diário.');
  else output('Roleta com '+slices.length+' fatias personalizadas. Cada jogada usa 1 giro virtual e não entrega prêmios.');
 }catch(error){output('Não foi possível carregar a roleta e os giros. Atualize a página para tentar novamente.',true)}
 finally{busy=false;display()}
}
btn.addEventListener('click',play);start();
