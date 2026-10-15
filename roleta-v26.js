/* Roleta do Tesouro — V2.6, débito atômico de giros no Supabase
 * Os setores ilustram valores, sem creditar moedas ou prêmios.
 * Uma mesma tentativa usa sempre o mesmo UUID para evitar débito duplicado.
 */
import {db,identity} from './app-config.js?v=26';
const btn=document.getElementById('spin');
const wheel=document.getElementById('wheel');
const out=document.getElementById('output');
const indicator=document.getElementById('remainingSpins');
const back=document.getElementById('goBack');
const sectors=['50','25','25','100','10','5'];
const fmt=n=>new Intl.NumberFormat('pt-BR').format(Number(n)||0);
let user=null,busy=false,angle=0,spins=0;
const pendingKey=uid=>'gp_pending_demo_spin_'+uid;
const pendingGet=()=>{
 try{const value=sessionStorage.getItem(pendingKey(user.id));return value&&/^[a-f0-9-]{36}$/.test(value)?value:null}
 catch{return null}
};
const pendingSet=value=>{try{sessionStorage.setItem(pendingKey(user.id),value);return true}catch{return false}};
const pendingClear=()=>{try{sessionStorage.removeItem(pendingKey(user.id))}catch{}};
function output(message,failed=false){out.textContent=message;out.style.color=failed?'#af2b32':'#0754a8'}
function display(){
 if(indicator)indicator.textContent='Giros disponíveis: '+fmt(spins);
 btn.disabled=busy||(!user)||(!pendingGet()&&spins<=0);
 btn.textContent=busy?'Girando...':pendingGet()?'Recuperar giro':spins>0?'Girar':'Sem giros';
}
const reducedMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
async function spinAnimation(index){
 const target=(360-60*index)%360;
 const current=((angle%360)+360)%360;
 const distance=(target-current+360)%360;
 angle+=360*5+distance;
 wheel.style.transform='rotate('+angle+'deg)';
 await new Promise(resolve=>setTimeout(resolve,reducedMotion()?50:4400));
}
async function load(){
 const {data,error}=await db.rpc('ensure_member_wallet');
 if(error)throw error;
 spins=Math.max(0,Number(data?.spins)||0);
 display();
}
async function play(){
 if(!user||busy)return;
 const existing=pendingGet();
 if(!existing&&spins<1){
  output('Você não tem giros disponíveis. Visite sua área para receber o bônus diário.',true);
  display();return;
 }
 if(!existing&&!confirm('Usar 1 giro virtual para animar a roleta demonstrativa? Nenhuma moeda, brinde ou prêmio será concedido.'))return;
 if(!existing&&typeof crypto?.randomUUID!=='function'){
  output('Seu navegador não oferece identificação segura de jogadas. Atualize o Chrome para tentar novamente.',true);return;
 }
 const requestId=existing||crypto.randomUUID();
 if(!existing&&!pendingSet(requestId)){
  output('Não foi possível proteger este giro contra solicitações duplicadas. Tente novamente em outro navegador.',true);return;
 }
 busy=true;display();
 output(existing?'Recuperando o resultado da jogada anterior...':'Registrando 1 giro virtual com segurança...');
 try{
  const {data,error}=await db.rpc('consume_demo_spin',{p_request_id:requestId});
  if(error)throw error;
  if(!data?.ok){
   if(data?.reason==='no_spins'){
    spins=Number(data.spins)||0;pendingClear();
    output('Giros esgotados. Resgate seu bônus diário para acumular novos giros.',true);
   }else{
    pendingClear();
    output('Não foi possível realizar a jogada. Tente novamente.',true);
   }
   return;
  }
  const index=Number(data.sector_index);
  if(!Number.isInteger(index)||index<0||index>=sectors.length)
    throw new Error('Resposta da roleta inesperada. Você pode recuperar sua jogada.');
  spins=Math.max(0,Number(data.spins)||0);
  output('🎡 Giro registrado! A roleta está girando...');
  await spinAnimation(index);
  pendingClear();
  output('✨ Resultado ilustrativo: setor '+sectors[index]+'. Nenhuma moeda ou prêmio foi creditado. Giros restantes: '+fmt(spins)+'.');
 }catch(error){
  // Manter o ID para consultar a MESMA tentativa caso a conexão caia após o débito.
  output('Não foi possível confirmar este giro. Toque em “Recuperar giro” para consultar a mesma jogada, sem novo desconto.',true);
 }finally{busy=false;display()}
}
async function start(){
 busy=true;display();
 try{
  const auth=await identity();
  if(auth.error)throw auth.error;
  if(!auth.user){
   output('Faça login para usar os giros disponíveis na sua conta. Você não será cobrado por visualizar a roleta.');
   const link=document.createElement('a');
   link.href='./entrar.html';link.textContent=' Entrar na minha conta ›';link.style.fontWeight='900';
   out.append(link);return;
  }
  user=auth.user;
  back.href=auth.role==='admin'?'./admin.html':'./usuario.html';
  if(auth.role==='admin')document.getElementById('testLabLink')?.removeAttribute('hidden');
  await load();
  if(pendingGet())output('Sua última tentativa pode ter sido interrompida. Toque em “Recuperar giro” para ver o resultado sem descontar novamente.');
  else if(spins<1)output('Você não possui giros disponíveis. Entre em sua área para receber o bônus diário.');
  else output('Você possui '+fmt(spins)+' giro(s). Cada jogada consome 1 giro virtual e não concede prêmios.');
 }catch(error){output('Não foi possível carregar seus giros. Atualize a página para tentar novamente.',true)}
 finally{busy=false;display()}
}
btn.addEventListener('click',play);
start();
