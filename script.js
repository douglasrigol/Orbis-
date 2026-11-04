/* ===== ORBIS — script ===== */
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

const RM=matchMedia('(prefers-reduced-motion:reduce)').matches;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const ss=(a,b,x)=>{x=clamp((x-a)/(b-a));return x*x*(3-2*x)};
const lerp=(a,b,t)=>a+(b-a)*t;
const K=2/.0585;      /* escala do modelo no hero (≈2 unidades de diâmetro) */
const KM=2.3/.0585;   /* escala dos três relógios da coleção */
const TONES=[0x4f72ff,0xc9cfd9,0xd9a35b];

let prog=0,shown=0,loadDone=false,ended=false,rdyAt=0,ok=true,watchOK=false;
let R_=null,R2=null,S=null,C=null,l1=null,watch=null,envTex=null,base=null,asp=1;
let minis=[],M=null,MC=null,envTex2=null,FIT=null,mx=0,my=0,tx=0,ty=0,sp=0;
let draggingWatch=false,dragStartX=0,dragStartY=0,dragRotationX=0,dragRotationY=0;
const T0=performance.now();
addEventListener('pointermove',e=>{
 if(RM)return;
 tx=e.clientX/innerWidth*2-1;ty=e.clientY/innerHeight*2-1;
 minis.forEach(m=>{
  const r=m.box.getBoundingClientRect(),inside=e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;
  m.hover=inside;m.px=inside?((e.clientX-(r.left+r.width/2))/(r.width/2)):0;m.py=inside?((e.clientY-(r.top+r.height/2))/(r.height/2)):0;
 });
});

/* ---------- utilidades ---------- */
const rot=(id,a)=>{const el=document.getElementById(id);if(el)el.setAttribute('transform','rotate('+a.toFixed(2)+')')};
function clock(){const d=new Date(),s=d.getSeconds()+d.getMilliseconds()/1000,m=d.getMinutes()+s/60,h=d.getHours()%12+m/60;return{s,m,h}}
function setHands(p,c){rot(p+'S',c.s*6);rot(p+'M',c.m*6);rot(p+'H',c.h*30)}
function miniClock(t){const s=t*6;return{s,m:s/60,h:s/3600}}
function ticks(sel){const element=$(sel);if(!element)return;element.innerHTML=Array.from({length:60},(_,i)=>`<line class="${i%5?'':'m'}" y1="-93" y2="${i%5?-89:-83}" transform="rotate(${i*6})"/>`).join('')}
ticks('#ftk');ticks('#mtk');

/* ---------- abertura ---------- */
const pre=$('#pre');
const pO=$('#pd .o'),pOrb=$('#pd .orb'),pPl=$('#pl'),pPct=$('#pp');
function drawPre(v){
 const a=v*Math.PI*2;
 pO.style.strokeDashoffset=1-v;pOrb.style.strokeDashoffset=1-v;
 pPl.setAttribute('cx',(88*Math.cos(a)).toFixed(2));pPl.setAttribute('cy',(23*Math.sin(a)).toFixed(2));
 pPl.style.opacity=Math.sin(a)<0&&v<1?.5:1;
 pPct.textContent=Math.round(v*100);
}
/* o anel cresce até passar da tela e a cortina preta abre um buraco do mesmo tamanho */
function openPre(){
 const veil=pre.querySelector('.veil'),box=$('#pd');
 const R0=box.getBoundingClientRect().width/2*.46,R1=Math.hypot(innerWidth,innerHeight)/2+40,S=R1/R0;
 const s0=performance.now(),D=1500;
 pre.classList.add('opening');pPl.style.opacity=0;
 (function step(now){
  const k=clamp((now-s0)/D),e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2,r=R0*(1+(S-1)*e);
  veil.style.webkitMaskImage=veil.style.maskImage=`radial-gradient(circle at 50% 50%,transparent ${(r-1).toFixed(1)}px,#000 ${r.toFixed(1)}px)`;
  box.style.transform=`scale(${(1+(S-1)*e).toFixed(3)})`;
  box.style.opacity=(1-ss(.55,1,k)).toFixed(3);
  if(k<1)requestAnimationFrame(step);else pre.remove();
 })(s0);
}
function endPre(){if(ended)return;ended=true;drawPre(1);setTimeout(()=>{document.body.classList.add('ready');rdyAt=performance.now();openPre()},350)}
function preFrame(now){
 if(ended)return;
 const el=now-T0;
 const target=loadDone?1:Math.max(prog*.95,Math.min(.9,el/4200));
 shown+=(target-shown)*.07;
 drawPre(shown);
 if((loadDone&&shown>.975&&el>2000)||el>15000){shown=1;drawPre(1);endPre();return}
 requestAnimationFrame(preFrame);
}

/* ---------- 3D: reserva, carregamento e cópia embutida ---------- */
function fallback(){
 ok=false;loadDone=true;
 const g=document.getElementById('gl');if(g)g.style.display='none';
 const g2=document.getElementById('gl2');if(g2)g2.style.display='none';
 document.body.classList.add('fb');
}
function live(){
 if(!R_)return;
 ok=true;
 document.getElementById('gl').style.display='';
 document.getElementById('gl2').style.display='';
 document.body.classList.remove('fb');
}
function loadEmbedded(ld,onOK){
 const s=document.createElement('script');
 s.src='models/seiko_watch.data.js';
 s.onload=()=>{try{ld.parse(Uint8Array.from(atob(window.SEIKO_GLB),c=>c.charCodeAt(0)).buffer,'',onOK,e=>{console.error('Cópia embutida inválida:',e);fallback()})}catch(e){console.error('Erro ao ler a cópia embutida:',e);fallback()}};
 s.onerror=()=>{console.error('Não foi possível carregar models/seiko_watch.data.js. Confira se a pasta models está junto do index.html.');fallback()};
 document.head.appendChild(s);
}
function studio(){
 const es=new THREE.Scene();es.background=new THREE.Color(0x020203);
 [[6,6,6,0xffffff,2.4],[-7,2,3,0xcfd8ff,1.3],[0,-6,4,0xffffff,.9],[0,8,-4,0xffffff,1.3]].forEach(a=>{const m=new THREE.Mesh(new THREE.BoxGeometry(5,.6,5),new THREE.MeshBasicMaterial({color:new THREE.Color(a[3]).multiplyScalar(a[4])}));m.position.set(a[0],a[1],a[2]);es.add(m)});
 return es;
}
function initGL(){
 if(typeof THREE==='undefined'){fallback();return false}
 try{
  R_=new THREE.WebGLRenderer({canvas:$('#gl'),antialias:true,alpha:true});
  R2=new THREE.WebGLRenderer({canvas:$('#gl2'),antialias:true,alpha:true});
 }catch(e){console.error('WebGL indisponível:',e);fallback();return false}
 [R_,R2].forEach(r=>{r.setPixelRatio(Math.min(devicePixelRatio,2));r.setClearColor(0x000000,0);r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.15;r.outputEncoding=THREE.sRGBEncoding});
 S=new THREE.Scene();C=new THREE.PerspectiveCamera(35,1,.05,60);
 S.add(new THREE.AmbientLight(0xffffff,.35));
 l1=new THREE.PointLight(0xffffff,2.2,60);S.add(l1);
 const l2=new THREE.PointLight(0xaec6ff,1.2,60);l2.position.set(-6,-2,5);S.add(l2);
 envTex=new THREE.PMREMGenerator(R_).fromScene(THREE.RoomEnvironment?new THREE.RoomEnvironment():studio(),.04).texture;
 S.environment=envTex;
 watch=new THREE.Group();S.add(watch);
 return true;
}
function size(){
 const w=innerWidth,h=innerHeight;asp=w/h;
 if(R_){R_.setSize(w,h,false);C.aspect=asp;C.updateProjectionMatrix()}
 if(R2)R2.setSize(w,h,false);
}
/* o modelo fica dentro de um grupo com a escala; o deslocamento centraliza o mostrador */
function prep(obj,k){const w=new THREE.Group();w.scale.setScalar(k);obj.position.set(0,-.0546,-.0546);w.add(obj);return w}
function brighten(root){root.traverse(o=>{if(!o.isMesh||!o.material)return;[].concat(o.material).forEach(mt=>{if(mt.isMeshStandardMaterial||mt.isMeshPhysicalMaterial){mt.envMapIntensity=1.6;mt.roughness=Math.max(mt.roughness,.22);mt.needsUpdate=true}})})}
/* Os 3 relógios vivem numa cena única em tela cheia (1 unidade = 1px), assim podem
   descer da hero e pousar dentro das caixas. O reflexo (PMREM) precisa ser gerado
   no PRÓPRIO renderer R2: texturas de um contexto WebGL não existem no outro. */
function bindMini(m){
 const el=m.box;let lx=0,ly=0;
 el.addEventListener('pointerdown',e=>{if(m.e<.85)return;m.drag=true;lx=e.clientX;ly=e.clientY;m.vx=m.vy=0;el.setPointerCapture(e.pointerId);el.classList.add('grabbing')});
 el.addEventListener('pointermove',e=>{if(!m.drag)return;const dx=e.clientX-lx,dy=e.clientY-ly;lx=e.clientX;ly=e.clientY;m.vy=dx*.011;m.vx=dy*.008;m.yaw+=m.vy;m.pitch=clamp(m.pitch+m.vx,-.9,.9)});
 const end=()=>{m.drag=false;el.classList.remove('grabbing')};
 el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
}
function buildMinis(){
 if(!R2||!base)return;
 const names=new Set();base.traverse(o=>{if(o.isMesh)[].concat(o.material).forEach(x=>names.add(x.name))});console.info('[ORBIS] materiais do GLB:',[...names]);
 envTex2=new THREE.PMREMGenerator(R2).fromScene(THREE.RoomEnvironment?new THREE.RoomEnvironment():studio(),.04).texture;
 M=new THREE.Scene();M.environment=envTex2;
 M.add(new THREE.AmbientLight(0xffffff,.35));
 MC=new THREE.PerspectiveCamera(34,1,10,12000);
 R2.setScissorTest(false);
 minis=$$('.slot').slice(0,3).map((slot,i)=>{
  const key=new THREE.PointLight(0xffffff,2.2,0),rim=new THREE.PointLight(TONES[i],1.8,0);M.add(key,rim);
  const g=prep(base.clone(true),1);M.add(g);   /* mesmo material da hero, sem tingir */
  const m={el:slot,box:slot.closest('.item'),g,key,rim,i,hover:false,px:0,py:0,hx:0,hy:0,h:0,yaw:0,pitch:0,vx:0,vy:0,drag:false,e:0};
  bindMini(m);return m;
 });
 /* extensão real do modelo (mostrador + pulseira) a partir do centro do mostrador */
 const b=new THREE.Box3().setFromObject(minis[0].g),ex=a=>2*Math.max(Math.abs(b.min[a]),Math.abs(b.max[a]));
 const w=ex('x'),h=ex('y'),d=ex('z');
 FIT={w:Math.hypot(w,d),h:Math.hypot(h,d)};   /* pior caso ao girar em Y e inclinar em X */
}
function loadModel(){
 try{
  const ld=new THREE.GLTFLoader();ld.setMeshoptDecoder(MeshoptDecoder);
  const onOK=g=>{
   base=g.scene;brighten(base);loadDone=true;
   if(R_){watch.add(prep(base,K));watchOK=true;live();buildMinis()}
  };
  const onERR=e=>{console.warn('models/seiko_watch.glb não carregou; tentando a cópia embutida.',e);loadEmbedded(ld,onOK)};
  ld.load('models/seiko_watch.glb',onOK,x=>{if(x.lengthComputable)prog=x.loaded/x.total},onERR);
 }catch(e){console.error('Erro ao iniciar o 3D:',e);fallback()}
}

/* ---------- render ---------- */
function renderHero(t,ie){
 if(!ok||!R_||!watch)return;
 const z0=Math.max(7.5,5.2/asp),zoom=ss(0,.92,sp);
 C.position.set(mx*.22,-my*.14,z0);C.lookAt(0,0,0);
 watch.scale.setScalar((.82+.18*ie)*(1+3.4*zoom));
 watch.position.y=.42;
 watch.rotation.set(my*.28*(1-zoom*.5)+dragRotationX,mx*.5+sp*1.4+Math.sin(t*.5)*.05+dragRotationY,0);
 l1.position.set(3+mx*5,3-my*4,7);
$('#gl').style.opacity=(ie*(1-ss(.94,1,sp))).toFixed(3);
 R_.render(S,C);
}
function isWatchTarget(x,y){
 const radius=Math.min(innerWidth,innerHeight)*.3;
 return scrollY<innerHeight*.92&&Math.hypot(x-innerWidth/2,y-innerHeight*.48)<radius;
}
const glCanvas=$('#gl');
addEventListener('pointermove',event=>{
 if(!glCanvas||RM)return;
 const target=isWatchTarget(event.clientX,event.clientY);
 document.body.classList.toggle('watch-target',target&&!draggingWatch);
 if(!draggingWatch)return;
 dragRotationY+=(event.clientX-dragStartX)*.012;
 dragRotationX+=(event.clientY-dragStartY)*.012;
 dragStartX=event.clientX;dragStartY=event.clientY;
});
 addEventListener('pointerdown',event=>{
 if(RM||!isWatchTarget(event.clientX,event.clientY))return;
 draggingWatch=true;dragStartX=event.clientX;dragStartY=event.clientY;
 document.body.classList.add('watch-dragging');document.body.classList.remove('watch-target');
});
addEventListener('pointerup',event=>{
 draggingWatch=false;glCanvas.classList.remove('watch-dragging');
 document.body.classList.remove('watch-dragging');
 document.body.classList.toggle('watch-target',isWatchTarget(event.clientX,event.clientY));
});
addEventListener('pointercancel',()=>{draggingWatch=false;document.body.classList.remove('watch-dragging')});
/* tempos da animação (segundos) — ajuste aqui */
const DROP=2.6,RISE=1.2,STAGGER=.25;
const TAU=Math.PI*2,back=x=>1+1.8*Math.pow(x-1,3)+.8*Math.pow(x-1,2);
function renderMinis(t){
 if(!R2||!M||!minis.length)return;
 const W=innerWidth,H=innerHeight;let any=false;
 const dt=Math.min(.05,Math.max(0,t-(renderMinis.l??t)));renderMinis.l=t;
 minis.forEach(m=>{
  const r=m.el.getBoundingClientRect(),vis=r.bottom>-120&&r.top<H+120;
  m.g.visible=vis;if(!vis)return;any=true;
  /* queda: com a caixa entrando na tela, o relógio desce do topo (a hero) até o centro dela */
  /* a descida é por TEMPO: a caixa entrando na tela dispara a queda, que toca inteira mesmo com rolagem rápida */
  const want=r.top<H*.95;
  m.wait=want?(m.wait||0)+dt:0;
  const go=want&&m.wait>=m.i*STAGGER;
  m.t=RM?1:clamp((m.t||0)+(go?dt/DROP:-dt/RISE));
  m.e=ss(0,1,m.t);
  m.box.classList.toggle('live',m.e>.85);
  const e=m.e,ee=RM?1:back(e),fall=1-e;
  const cx=r.left+r.width/2,cy=r.top+r.height/2;
  const sx=cx,sy=lerp(-H*.2,cy,ee);
  const hv=m.hover&&e>.85;
  m.h=lerp(m.h,hv||m.drag?1:0,.12);
  m.hx=lerp(m.hx,hv?m.px:0,.1);m.hy=lerp(m.hy,hv?m.py:0,.1);
  /* inércia do arrasto; depois a peça volta devagar para a frente */
  if(!m.drag){
   m.yaw+=m.vy;m.pitch=clamp(m.pitch+m.vx,-.9,.9);m.vy*=.94;m.vx*=.94;
   if(Math.abs(m.vy)<.01)m.yaw+=(Math.round(m.yaw/TAU)*TAU-m.yaw)*.05;
   if(Math.abs(m.vx)<.01)m.pitch*=.94;
  }
  const idle=RM?0:Math.sin(t*.45+m.i*2)*.1,bob=RM?0:Math.sin(t*1.2+m.i*1.7)*4*e;
  const fit=Math.min(r.width*.98/FIT.w,r.height*1.0/FIT.h);   /* cabe na caixa em qualquer ângulo */
  m.g.scale.setScalar(fit*(.55+.45*ee)*(1+.05*m.h));
  m.g.position.set(sx-W/2,H/2-sy+bob+m.h*10,0);
  m.g.rotation.set(m.pitch+m.hy*.45+fall*.9,m.yaw+m.hx*.7+idle+fall*TAU*.9,0);
  /* a luz principal segue o cursor, o brilho passeia pelo metal como na hero */
  m.key.position.set(m.g.position.x+m.hx*260+120,m.g.position.y-m.hy*260+160,520);
  m.rim.position.set(m.g.position.x-320,m.g.position.y-120,320);
  m.el.parentElement.style.setProperty('--land',e.toFixed(3));
 });
 MC.aspect=W/H;MC.position.set(0,0,H/2/Math.tan(17*Math.PI/180));MC.updateProjectionMatrix();
 if(any)R2.render(M,MC);else R2.clear();
}

/* ---------- mostrador de palavras ---------- */
const DEF={ESTILO:'A assinatura que se reconhece de longe.',BELEZA:'O que faz parar e olhar outra vez.',CUIDADO:'Atenção em cada detalhe, do mostrador à pulseira.',ELEGÂNCIA:'Simplicidade que não precisa se explicar.',PRECISÃO:'Cada segundo no lugar certo.',ORIGEM:'O ponto de partida de tudo o que se mede.',ARTE:'Ofício que transforma técnica em emoção.',DETALHE:'Onde a peça revela quem a fez.',PRESENÇA:'Um objeto que ocupa o pulso com calma.',MEMÓRIA:'O tempo que a gente guarda.',ESSÊNCIA:'O que fica quando tudo o resto sai.',CRIAÇÃO:'Algo novo nascido de um traço antigo.',TEMPO:'A matéria-prima de tudo.',SILÊNCIO:'O tique que só você escuta.',PACIÊNCIA:'Esperar também é uma forma de medir.',HERANÇA:'Algo que se passa adiante.',MOVIMENTO:'Engrenagens em harmonia.',ALMA:'O que dá sentido ao mecanismo.',ASSINATURA:'O traço que só pertence a você.',INSTANTE:'Um minuto que vira memória.',OFÍCIO:'Mãos que aprenderam a demorar.',CONTEMPLAR:'Olhar sem pressa para o que importa.'};
const dialSection=$('#palavras'),dial=$('.dial');
const drumItems=$$('.drum li'),drumButtons=$$('.drum button'),dw=$('#dw'),dd=$('#dd');
const wordKeys=drumButtons.map(button=>button.dataset.word);let dialP=0,dialHandP=0,lastWord=-1;
ticks('#dtk');
const dialArc=$('.dial-arc'),dialHand=$('.hand'),hourLines=$$('.hours line'),dialTickLines=$$('#dtk line');
function scrollToWord(index){
 const sectionTop=dialSection.getBoundingClientRect().top+scrollY;
 const travel=Math.max(0,dialSection.offsetHeight-innerHeight);
 scrollTo({top:sectionTop+travel*(index/(wordKeys.length-1)),behavior:'smooth'});
}
drumButtons.forEach((button,i)=>button.addEventListener('click',()=>scrollToWord(i)));
function renderDial(){
 if(RM)return;
 const rect=dialSection.getBoundingClientRect(),travel=Math.max(1,rect.height-innerHeight);
 const sectionProg=clamp(-rect.top/travel);
 dialP=lerp(dialP,sectionProg,.1);
 const N=wordKeys.length,p=dialP*(N-1),i0=Math.floor(p);
 const pe=i0+ss(.4,.6,p-i0);
 const active=clamp(Math.round(pe),0,N-1);
 const intro=clamp((innerHeight-rect.top)/(innerHeight*.35));
 dial.style.opacity=ss(0,.8,intro).toFixed(3);
 dial.style.transform=`translate(-50%,-50%) translate(${(mx*10).toFixed(1)}px,${(my*10).toFixed(1)}px) scale(${(1+dialP*.1).toFixed(4)})`;
 const handTarget=sectionProg>.9
  ?(.9*(N-1)+ss(.9,1,sectionProg)*(N-.9*(N-1)))
  :p;
 dialHandP=lerp(dialHandP,handTarget,.14);
 dialHand.setAttribute('transform',`rotate(${(dialHandP*30).toFixed(2)})`);
 dialArc.style.strokeDashoffset=(1-dialP).toFixed(4);
 dialTickLines.forEach((line,i)=>line.classList.toggle('passed',i<=(dialP*60)));
 hourLines.forEach((line,i)=>line.classList.toggle('passed',i<=active));
 drumItems.forEach((item,i)=>{
  const off=i-pe,d=Math.abs(off);
  item.style.opacity=clamp(1-d*1.5).toFixed(3);
  item.style.transform=`scale(${(1-off*.12).toFixed(3)})`;
  item.style.filter=`blur(${(d*d*26).toFixed(1)}px)`;
  item.style.setProperty('--dv',clamp(1-d*3.4).toFixed(3));
  item.style.visibility=d<.67?'visible':'hidden';
  item.setAttribute('aria-current',i===active?'true':'false');
  drumButtons[i].tabIndex=d<.67?0:-1;
 });
 if(active!==lastWord){
  lastWord=active;dw.textContent=drumButtons[active].textContent;dd.textContent=DEF[wordKeys[active]]||'';
 }
}

/* ---------- navegação: brilho que acompanha o cursor ---------- */
const hl=$('.hl');
$$('nav a').forEach(a=>{
 const on=()=>{hl.style.left=a.offsetLeft+'px';hl.style.width=a.offsetWidth+'px';hl.style.opacity=1};
 a.addEventListener('pointermove',e=>{const r=a.getBoundingClientRect();a.style.setProperty('--glass-x',`${((e.clientX-r.left)/r.width*100).toFixed(1)}%`);a.style.setProperty('--glass-y',`${((e.clientY-r.top)/r.height*100).toFixed(1)}%`);hl.style.setProperty('--hl-x',`${(e.clientX-r.left).toFixed(1)}px`)});
 a.addEventListener('mouseenter',on);a.addEventListener('touchstart',on,{passive:true});
});
$('nav').addEventListener('mouseleave',()=>{hl.style.opacity=0});

/* ---------- final: manifesto em órbita, fusos horários e botão magnético ---------- */
let T_=0,curX=-9999,curY=-9999;
addEventListener('pointermove',e=>{curX=e.clientX;curY=e.clientY},{passive:true});
const mf=$('#manifesto'),mfp=$('#mf'),mfw=$$('#mf .w'),mfr=$('.mf-ring'),ringO=$('.ring-o'),ringP=$('.ring-p');
let ringA=0,ringProx=0,ringW=0,ringH=0;
function renderManifesto(dt){
 if(!mf||!mfp)return;
 const r=mf.getBoundingClientRect(),vh=innerHeight,p=RM?1:clamp((vh*.85-r.top)/(vh*.5)),N=mfw.length;
 mfw.forEach((w,i)=>{const a=i/N*.75,l=ss(a,a+.25,p);w.style.opacity=(.16+.84*l).toFixed(3);w.style.filter=l<1?`blur(${((1-l)*6).toFixed(1)}px)`:'none'});
 /* o anel envolve o texto todo, com folga */
 const rx=Math.min(mfp.offsetWidth*.75,innerWidth/2-6),ry=mfp.offsetHeight*.8;
 if(rx!==ringW||ry!==ringH){ringW=rx;ringH=ry;mfr.setAttribute('width',2*rx);mfr.setAttribute('height',2*ry);mfr.setAttribute('viewBox',`0 0 ${2*rx} ${2*ry}`);ringO.setAttribute('cx',rx);ringO.setAttribute('cy',ry);ringO.setAttribute('rx',rx-1);ringO.setAttribute('ry',ry-1)}
 ringO.style.strokeDashoffset=(1-ss(.5,.95,p)).toFixed(3);
 const b=mfp.getBoundingClientRect(),prox=clamp(1-Math.hypot(curX-(b.left+b.width/2),curY-(b.top+b.height/2))/(Math.max(rx,ry)*1.6));
 ringProx=lerp(ringProx,prox,.08);ringA+=dt*(.5+3*ringProx);   /* o planeta acelera quando o cursor chega perto */
 ringP.setAttribute('cx',(rx+(rx-1)*Math.cos(ringA)).toFixed(1));ringP.setAttribute('cy',(ry+(ry-1)*Math.sin(ringA)).toFixed(1));
 ringP.style.opacity=ss(.8,1,p).toFixed(3);
}
const ZN=[['Londres','Europe/London',0],['Nova York','America/New_York',1],['Tóquio','Asia/Tokyo',2],['Dubai','Asia/Dubai',0],['São Paulo','America/Sao_Paulo',1],['Sydney','Australia/Sydney',2]];
const ZR=[70,115,160],ZS=[.35,.24,.16],zbox=$('#zones'),zsvg=zbox&&zbox.querySelector('svg'),zc=$('#zc'),zt=$('#zt');
const zA=ZN.map((_,k)=>k*2.4+(k%3)*.7);let zActive=null,zHold=null,zSec=-1,zShown=-2,zg=[];
const fmtOf=tz=>new Intl.DateTimeFormat('pt-BR',{timeZone:tz,hour:'2-digit',minute:'2-digit',second:'2-digit'});
const zf=ZN.map(z=>fmtOf(z[1])),zLocal=fmtOf(undefined);
if(zsvg){
 zsvg.innerHTML=ZR.map(r=>`<circle class="zr" r="${r}"/>`).join('')+ZN.map(z=>`<g class="zp" tabindex="0" role="button" aria-label="${z[0]}"><circle class="zh" r="18"/><circle class="zd" r="5"/><text class="zl" y="-13">${z[0]}</text></g>`).join('');
 zg=$$('.zp');
 zg.forEach((g,k)=>{
  g.addEventListener('pointerenter',()=>{zActive=k});
  g.addEventListener('pointerleave',()=>{if(zActive===k)zActive=null});
  g.addEventListener('focus',()=>{zActive=k});g.addEventListener('blur',()=>{if(zActive===k)zActive=null});
  g.addEventListener('click',()=>{zHold=zHold===k?null:k;zActive=k});   /* no toque, o clique fixa a cidade */
 });
}
function renderZones(dt,now){
 if(!zsvg)return;
 zbox.style.setProperty('--z',clamp((innerHeight-zbox.getBoundingClientRect().top)/(innerHeight*.3)).toFixed(3));
 const show=zActive??zHold;
 zg.forEach((g,k)=>{
  const ring=ZN[k][2];zA[k]+=dt*ZS[ring]*(show===k?.08:1);   /* a cidade em foco quase para */
  g.setAttribute('transform',`translate(${(ZR[ring]*Math.cos(zA[k])).toFixed(1)} ${(ZR[ring]*Math.sin(zA[k])).toFixed(1)})`);
  g.classList.toggle('on',show===k);
 });
 const s=Math.floor(now/1000);
 if(s!==zSec||show!==zShown){zSec=s;zShown=show;zc.textContent=show==null?'Sua hora':ZN[show][0];zt.textContent=(show==null?zLocal:zf[show]).format(new Date())}
}
const mag=$('.btn.mag');let mgx=0,mgy=0;
function renderMag(){
 if(!mag||RM)return;
 const r=mag.getBoundingClientRect(),dx=curX-(r.left+r.width/2-mgx),dy=curY-(r.top+r.height/2-mgy),k=Math.max(0,1-Math.hypot(dx,dy)/150);
 mgx=lerp(mgx,dx*k*.35,.15);mgy=lerp(mgy,dy*k*.35,.15);
 mag.style.setProperty('--mx',mgx.toFixed(1)+'px');mag.style.setProperty('--my',mgy.toFixed(1)+'px');
 mag.classList.toggle('near',k>0);
}

/* ---------- loop principal ---------- */
const caps=$$('.cap'),st=$('#story'),letters=$$('.word i'),items=$$('.item'),foot=$('#foot');
function frame(now){
 const t=RM?0:now/1000,vh=innerHeight;
 const sh=Math.max(1,st.offsetHeight-vh),p=clamp(scrollY/sh);
 sp=RM?p:sp+(p-sp)*.085;           /* rolagem suavizada: as animações acompanham a página sem travar */
 const ie=RM?1:(rdyAt?ss(0,1,(now-rdyAt)/1800):0);
 caps.forEach((el,i)=>{const a=+el.dataset.a,b=+el.dataset.b;el.style.opacity=(clamp(Math.min((sp-a)/.04,(b-sp)/.04))*(i?1:ie)).toFixed(3)});
 mx=lerp(mx,tx,.07);my=lerp(my,ty,.07);
 renderHero(t,ie);
 const c=clock();
 setHands('m',RM?c:miniClock(t));if(!ok)setHands('f',c);
 letters.forEach((el,i)=>{el.style.transform=`rotateY(${(Math.sin(t*1.2+i*.9)*22+sp*150*(i%2?-1:1)).toFixed(1)}deg)`});
 renderDial();
 items.forEach(it=>{const r=it.getBoundingClientRect();it.style.setProperty('--k',clamp((vh*.94-r.top)/(vh*.6)).toFixed(3))});
 const fr=foot.getBoundingClientRect();foot.style.setProperty('--f',clamp((vh-fr.top)/(vh*.7)).toFixed(3));
 renderMinis(t);
 const dt=Math.min(.05,Math.max(0,t-T_));T_=t;
 renderManifesto(dt);renderZones(dt,now);renderMag();
 requestAnimationFrame(frame);
}

/* ---------- textos e revelações ---------- */
const WP=['viajantes','noctívagos','colecionadores','contempladores'];let wi=0;
/* a troca das palavras do #pill agora é feita por orbis-animations.js (ScrambleText) */
const splitReveals=new WeakMap();
function revealText(el){
 if(RM){el.classList.add('in');return}
 const split=new SplitText(el,{type:'words',wordsClass:'split-word'});
 splitReveals.set(el,split);
 el.classList.add('in');
 gsap.set(el,{opacity:1,transform:'none'});
 gsap.fromTo(split.words,{y:22,opacity:0,filter:'blur(8px)'},{y:0,opacity:1,filter:'blur(0px)',duration:.85,ease:'power3.out',stagger:.045,overwrite:true});
}
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){revealText(e.target);io.unobserve(e.target)}}),{threshold:.15});
$$('.sec .rv:not(.item)').forEach(e=>io.observe(e));
$$('.item.rv').forEach(e=>io.observe(e));

/* ---------- arranque ---------- */
const okGL=initGL();
if(okGL){size();loadModel()}
addEventListener('resize',size);
if(RM){pre.remove();ended=true;document.body.classList.add('ready');loadDone=true}
else requestAnimationFrame(preFrame);
requestAnimationFrame(frame);