// Searches for a room that wins a campaign level: random starts, then small changes kept while
// they do not score worse. It searches a 5x5 room, start top left and goal bottom right.
// Usage: node tools/levelSearch.mjs <level> [seed]. Prints the room, a row per word.
const W='../src/';
const { roomOf, check, placementErrors, REQUIREMENTS } = await import(new URL(W, import.meta.url).href+'campaign/rules.js');
const { allShortest } = await import(new URL(W, import.meta.url).href+'campaign/robot.js');
const { LEVELS, COSTS } = await import(new URL(W, import.meta.url).href+'level/campaign.js');
const def = LEVELS.find(l=>l.id===process.argv[2]); const N = 5, base = roomOf({ ...def, size: [N, N] });
base.start = { x: 0, y: 0 }; base.cells[N * N - 1] = 'goal';
let seed=+(process.argv[3]||1);const rnd=()=>((seed=(seed*1103515245+12345)%2147483648)/2147483648);
const free=[]; base.cells.forEach((c,i)=>{ if(!c && i!==0) free.push(i)});
const CELL={block:'wall',toggle:'toggle:red',door:'door:red',button:'button:red'};
const make=g=>{const r=structuredClone(base);for(const [el,i] of g){if(el==='box')r.entities.push({kind:'box',x:i%N,y:Math.floor(i/N),dir:1,mode:'input'});else r.cells[i]=CELL[el];}return r;};
const score=g=>{const r=make(g);if(placementErrors(def,r).length)return 1e9;const a=allShortest(r,{maxPaths:300});
 if(a.status!=='solved')return 1000;const st=def.steps;let p=Math.max(0,st.best-st.range-a.length,a.length-st.best-st.range)*10;
 for(const path of a.paths.slice(0,60))for(const id of def.require)if(!REQUIREMENTS[id].judge(r,path))p+=1;if(a.capped)p+=5;return p;};
const rand=()=>{const g=[];const used=new Set();const pick=()=>{let i;do i=free[Math.floor(rnd()*free.length)];while(used.has(i));used.add(i);return i;};
 for(const [el,[mn,mx]] of Object.entries(def.palette)){const n=el==='block'?Math.floor(rnd()*((mx??12)+1)):mn;for(let k=0;k<n;k++)g.push([el,pick()]);}return g;};
const mutate=g=>{const h=g.map(x=>[...x]);const used=new Set(h.map(x=>x[1]));const r=rnd();const fr=free.filter(i=>!used.has(i));
 if(r<0.6&&h.length){h[Math.floor(rnd()*h.length)][1]=fr[Math.floor(rnd()*fr.length)];}
 else if(r<0.8){const b=h.filter(x=>x[0]==='block').length;if(b<(def.palette.block[1]??12))h.push(['block',fr[Math.floor(rnd()*fr.length)]]);}
 else{const bi=h.findIndex(x=>x[0]==='block');if(bi>=0)h.splice(bi,1);}return h;};
const end=Date.now()+170000;let best=null,bs=Infinity;
while(Date.now()<end){let g=rand(),s=score(g);for(let it=0;it<400&&s>0&&Date.now()<end;it++){const h=mutate(g),t=score(h);if(t<=s){g=h;s=t;}}
 if(s<bs){bs=s;best=g;} if(s===0){const r=make(g);const v=check(def,r,COSTS);if(v.won){console.log('WIN',v.length,r.cells.map((c,i)=>i===r.start.y*N+r.start.x?'P':c==='wall'?'#':c==='goal'?'G':c.startsWith('toggle')?'t':c.startsWith('door')?'D':c.startsWith('button')?'o':r.entities.some(e=>e.y*N+e.x===i)?'B':'.').join('').match(new RegExp(`.{${N}}`,'g')).join(' '));process.exit(0);}}}
console.log('best penalty',bs);
