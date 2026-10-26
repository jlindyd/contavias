import * as T from './vendor/three.module.min.js';
export function createStreetlife(scene){
  const signals=[],people=[];
  const m=c=>new T.MeshStandardMaterial({color:c,roughness:.85});
  function box(parent,w,h,d,mat,x,y,z){const o=new T.Mesh(new T.BoxGeometry(w,h,d),mat);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o;}
  const pole=m(0x83968d),clothes=[m(0x9aaea7),m(0xb3a28e),m(0x9fa9b8)],skin=m(0xc7ac94),pants=m(0x89968e);
  for(let r=0;r<4;r++){
    const g=new T.Group();g.rotation.y=r*Math.PI/2;scene.add(g);
    box(g,.16,4,.16,pole,10.8,2,20);box(g,.8,1.9,.6,m(0x526b60),10.8,4.15,20);
    const lights=[];for(let j=0;j<3;j++){const mat=new T.MeshStandardMaterial({color:0x526156,emissive:0x000000});const bulb=new T.Mesh(new T.SphereGeometry(.22,10,8),mat);bulb.position.set(10.8,4.75-j*.6,20.36);g.add(bulb);lights.push(mat);}signals.push(lights);
    box(g,8,.025,.25,m(0xf6f6ec),5,.15,20);
    for(let j=0;j<2;j++){
      const person=new T.Group();scene.add(person);box(person,.46,.65,.28,clothes[(r+j)%3],0,1.12,0);
      const head=new T.Mesh(new T.SphereGeometry(.2,10,8),skin);head.position.y=1.67;person.add(head);
      const legs=[box(person,.16,.7,.18,pants,-.14,.46,0),box(person,.16,.7,.18,pants,.14,.46,0)];
      const arms=[box(person,.12,.6,.15,clothes[(r+j)%3],-.32,1.05,0),box(person,.12,.6,.15,clothes[(r+j)%3],.32,1.05,0)];
      people.push({person,legs,arms,r,j});
    }
  }
  return function update(t,time){
    signals.forEach((lights,r)=>lights.forEach((mat,j)=>{const on=j===0?(t.phase!=='green'&&t.phase!=='amber'||r!==t.approach):r===t.approach&&(j===1?t.phase==='amber':t.phase==='green');const color=on?[0xe46e57,0xe5b55c,0x52ac83][j]:0x526156;mat.color.setHex(color);mat.emissive.setHex(on?color:0);mat.emissiveIntensity=.5;}));
    for(const p of people){
      // One-way crossings alternate each round; lateral spacing separates walkers.
      const from=t.pedRound%2===1?-1:1,walk=t.phase==='walk'?t.walk:1;
      const x=t.pedRound===0?-12:from*(12-24*walk),z=15+(p.j-.5)*1.15,a=p.r*Math.PI/2;
      p.person.position.set(x*Math.cos(a)+z*Math.sin(a),.2,-x*Math.sin(a)+z*Math.cos(a));p.person.rotation.y=a+(from===-1?Math.PI/2:-Math.PI/2);
      const swing=t.phase==='walk'&&walk<1?Math.sin(time*7+p.j)*.35:0;
      p.legs[0].rotation.x=swing;p.legs[1].rotation.x=-swing;p.arms[0].rotation.x=-swing;p.arms[1].rotation.x=swing;
    }
  };
}
