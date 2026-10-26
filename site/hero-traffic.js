// Deterministic traffic controller shared by the animation and simulation checks.
export const STOP=20, CLEAR=29, GAP=2.4;
const ARC=10*Math.PI/2;
export function pose(car,s=car.s){
  let x=5,z=78-s,angle=Math.PI;
  if(car.turn&&s>63){const a=Math.min(Math.PI/2,(s-63)/10);x=15-10*Math.cos(a);z=15-10*Math.sin(a);angle=Math.PI-a;if(s>63+ARC){x=15+s-63-ARC;z=5;angle=Math.PI/2;}}
  const a=car.r*Math.PI/2;
  return {x:x*Math.cos(a)+z*Math.sin(a),z:-x*Math.sin(a)+z*Math.cos(a),angle:angle+a};
}
export function createTraffic(specs){
  const cars=specs.map((v,i)=>({...v,s:47-Math.floor(i/4)*12,v:0,active:true,committed:false,counted:false,lap:0}));
  return {cars,phase:'green',approach:0,elapsed:0,owner:null,walk:0,pedRound:0,events:[]};
}
export function tick(t,dt){
  t.events=[];t.elapsed+=dt;
  if(t.phase==='green'&&t.elapsed>=18){t.phase='amber';t.elapsed=0;}
  if(t.phase==='amber'&&t.elapsed>=2){t.phase='clear';t.elapsed=0;}
  if(t.phase==='clear'&&t.owner===null&&t.elapsed>=1.5){
    if(t.approach===3){t.phase='walk';t.walk=0;t.pedRound++;}else{t.approach++;t.phase='green';}t.elapsed=0;
  }
  if(t.phase==='walk'){t.walk=Math.min(1,t.elapsed/14);if(t.elapsed>=16){t.phase='green';t.approach=0;t.elapsed=0;}}
  // Front vehicles advance first. A reservation spans all crosswalks and exits.
  for(const c of [...t.cars].sort((a,b)=>b.s-a.s)){
    const total=c.turn?126+ARC:156;
    if(!c.active){const start=pose(c,0);if(t.cars.some(o=>o!==c&&o.active&&Math.hypot(pose(o).x-start.x,pose(o).z-start.z)<(o.length+c.length)/2+GAP))continue;c.active=true;c.s=0;c.v=0;c.counted=false;c.committed=false;c.lap++;}
    const stop=78-STOP-c.length/2;
    if(!c.committed&&t.phase==='green'&&c.r===t.approach&&t.owner===null&&c.s>stop-1){t.owner=c;c.committed=true;}
    let limit=c.committed?total+1:stop;
    for(const o of t.cars){if(o!==c&&o.active&&o.r===c.r&&o.s>c.s&&c.s<=63&&o.s<=63)limit=Math.min(limit,o.s-(o.length+c.length)/2-GAP);}
    const remaining=Math.max(0,limit-c.s),desired=Math.min(c.turn?6:7,Math.sqrt(2*2.8*remaining));
    c.v=Math.max(0,Math.min(desired,c.v+1.8*dt));
    const next=Math.min(limit,c.s+c.v*dt),p=pose(c,next);
    // Conservative body envelopes prevent overlapping at merges and respawns.
    const blocked=t.cars.some(o=>o!==c&&o.active&&Math.hypot(p.x-pose(o).x,p.z-pose(o).z)<(c.length+o.length)/2+.7);
    if(blocked)c.v=0;else c.s=Math.max(c.s,next);
    const exit=c.turn?c.s-(63+ARC)+15:c.s-78;
    if(!c.counted&&c.committed&&exit>=20){c.counted=true;t.events.push(c);}
    if(t.owner===c&&exit>CLEAR+c.length/2){t.owner=null;}
    if(c.s>=total){c.active=false;c.v=0;}
  }
}

