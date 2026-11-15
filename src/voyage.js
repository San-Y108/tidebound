// The voyage is a seeded three-lane graph. `day` is a node number rather than
// a deadline: every twelfth node is a boss, and sailing may continue indefinitely.
export const ACT_LENGTH = 12;

const ACTS = [
  { name: '漂流近海', bossName: '断礁巨钳', biome: 'shallows', pattern: 'crusher' },
  { name: '锈蚀航道', bossName: '锈帆舰队', biome: 'rust', pattern: 'corsair' },
  { name: '无光深渊', bossName: '深渊之母', biome: 'abyss', pattern: 'abyss' },
];
const STOPS = {
  battle: ['猎食海域', '迎击海怪，选择一张指令牌', '中'],
  elite: ['海盗伏击', '挑战强敌，争夺遗物与稀有补给', '高'],
  shop: ['漂流商船', '购买建筑与指令牌，也可删牌', '安全'],
  event: ['迷雾信号', '风险事件，建筑与牌组改变选择', '未知'],
  wreck: ['旧日沉船', '打捞船板、零件与失落建筑', '低'],
  rest: ['避风礁湾', '修复船体，或升级一张指令牌', '安全'],
  boss: ['海域霸主', '击败霸主，驶入下一片海域', '极高'],
};
export const ENEMY_ROSTER = [
  [
    ['裂鳍猎手','attack','稳定攻击；在防御后安排装填与爆发。'],
    ['雾礁潜伏者','charge','蓄力重击前施加破绽，可以打断扑击。'],
    ['针鳍鱼群','swarm','连续三次小伤害，反刺能够逐次反击。'],
    ['寄生海葵','leech','周期恢复生命；用侵蚀压低恢复，再集中火力。'],
    ['盐壳巨蟹','guard','厚甲逐次抵挡伤害；重击与侵蚀更有效。'],
    ['迷航歌妖','siren','预告干扰下一轮抽牌；提前储备指令与装填。'],
  ],
  [
    ['锈壳巨蟹','guard','厚甲与临时护甲交替，先制造破绽再重击。'],
    ['弹仓劫掠者','raider','周期掠夺弹药；在掠夺前开炮，之后再装填。'],
    ['铆钉蜂群','swarm','多段齐射；格挡配合反刺更划算。'],
    ['铁钩潜猎者','charge','破绽能打断蓄力重击，留好标记牌。'],
    ['修复拖船','leech','反复修复；侵蚀与爆发要在修复窗口前叠好。'],
    ['锈帆咒术师','siren','封锁下一回合抽牌，规划本轮资源与后续防御。'],
  ],
  [
    ['无光吞噬者','leech','低血量时恢复更强；侵蚀封锁恢复。'],
    ['噬潮触须','swarm','连续抽打船体，反伤与持续格挡更有效。'],
    ['深渊歌者','siren','削减下一回合抽牌，避免把关键防御留在牌库。'],
    ['沉舰铁卫','guard','厚甲防御，重击配合破绽。'],
    ['掠弹幽灵','raider','先攻击消耗弹药，再使用装填。'],
    ['裂渊伏兽','charge','在扑击前打出破绽，争取一个安全回合。'],
  ],
];

function nodeNumber(value) {
  const node = typeof value === 'object' && value !== null ? value.day : value;
  if (!Number.isSafeInteger(node) || node < 1) throw new RangeError('航程节点必须是正整数');
  return node;
}

function mix(seed, node, lane, purpose = 0) {
  let x = (Number(seed) >>> 0) ^ Math.imul(node, 0x9e3779b1) ^ Math.imul(lane + 1, 0x85ebca6b) ^ Math.imul(purpose + 1, 0xc2b2ae35);
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}

export function actInfo(sOrNode) {
  const node = nodeNumber(sOrNode), act = Math.floor((node - 1) / ACT_LENGTH) + 1;
  const step = (node - 1) % ACT_LENGTH + 1, base = ACTS[(act - 1) % ACTS.length];
  const suffix = act > ACTS.length ? ` · 远征 ${Math.ceil(act / ACTS.length)}` : '';
  return { act, step, name: base.name + suffix, bossName: base.bossName + suffix, biome: base.biome };
}

function typeAt(seed, node, lane) {
  const { step } = actInfo(node), roll = mix(seed, node, lane, 1);
  if (step === ACT_LENGTH) return 'boss';
  // Two mandatory combat floors per act, independent of route and seed.
  if (step === 1 || step === 4 || step === 8 || step === 10) return 'battle';
  if (step === 2) return ['wreck', 'event', 'battle'][roll % 3];
  // The middle lane can be reached from every lane. These anchors guarantee
  // that shops and rest sites are offered even when sailing on an edge.
  if (step === 3 || step === 9) return lane === 1 ? 'shop' : ['battle', 'event', 'wreck'][roll % 3];
  if (step === 5 || step === 7) return ['event', 'elite', 'battle'][(roll + lane) % 3];
  if (step === 6 || step === 11) return lane === 1 ? 'rest' : ['battle', 'shop', 'event'][roll % 3];
  return ['rest', 'elite', 'shop'][lane]; // preparation before a visible boss
}

function currentLane(s, info) {
  // Bosses join the branches; the following act starts with three open routes.
  if (info.step === 1) return 1;
  return Number.isInteger(s.lane) && s.lane >= 0 && s.lane <= 2 ? s.lane : 1;
}

export function routes(s, node = s.day) {
  node = nodeNumber(node);
  const info = actInfo(node), lane = currentLane(s, info);
  if (info.step === ACT_LENGTH) {
    return [{ type: 'boss', name: info.bossName, subtitle: `第 ${info.act} 幕终点 · 击败后可继续航行`, risk: '极高', icon: 'boss', lane: 1, variant: (info.act - 1) % 3, id: `${node}:boss`, forecast: ['battle', typeAt(s.seed, node + 2, 1)] }];
  }
  return [0, 1, 2].filter(next => Math.abs(next - lane) <= 1).map(next => {
    const type = typeAt(s.seed, node, next), [name, subtitle, risk] = STOPS[type];
    return { type, name, subtitle, risk, icon: type, lane: next, variant: mix(s.seed, node, next, 2) % 6, id: `${node}:${next}`,
      forecast: [typeAt(s.seed, node + 1, next), typeAt(s.seed, node + 2, next)] };
  });
}

export function encounterSpec(s, route) {
  const info = actInfo(s), index = (info.act - 1) % ACTS.length;
  const type = route.type, elite = type === 'elite', boss = type === 'boss';
  const variant = Number.isInteger(route.variant) ? ((route.variant % 6) + 6) % 6 : mix(s.seed, s.day, route.lane ?? 1, 3) % 6;
  const baseHp = 38 + (info.act - 1) * 22 + (info.step - 1) * 3;
  const baseAttack = 7 + (info.act - 1) * 3 + Math.floor((info.step - 1) / 3);
  const hp = boss ? 110 + (info.act - 1) * 65 : Math.round(baseHp * (elite ? 1.35 : 1));
  const attack = boss ? 10 + info.act * 2 : Math.round(baseAttack * (elite ? 1.35 : 1));
  const pattern = boss ? ACTS[index].pattern : ENEMY_ROSTER[index][variant][1];
  const name = boss ? info.bossName : elite ? ['锈帆掠夺者', '铁钩船长', '掠潮旗舰', '噬血修复舰', '迷雾咏潮者', '沉锚重装舰'][variant] : ENEMY_ROSTER[index][variant][0];
  const armor = Math.min(8, pattern === 'guard' ? 2 + Math.floor((info.act - 1) / 2) : boss ? 1 + Math.floor(info.act / 2) : 0);
  return { tactic: boss ? ['蓄力时施加破绽可打断重击；半血后重击增强。','轮流齐射、掠弹与修复；侵蚀能够封锁修复。','腐蚀持续增强；半血后连袭，抓紧安全窗口爆发。'][index] : ENEMY_ROSTER[index][variant][2], name, hp, maxHp: hp, attack, type, pattern, armor, act: info.act, step: info.step };
}

function attackIntent(amount, hits = 1, label = '攻击') {
  amount = Math.max(1, Math.round(amount));
  return { kind: 'attack', amount, hits, label: hits > 1 ? `${label} ${amount}×${hits}` : `${label} ${amount}`, description: `造成 ${hits} 次攻击，每次 ${amount} 点伤害（共 ${amount * hits} 点）。` };
}
function defendIntent(amount) {
  amount = Math.max(1, Math.round(amount));
  return { kind: 'defend', amount, hits: 0, label: `防御 ${amount}`, description: `获得 ${amount} 点临时护甲，本回合不攻击。` };
}
function chargeIntent(multiplier, attack) {
  return { kind: 'charge', amount: 0, hits: 0, label: '蓄力', description: `本回合不攻击；下回合发动 ${Math.round(attack * multiplier)} 点重击。` };
}

export function intentFor(enemy, turn = 1) {
  turn = Number.isSafeInteger(turn) && turn > 0 ? turn : 1;
  const enraged=enemy.hp<=enemy.maxHp/2;
  const attack = Math.max(1, Number(enemy.attack) || 1), beat = (turn - 1) % 3;
  if (enemy.pattern === 'crusher') {
    return beat === 0 ? attackIntent(attack * .75, 1, '试探') : beat === 1 ? chargeIntent(enraged?2.5:2, attack) : {...attackIntent(attack * (enraged?2.5:2), 1, '断礁重击'), interruptible:true};
  }
  if (enemy.pattern === 'corsair') {
    return beat === 0 ? attackIntent(attack * .55, 2, '舷炮连击') : beat === 1 ? {kind:'raid',amount:2,hits:0,label:'掠夺弹药 2',description:'失去至多 2 弹药。先开炮消耗弹药，再装填备战。'} : enraged ? {kind:'mend',amount:12,hits:0,label:'紧急修复 12',description:'恢复 12 生命；任何敌方侵蚀层数会阻止修复。'} : attackIntent(attack * .45, 3, '齐射');
  }
  if (enemy.pattern === 'abyss') {
    const pressure = Math.floor((turn - 1) / 3);
    if (beat === 0) {
      const amount = 2 + Math.floor(attack / 12) + pressure;
      return { kind: 'poison', amount, hits: 1, label: `腐蚀 ${amount}`, description: `施加 ${amount} 层船体腐蚀，后续回合持续造成伤害。深渊每 3 回合增强。` };
    }
    return attackIntent(attack + pressure * 2, beat === 2 || enraged ? 2 : 1, beat === 2 ? '深渊连袭' : '深渊冲击');
  }
  if(enemy.pattern==='swarm')return attackIntent(attack*.45,3,'群袭');
  if(enemy.pattern==='leech'&&beat===1)return {kind:'mend',amount:enraged?14:9,hits:0,label:`再生 ${enraged?14:9}`,description:'恢复生命；侵蚀在结算伤害后仍有剩余层数时，再生失败。'};
  if(enemy.pattern==='raider'&&beat===1)return {kind:'raid',amount:2,hits:0,label:'掠夺弹药 2',description:'失去至多 2 弹药；提前开火，在掠夺后再装填。'};
  if(enemy.pattern==='siren'&&beat===0)return {kind:'disrupt',amount:2,hits:0,label:'迷航：下回合少抽 2',description:'下一回合基础抽牌减少 2；本轮准备弹药，或打出筹划增加后续抽牌。'};
  if (enemy.pattern === 'guard' && beat === 0) return defendIntent(5 + attack / 2);
  if (enemy.pattern === 'charge') return beat === 1 ? chargeIntent(1.7, attack) : beat === 2 ? {...attackIntent(attack * 1.7, 1, '扑击'), interruptible:true} : attackIntent(attack);
  return attackIntent(attack);
}
