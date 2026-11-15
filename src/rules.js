import {BUILDINGS,BUILDING_TYPES,RELICS} from './buildings.js';
import {CARDS,cardView,createStarterDeck,beginCardCombat,startCardTurn,endCardTurn,drawCards,playCard,canPlay,assertCardZones} from './cards.js';
import {ACT_LENGTH,actInfo,routes,encounterSpec,intentFor} from './voyage.js';
export {BUILDINGS,BUILDING_TYPES,RELICS,CARDS,cardView,canPlay,ACT_LENGTH,actInfo,routes,intentFor};
export const TYPES=BUILDING_TYPES;
export function random(seed){let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function createRun(seed=Date.now()%1000000,mode='route',school='炮击'){
  return {version:4,seed,mode,day:1,lane:1,phase:'prep',hp:100,maxHp:100,shield:0,wood:18,coins:35,food:6,grid:Array.from({length:3},()=>Array.from({length:3},()=>({building:null}))),inventory:['ballista','net','beacon','cannon','coral'].map((type,i)=>({id:i+1,type})),nextId:6,school,deck:createStarterDeck().map((c,i)=>({...c,type:school==='壁垒'?(i===0?'spikes':i===1?'ram':c.type):school==='异变'?(i===0?'spores':i===1?'saltMist':c.type):(i===0?'powderCrew':i===1?'mark':c.type)})),nextCardId:11,relics:[],route:[],history:[],log:['将建筑部署上木筏。每回合抽 5 张牌，使用 3 点指令指挥船上的设备。'],enemy:null,battle:null,turn:0,reward:null,shop:[],removals:0,score:0,endReason:''};
}
export function addLog(s,t){s.log.unshift(t);s.log=s.log.slice(0,45);}
export function cells(s){return s.grid.flatMap((row,y)=>row.map((c,x)=>({x,y,...c})));}
function near(s,c,types,diagonal=false){return cells(s).filter(n=>n.building&&!(c.x===n.x&&c.y===n.y)&&(diagonal?Math.max(Math.abs(c.x-n.x),Math.abs(c.y-n.y))<=1:Math.abs(c.x-n.x)+Math.abs(c.y-n.y)===1)&&(!types||types.includes(n.building.type)));}
export function multiplier(s,x,y){const c={x,y},type=s.grid[y]?.[x]?.building?.type;if(!type)return 1;return 1+(near(s,c,['coral'],true).length?.35:0)+(BUILDINGS[type].damage&&near(s,c,['beacon']).length?.25:0);}
export function stats(s){const out={damage:0,food:0,wood:0,heal:0,shield:0,combos:0,ammo:0};for(const c of cells(s)){if(!c.building)continue;const b=BUILDINGS[c.building.type],m=multiplier(s,c.x,c.y);if(m>1)out.combos++;for(const k of ['food','wood','heal','shield'])out[k]+=Math.round((b[k]||0)*m);if(b.damage)out.damage+=Math.round(b.damage*m)/b.cooldown;if(c.building.type==='ammoDock')out.ammo+=1+Math.min(2,near(s,c).filter(n=>BUILDINGS[n.building.type].damage).length);if(c.building.type==='collector'&&near(s,c).some(n=>BUILDINGS[n.building.type].damage))out.ammo++;}return out;}
export function place(s,id,x,y){if(s.phase!=='prep'||!s.grid[y]?.[x]||s.grid[y][x].building)return false;const i=s.inventory.findIndex(b=>b.id===id);if(i<0)return false;s.grid[y][x].building=s.inventory.splice(i,1)[0];return true;}
export function move(s,from,to){if(s.phase!=='prep'||!s.grid[from.y]?.[from.x]?.building||!s.grid[to.y]?.[to.x]||s.grid[to.y][to.x].building)return false;s.grid[to.y][to.x].building=s.grid[from.y][from.x].building;s.grid[from.y][from.x].building=null;return true;}
export function stow(s,x,y){if(s.phase!=='prep'||!s.grid[y]?.[x]?.building)return false;s.inventory.push(s.grid[y][x].building);s.grid[y][x].building=null;return true;}
export function expand(s,dir){if(s.phase!=='prep'||!['east','south'].includes(dir)||s.wood<14||(dir==='east'?s.grid[0].length:s.grid.length)>=5)return false;s.wood-=14;if(dir==='east')s.grid.forEach(r=>r.push({building:null}));else s.grid.push(Array.from({length:s.grid[0].length},()=>({building:null})));s.maxHp+=10;s.hp+=10;addLog(s,'扩建船板，船体上限 +10。');return true;}
function addCard(s,type){const card={id:`c${s.nextCardId++}`,type,upgraded:false};s.deck.push(card);return card;}
function addBuilding(s,type){s.inventory.push({id:s.nextId++,type});}
function sample(pool,n,seed){const rng=random(seed),left=[...pool],out=[];while(out.length<n&&left.length){const i=Math.floor(rng()*left.length);out.push(left.splice(i,1)[0]);}return out;}
export function cardRewardPool(s){const act=actInfo(s).act;const pool=Object.keys(CARDS).filter(t=>!['shot','brace','reload','insight'].includes(t));const weighted=pool.flatMap(t=>Array(CARDS[t].rarity==='rare'?Math.min(3,act):CARDS[t].rarity==='uncommon'?3:5).fill(t));const rng=random(s.seed+s.day*701);const out=[];while(out.length<3&&out.length<pool.length){const t=weighted[Math.floor(rng()*weighted.length)];if(!out.includes(t))out.push(t);}return out;}
function prepareShop(s){const discount=s.relics.includes('ledger')?.8:1;const cards=sample(Object.keys(CARDS).filter(t=>!['shot','brace'].includes(t)),3,s.seed+s.day*19).map((type,i)=>({id:`c${i}`,kind:'card',type,price:Math.ceil((CARDS[type].rarity==='rare'?32:CARDS[type].rarity==='uncommon'?23:16)*discount)}));const buildings=sample(TYPES,3,s.seed+s.day*23).map((type,i)=>({id:`b${i}`,kind:'building',type,price:Math.ceil(BUILDINGS[type].price*discount)}));s.shop=[...cards,...buildings];s.phase='shop';}
export function depart(s,index=0){
  if(s.phase!=='prep'||!cells(s).some(c=>c.building&&BUILDINGS[c.building.type].damage))return false;const list=routes(s);if(s.mode==='random')index=Math.floor(random(s.seed+s.day*43)()*list.length);const r=list[index];if(!r)return false;
  const prod=stats(s),upkeep=Math.min(3,actInfo(s).act);s.wood+=prod.wood;s.food+=prod.food;if(s.food<upkeep){s.hp=Math.max(0,s.hp-8);addLog(s,'补给不足：船体 -8。');}s.food=Math.max(0,s.food-upkeep);s.encounter=r;s.lane=r.lane;s.route.push({...r,day:s.day});s.turn=1;addLog(s,`节点 ${s.day}：驶入${r.name}，食物 +${prod.food}、木材 +${prod.wood}，航行消耗 ${upkeep} 食物。`);
  if(s.hp<=0){lose(s,'补给耗尽，船体在漂流中解体。');return true;}
  if(['battle','elite','boss'].includes(r.type)){s.enemy={...encounterSpec(s,r),block:0};s.phase='combat';beginCardCombat(s);s.battle.ammo=2;s.battle.echo=0;s.battle.hullPoison=0;for(const c of cells(s)){if(c.building?.type==='collector')s.battle.ammo+=2;if(c.building?.type==='ammoDock')s.battle.ammo+=3;if(c.building?.type==='battery')s.battle.energy++;}if(s.relics.includes('compass'))drawCards(s,1);if(s.relics.includes('sail'))s.battle.energy++;s.battle.maxEnergy=3+(cells(s).some(c=>c.building?.type==='battery'&&near(s,c,['beacon']).length)?1:0);startBuildings(s,true);s.shield=s.battle.block;}
  else if(r.type==='shop')prepareShop(s);else if(r.type==='rest')s.phase='rest';else if(r.type==='event'){s.eventIndex=Math.floor(random(s.seed+s.day*67)()*EVENTS.length);s.phase='event';}
  else{s.wood+=16;s.coins+=10;addLog(s,'沉船打捞：木材 +16，零件 +10。');makeReward(s,false);}
  return true;
}
function deal(s,n){if(!s.enemy||s.enemy.hp<=0)return 0;let amount=Math.max(0,Math.round(n)-(s.enemy.armor||0));const blocked=Math.min(s.enemy.block||0,amount);s.enemy.block=(s.enemy.block||0)-blocked;amount=Math.min(s.enemy.hp,amount-blocked);s.enemy.hp-=amount;return amount;}
function fire(s,c,forced=false){
  const type=c.building.type,b=BUILDINGS[type],bt=s.battle;if(!b.damage||(!forced&&bt.turn%b.cooldown!==0))return [];
  if(b.ammo&&bt.ammo<b.ammo){addLog(s,`${b.name}缺少弹药，未能开火。`);return [];}bt.ammo-=b.ammo||0;let dmg=Math.round(b.damage*multiplier(s,c.x,c.y));
  if(type==='cannon'&&near(s,c,['ammoDock']).length)dmg+=3;if(type==='ram'&&bt.block>=10)dmg+=8;if(type==='coil')dmg+=new Set(near(s,c).map(n=>BUILDINGS[n.building.type].category)).size*2;
  const amount=deal(s,dmg);const out=[{kind:'shot',x:c.x,y:c.y,amount}];if(type==='harpoon')bt.vulnerable++;if(type==='repeater'&&near(s,c).some(n=>BUILDINGS[n.building.type].category==='资源')){const second=deal(s,2);out.push({kind:'shot',x:c.x,y:c.y,amount:second});}return out;
}
function support(s,c,forced=false){const b=s.battle,t=c.building.type,m=multiplier(s,c.x,c.y),effects=[];
  if(t==='beacon'){const amount=Math.round(2*m);b.block+=amount;effects.push({kind:'shield',x:c.x,y:c.y,amount});}
  if(t==='purifier'&&(forced||b.turn%3===0)){const amount=Math.min(s.maxHp-s.hp,Math.round(3*m));s.hp+=amount;effects.push({kind:'heal',x:c.x,y:c.y,amount});if(near(s,c,['beacon']).length)b.block+=3;}
  if(t==='collector'&&near(s,c).some(n=>BUILDINGS[n.building.type].damage))b.ammo++;
  if(t==='ammoDock')b.ammo+=1+Math.min(2,near(s,c).filter(n=>BUILDINGS[n.building.type].damage).length);
  if(t==='kelp'&&near(s,c,['coral','spore','mirror'],true).length)b.poison+=2;
  if(t==='counter')b.thorns+=near(s,c,['beacon']).length?3:1;
  if(t==='spore')b.poison+=1+near(s,c).filter(n=>BUILDINGS[n.building.type].category==='资源').length;
  if(t==='mirror'&&(b.turn%3===0||(b.turn===1&&near(s,c,['coral'],true).length)))b.echo=Math.min(3,(b.echo||0)+1);
  return effects;
}
function startBuildings(s,first=false){const effects=[];for(const c of cells(s))if(c.building)effects.push(...support(s,c));return effects;}
function lose(s,reason){s.phase='lost';s.endReason=reason;addLog(s,reason);}
function winBattle(s){if(s.phase!=='combat')return;s.score+=s.enemy.type==='boss'?100:s.enemy.type==='elite'?40:15;s.coins+=s.enemy.type==='boss'?45:s.enemy.type==='elite'?28:18;s.wood+=6;if(s.relics.includes('chalice'))s.hp=Math.min(s.maxHp,s.hp+5);addLog(s,`击退${s.enemy.name}，选择新的指令与工程图。`);makeReward(s,true);}
export function play(s,id){
  if(!canPlay(s,id))return {ok:false,effects:[]};const card=s.battle.zones.hand.find(c=>c.id===id),view=cardView(card),charges=view.ops.some(o=>o.op==='echo')?0:s.battle.echo||0;let opCount=0,used=false;const before=s.battle.zones.exhaust.length;
  if(charges)s.battle.echo=0;
  const result=playCard(s,id,{log:t=>addLog(s,t),apply(op){const fx=[];
    if(op.op==='volley')for(let i=0;i<op.amount;i++)for(const c of cells(s))if(c.building)fx.push(...fire(s,c,true));
    if(op.op==='trigger')for(let i=0;i<op.amount;i++)for(const c of cells(s))if(c.building)fx.push(...support(s,c,true));
    if(op.op==='echo')s.battle.echo=Math.min(3,(s.battle.echo||0)+op.amount);
    if(op.op==='ram'){const block=s.battle.block;s.battle.block=0;const amount=deal(s,block);fx.push({kind:'cardDamage',amount});}
    return fx;
  },afterOp(){opCount++;if(!used&&charges&&opCount===view.ops.length){used=true;return {ops:Array.from({length:Math.min(3,charges)},()=>view.ops.map(o=>({...o}))).flat()};}}});
  if(s.relics.includes('pearl')&&s.battle.zones.exhaust.length>before)s.battle.block+=4;
  s.shield=s.battle.block;addLog(s,`打出${view.name}，剩余 ${s.battle.energy} 指令。`);if(s.hp<=0)lose(s,'指令透支了船体的最后力量。');else if(s.enemy.hp<=0)winBattle(s);return result;
}
export function currentIntent(s){const i=intentFor(s.enemy,s.battle.turn);if(i.interruptible&&s.battle.vulnerable>0)return {kind:'charge',amount:0,hits:0,label:'扑击已打断',description:'破绽打断了蓄力重击，本回合无法攻击。'};if(i.kind!=='attack')return i;const amount=Math.max(1,Math.floor(i.amount*(s.battle.weak>0?.75:1)))+Math.max(0,s.battle.turn-14)*2;return {...i,amount,label:`${i.hits>1?'连击':'攻击'} ${amount}${i.hits>1?'×'+i.hits:''}`,description:`造成 ${i.hits} 次攻击，每次 ${amount} 伤害，共 ${amount*i.hits}。${s.battle.weak>0?'已计入虚弱。':''}${s.battle.turn>14?'风暴持续增强。':''}`};}
export function endTurn(s){
  if(s.phase!=='combat')return [];const b=s.battle,effects=[];endCardTurn(s);
  if(s.enemy.hp>0&&b.poison>0){const amount=Math.min(s.enemy.hp,b.poison);s.enemy.hp-=amount;b.poison=Math.max(0,b.poison-1);effects.push({kind:'cardDamage',amount});addLog(s,`侵蚀造成 ${amount} 伤害。`);}
  if(s.enemy.hp<=0){s.shield=b.block;winBattle(s);return effects;}
  const intent=currentIntent(s);s.enemy.block=0;
  if(intent.kind==='raid'){const lost=Math.min(b.ammo,intent.amount);b.ammo-=lost;addLog(s,`弹药被掠夺 ${lost}。`);}
  if(intent.kind==='disrupt'){b.nextDraw-=intent.amount;addLog(s,`下回合少抽 ${intent.amount} 张。`);}
  if(intent.kind==='mend'){const healed=b.poison>0?0:Math.min(intent.amount,s.enemy.maxHp-s.enemy.hp);s.enemy.hp+=healed;addLog(s,healed?`敌人修复 ${healed} 生命。`:'侵蚀封锁了敌人的修复。');}
  if(intent.kind==='defend'){s.enemy.block=intent.amount;addLog(s,`${s.enemy.name}架起 ${intent.amount} 护甲。`);}
  if(intent.kind==='poison'){b.hullPoison+=intent.amount;addLog(s,`船体受到 ${intent.amount} 层腐蚀。`);}
  if(intent.kind==='charge')addLog(s,`${s.enemy.name}正在蓄力！下回合将重击。`);
  if(intent.kind==='attack')for(let i=0;i<intent.hits;i++){const attack=intent.amount,blocked=Math.min(b.block,attack),damage=attack-blocked;b.block-=blocked;s.hp=Math.max(0,s.hp-damage);effects.push({kind:'hit',amount:damage});if(b.thorns>0)deal(s,b.thorns);addLog(s,`${s.enemy.name}攻击 ${attack}，格挡 ${blocked}，船体 -${damage}${b.thorns?`，反刺 ${b.thorns}`:''}。`);if(s.hp<=0||s.enemy.hp<=0)break;}
  if(s.hp>0&&s.enemy.hp<=0){s.shield=b.block;winBattle(s);return effects;}
  if(b.hullPoison&&s.hp>0){s.hp=Math.max(0,s.hp-b.hullPoison);effects.push({kind:'hit',amount:b.hullPoison});b.hullPoison=Math.max(0,b.hullPoison-1);}
  if(s.hp<=0){lose(s,`木筏在节点 ${s.day} 被${s.enemy.name}击沉。`);s.shield=b.block;return effects;}
  if(s.enemy.hp<=0){winBattle(s);return effects;}
  b.weak=Math.max(0,b.weak-1);b.vulnerable=Math.max(0,b.vulnerable-1);const retained=s.relics.includes('anchor')?Math.min(5,b.block):0;startCardTurn(s);b.block=Math.max(b.block,retained);effects.push(...startBuildings(s));s.turn=b.turn;s.shield=b.block;return effects;
}
export function weaponReady(s,id){if(s.phase!=='combat'||s.battle.energy<1)return false;const c=cells(s).find(c=>c.building?.id===id);if(!c)return false;const b=BUILDINGS[c.building.type];return Boolean(b.damage&&s.battle.ammo>=(b.ammo||0)&&s.battle.turn>=(s.battle.weaponCooldowns?.[id]||0));}
export function fireWeapon(s,id){if(!weaponReady(s,id))return {ok:false,effects:[]};const c=cells(s).find(c=>c.building?.id===id);s.battle.energy--;s.battle.weaponCooldowns??={};s.battle.weaponCooldowns[id]=s.battle.turn+BUILDINGS[c.building.type].cooldown;const effects=fire(s,c,true);s.shield=s.battle.block;addLog(s,`手动指挥${BUILDINGS[c.building.type].name}开火，消耗 1 指令。`);if(s.enemy.hp<=0)winBattle(s);return {ok:true,effects};}
export const combatTick=endTurn;
export function makeReward(s,battle=true){s.phase='reward';const boss=s.encounter?.type==='boss';s.reward={cards:cardRewardPool(s),buildings:sample(TYPES,3,s.seed+s.day*911),relics:(boss||s.encounter?.type==='elite')?sample(Object.keys(RELICS).filter(t=>!s.relics.includes(t)),3,s.seed+s.day*31):[],cardTaken:false,buildingTaken:false,relicTaken:false};}
export function chooseReward(s,kind,index){if(s.phase!=='reward'||!['card','building','relic'].includes(kind)||s.reward[`${kind}Taken`])return false;const key={card:'cards',building:'buildings',relic:'relics'}[kind],list=s.reward[key];if(index===-1){s.reward[`${kind}Taken`]=true;return true;}const type=list[index];if(!type)return false;if(kind==='card')addCard(s,type);if(kind==='building')addBuilding(s,type);if(kind==='relic')s.relics.push(type);s.reward[`${kind}Taken`]=true;addLog(s,`获得${kind==='card'?CARDS[type].name:kind==='building'?BUILDINGS[type].name:RELICS[type].name}。`);return true;}
function advance(s){s.history.push({day:s.day,type:s.encounter?.type,hp:s.hp,deck:s.deck.length});s.reward=null;s.enemy=null;s.battle=null;s.shield=0;if(s.day%ACT_LENGTH===0)s.phase='crossroads';else{s.day++;s.phase='prep';}}
export function finishReward(s){if(s.phase!=='reward')return false;if(s.reward.relics.length&&!s.reward.relicTaken)return false;advance(s);return true;}
export function sailOn(s){if(s.phase!=='crossroads')return false;s.day++;s.phase='prep';s.hp=Math.min(s.maxHp,s.hp+20);s.food+=3;s.wood+=8;addLog(s,`驶入第 ${actInfo(s).act} 幕。船体修复 20，补给已装船。`);return true;}
export function finishVoyage(s){if(s.phase!=='crossroads'||s.day<3*ACT_LENGTH)return false;s.phase='won';s.endReason=`穿越 ${Math.floor(s.day/ACT_LENGTH)} 片海域，你带着 ${s.deck.length} 张指令和独一无二的木筏抵达灯塔。`;return true;}
export function buy(s,index){if(s.phase!=='shop'||!s.shop[index]||s.coins<s.shop[index].price)return false;const item=s.shop[index];s.coins-=item.price;if(item.kind==='card')addCard(s,item.type);else addBuilding(s,item.type);s.shop[index]=null;return true;}
export function repair(s){if(s.phase!=='shop'||s.coins<10||s.hp>=s.maxHp)return false;s.coins-=10;s.hp=Math.min(s.maxHp,s.hp+25);return true;}
export function removeCard(s,id){if(s.phase!=='shop'||s.deck.length<=5)return false;const index=s.deck.findIndex(c=>c.id===id),price=15+s.removals*5;if(index<0||s.coins<price)return false;s.coins-=price;s.deck.splice(index,1);s.removals++;addLog(s,'从永久牌组中移除一张指令。');return true;}
export function upgradeCard(s,id){const card=s.deck.find(c=>c.id===id);if(s.phase!=='rest'||!cardView(card)?.upgradeable)return false;card.upgraded=true;addLog(s,`${cardView(card).name}升级完成。`);advance(s);return true;}
export function rest(s){if(s.phase!=='rest')return false;const heal=Math.ceil(s.maxHp*.3);s.hp=Math.min(s.maxHp,s.hp+heal);addLog(s,`礁湾休息，修复 ${heal} 船体。`);advance(s);return true;}
export function leaveShop(s){if(s.phase!=='shop')return false;advance(s);return true;}
export const EVENTS=[
  {name:'沉没图书馆',text:'一座旧世界图书馆露出水面。深入水下，或收集门口的物资？',choices:['潜入藏书室：失去 10 船体，获得一张稀有指令','收集漂浮物：木材 +12，食物 +2']},
  {name:'走私者的小艇',text:'陌生人摊开防水的工程图纸，要求用零件交换。',choices:['支付 15 零件：获得重型迫击炮工程图','拒绝交易：获得 2 食物']},
  {name:'遗弃的信标',text:'信标下压着一封旧航海日志。遗忘一条命令，或留下来修补船体。',choices:['遗忘：免费移除一张基础射击或加固牌','休整：修复 20 船体']},
  {name:'盛放的珊瑚礁',text:'珊瑚在船底发出低语。它愿意分享力量，但代价是木筏的一部分。',choices:['献出船板：生命上限 -8，获得回声珊瑚和珊瑚回响','顺流而去：零件 +14']},
];
export function resolveEvent(s,choice){if(s.phase!=='event'||![0,1].includes(choice))return false;const index=s.eventIndex;
  if(choice===0&&index===1&&s.coins<15)return false;
  if(choice===1){if(index===0){s.wood+=12;s.food+=2;}if(index===1)s.food+=2;if(index===2)s.hp=Math.min(s.maxHp,s.hp+20);if(index===3)s.coins+=14;}
  else{if(index===0){s.hp=Math.max(1,s.hp-10);addCard(s,sample(Object.keys(CARDS).filter(t=>CARDS[t].rarity==='rare'),1,s.seed+s.day)[0]);}if(index===1){s.coins-=15;addBuilding(s,'mortar');}if(index===2){const i=s.deck.findIndex(c=>['shot','brace'].includes(c.type));if(i>=0&&s.deck.length>5)s.deck.splice(i,1);}if(index===3){s.maxHp=Math.max(20,s.maxHp-8);s.hp=Math.min(s.hp,s.maxHp);addBuilding(s,'mirror');addCard(s,'echo');}}
  addLog(s,`事件：${EVENTS[index].choices[choice]}。`);advance(s);return true;
}
export function validateSave(s){try{
  if(!s||s.version!==4||!Number.isSafeInteger(s.seed)||!Number.isSafeInteger(s.day)||s.day<1||!['prep','combat','shop','rest','event','reward','crossroads','won','lost'].includes(s.phase))return false;
  if(!['hp','maxHp','wood','coins','food','shield'].every(k=>Number.isFinite(s[k])&&s[k]>=0)||s.hp>s.maxHp||s.maxHp<=0)return false;
  if(!Array.isArray(s.grid)||s.grid.length<3||s.grid.length>5||!s.grid.every(row=>Array.isArray(row)&&row.length===s.grid[0].length&&row.length>=3&&row.length<=5&&row.every(c=>c&&Object.hasOwn(c,'building')&&(!c.building||BUILDINGS[c.building.type]))))return false;
  const buildings=[...s.inventory,...cells(s).map(c=>c.building).filter(Boolean)];if(!buildings.every(b=>b&&BUILDINGS[b.type]&&Number.isInteger(b.id))||new Set(buildings.map(b=>b.id)).size!==buildings.length)return false;
  if(!Array.isArray(s.deck)||!s.deck.length||!s.deck.every(c=>CARDS[c.type]&&typeof c.id==='string')||new Set(s.deck.map(c=>c.id)).size!==s.deck.length)return false;
  if(!Array.isArray(s.log)||!Array.isArray(s.route)||!Array.isArray(s.history)||!Array.isArray(s.relics)||!s.relics.every(t=>RELICS[t]))return false;
  if(s.phase==='combat'){if(!s.enemy||!Number.isFinite(s.enemy.hp)||s.enemy.hp<=0||!s.battle||!Number.isFinite(s.battle.energy))return false;assertCardZones(s);}
  if(s.phase==='reward'&&(!s.reward||!s.reward.cards.every(t=>CARDS[t])||!s.reward.buildings.every(t=>BUILDINGS[t])||!s.reward.relics.every(t=>RELICS[t])))return false;
  return true;
}catch{return false;}}
