import assert from 'node:assert/strict';
import {createTraffic,tick,pose} from './hero-traffic.js';
const lengths=[3.8,4.65,2.2,6.6,8.1],types=[0,1,0,2,0,1,3,0,1,0,2,4,0,1,0,0];
const t=createTraffic(types.map((type,i)=>({r:i%4,turn:i%3===0,length:lengths[type],id:i})));
let count=0,walks=0;const directions=new Set(),seen=new Set();
for(let frame=0;frame<36000;frame++){
  tick(t,1/60);
  if(t.phase==='walk'){walks++;assert.equal(t.owner,null);}
  for(const c of t.events){const key=`${c.id}:${c.lap}`;assert(!seen.has(key),'Duplicate count');seen.add(key);directions.add(c.r);count++;}
  for(const c of t.cars.filter(c=>c.active)){
    if(!c.committed)assert(c.s+c.length/2<=58+.001,'Vehicle crossed stop line without permission');
    if(t.phase==='walk'&&c.committed){const exit=c.turn?c.s-(63+5*Math.PI)+15:c.s-78;assert(exit>29+c.length/2,'Vehicle occupies crossing during walk phase');}
    for(const o of t.cars.filter(o=>o.active&&o.id>c.id)){const a=pose(c),b=pose(o);assert(Math.hypot(a.x-b.x,a.z-b.z)>=(c.length+o.length)/2+.69,'Vehicle bodies overlap');}
  }
}
assert.equal(directions.size,4,'All approaches must progress');assert(count>50,'Traffic stalled');assert(walks>0,'Missing pedestrian phase');
console.log(`Passed 10 simulated minutes: ${count} passages, all 4 approaches, no overlaps, no unauthorized stop-line crossings, no duplicate counts, safe pedestrian phases.`);
