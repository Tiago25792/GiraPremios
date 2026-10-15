/* Roleta SVG dinâmica GiraPrêmios V3.1: somente representação visual dos setores.
 * Não representa premiação nem crédito de moedas. */
const NS='http://www.w3.org/2000/svg';
const el=(tag,props={},value)=>{const node=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(props))node.setAttribute(k,String(v));if(value!=null)node.textContent=String(value);return node};
const point=(degrees,r)=>{const a=(degrees-90)*Math.PI/180;return [300+Math.cos(a)*r,300+Math.sin(a)*r]};
const hex=value=>typeof value==='string'&&/^#[\da-fA-F]{6}$/.test(value)?value:'#1689ee';
const isValidImage=url=>{try{return new URL(url).protocol==='https:'}catch{return false}};
function splitTitle(title,n){
 const max=n>9?11:n>7?15:18;
 const text=String(title||'').trim().slice(0,28);if(text.length<=max)return[text];
 const words=text.split(/\s+/);let a='',b='';
 for(const word of words){
  if((a+' '+word).trim().length<=max&&!b)a=(a+' '+word).trim();
  else b=(b+' '+word).trim();
 }
 if(!a)return[text.slice(0,max),text.slice(max,max*2)];
 return[a,b.slice(0,max+2)];
}
function renderWheel(container,slices,{small=false}={}){
 container.replaceChildren();
 const filtered=(slices||[]).filter(s=>s.enabled!==false);
 if(filtered.length<4||filtered.length>12){
  container.textContent='Roleta indisponível. Volte ao painel e configure 4 a 12 fatias ativas.';
  return;
 }
 const n=filtered.length,step=360/n;
 const svg=el('svg',{xmlns:NS,viewBox:'0 0 600 600',width:'100%',height:'100%',role:'img',
  'aria-label':'Roleta personalizada com '+n+' fatias; resultados meramente ilustrativos'});
 svg.style.overflow='visible';
 const defs=el('defs');
 const grad=el('linearGradient',{id:'wheelGold31',x1:'0',y1:'0',x2:'.9',y2:'1'});
 for(const [o,c] of [['0%','#fff4c2'],['25%','#ffcb59'],['55%','#a96114'],['80%','#ffe98c'],['100%','#a65312']])grad.append(el('stop',{offset:o,'stop-color':c}));
 defs.append(grad);
 const hub=el('radialGradient',{id:'hubGold31'});
 for(const [o,c] of [['0%','#fff8de'],['55%','#ffd666'],['100%','#b76c16']])hub.append(el('stop',{offset:o,'stop-color':c}));
 defs.append(hub);svg.append(defs);
 svg.append(el('circle',{cx:300,cy:300,r:292,fill:'#85500c',stroke:'#6a3808','stroke-width':7}));
 svg.append(el('circle',{cx:300,cy:300,r:286,fill:'url(#wheelGold31)',stroke:'#fff5bb','stroke-width':4}));
 svg.append(el('circle',{cx:300,cy:300,r:244,fill:'#fff2c3',stroke:'#8d4a13','stroke-width':6}));
 svg.append(el('circle',{cx:300,cy:300,r:231,fill:'#fff5d8'}));
 for(let i=0;i<n;i++){
  const slice=filtered[i],start=i*step-step/2,end=start+step;
  const a=point(start,224),b=point(end,224),fill=hex(slice.color);
  const p='M 300 300 L '+a[0].toFixed(3)+' '+a[1].toFixed(3)+' A 224 224 0 '+(step>180?1:0)+' 1 '+b[0].toFixed(3)+' '+b[1].toFixed(3)+' Z';
  svg.append(el('path',{d:p,fill,stroke:'#ffeab3','stroke-width':3.5,'stroke-linejoin':'round'}));
  const mid=i*step;
  const emojiPoint=point(mid,n>9?117:125),labelPoint=point(mid,n>9?172:170);
  const isImage=isValidImage(slice.image_url);
  if(isImage){
   const size=n>9?35:48;
   const img=el('image',{href:slice.image_url,x:emojiPoint[0]-size/2,y:emojiPoint[1]-size/2,
    width:size,height:size,preserveAspectRatio:'xMidYMid slice'});
   svg.append(img);
  }else{
   svg.append(el('text',{x:emojiPoint[0],y:emojiPoint[1]+(n>9?9:12),
    'font-size':n>9?30:38,'text-anchor':'middle','font-family':'system-ui,"Apple Color Emoji","Segoe UI Emoji"',
    'paint-order':'stroke','stroke':'#07466c30','stroke-width':1.5},String(slice.emoji||'🎁')));
  }
  const lines=splitTitle(slice.title,n),fontSize=n>9?13:n>7?15:17;
  for(let j=0;j<lines.length;j++){
   const y=labelPoint[1]+(j-(lines.length-1)/2)*fontSize*1.07+fontSize*.37;
   svg.append(el('text',{x:labelPoint[0],y,
    'font-size':fontSize,'font-weight':950,'text-anchor':'middle',
    'font-family':'system-ui,Arial,sans-serif',fill:'#082d5b',
    stroke:'#fffffff0','stroke-width':3.4,'paint-order':'stroke'},lines[j]));
  }
 }
 svg.append(el('circle',{cx:300,cy:300,r:72,fill:'url(#wheelGold31)',stroke:'#fff6bb','stroke-width':8}));
 svg.append(el('circle',{cx:300,cy:300,r:62,fill:'url(#hubGold31)',stroke:'#975512','stroke-width':4}));
 svg.append(el('text',{x:300,y:299,'font-size':small?26:30,'text-anchor':'middle',
 'font-family':'system-ui,Arial','font-weight':'1000',fill:'#734207'},'GIRA'));
 svg.append(el('text',{x:300,y:322,'font-size':small?15:17,'text-anchor':'middle',
 'font-family':'system-ui,Arial','font-weight':'950',fill:'#0b5aa9'},'PRÊMIOS'));
 for(let i=0;i<30;i++){
  const [x,y]=point(i*12,266);
  svg.append(el('circle',{cx:x,cy:y,r:i%3===0?5.2:3.7,fill:i%3===0?'#fff8d4':'#b66e18',
   stroke:'#a96118','stroke-width':1.2}));
 }
 container.append(svg);
}
function desiredRotation(previous,index,n,cycles=5){
 const target=(360-(index*360/n))%360;
 const current=((previous%360)+360)%360;
 return previous+cycles*360+(target-current+360)%360;
}
export{renderWheel,desiredRotation};
