// Прогон реального ui.drawPreview по всем 8 моделям: ловит исключения в каждом стиле.
import { SCOOTERS } from '../js/config.js';
import { makeSpec } from '../js/game.js';
import { drawPreview } from '../js/ui.js';
globalThis.window={addEventListener(){},removeEventListener(){},AudioContext:null};
globalThis.document={addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>({style:{},appendChild(){},addEventListener(){},querySelector:()=>null,classList:{toggle(){},add(){},remove(){}}})};
globalThis.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
class G{constructor(){this.stops=[]}addColorStop(o,c){this.stops.push([o,c])}}
class Ctx{
 constructor(w,h){this.w=w;this.h=h;this.ops=0;this.m=[1,0,0,1,0,0];this.stack=[];this.path=[];this.cur=null;
  this.globalAlpha=1;this.fillStyle='#000';this.strokeStyle='#000';this.lineWidth=1;this.lineCap='butt';this.font='10px sans-serif';this.textAlign='start';this.textBaseline='alphabetic';}
 save(){this.stack.push(1)} restore(){this.stack.pop()}
 setTransform(){} transform(){} translate(){} scale(){} rotate(){}
 beginPath(){this.path=[];this.cur=null} moveTo(){this.cur=[[]];this.path.push(this.cur)} lineTo(){if(!this.cur)this.moveTo();this.cur.push([0,0])}
 closePath(){} quadraticCurveTo(){this.cur&&this.cur.push([0,0])} arc(){this.cur||(this.cur=[],this.path.push(this.cur));this.cur.push([0,0])}
 ellipse(){this.cur=[];this.path.push(this.cur)} rect(){this.moveTo()}
 fill(){this.ops++} stroke(){this.ops++} fillRect(){this.ops++} strokeRect(){this.ops++} clearRect(){}
 createLinearGradient(){return new G()} createRadialGradient(){return new G()}
 setLineDash(){} measureText(){return{width:10}} fillText(){this.ops++} strokeText(){} clip(){} drawImage(){}
}
const save={money:90000,owned:SCOOTERS.map(s=>s.id),current:'s3',upgrades:{},cosmetics:{},levelsDone:{},best:{},unlocked:9,stats:{}};
console.log('моделей в каталоге:', SCOOTERS.length, SCOOTERS.map(s=>s.id).join(','));
let bad=0;
for(const s of SCOOTERS){
  const {spec,cosmetics}=makeSpec(s.id,save);
  const cv={width:560,height:216,getContext:()=>new Ctx(560,216)};
  try{ drawPreview(cv,{spec,cosmetics}); console.log('  ok', s.id, s.style); }
  catch(e){ bad++; console.error('  ✗', s.id, e.message); }
}
process.exit(bad?1:0);
