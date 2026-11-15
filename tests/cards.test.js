import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {CARDS,cardView,createStarterDeck,shuffle,beginCardCombat,drawCards,startCardTurn,endCardTurn,canPlay,playCard,assertCardZones} from '../src/cards.js';

function run(seed=44,deck=createStarterDeck()){
  const s={seed,day:1,phase:'combat',deck,hp:80,maxHp:100,enemy:{hp:1e9,maxHp:1e9},battle:{intent:{kind:'attack',amount:8}},log:[]};beginCardCombat(s);return s;
}
const singleton=type=>[{id:'only',type,upgraded:false}];
const hash=s=>createHash('sha256').update(JSON.stringify(s)).digest('hex');
const hooks={apply:op=>op.op==='volley'?{ops:[{op:'damage',amount:7}]}:op.op==='trigger'?{ops:[{op:'block',amount:3}]}:[]};

test('40 original cards have valid costs, descriptions, schools and reusable artwork',()=>{
  assert.equal(Object.keys(CARDS).length,40);const schools=new Set();
  for(const [type,card] of Object.entries(CARDS)){
    assert.ok(Number.isInteger(card.cost)&&card.cost>=0);assert.ok(card.description.length>3);assert.ok(card.ops.length);schools.add(card.school);
    assert.ok(['ballista','cannon','net','collector','purifier','beacon','coral'].includes(card.art));
    assert.equal(card.description,cardView({type}).description);
  }
  assert.equal(schools.size,4);
});
test('combat begins with ten unique cards, five in hand, fresh counters and retained external battle data',()=>{
  const s=run();assert.equal(s.deck.length,10);assert.equal(s.battle.zones.hand.length,5);assert.equal(s.battle.zones.draw.length,5);
  assert.equal(s.battle.energy,3);assert.equal(s.battle.turn,1);assert.equal(s.battle.ammo,0);assert.equal(s.battle.intent.amount,8);assertCardZones(s);
  s.battle.zones.hand[0].upgraded=true;assert.ok(s.deck.every(c=>!c.upgraded),'combat uses copies of the permanent deck');
});
test('4-card Fisher–Yates permutation distribution over 24,000 independent seeds',()=>{
  const counts=new Map();for(let seed=0;seed<24000;seed++){const key=shuffle([0,1,2,3],seed).cards.join('');counts.set(key,(counts.get(key)||0)+1);}
  assert.equal(counts.size,24);const chiSquare=[...counts.values()].reduce((v,n)=>v+(n-1000)**2/1000,0);
  assert.ok(chiSquare<41,`chi square ${chiSquare}`);console.log(`shuffle distribution: 24 permutations, chi-square=${chiSquare.toFixed(3)}, range=${Math.min(...counts.values())}–${Math.max(...counts.values())}`);
});
test('10,000 legal bot turns conserve identity after every play, discard and draw',()=>{
  const deck=Object.keys(CARDS).map((type,i)=>({id:`mixed-${i}`,type,upgraded:i%3===0})),s=run(171,deck);let choice=1337,actions=0;
  const rnd=()=>{choice=(Math.imul(choice,1664525)+1013904223)>>>0;return choice/4294967296;};
  for(let turn=0;turn<10000;turn++){
    for(let move=0;move<20;move++){
      const legal=s.battle.zones.hand.filter(c=>canPlay(s,c.id));if(!legal.length)break;
      const card=legal[Math.floor(rnd()*legal.length)];assert.ok(playCard(s,card.id,hooks).ok);assertCardZones(s);actions++;
      assert.ok(s.battle.energy>=0&&s.battle.ammo>=0);
    }
    endCardTurn(s);assertCardZones(s);startCardTurn(s);assertCardZones(s);
  }
  assert.ok(actions>10000);console.log(`identity simulation: 10,000 turns, ${actions} successful plays`);
});
test('same seed and legal input policy replays to the same final hash, independent of Math.random',()=>{
  function play(seed){const s=run(seed);for(let i=0;i<80;i++){for(let j=0;j<15;j++){Math.random();const c=s.battle.zones.hand.find(c=>canPlay(s,c.id));if(!c)break;playCard(s,c.id);}endCardTurn(s);startCardTurn(s);}return hash(s);}
  assert.equal(play(99),play(99));assert.notEqual(play(99),play(100));
});
test('illegal plays leave every part of state unchanged',()=>{
  for(const mutate of [s=>s.battle.energy=0,s=>s.phase='prep',s=>s.enemy.hp=0]){
    const s=run(1,singleton('shot'));mutate(s);const before=structuredClone(s);assert.equal(canPlay(s,'only'),false);assert.equal(playCard(s,'only').ok,false);assert.deepEqual(s,before);
  }
  const s=run(1,singleton('heavyShot'));const before=structuredClone(s);assert.equal(playCard(s,'only').ok,false);assert.deepEqual(s,before);
  const ordinary=run();const snapshot=structuredClone(ordinary);assert.equal(playCard(ordinary,'missing').ok,false);assert.deepEqual(ordinary,snapshot);
});
test('self-drawing cards stay in limbo and cannot redraw themselves',()=>{
  const s=run(1,singleton('insight'));assert.equal(s.battle.zones.hand.length,1);
  playCard(s,'only');assert.equal(s.battle.zones.hand.length,0);assert.equal(s.battle.zones.exhaust.length,1);assert.equal(s.battle.zones.discard.length,0);assertCardZones(s);
  endCardTurn(s);startCardTurn(s);assert.equal(s.battle.zones.hand.length,0);beginCardCombat(s);assert.equal(s.battle.zones.hand.length,1,'exhaustion resets next battle');
});
test('turn transitions discard the old hand and reset block/energy without destroying persistent ammo or strength',()=>{
  const s=run();s.battle.energy=0;s.battle.block=10;s.battle.ammo=4;s.battle.strength=2;s.battle.nextDraw=1;
  endCardTurn(s);assert.equal(s.battle.zones.hand.length,0);startCardTurn(s);assert.equal(s.battle.energy,3);assert.equal(s.battle.block,0);assert.equal(s.battle.zones.hand.length,6);assert.equal(s.battle.ammo,4);assert.equal(s.battle.strength,2);assert.equal(s.battle.nextDraw,0);assertCardZones(s);
  s.battle.block=9;s.battle.retainBlock=1;endCardTurn(s);startCardTurn(s);assert.equal(s.battle.block,9);endCardTurn(s);startCardTurn(s);assert.equal(s.battle.block,0);
});
test('a trigger cycle stops at the 100-op safety cap and returns the card from limbo',()=>{
  const s=run(1,singleton('brace'));playCard(s,'only',{afterOp:op=>({ops:[{op:op.op==='block'?'draw':'block',amount:1}]})});
  assert.ok(s.log.some(l=>l.includes('100')));assert.equal(s.battle.zones.limbo.length,0);assert.equal(s.battle.resolving,false);assertCardZones(s);
});
test('upgrade text, energy costs and executed effect values have one source of truth',()=>{
  for(const [type,base] of Object.entries(CARDS)){
    const plain=cardView({type,upgraded:false}),up=cardView({type,upgraded:true});assert.ok(up.name.endsWith('+'));assert.equal(up.upgradeable,false);
    const numeric=base.ops.some(o=>['damage','block','heal','ammo','poison'].includes(o.op));
    assert.equal(up.cost,numeric?plain.cost:Math.max(0,plain.cost-1));
    up.ops.forEach((o,i)=>assert.equal(o.amount,base.ops[i].amount+(['damage','block','heal','ammo','poison'].includes(o.op)?2:0)));
  }
  const shot=run(1,[{id:'only',type:'shot',upgraded:true}]);playCard(shot,'only');assert.equal(shot.battle.damageThisTurn,8);assert.match(cardView(shot.deck[0]).description,/8 点伤害/);
  const brace=run(1,[{id:'only',type:'brace',upgraded:true}]);playCard(brace,'only');assert.equal(brace.battle.block,7);
  const reload=run(1,[{id:'only',type:'reload',upgraded:true}]);playCard(reload,'only');assert.equal(reload.battle.ammo,4);
  assert.equal(cardView({type:'insight'}).upgradeable,false,'zero-cost draw cannot receive a fake numeric upgrade');
});
test('damage modifiers apply per hit, ammo is paid once, healing caps at maxHp',()=>{
  const s=run(1,singleton('doubleTap'));s.battle.ammo=1;s.battle.strength=2;s.battle.vulnerable=1;
  const result=playCard(s,'only');assert.equal(result.effects.filter(f=>f.kind==='cardDamage').length,2);assert.equal(s.battle.damageThisTurn,18);assert.equal(s.battle.ammo,0);assert.equal(s.battle.energy,2);
  const heal=run(1,singleton('patch'));heal.hp=99;playCard(heal,'only');assert.equal(heal.hp,100);
});
test('enemy armor applies to each hit, then remaining damage consumes enemy block before hull',()=>{
  const s=run(1,singleton('doubleTap'));s.battle.ammo=1;s.enemy.armor=2;s.enemy.block=3;
  const startHp=s.enemy.hp,result=playCard(s,'only'),hits=result.effects.filter(f=>f.kind==='cardDamage');
  assert.equal(hits.length,2);assert.equal(hits[0].amount,0);assert.equal(hits[0].blocked,2);assert.equal(hits[0].armored,2);
  assert.equal(hits[1].amount,1);assert.equal(hits[1].blocked,1);assert.equal(s.enemy.block,0);assert.equal(s.enemy.hp,startHp-1);assert.equal(s.battle.damageThisTurn,1);
  const immune=run(1,singleton('shot'));immune.enemy.armor=99;const hp=immune.enemy.hp;playCard(immune,'only');assert.equal(immune.enemy.hp,hp);assert.equal(immune.battle.damageThisTurn,0);
});
test('lethal self damage stops later effects and triggers while finishing the card zone transition',()=>{
  const s=run(1,singleton('brace')),hp=s.enemy.hp;let triggerCalls=0;
  playCard(s,'only',{afterOp:op=>{triggerCalls++;if(op.op==='block')return {ops:[{op:'self_damage',amount:999},{op:'damage',amount:20},{op:'draw',amount:2}]};}});
  assert.equal(s.hp,0);assert.equal(s.enemy.hp,hp);assert.equal(triggerCalls,1);assert.equal(s.battle.zones.limbo.length,0);assert.equal(s.battle.zones.discard.length,1);assert.equal(s.battle.resolving,false);assertCardZones(s);assert.equal(canPlay(s,'only'),false);
});
test('starter greedy bot: measure command damage and block over 1,000 turns',()=>{
  const s=run(548);let damage=0,block=0;
  for(let i=0;i<1000;i++){
    for(let j=0;j<15;j++){
      const legal=s.battle.zones.hand.filter(c=>canPlay(s,c.id)).sort((a,b)=>{const priority={insight:0,reload:1,shot:2,brace:3};return priority[a.type]-priority[b.type];});
      if(!legal.length)break;playCard(s,legal[0].id);
    }
    damage+=s.battle.damageThisTurn;block+=s.battle.block;assertCardZones(s);endCardTurn(s);startCardTurn(s);
  }
  assert.ok(damage>5000&&damage<18000);assert.ok(block>1000&&block<15000);
  console.log(`starter command baseline: damage/turn=${(damage/1000).toFixed(2)}, block/turn=${(block/1000).toFixed(2)} (building output excluded)`);
});
