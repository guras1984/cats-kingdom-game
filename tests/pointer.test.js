import test from 'node:test';
import assert from 'node:assert/strict';
import {dragIntent,bindPuzzlePointer} from '../pointer.js';

function harness({valid=true,locked=[]}={}) {
  const list=()=>{const set=new Set();return {add:(...xs)=>xs.forEach(x=>set.add(x)),remove:(...xs)=>xs.forEach(x=>set.delete(x)),contains:x=>set.has(x)};};
  const handlers={}, captured=new Set(),swaps=[],taps=[],states=[];
  const cells=Array.from({length:64},(_,i)=>{
    const piece={style:{transform:''},animate:()=>({finished:Promise.resolve()})};
    return {dataset:{cell:String(i)},classList:list(),querySelector:()=>piece,
      closest(){return this;},getBoundingClientRect:()=>({left:i%8*50,top:(i/8|0)*50,width:46,height:46}),piece};
  });
  const board={classList:list(),addEventListener:(name,fn)=>handlers[name]=fn,
    querySelector:s=>cells[Number(s.match(/\d+/)[0])],
    querySelectorAll:s=>s==='.hint'?[]:cells.filter(c=>c.classList.contains('drag-source')||c.classList.contains('drag-neighbor')),
    setPointerCapture:id=>captured.add(id),hasPointerCapture:id=>captured.has(id),releasePointerCapture:id=>captured.delete(id)};
  globalThis.window={addEventListener(){}};globalThis.document={addEventListener(){},hidden:false};globalThis.matchMedia=()=>({matches:false});
  const api=bindPuzzlePointer(board,{blocked:()=>false,canMove:i=>!locked.includes(i),canSwap:()=>valid,
    onGesture:s=>states.push(s),onSwap:(...s)=>swaps.push(s),onTap:i=>taps.push(i),onInvalid:()=>states.push('invalid')});
  const emit=(name,overrides={})=>handlers[name]({pointerId:1,isPrimary:true,button:0,clientX:173,clientY:173,target:cells[27],cancelable:true,preventDefault(){},...overrides});
  return {cells,captured,swaps,taps,states,emit,api};
}

test('swipes use one axis, scale with tile size, and cannot wrap board edges',()=>{
  assert.equal(dragIntent(7,100,0,50,50).target,null);
  assert.equal(dragIntent(0,-100,0,50,50).target,null);
  assert.equal(dragIntent(63,0,100,50,50).target,null);
  assert.equal(dragIntent(27,0,15,40,40).committed,true);
  assert.equal(dragIntent(27,0,15,80,80).committed,false);
  const locked=dragIntent(27,10,100,50,50,'x');assert.equal(locked.axis,'x');assert.equal(locked.target,28);
  assert.equal(dragIntent(27,500,0,50,50).offset,50);
});
test('piece follows the pointer before release and neighbor moves the opposite way',async()=>{
  const h=harness();h.emit('pointerdown');assert.ok(h.captured.has(1));
  h.emit('pointermove',{clientX:195});
  assert.equal(h.cells[27].piece.style.transform,'translate3d(22px, 0px, 0)');
  assert.equal(h.cells[28].piece.style.transform,'translate3d(-22px, 0px, 0)');assert.equal(h.swaps.length,0);
  await h.emit('pointerup',{clientX:195});assert.deepEqual(h.swaps,[[27,28,true]]);assert.deepEqual(h.states,[true,false]);assert.equal(h.captured.size,0);assert.equal(h.cells[27].piece.style.transform,'');
});
test('short swipes and invalid matches return to their starting cells without swapping',async()=>{
  for(const [valid,x]of [[true,181],[false,210]]){
    const h=harness({valid});h.emit('pointerdown');h.emit('pointermove',{clientX:x});await h.emit('pointerup',{clientX:x});
    assert.equal(h.swaps.length,0);assert.equal(h.cells[27].piece.style.transform,'');assert.equal(h.cells[28].piece.style.transform,'');
  }
});
test('canceled touch resets preview and leaves game untouched',async()=>{
  const h=harness();h.emit('pointerdown');h.emit('pointermove',{clientY:205});await h.emit('pointercancel');
  assert.equal(h.swaps.length,0);assert.equal(h.taps.length,0);assert.equal(h.cells[27].piece.style.transform,'');assert.deepEqual(h.states,[true,false]);
});
test('secondary pointers do not interrupt a gesture and clicks still select pieces',async()=>{
  const h=harness();h.emit('pointerdown');h.emit('pointermove',{pointerId:2,clientX:220});await h.emit('pointerup',{pointerId:2});assert.ok(h.captured.has(1));
  await h.emit('pointerup');assert.deepEqual(h.taps,[27]);assert.equal(h.swaps.length,0);
});
test('locked targets resist dragging without displacing the obstacle',async()=>{
  const h=harness({locked:[28]});h.emit('pointerdown');h.emit('pointermove',{clientX:210});assert.equal(h.cells[28].piece.style.transform,'');await h.emit('pointerup',{clientX:210});assert.equal(h.swaps.length,0);
});
