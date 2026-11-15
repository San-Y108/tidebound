// Original PvE command cards. The permanent deck is copied into combat zones;
// a card in limbo cannot be drawn again while its own effects resolve.
const def=(name,cost,school,art,ops,extra={})=>({name,cost,school,art,rarity:'common',ops,...extra});
export const CARDS={
  shot:def('瞄准射击',1,'通用','ballista',[{op:'damage',amount:6}]),
  brace:def('加固船舷',1,'通用','beacon',[{op:'block',amount:5}]),
  reload:def('回收装填',0,'炮击','collector',[{op:'ammo',amount:2}]),
  insight:def('观潮笔记',0,'通用','net',[{op:'draw',amount:2}],{exhaust:true}),
  heavyShot:def('穿甲重弹',2,'炮击','cannon',[{op:'damage',amount:20}],{ammoCost:2,rarity:'uncommon'}),
  broadside:def('全舷齐射',2,'炮击','cannon',[{op:'volley',amount:1}],{ammoCost:1,rarity:'rare'}),
  powderCrew:def('甲板装填班',1,'炮击','collector',[{op:'ammo',amount:3},{op:'draw',amount:1}]),
  mark:def('标记薄弱处',1,'炮击','ballista',[{op:'vulnerable',amount:2},{op:'damage',amount:3}]),
  doubleTap:def('交替击发',1,'炮击','cannon',[{op:'damage',amount:4},{op:'damage',amount:4}],{ammoCost:1}),
  powderKeg:def('干燥火药',1,'炮击','collector',[{op:'strength',amount:2}],{exhaust:true,rarity:'uncommon'}),
  bulwark:def('重装防波墙',2,'壁垒','beacon',[{op:'block',amount:14}]),
  ram:def('钢舷撞击',1,'壁垒','beacon',[{op:'ram',amount:1}],{rarity:'uncommon'}),
  spikes:def('倒刺船舷',1,'壁垒','coral',[{op:'thorns',amount:4}],{rarity:'uncommon'}),
  coverFire:def('掩护炮击',2,'壁垒','cannon',[{op:'block',amount:8},{op:'damage',amount:6}]),
  patch:def('水下抢修',1,'壁垒','purifier',[{op:'heal',amount:4}],{exhaust:true}),
  fortify:def('缆绳锁定',1,'壁垒','beacon',[{op:'retain_block',amount:1}],{rarity:'uncommon'}),
  spores:def('深海孢子',1,'异变','coral',[{op:'poison',amount:4}]),
  bloom:def('荧光繁殖',1,'异变','coral',[{op:'poison',amount:2},{op:'draw',amount:1}]),
  saltMist:def('盐雾迷航',1,'异变','purifier',[{op:'weak',amount:2},{op:'poison',amount:2}]),
  echo:def('珊瑚回响',2,'异变','coral',[{op:'echo',amount:1}],{exhaust:true,rarity:'rare'}),
  transmute:def('废铁转化',0,'异变','collector',[{op:'energy',amount:1},{op:'draw',amount:1}],{ammoCost:2,exhaust:true,rarity:'uncommon'}),
  distill:def('记忆蒸馏',1,'异变','purifier',[{op:'draw',amount:3}],{exhaust:true,rarity:'uncommon'}),
  retreat:def('顺流避险',1,'通用','net',[{op:'block',amount:4},{op:'next_draw',amount:1}]),
  awaken:def('唤醒甲板',2,'异变','coral',[{op:'trigger',amount:1}],{rarity:'rare'}),
};

const LABELS={damage:n=>`造成 ${n} 点伤害`,block:n=>`获得 ${n} 点格挡`,ammo:n=>`获得 ${n} 发弹药`,heal:n=>`修复 ${n} 点船体`,draw:n=>`抽 ${n} 张牌`,energy:n=>`获得 ${n} 点指令`,thorns:n=>`本场战斗反刺 +${n}`,strength:n=>`本场战斗火力 +${n}`,weak:n=>`施加 ${n} 回合虚弱（敌方攻击 -25%）`,vulnerable:n=>`施加 ${n} 回合破绽（指令伤害 +50%）`,poison:n=>`施加 ${n} 层侵蚀`,next_draw:n=>`下回合额外抽 ${n} 张牌`,retain_block:n=>`接下来 ${n} 回合保留已有格挡`,self_damage:n=>`损失 ${n} 点船体`,volley:n=>`全部攻击建筑额外触发 ${n} 轮`,ram:()=>`消耗全部格挡，造成等量伤害`,echo:n=>`下一张指令的效果额外结算 ${n} 次`,trigger:n=>`全部支援建筑额外触发 ${n} 轮`};
const UPGRADE_OPS=new Set(['damage','block','heal','ammo','poison']);
export function cardView(card){
  const source=CARDS[card?.type];if(!source)return null;
  const eligible=source.ops.some(o=>UPGRADE_OPS.has(o.op));
  const ops=source.ops.map(o=>({...o,amount:o.amount+(card.upgraded&&UPGRADE_OPS.has(o.op)?2:0)}));
  const cost=card.upgraded&&!eligible?Math.max(0,source.cost-1):source.cost;
  const description=[source.ammoCost?`额外消耗 ${source.ammoCost} 发弹药`:null,...ops.map(o=>LABELS[o.op]?.(o.amount)||o.op),source.exhaust?'消耗：本场战斗不再抽到':null].filter(Boolean).join('；')+'。';
  return {...source,name:source.name+(card.upgraded?'+':''),cost,ops,description,upgradeable:!card.upgraded&&(eligible||source.cost>0)};
}
for(const [type,value] of Object.entries(CARDS))value.description=cardView({type,upgraded:false}).description;

export function createStarterDeck(){return ['shot','shot','shot','shot','brace','brace','brace','brace','reload','insight'].map((type,i)=>({id:`c${i+1}`,type,upgraded:false}));}
export function shuffle(cards,rngState){
  const result=[...cards];let state=rngState>>>0;
  function next(){state=(state+0x6D2B79F5)>>>0;let t=state;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}
  for(let i=result.length-1;i>0;i--){const j=Math.floor(next()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return {cards:result,rngState:state};
}
function log(s,text,hooks={}){if(hooks.log)hooks.log(text);else if(Array.isArray(s.log))s.log.unshift(text);}
export function beginCardCombat(s){
  const seed=(s.seed^Math.imul(s.day||1,0x9E3779B1))>>>0;
  const mixed=shuffle(s.deck.map(c=>({...c})),seed);
  Object.assign(s.battle??={}, {zones:{draw:mixed.cards,hand:[],discard:[],exhaust:[],limbo:[]},rngState:mixed.rngState,energy:3,maxEnergy:3,ammo:0,block:0,thorns:0,poison:0,strength:0,vulnerable:0,weak:0,nextDraw:0,retainBlock:0,turn:1,damageThisTurn:0,resolving:false});
  drawCards(s,5);return s.battle;
}
export function drawCards(s,n){
  const b=s.battle,z=b?.zones;if(!z)return [];
  const drawn=[];
  for(let i=0;i<Math.min(100,Math.max(0,Math.floor(n)));i++){
    if(!z.draw.length){if(!z.discard.length)break;const mixed=shuffle(z.discard,b.rngState);z.draw=mixed.cards;z.discard=[];b.rngState=mixed.rngState;}
    const card=z.draw.pop();
    if(z.hand.length>=10){z.discard.push(card);log(s,`手牌已满：${cardView(card).name}进入弃牌堆。`);}else{z.hand.push(card);drawn.push(card);}
  }
  return drawn;
}
export function endCardTurn(s){const z=s.battle?.zones;if(!z)return 0;const count=z.hand.length;z.discard.push(...z.hand);z.hand=[];return count;}
export function startCardTurn(s){
  const b=s.battle;if(!b?.zones)return [];
  b.turn++;b.energy=b.maxEnergy;b.damageThisTurn=0;
  if(b.retainBlock>0)b.retainBlock--;else b.block=0;
  const extra=b.nextDraw;b.nextDraw=0;return drawCards(s,5+extra);
}
export function canPlay(s,id){
  const b=s.battle;if(s.phase!=='combat'||s.hp<=0||!b?.zones||b.resolving||!s.enemy||s.enemy.hp<=0)return false;
  const card=b.zones.hand.find(c=>c.id===id),view=cardView(card);
  return Boolean(view&&b.energy>=view.cost&&b.ammo>=(view.ammoCost||0));
}
export function playCard(s,id,hooks={}){
  if(!canPlay(s,id))return {ok:false,effects:[]};
  const b=s.battle,z=b.zones,index=z.hand.findIndex(c=>c.id===id),card=z.hand.splice(index,1)[0],view=cardView(card),effects=[];
  b.energy-=view.cost;b.ammo-=view.ammoCost||0;z.limbo.push(card);b.resolving=true;
  const queue=view.ops.map(o=>({...o}));let processed=0;
  function merge(result){if(Array.isArray(result))effects.push(...result);else if(result){if(Array.isArray(result.effects))effects.push(...result.effects);if(Array.isArray(result.ops))queue.push(...result.ops.map(o=>({...o})));}}
  try{
    while(queue.length&&processed<100){
      if(s.hp<=0)break;
      const op=queue.shift(),n=Number.isFinite(op.amount)?op.amount:0;processed++;
      switch(op.op){
        case 'draw':drawCards(s,n);break;
        case 'energy':b.energy=Math.max(0,b.energy+n);break;
        case 'ammo':b.ammo=Math.max(0,b.ammo+n);break;
        case 'block':b.block=Math.max(0,b.block+n);effects.push({kind:'cardBlock',amount:n});break;
        case 'thorns':b.thorns=Math.max(0,b.thorns+n);break;
        case 'strength':b.strength+=n;break;
        case 'weak':b.weak=Math.max(0,b.weak+n);break;
        case 'vulnerable':b.vulnerable=Math.max(0,b.vulnerable+n);break;
        case 'poison':b.poison=Math.max(0,b.poison+n);break;
        case 'next_draw':b.nextDraw+=n;break;
        case 'retain_block':b.retainBlock+=n;break;
        case 'self_damage':s.hp=Math.max(0,s.hp-n);effects.push({kind:'cardSelfDamage',amount:n});break;
        case 'heal':{const amount=Math.min(n,s.maxHp-s.hp);s.hp+=amount;effects.push({kind:'cardHeal',amount});break;}
        case 'damage':{
          if(s.enemy.hp<=0)break;
          const raw=Math.max(0,Math.floor((n+b.strength)*(b.vulnerable>0?1.5:1))),armor=Math.max(0,s.enemy.armor||0);
          const afterArmor=Math.max(0,raw-armor),blocked=Math.min(Math.max(0,s.enemy.block||0),afterArmor);
          if(blocked)s.enemy.block-=blocked;
          const amount=Math.min(s.enemy.hp,afterArmor-blocked);
          s.enemy.hp-=amount;b.damageThisTurn+=amount;effects.push({kind:'cardDamage',amount,blocked,armored:Math.min(raw,armor)});break;
        }
        default:if(hooks.apply)merge(hooks.apply(op,card));else log(s,`未接入的指令效果：${op.op}`,hooks);
      }
      if(s.hp<=0){queue.length=0;break;}
      if(hooks.afterOp)merge(hooks.afterOp(op,card));
    }
    if(queue.length)log(s,'触发结算达到 100 次上限，已停止后续连锁。',hooks);
  }finally{
    const limboIndex=z.limbo.findIndex(c=>c.id===card.id);if(limboIndex>=0)z.limbo.splice(limboIndex,1);
    (view.exhaust?z.exhaust:z.discard).push(card);b.resolving=false;
  }
  return {ok:true,effects};
}
export function assertCardZones(s){
  const b=s.battle;if(!Array.isArray(s.deck)||!b?.zones)throw new Error('Missing deck or combat zones');
  const expected=s.deck.map(c=>c.id),actual=['draw','hand','discard','exhaust','limbo'].flatMap(k=>b.zones[k].map(c=>c.id));
  if(new Set(expected).size!==expected.length||new Set(actual).size!==actual.length||actual.length!==expected.length||actual.some(id=>!expected.includes(id)))throw new Error('Card zone identity/conservation violation');
  return true;
}

// Expanded command families: sequencing, resource conversion and delayed payoffs.
Object.assign(CARDS,{
  rapidLoad:def('应急装填',0,'炮击','collector',[{op:'ammo',amount:1},{op:'block',amount:2}],{exhaust:true}),
  powderStorm:def('火药风暴',2,'炮击','cannon',[{op:'damage',amount:7},{op:'damage',amount:7},{op:'damage',amount:7}],{ammoCost:3,rarity:'rare'}),
  rangefinder:def('校准测距',1,'炮击','ballista',[{op:'vulnerable',amount:3},{op:'draw',amount:1}],{rarity:'uncommon'}),
  battleStations:def('全员战位',2,'炮击','collector',[{op:'ammo',amount:3},{op:'volley',amount:1}],{exhaust:true,rarity:'rare'}),
  burningBarrel:def('燃烧桶',1,'炮击','cannon',[{op:'damage',amount:9},{op:'poison',amount:3}],{ammoCost:1}),
  steadyAim:def('稳固炮架',1,'炮击','ballista',[{op:'strength',amount:1},{op:'block',amount:4}],{exhaust:true}),
  ironTide:def('铁壁涨潮',2,'壁垒','beacon',[{op:'block',amount:10},{op:'retain_block',amount:1}],{rarity:'uncommon'}),
  barbedWake:def('倒刺尾流',1,'壁垒','coral',[{op:'block',amount:4},{op:'thorns',amount:2}]),
  salvageArmor:def('废铁装甲',0,'壁垒','collector',[{op:'block',amount:8}],{ammoCost:2}),
  lastBulkhead:def('最后一道舱壁',2,'壁垒','beacon',[{op:'block',amount:20},{op:'next_draw',amount:-1}],{rarity:'uncommon'}),
  repairWatch:def('轮班抢修',1,'壁垒','purifier',[{op:'heal',amount:3},{op:'block',amount:5}],{exhaust:true}),
  toxicBloom:def('毒潮盛放',2,'异变','coral',[{op:'poison',amount:9}],{rarity:'uncommon'}),
  bloodCurrent:def('血色洋流',0,'异变','coral',[{op:'self_damage',amount:4},{op:'energy',amount:1},{op:'draw',amount:1}],{exhaust:true,rarity:'uncommon'}),
  symbiosis:def('深海共生',2,'异变','purifier',[{op:'trigger',amount:1},{op:'draw',amount:2}],{exhaust:true,rarity:'rare'}),
  echoingFire:def('回声炮令',2,'异变','cannon',[{op:'damage',amount:8},{op:'echo',amount:1}],{exhaust:true,rarity:'rare'}),
  tidalPlanning:def('预读潮汐',1,'通用','net',[{op:'draw',amount:1},{op:'next_draw',amount:2}]),
});
for(const [type,value] of Object.entries(CARDS))value.description=cardView({type,upgraded:false}).description;
