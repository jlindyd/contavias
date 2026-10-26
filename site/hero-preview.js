import * as T from './vendor/three.module.min.js';
const $=id=>document.getElementById(id), clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)), smooth=v=>{v=clamp(v);return v*v*(3-2*v)};
import { makeVehicle, makeBuilding, makeTree, vehicleTypes } from './hero-models.js';
import {createTraffic, tick, pose} from './hero-traffic.js';
import {createStreetlife} from './hero-streetlife.js';
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let paused=reduced, progress=0, current=-2, time=0, last=performance.now();
const pause=$('pause');pause.textContent=paused?'Reproduzir movimento':'Pausar movimento';pause.setAttribute('aria-pressed',String(paused));pause.onclick=()=>{paused=!paused;pause.textContent=paused?'Reproduzir movimento':'Pausar movimento';pause.setAttribute('aria-pressed',String(paused));};
const chapters=[...document.querySelectorAll('[data-step]')];
chapters.forEach((b,i)=>b.onclick=()=>window.scrollTo({top:(.15+i*.18)*($('journey').offsetHeight-innerHeight),behavior:reduced?'instant':'smooth'}));
const copy=[['Cada veículo.<br><em>Identificado.</em>','A detecção acompanha os veículos em movimento, quadro a quadro.','DETECTAR · UM ID PARA CADA VEÍCULO'],['Diferentes veículos.<br><em>Dados precisos.</em>','Carros, SUVs, motos, ônibus e caminhões. Cada categoria tem seu lugar na análise.','CLASSIFICAR · ENTENDER O FLUXO'],['Todo trajeto.<br><em>Uma história.</em>','Acompanhe cada veículo durante sua passagem pelo cruzamento.','RASTREAR · DA ENTRADA À SAÍDA'],['Cruzou a linha.<br><em>Está contado.</em>','Cada passagem registra o tipo de veículo e o movimento realizado.','CONTAR · CADA PASSAGEM, UMA VEZ'],['Seu tráfego.<br><em>Em números.</em>','Os movimentos se transformam em contagens e relatórios prontos para analisar.','RELATÓRIO · DO VÍDEO À DECISÃO']];
function updateCopy(){const step=progress<.1?-1:Math.min(4,Math.floor((progress-.1)/.18));if(step!==current){current=step;$('headline').innerHTML=step<0?'Seu vídeo.<br>Cada veículo<br><em>contado.</em>':copy[step][0];$('description').textContent=step<0?'A IA detecta, classifica e conta veículos por movimento. Dados de tráfego prontos para analisar.':copy[step][1];$('stage-detail').textContent=step<0?'DO VÍDEO AO DADO. SEM COMPLICAÇÃO.':copy[step][2];$('cta').classList.toggle('cta-emphasis',step===4);chapters.forEach((b,i)=>{b.classList.toggle('active',i===step);if(i===step)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current')});}$('progress').style.width=`${progress*100}%`;$('view').textContent=progress<.42?'01 / VISTA SUPERIOR':progress<.65?'02 / PERSPECTIVA ESPACIAL':'03 / CADA MOVIMENTO IMPORTA';}
try {init();}catch(e){$('fallback').hidden=false;console.error(e);}
function init(){
const renderer=new T.WebGLRenderer({canvas:$('world'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0xedf0eb);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;
const scene=new T.Scene();scene.fog=new T.Fog(0xedf0eb,105,215);const camera=new T.PerspectiveCamera(36,1,.1,300);
scene.add(new T.HemisphereLight(0xffffff,0xc5cfc0,2.6));const sun=new T.DirectionalLight(0xfffaf0,3);sun.position.set(-25,65,25);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-65,right:65,top:65,bottom:-65,near:1,far:160});sun.shadow.normalBias=.1;sun.shadow.bias=-.0002;scene.add(sun);
const mat=c=>new T.MeshStandardMaterial({color:c,roughness:.8});const road=mat(0xc0cac5),white=mat(0xf5f6ee),ground=mat(0xe6ebe2),curb=mat(0xe0e5dc),glass=mat(0x344e54),wheel=mat(0x364743);
function box(w,h,d,m,x=0,y=0,z=0,parent=scene){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.receiveShadow=true;parent.add(mesh);return mesh;}
box(250,.2,250,ground,0,-.4);box(20,.12,200,road);box(200,.13,20,road);
for(const sx of [-1,1])for(const sz of [-1,1]){box(39,.4,39,curb,sx*31,-.02,sz*31);box(35,.2,35,ground,sx*32,.25,sz*32);for(let i=0;i<3;i++){const seed=(sx+1)*3+(sz+1)*1.5+i;const tree=makeTree(seed);tree.position.set(sx*(17+i*11+(i===1?1.2:0)),.3,sz*(22+(seed%3-1)*1.4));scene.add(tree);}for(let i=0;i<2;i++)scene.add(makeBuilding(sx*(23+i*17),sz*39,12,11,7+i*5+(sx===sz?3:0)));}
for(let n=-90;n<=90;n+=6){if(Math.abs(n)<15)continue;box(.16,.02,2.5,white,0,.1,n);box(2.5,.02,.16,white,n,.11,0);}
for(const s of [-1,1])for(let k=-8;k<=8;k+=2){box(1.1,.03,3.2,white,k,.12,s*15);box(3.2,.03,1.1,white,s*15,.13,k);}
const orange=new T.MeshBasicMaterial({color:0xe56b38,transparent:true,opacity:.65});const gates=[];for(let r=0;r<4;r++){const group=new T.Group();group.rotation.y=r*Math.PI/2;scene.add(group);gates.push(box(18,.06,.18,orange,0,.18,20,group));}
function rotated(x,z,r){const a=r*Math.PI/2;return new T.Vector3(x*Math.cos(a)+z*Math.sin(a),.35,-x*Math.sin(a)+z*Math.cos(a));}
function route(r,turn){const pts=turn?[[5,61],[5,28],[5,8],[9,-5],[28,-5],[61,-5]]:[[5,61],[5,24],[5,-24],[5,-61]];return new T.CatmullRomCurve3(pts.map(([x,z])=>rotated(x,z,r)),false,'centripetal');}
const colors=vehicleTypes.map(v=>v.color),names=vehicleTypes.map(v=>v.name);const cars=[];
for(let i=0;i<16;i++){
const type=[0,1,0,2,0,1,3,0,1,0,2,4,0,1,0,0][i],r=i%4,turn=i%3===0,model=makeVehicle(type),group=model.group,length=model.l;
const shape={r,turn};const path={getPointAt(u){const p=pose(shape,u*(turn?126+5*Math.PI:156));return new T.Vector3(p.x,.35,p.z);}};
scene.add(group);
const outline=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(model.w+.18,model.h+.18,length+.2)),new T.LineBasicMaterial({color:colors[type],transparent:true,opacity:.48}));outline.position.y=model.h/2;group.add(outline);const trail=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:colors[type],transparent:true,opacity:.5}));scene.add(trail);
const label=document.createElement('div');label.className='vehicle-label';label.style.setProperty('--color',`#${colors[type].toString(16).padStart(6,'0')}`);$('labels').append(label);
cars.push({group,path,r,turn,type,length,outline,trail,label,offset:i/25,speed:.024+(i%3)*.002,prev:null,flash:-10,id:String(i+1).padStart(3,'0')});}
const traffic=createTraffic(cars);const updateStreetlife=createStreetlife(scene);let accumulator=0;
const marker=new T.Vector3(),target=new T.Vector3();let width=0,height=0;
function resize(){width=innerWidth;height=innerHeight;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.05);last=now;if(!paused){time+=dt;accumulator+=dt;while(accumulator>=1/60){tick(traffic,1/60);for(const event of traffic.events)event.flash=time;accumulator-=1/60;}}updateStreetlife(traffic,time);progress=clamp(scrollY/($('journey').offsetHeight-innerHeight));updateCopy();const tilt=reduced?.45:smooth((progress-.36)/.25),zoom=reduced?0:smooth((progress-.62)/.18)*(1-.65*smooth((progress-.85)/.15));const mobile=width<700;
target.set(mobile?0:-15+zoom*10,0,mobile?12:0);camera.position.set(target.x+tilt*(44-zoom*23),100-tilt*41-zoom*16,target.z+(1-tilt)*.1+tilt*(51-zoom*23));if(mobile){camera.position.y+=30;target.z+=15;}camera.lookAt(target);
gates.forEach(g=>g.visible=current>=3);
for(const car of traffic.cars){car.group.visible=car.active;if(!car.active){car.label.hidden=true;car.trail.visible=false;continue;}const total=car.turn?126+5*Math.PI:156,u=clamp(car.s/total),point=pose(car),p=new T.Vector3(point.x,.35,point.z);car.group.position.copy(p);car.group.rotation.y=point.angle;car.outline.visible=current>=0;const flash=current>=3&&time-car.flash<1.25;
car.trail.visible=current>=2;if(car.trail.visible){const points=[];for(let j=0;j<=16;j++){const point=car.path.getPointAt(Math.max(0,u-j*.003));point.y=.23;points.push(point);}car.trail.geometry.dispose();car.trail.geometry=new T.BufferGeometry().setFromPoints(points);}
marker.copy(p);marker.y+=vehicleTypes[car.type].h+1;marker.project(camera);const x=(marker.x*.5+.5)*width,y=(-marker.y*.5+.5)*height;const visible=marker.z<1&&x>(mobile?width*.08:width*.43)&&x<width-20&&y>(mobile?height*.46:150)&&y<height-145;
car.label.hidden=!(visible&&(current>=0||flash));car.label.classList.toggle('count-label',flash);car.label.textContent=flash?`+1 · ${names[car.type]} · ${'ABCD'[car.r]} → ${'ABCD'[(car.r+(car.turn?1:2))%4]}`:current>=1?`${names[car.type]} · V${car.id}`:`V${car.id}`;car.label.style.left=`${x}px`;car.label.style.top=`${y}px`;
}renderer.render(scene,camera);
}requestAnimationFrame(frame);
}



