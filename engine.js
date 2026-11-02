export const SIZE=8;
export const TYPES=['털실','생선 인형','방울','발바닥 쿠션','장난감 쥐','간식'];
export const CHAPTERS=['햇살의 정원','상자의 골목','왕실 간식 창고','별빛 궁전'];
const spec=[
[24,5,{collect:[0,18]}],[24,5,{collect:[1,24]}],[23,5,{collect:[2,28]}],[23,5,{jelly:12}],[24,5,{collect:[0,30],jelly:14}],
[25,5,{crates:6}],[25,5,{crates:8,jelly:12}],[25,6,{collect:[3,30],crates:8}],[26,6,{crates:10,jelly:16}],[27,6,{crates:12,jelly:18}],
[27,6,{drops:2}],[27,6,{drops:2,ropes:6}],[27,6,{collect:[4,30],ropes:8}],[28,6,{drops:2,crates:8}],[28,6,{drops:3,jelly:18,ropes:6}],
[28,6,{crates:10,jelly:20,ropes:6}],[28,6,{collect:[5,38],crates:12,ropes:8}],[29,6,{drops:3,crates:10,jelly:20}],[29,6,{crates:14,jelly:24,ropes:8}],[30,6,{drops:3,crates:12,jelly:26,ropes:8}]
];
export const LEVELS=spec.map(([moves,colors,goals],i)=>({id:i+1,moves,colors,...goals,chapter:CHAPTERS[Math.floor(i/5)],reinforced:i>=9}));
export const adjacent=(a,b)=>Math.abs(a%8-b%8)+Math.abs((a/8|0)-(b/8|0))===1;
export class Game {
 constructor(level,rng=Math.random){this.level=level;this.rng=rng;this.moves=level.moves;this.score=0;this.collected=Array(6).fill(0);this.delivered=0;this.combo=0;this.used={hammer:0,shuffle:0,moves:0};this.jelly=Array(64).fill(0);this.crates=Array(64).fill(0);this.rope=Array(64).fill(false);this.board=Array(64).fill(null);this.events=[];
 const cells=Array.from({length:64},(_,i)=>i).filter(i=>i>=8&&i<56).sort(()=>this.rng()-.5);
 cells.slice(0,level.crates||0).forEach((i,n)=>this.crates[i]=level.reinforced&&n%3===0?2:1);
 const free=cells.filter(i=>!this.crates[i]);free.slice(0,level.jelly||0).forEach((i,n)=>this.jelly[i]=level.id>=16&&n%4===0?2:1);
 free.slice(-(level.ropes||0)).forEach(i=>{if(level.ropes)this.rope[i]=true;});
 for(let i=0;i<64;i++)if(!this.crates[i]){let t;do{t=this.randomType();}while((i%8>=2&&this.board[i-1]?.t===t&&this.board[i-2]?.t===t)||(i>=16&&this.board[i-8]?.t===t&&this.board[i-16]?.t===t));this.board[i]={t,s:null};}
 this.spawnDrop();this.ensureMoves();
 }
 randomType(){return Math.floor(this.rng()*this.level.colors);}
 swap(a,b){[this.board[a],this.board[b]]=[this.board[b],this.board[a]];}
 runs(){const runs=[];for(let axis=0;axis<2;axis++)for(let line=0;line<8;line++){let run=[];let prev=-99;for(let x=0;x<=8;x++){const i=axis?x*8+line:line*8+x;const t=x<8&&!this.crates[i]&&this.board[i]?.t>=0?this.board[i].t:-99;if(t!==prev||t<0||x===8){if(run.length>=3)runs.push({ids:run,axis});run=[];}if(t>=0)run.push(i);prev=t;}}return runs;}
 legal(a,b){if(!adjacent(a,b)||this.crates[a]||this.crates[b]||this.rope[a]||this.rope[b]||!this.board[a]||!this.board[b])return false;const x=this.board[a],y=this.board[b];if(x.s==='rainbow'||y.s==='rainbow'||(x.s&&y.s))return true;this.swap(a,b);const ok=this.runs().some(r=>r.ids.includes(a)||r.ids.includes(b));this.swap(a,b);return ok;}
 hint(){for(let a=0;a<64;a++)for(const b of [a+1,a+8])if(b<64&&this.legal(a,b))return[a,b];return null;}
 ensureMoves(){if(this.won()||this.moves<=0)return;if(this.hint())return;this.shuffle();this.events.push('움직일 수 있는 조합이 없어 자동으로 섞었어요.');}
 shuffle(){const ids=this.board.map((p,i)=>p&&!this.rope[i]&&p.t>=0?i:-1).filter(i=>i>=0);for(let attempt=0;attempt<300;attempt++){for(let n=ids.length-1;n>0;n--){let k=Math.floor(this.rng()*(n+1));this.swap(ids[n],ids[k]);}if(!this.runs().length&&this.hint())return true;}for(let k=0;k<100;k++){for(const i of ids)this.board[i]={t:this.randomType(),s:null};if(!this.runs().length&&this.hint())return true;}return false;}
 spawnDrop(){if(!this.level.drops||this.delivered>=this.level.drops||this.board.some(p=>p?.t===-1))return;const cols=[3,4,2,5,1,6,0,7];for(const col of cols){if(!this.crates[col]&&!this.rope[col]){this.board[col]={t:-1,s:null};break;}}}
 async play(a,b,frame=async()=>{}){if(this.moves<=0||this.won()||!this.legal(a,b))return false;this.events=[];this.swap(a,b);this.moves--;this.combo=0;await frame('swap');const x=this.board[a],y=this.board[b];if(x.s==='rainbow'||y.s==='rainbow'||(x.s&&y.s)){await this.combine(a,b,frame);}await this.resolve([b,a],frame);this.ensureMoves();return true;}
 async combine(a,b,frame){const x=this.board[a],y=this.board[b];let ids=new Set([a,b]);let suppress=new Set();if(x.s==='rainbow'||y.s==='rainbow'){const r=x.s==='rainbow'?a:b;const other=r===a?b:a;const p=this.board[other];suppress.add(r);if(p.s==='rainbow'){suppress.add(other);for(let i=0;i<64;i++)ids.add(i);}else{for(let i=0;i<64;i++)if(this.board[i]?.t===p.t){ids.add(i);if(p.s)this.board[i].s=p.s==='bomb'?'bomb':(this.rng()<.5?'row':'col');}suppress.add(other);if(p.s)suppress.delete(other);}}
 else if(x.s==='bomb'&&y.s==='bomb'){suppress=new Set([a,b]);for(const i of [a,b])this.area(i,2).forEach(j=>ids.add(j));await this.clear(ids,new Map(),frame,suppress);await this.gravity(frame);await this.clear(new Set([...this.area(a,2),...this.area(b,2)]),new Map(),frame);await this.gravity(frame);return;}
 else if(x.s==='bomb'||y.s==='bomb'){suppress=new Set([a,b]);const row=b/8|0,col=b%8;for(let i=0;i<64;i++)if(Math.abs((i/8|0)-row)<=1||Math.abs(i%8-col)<=1)ids.add(i);}
 else{suppress=new Set([a,b]);for(let i=0;i<64;i++)if((i/8|0)===(b/8|0)||i%8===b%8)ids.add(i);}
 await this.clear(ids,new Map(),frame,suppress);await this.gravity(frame);}
 area(i,d=1){const out=[];for(let j=0;j<64;j++)if(Math.abs((j/8|0)-(i/8|0))<=d&&Math.abs(j%8-i%8)<=d)out.push(j);return out;}
 async resolve(preferred=[],frame=async()=>{}){for(let guard=0;guard<150;guard++){const runs=this.runs();if(!runs.length)break;this.combo++;const ids=new Set(runs.flatMap(r=>r.ids)),creates=new Map();const remaining=[...runs];while(remaining.length){const group=[remaining.shift()];let changed=true;while(changed){changed=false;for(let i=remaining.length-1;i>=0;i--)if(group.some(r=>r.ids.some(x=>remaining[i].ids.includes(x)))){group.push(remaining.splice(i,1)[0]);changed=true;}}
 const all=[...new Set(group.flatMap(r=>r.ids))];const longest=group.reduce((a,b)=>a.ids.length>=b.ids.length?a:b);let special=null;if(longest.ids.length>=5)special='rainbow';else if(group.some(r=>r.axis!==group[0].axis))special='bomb';else if(longest.ids.length===4)special=longest.axis?'row':'col';if(special){const at=preferred.find(i=>all.includes(i)&&!this.board[i]?.s&&!this.rope[i])??all.find(i=>!this.board[i]?.s&&!this.rope[i]);if(at!==undefined)creates.set(at,{t:this.board[at].t,s:special});}}
 await this.clear(ids,creates,frame);await this.gravity(frame);preferred=[];}
 }
 async clear(initial,creates,frame,suppress=new Set()){const hit=new Set(initial),queue=[...initial],triggered=new Set(),bombs=[];for(let n=0;n<queue.length;n++){const i=queue[n],p=this.board[i];if(!p?.s||suppress.has(i)||triggered.has(i)||this.rope[i])continue;triggered.add(i);creates.delete(i);let extra=[];if(p.s==='row')extra=Array.from({length:8},(_,x)=>(i/8|0)*8+x);if(p.s==='col')extra=Array.from({length:8},(_,x)=>x*8+i%8);if(p.s==='bomb'){extra=this.area(i);bombs.push(i);}if(p.s==='rainbow'){const counts=Array(6).fill(0);this.board.forEach(p=>{if(p?.t>=0)counts[p.t]++;});const t=counts.indexOf(Math.max(...counts));extra=this.board.map((p,j)=>p?.t===t?j:-1).filter(j=>j>=0);}for(const j of extra)if(!hit.has(j)){hit.add(j);queue.push(j);}}
 const crateHits=new Set([...hit].filter(i=>this.crates[i]));for(const i of hit){if(this.crates[i])continue;if(this.jelly[i])this.jelly[i]--;for(const j of [i-8,i+8,i-1,i+1])if(j>=0&&j<64&&adjacent(i,j)&&this.crates[j])crateHits.add(j);if(this.rope[i]){this.rope[i]=false;creates.delete(i);continue;}const p=this.board[i];if(p?.t===-1)continue;if(p){this.collected[p.t]++;this.score+=60*Math.max(1,this.combo);}this.board[i]=null;}
 for(const i of crateHits){this.crates[i]--;this.score+=100;}
 for(const [i,p]of creates)if(!this.board[i]&&!this.crates[i])this.board[i]=p;
 await frame('clear',[...hit]);for(const i of [...creates.keys()])if(!this.board[i])creates.delete(i);
 if(bombs.length){await this.gravity(frame);const again=new Set(bombs.flatMap(i=>this.area(i)));await this.clear(again,new Map(),frame);}
 }
 async gravity(frame=async()=>{}){for(let col=0;col<8;col++){let start=0;for(let row=0;row<=8;row++){const i=row*8+col;if(row===8||this.crates[i]||this.rope[i]){const ids=Array.from({length:row-start},(_,k)=>(start+k)*8+col);const pieces=ids.map(j=>this.board[j]).filter(Boolean);for(let k=ids.length-1;k>=0;k--)this.board[ids[k]]=pieces.pop()||{t:this.randomType(),s:null};start=row+1;}}}
 for(let i=56;i<64;i++)if(this.board[i]?.t===-1){this.board[i]=null;this.delivered++;this.score+=1000;this.events.push('간식 꾸러미 배달 완료!');}if(this.board.some(p=>p===null)&&this.crates.some((c,i)=>!c&&!this.board[i])){for(let col=0;col<8;col++){const i=56+col;if(!this.crates[i]&&!this.board[i]){for(let row=7;row>0;row--){const j=row*8+col;if(this.crates[j-8]||this.rope[j-8])break;this.board[j]=this.board[j-8];this.board[j-8]=null;}}}for(let i=0;i<64;i++)if(!this.board[i]&&!this.crates[i])this.board[i]={t:this.randomType(),s:null};}
 this.spawnDrop();await frame('fall');}
 goals(){const l=this.level,out=[];if(l.collect)out.push({type:'collect',icon:l.collect[0],label:TYPES[l.collect[0]],left:Math.max(0,l.collect[1]-this.collected[l.collect[0]]),total:l.collect[1]});if(l.jelly)out.push({type:'jelly',label:'발자국',left:this.jelly.reduce((a,b)=>a+b,0),total:l.jelly+(l.id>=16?Math.ceil(l.jelly/4):0)});if(l.crates)out.push({type:'crates',label:'상자',left:this.crates.filter(Boolean).length,total:l.crates});if(l.drops)out.push({type:'drops',label:'간식 배달',left:Math.max(0,l.drops-this.delivered),total:l.drops});return out;}
 won(){return this.goals().every(g=>g.left===0);}
 async booster(type,index,frame=async()=>{}){const limits={hammer:2,shuffle:1,moves:1};if(this.used[type]>=limits[type]||this.won()||this.moves<=0)return false;if(type==='hammer'){if(index==null)return false;this.combo=1;await this.clear(new Set([index]),new Map(),frame);await this.gravity(frame);await this.resolve([],frame);}if(type==='shuffle'){this.shuffle();await frame('fall');}if(type==='moves')this.moves+=3;this.used[type]++;this.ensureMoves();return true;}
}
