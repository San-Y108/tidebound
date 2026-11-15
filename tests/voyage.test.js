import test from 'node:test';
import assert from 'node:assert/strict';
import { ACT_LENGTH, actInfo, routes, encounterSpec, intentFor } from '../src/voyage.js';

test('acts have eight nodes with bosses at 8, 16, 24, and no seven-day cutoff', () => {
  assert.equal(ACT_LENGTH, 8);
  assert.deepEqual(actInfo(1), {act:1,step:1,name:'漂流近海',bossName:'断礁巨钳',biome:'shallows'});
  assert.equal(actInfo({day:9}).name, '锈蚀航道');
  assert.equal(actInfo(17).name, '无光深渊');
  for (const day of [8,16,24,32,80,800]) {
    const r=routes({day,seed:42,lane:0});assert.equal(r.length,1);assert.equal(r[0].type,'boss');
  }
  assert.equal(routes({day:7,seed:42}).length,3);
  assert.equal(routes({day:25,seed:42,lane:0}).length,3);
  assert.equal(actInfo(25).act,4);assert.match(actInfo(25).name,/远征 2/);
  assert.equal(actInfo(8001).act,1001);
  for(const day of [0,-1,1.5,Infinity,NaN]) assert.throws(()=>actInfo(day),RangeError);
});

test('500 seeds produce connected routes, combat anchors and universally reachable shops/rests', () => {
  for(let seed=0;seed<500;seed++){
    for(let act=1;act<=6;act++){
      let frontier=new Set([0,1,2]);let forcedBattles=0;
      for(let step=1;step<=8;step++){
        const day=(act-1)*8+step,next=new Set();let allBattle=true;
        for(const lane of frontier){
          const options=routes({seed,day,lane});assert.ok(options.length>0);
          if(step!==8)assert.ok(options.length>=2&&options.length<=3);
          for(const r of options){
            assert.ok(step===1||step===8||Math.abs(r.lane-lane)<=1);
            assert.equal(r.forecast.length,2);assert.ok(r.id.startsWith(`${day}:`));
            if(step<=2)assert.notEqual(r.type,'elite');
            if(r.type!=='battle')allBattle=false;
            next.add(r.lane);
          }
          if(step===3)assert.ok(options.some(r=>r.type==='shop'));
          if(step===6)assert.ok(options.some(r=>r.type==='rest'));
        }
        if(allBattle)forcedBattles++;
        frontier=next;
      }
      assert.ok(forcedBattles>=2);
    }
  }
});

test('route forks are seeded per node and lane, isolated from combat and rewards', () => {
  const a={seed:763,day:11,lane:0};
  const b={...a,turn:999,hp:2,coins:888,inventory:[{id:9,type:'cannon'}],battle:{rngState:42},history:[{day:10}]};
  assert.deepEqual(routes(a),routes(b));
  const center=routes({...a,lane:1});
  for(const r of routes(a))assert.deepEqual(r,center.find(c=>c.lane===r.lane));
  assert.deepEqual(routes(a,27),routes({...a,day:27}));
  assert.equal(JSON.stringify(a),JSON.stringify({seed:763,day:11,lane:0}));
  const distributions=new Set(Array.from({length:50},(_,seed)=>JSON.stringify(routes({seed,day:2}).map(r=>r.type))));
  assert.ok(distributions.size>10);
});

test('encounters scale linearly and first battle starts at 38 HP / 7 attack', () => {
  const first=encounterSpec({seed:1,day:1},{type:'battle',lane:1,variant:0});
  assert.equal(first.hp,38);assert.equal(first.maxHp,38);assert.equal(first.attack,7);
  const elite=encounterSpec({seed:1,day:1},{type:'elite',lane:1,variant:0});
  assert.equal(elite.hp,Math.round(38*1.35));assert.equal(elite.attack,Math.round(7*1.35));
  const a=encounterSpec({seed:1,day:9},{type:'battle',variant:0}),b=encounterSpec({seed:1,day:17},{type:'battle',variant:0});
  assert.equal(a.hp-first.hp,b.hp-a.hp);assert.equal(a.attack-first.attack,b.attack-a.attack);
  const bosses=[8,16,24].map(day=>encounterSpec({seed:1,day},{type:'boss'}));
  assert.deepEqual(bosses.map(b=>b.pattern),['crusher','corsair','abyss']);
  assert.equal(bosses[1].hp-bosses[0].hp,bosses[2].hp-bosses[1].hp);
  const deep=encounterSpec({seed:1,day:801},{type:'battle',variant:1});
  assert.ok(Number.isFinite(deep.hp)&&deep.hp<3000);assert.ok(deep.attack<400);
});

test('enemy intents are deterministic, diverse and describe per-hit damage correctly', () => {
  const attack={attack:10,pattern:'attack'};
  assert.deepEqual(intentFor(attack,1),intentFor(attack,1));assert.equal(intentFor(attack,1).amount,10);
  assert.equal(intentFor({attack:10,pattern:'guard'},1).kind,'defend');
  assert.equal(intentFor({attack:10,pattern:'charge'},2).kind,'charge');
  assert.equal(intentFor({attack:10,pattern:'charge'},3).amount,17);
  const crusher={attack:12,pattern:'crusher'};
  assert.equal(intentFor(crusher,2).kind,'charge');assert.equal(intentFor(crusher,3).amount,24);
  const corsair={attack:20,pattern:'corsair'},double=intentFor(corsair,1),triple=intentFor(corsair,3);
  assert.equal(double.hits,2);assert.equal(double.amount,11);assert.match(double.description,/共 22 点/);
  assert.equal(triple.hits,3);assert.equal(triple.amount,9);assert.match(triple.description,/共 27 点/);
  const abyss={attack:16,pattern:'abyss'};
  assert.equal(intentFor(abyss,1).kind,'poison');assert.ok(intentFor(abyss,7).amount>intentFor(abyss,1).amount);
  assert.ok(intentFor(abyss,8).amount>intentFor(abyss,2).amount);
});
