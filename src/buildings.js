const colors={攻击:'#dfac78',资源:'#93bba0',技能:'#9fc5d5',奇妙:'#c6a2d2'};
const make=(name,category,art,price,description,combo,extra={})=>({name,category,art,price,color:colors[category],description,combo,...extra});
export const BUILDINGS={
  ballista:make('拾荒弩炮','攻击','ballista',12,'每回合发射，造成 4 伤害。','信标四邻：伤害 +25%。',{damage:4,cooldown:1}),
  cannon:make('锈铁火炮','攻击','cannon',18,'每 2 回合消耗 1 弹药，造成 11 伤害。','弹药坞四邻：额外 +3 伤害。',{damage:11,cooldown:2,ammo:1}),
  net:make('深海渔网','资源','net',12,'每次出航生产 2 食物。','珊瑚周围：产量 +50%。',{food:2}),
  collector:make('漂流收集器','资源','collector',14,'每次出航获得 4 木材；战斗开始获得 2 弹药。','与武器相邻，每回合再生产 1 弹药。',{wood:4}),
  purifier:make('海水净化器','技能','purifier',16,'每 3 回合修复 3 船体。','与信标相邻，每次修复同时获得 3 护盾。',{heal:3}),
  beacon:make('潮汐信标','技能','beacon',16,'每回合获得 2 护盾。','上下左右武器伤害 +25%。',{shield:2}),
  coral:make('异变珊瑚','奇妙','coral',20,'周围 8 格的伤害、产量、格挡和修复 +35%。','每轮共振指令会立即触发周围设备。',{aura:true}),
  repeater:make('连弩台','攻击','ballista',18,'每回合造成 3 伤害。','旁边有资源建筑时，追加一次 2 伤害射击。',{damage:3,cooldown:1}),
  mortar:make('重型迫击炮','攻击','cannon',26,'每 3 回合消耗 2 弹药，造成 24 伤害。','一轮齐射可提前开火，但仍消耗弹药。',{damage:24,cooldown:3,ammo:2}),
  harpoon:make('穿甲鱼叉','攻击','ballista',21,'每 2 回合造成 6 伤害，并施加 1 层易伤。','先用齐射施加易伤，再打出攻击牌。',{damage:6,cooldown:2}),
  ram:make('装甲撞角','攻击','cannon',22,'每 2 回合造成 4 伤害。','当前护盾至少 10 时，伤害提高 8。',{damage:4,cooldown:2}),
  coil:make('风暴线圈','攻击','beacon',24,'每回合造成 2 伤害。','四邻每多一种建筑类别，伤害 +2。',{damage:2,cooldown:1}),
  ammoDock:make('弹药坞','资源','collector',20,'战斗开始 3 弹药；每回合生产 1 弹药。','生产量随相邻武器数量增加，最多额外 +2。',{wood:1}),
  kelp:make('海藻培养架','资源','net',18,'每次出航生产 1 食物。','与珊瑚相邻：每回合对敌人施加 2 层腐蚀。',{food:1}),
  battery:make('潮汐电容','技能','purifier',27,'战斗首回合指令点 +1。','与信标相邻：之后每回合指令上限 +1，全船最多 +1。'),
  counter:make('反击棘轮','技能','beacon',22,'回合开始获得 1 点反击。','与信标相邻时改为 3 点；每次受击均反击。'),
  spore:make('孢潮培育器','奇妙','coral',25,'每回合对敌人施加 1 层腐蚀。','四邻每座资源建筑，使施加量 +1。'),
  mirror:make('回声珊瑚','奇妙','coral',30,'每 3 回合，下一张牌的数值效果额外复制一次。','与异变珊瑚相邻时，战斗首回合也生效。'),
};
export const BUILDING_TYPES=Object.keys(BUILDINGS);
export const RELICS={
  compass:{name:'旧世界罗盘',art:'beacon',description:'每场战斗开局额外抽 1 张牌。'},
  anchor:{name:'沉铁船锚',art:'cannon',description:'每个回合保留最多 5 点未用护盾。'},
  chalice:{name:'雨水圣杯',art:'purifier',description:'每场战斗结束后修复 5 船体。'},
  ledger:{name:'走私者账簿',art:'collector',description:'商店商品价格降低 20%。'},
  sail:{name:'不落之帆',art:'net',description:'每场战斗首回合额外获得 1 指令点。'},
  pearl:{name:'黑潮珍珠',art:'coral',description:'每当打出的牌被消耗，获得 4 护盾。'},
};
