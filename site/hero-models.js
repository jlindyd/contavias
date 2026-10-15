import * as T from './vendor/three.module.min.js';

const material = (color, roughness=.55, metalness=.05) => new T.MeshStandardMaterial({color, roughness, metalness});
const glass = material(0x25434b,.22,.35), rubber=material(0x283533), alloy=material(0xaebdbb,.35,.6);
const lamp=material(0xf9f4d6), tail=material(0x9e3f32), trim=material(0x425653);
function part(parent,w,h,d,m,x,y,z,bevel=0){
  let geometry;
  if(bevel){
    const s=new T.Shape(),a=-w/2,b=-d/2,r=Math.min(bevel,w/3,d/3);
    s.moveTo(a+r,b);s.lineTo(-a-r,b);s.quadraticCurveTo(-a,b,-a,b+r);s.lineTo(-a,-b-r);s.quadraticCurveTo(-a,-b,-a-r,-b);s.lineTo(a+r,-b);s.quadraticCurveTo(a,-b,a,-b-r);s.lineTo(a,b+r);s.quadraticCurveTo(a,b,a+r,b);
    geometry=new T.ExtrudeGeometry(s,{depth:h-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r/2,bevelSegments:2,steps:1,curveSegments:4});geometry.rotateX(-Math.PI/2);geometry.translate(0,-h/2+r,0);
  }else geometry=new T.BoxGeometry(w,h,d);
  const mesh=new T.Mesh(geometry,m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function tire(parent,x,z,r=.37,y=r){
  const mesh=new T.Mesh(new T.CylinderGeometry(r,r,.22,16),rubber);mesh.rotation.z=Math.PI/2;mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);
  for(const side of [-1,1]){const hub=new T.Mesh(new T.CylinderGeometry(r*.58,r*.58,.025,12),alloy);hub.rotation.z=Math.PI/2;hub.position.set(x+side*.12,y,z);parent.add(hub);}
}
export const vehicleTypes=[
  {name:'Carro',color:0x36737c,w:1.78,l:3.8,h:1.6},
  {name:'SUV',color:0xcb7048,w:2.05,l:4.65,h:2.05},
  {name:'Moto',color:0x92764c,w:.8,l:2.2,h:1.85},
  {name:'Caminhão',color:0x668465,w:2.25,l:6.6,h:2.9},
  {name:'Ônibus',color:0x527ba2,w:2.35,l:8.1,h:2.85}
];
export function makeVehicle(type){
  const v=vehicleTypes[type],g=new T.Group(),paint=material(v.color,.3,.25);
  if(type===2){
    tire(g,0,-.72,.34);tire(g,0,.78,.34);
    part(g,.4,.42,1.18,paint,0,.65,0,.1);part(g,.45,.12,.65,rubber,0,.92,-.2,.04);
    const fork=part(g,.13,.7,.12,alloy,0,.65,.7);fork.rotation.x=-.25;
    part(g,.78,.07,.07,trim,0,1.13,.58);part(g,.3,.22,.12,lamp,0,.97,.8,.04);
    const rider=part(g,.48,.6,.36,trim,0,1.2,-.08,.08);rider.rotation.x=.2;
    const helmet=new T.Mesh(new T.SphereGeometry(.24,12,10),paint);helmet.position.set(0,1.74,.07);helmet.castShadow=true;g.add(helmet);
    for(const x of [-.25,.25]){part(g,.13,.46,.2,trim,x,.75,-.1,.04);const arm=part(g,.12,.13,.52,trim,x,1.32,.3,.04);arm.rotation.x=.25;}
  }else{
    part(g,v.w,.53,v.l,paint,0,.65,0,.15);
    for(const x of [-v.w/2,v.w/2])for(const z of [-v.l*.31,v.l*.32])tire(g,x,z,type>=3?.46:.38);
    if(type===3){
      part(g,2.1,2.05,4.15,material(0xdbe1d7),0,1.8,-1.07,.08);
      part(g,2.15,1.65,1.85,paint,0,1.42,2.17,.15);
      part(g,1.9,.7,.06,glass,0,1.8,3.11);part(g,1.5,.22,.08,trim,0,.94,3.13);
      for(const x of [-1.085,1.085]){part(g,.03,.63,1.1,glass,x,1.8,2.3);for(let z=-2.8;z<.9;z+=.5)part(g,.035,1.7,.025,curbMat,x,1.8,z);tire(g,x,-1.25,.46);}
      part(g,2.08,1.85,.04,curbMat,0,1.8,-3.17);
    }else if(type===4){
      part(g,2.3,2.02,7.85,paint,0,1.66,0,.16);
      part(g,2.12,.9,.04,glass,0,2,3.99);
      for(const x of [-1.18,1.18])for(let z=-3.25;z<3.5;z+=.94)part(g,.025,.86,.79,glass,x,2.05,z);
      part(g,2.1,.15,7.4,material(0xdce4de),0,2.77,0,.06);part(g,1.3,.22,2.1,curbMat,0,2.95,-.3,.07);
    }else{
      const suv=type===1;
      part(g,v.w*.88,suv?.96:.72,v.l*.57,glass,0,suv?1.42:1.18,-.12,.16);
      part(g,v.w*.79,.12,v.l*.41,paint,0,suv?1.95:1.58,-.16,.04);
      for(const x of [-v.w*.455,v.w*.455]){part(g,.07,suv?.85:.65,.11,paint,x,suv?1.45:1.2,-.2);part(g,.18,.15,.27,paint,x*1.16,1.1,.7,.04);part(g,.025,.055,.22,alloy,x,1.03,-.45);}
      if(suv)for(const x of [-.66,.66])part(g,.07,.08,1.5,trim,x,2.04,-.15);
    }
    for(const x of [-v.w*.32,v.w*.32]){part(g,.38,.15,.07,lamp,x,.82,v.l/2+.06,.025);part(g,.33,.14,.07,tail,x,.82,-v.l/2-.06,.025);}
    part(g,v.w*.65,.15,.08,trim,0,.5,v.l/2+.06);part(g,.4,.14,.025,alloy,0,.7,-v.l/2-.1);
  }
  return {group:g,...v};
}
const curbMat=material(0xcbd4ca),wallMat=material(0xe0e5dc),windowMat=material(0xbacac5,.5),roofMat=material(0xd0d9ce);
// Fixed variations keep the streetscape consistent between reloads.
export function makeTree(seed){
  const g=new T.Group(),kind=0;
  const leaves=material(0xcbd9c5);
  const bark=material(0xbfc6b5);
  const mesh=(geo,mat,x,y,z,sx=1,sy=1,sz=1)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;};
  mesh(new T.CylinderGeometry(.14,.23,3.1,7),bark,0,1.8,0);
  const crown=(x,y,z,sx,sy,sz)=>mesh(new T.IcosahedronGeometry(1,2),leaves,x,y,z,sx,sy,sz);
  if(kind===0){ // Broad, irregular deciduous canopy.
    crown(0,4.2,0,2.5,1.6,2.2);crown(-1.2,4.7,.4,1.5,1.3,1.4);crown(1.1,4.5,-.4,1.7,1.5,1.5);
  }else if(kind===1){ // Slim upright tree.
    crown(.15,4.8,0,1.3,3.1,1.45);crown(-.45,3.7,.2,1.1,1.5,1.1);
  }else if(kind===2){ // Layered evergreen silhouette.
    for(let j=0;j<3;j++)mesh(new T.ConeGeometry(2.2-j*.48,2.8,10),leaves,0,3.3+j*1.25,0);
  }else{ // Smaller spreading tree with offset crowns.
    crown(-.7,3.3,.3,1.65,1.3,1.55);crown(.9,3.8,-.25,1.7,1.6,1.45);crown(.1,4.6,.1,1.4,1.2,1.25);
  }
  g.scale.setScalar(.84+(seed%5)*.075);g.rotation.y=seed*1.37;
  return g;
}
export function makeBuilding(x,z,w,d,h){
  const g=new T.Group();g.position.set(x,0,z);
  part(g,w+.5,.5,d+.5,curbMat,0,.4,0);
  part(g,w,h,d,wallMat,0,h/2+.65,0);
  for(let y=2.2;y<h;y+=2.7){
    for(const side of [-1,1]){
      for(let a=-w/2+1.4;a<w/2-1;a+=2.3)part(g,1.3,1.5,.035,windowMat,a,y,side*(d/2+.02));
      for(let b=-d/2+1.4;b<d/2-1;b+=2.3)part(g,.035,1.5,1.3,windowMat,side*(w/2+.02),y,b);
      part(g,w+.12,.12,.12,curbMat,0,y+1,side*d/2);
    }
  }
  part(g,w+.3,.25,d+.3,wallMat,0,h+.8,0);part(g,w-1,.12,d-1,roofMat,0,h+.96,0);
  part(g,2.4,.7,1.7,curbMat,1,h+1.35,1);part(g,2,.07,1.3,windowMat,1,h+1.74,1);
  part(g,1.6,2.1,.06,windowMat,0,1.6,d/2+.05);part(g,2.8,.15,1.2,wallMat,0,2.8,d/2+.4);
  return g;
}

