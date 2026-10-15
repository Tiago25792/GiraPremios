import {db,identity} from './app-config.js?v=29';
const $=id=>document.getElementById(id);
const pretty=value=>{try{return new Date(value).toLocaleString('pt-BR')}catch{return ''}};
const status=(text,bad=false)=>{const el=$('guaranteedSummary');if(el){el.textContent=text;el.className=bad?'state error':'eyebrow'}};
const el=(tag,value,cls='')=>{const n=document.createElement(tag);n.textContent=String(value??'');if(cls)n.className=cls;return n};
let authorized=false;
async function markUsed(code,button){
 if(!authorized)return;
 if(!confirm('Confirma que o cupom '+code+' foi efetivamente utilizado pelo participante?'))return;
 button.disabled=true;
 try{
  const {data,error}=await db.rpc('admin_mark_guaranteed_used',{p_code:code});
  if(error)throw error;
  if(!data?.ok){
   status(data?.reason==='expired'?'Cupom vencido.':data?.reason==='not_found'?'Código não encontrado.':'Falha na confirmação.',true);return;
  }
  status(data.already_used?'Este cupom já estava marcado como utilizado.':'✅ Utilização confirmada.');
  await load();
 }catch(e){status('Não foi possível confirmar o código: '+(e?.message||'erro'),true)}
 finally{button.disabled=false}
}
async function load(){
 if(!authorized)return;
 const {data,error}=await db.from('guaranteed_benefit_claims')
  .select('code,title_snapshot,status,created_at,used_at,valid_until,user_id')
  .order('created_at',{ascending:false}).limit(100);
 if(error){status('Falha ao listar cupons: '+error.message,true);return}
 const list=$('guaranteedClaims');list.replaceChildren();
 status((data?.length||0)+' cupom(ns) emitido(s), incluindo '+(data||[]).filter(x=>x.status==='issued').length+' ainda sem confirmação de uso.');
 if(!data?.length){list.append(el('p','Nenhum cupom emitido. Cadastre e ative um benefício garantido para começar.','empty'));return}
 for(const c of data){
  const card=el('article','','catalog-entry');
  const body=document.createElement('div');body.className='reward-info';
  body.append(el('strong',c.title_snapshot),el('p','Código: '+c.code+' • Emitido em: '+pretty(c.created_at)));
  body.append(el('small','Participante: ...'+String(c.user_id).slice(-8)+' • '+(c.status==='used'?'Utilizado em '+pretty(c.used_at):'Aguardando uso')));
  if(c.valid_until)body.append(el('small','Validade: '+c.valid_until));
  card.append(el('span','🎟️','reward-icon'),body);
  if(c.status==='issued'){
   const b=el('button','Confirmar uso','gold');b.type='button';
   b.addEventListener('click',()=>markUsed(c.code,b));card.append(b);
  }else card.append(el('span','Utilizado','chip'));
  list.append(card);
 }
}
async function start(){
 const {user,role,error}=await identity();
 if(error||!user||role!=='admin'){status('Acesso exclusivo do administrador.',true);return}
 authorized=true;await load();
 $('reloadGuaranteed')?.addEventListener('click',load);
}
start().catch(()=>status('Não foi possível iniciar o painel de cupons.',true));
