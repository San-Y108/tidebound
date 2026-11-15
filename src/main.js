import Phaser from 'phaser';
import './spire.css';
import * as R from './rules.js';
import {icon} from './icons.js';
import {SeaScene} from './sea.js';
import {OCEAN,artImage} from './art.js';
import {createOceanBackdrop} from './water.js';
const $=s=>document.querySelector(s),B=R.BUILDINGS,SAVE='tidebound.spire.v4';
let s,selected=null,panel=null,overlay=null,routeIndex=0,rewardTab='card',message='';
try{const saved=JSON.parse(localStorage.getItem(SAVE));s=R.validateSave(saved)?saved:R.createRun();}catch{s=R.createRun();}
const sea=new SeaScene();
const art=(type,cls='')=>artImage(B[type]?.art||R.CARDS[type]?.art||R.RELICS[type]?.art||type,cls);
const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
$('#app').innerHTML=`<header class="topbar"><a class="brand" href="#">${icon('rest')}<span>余潮<small>Tidebound · 逐浪牌组</small></span></a><div id="resources"></div><nav><button data-a="deck">${icon('wreck')}牌组 <b id="deck-count"></b></button><button data-a="map">${icon('compass')}航图</button><button data-a="help">玩法</button><button data-a="new">新航程</button></nav></header><main class="ocean"><div class="sea-heading"><span id="chapter"></span><h1 id="title">让木筏成为你的牌组。</h1><p id="subtitle"></p></div><div id="game" aria-label="逐格建造木筏"></div><div id="enemy" aria-live="polite"></div><div id="inspect"></div><div class="relics" id="relics"></div><div id="hint" class="scene-hint"></div><div class="sea-foot"><span id="ship-count"></span><span id="seed"></span></div></main><div id="dock"></div><section id="hand" aria-label="战斗手牌"></section><aside id="drawer" hidden></aside><button id="scrim" aria-label="收起面板" hidden data-a="close-panel"></button><dialog id="modal"></dialog><div id="toast" role="status"></div>`;
$('.ocean').style.setProperty('--ocean-art',`url("${OCEAN}")`);
const disposeOcean=createOceanBackdrop($('.ocean'),OCEAN,()=>s);if(import.meta.hot)import.meta.hot.dispose(disposeOcean);
window.game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:1000,height:700,transparent:true,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[sea],audio:{noAudio:true},render:{antialias:true},banner:false});
sea.connect(()=>s,cell,()=>{});
function tell(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(tell.timer);tell.timer=setTimeout(()=>$('#toast').classList.remove('show'),2400);}
function sync(){try{localStorage.setItem(SAVE,JSON.stringify(s));message='航程已保存';}catch{message='本次浏览器不允许存档';}render();}
function cell(x,y){if(s.phase==='combat'){const b=s.grid[y]?.[x]?.building;if(b&&B[b.type].damage){const result=R.fireWeapon(s,b.id);if(!result.ok)tell('需要 1 指令、足够弹药，并等待武器冷却。');sync();applyEffects(result);}return;}if(s.phase!=='prep')return;if(selected?.id&&!s.grid[y][x].building){R.place(s,selected.id,x,y);selected=null;}else if(selected?.cell&&!s.grid[y][x].building){R.move(s,selected.cell,{x,y});selected={cell:{x,y}};}else if(s.grid[y][x].building)selected={cell:{x,y}};else selected=null;closePanel();sync();}
function closePanel(){panel=null;$('#drawer').hidden=true;$('#scrim').hidden=true;}
function openPanel(name){panel=panel===name?null:name;renderPanel();}
function viewCard(card,action='',extra='',disabled=false){const v=R.cardView(card);return `<button class="command ${v.school==='炮击'?'gun':v.school==='壁垒'?'guard':v.school==='异变'?'mutant':'basic'} rarity-${v.rarity} ${disabled?'unplayable':''}" ${action?`data-a="${action}"`:''} ${extra} ${disabled?'disabled':''} aria-label="${esc(v.name)}，${v.cost} 指令，${esc(v.description)}"><span class="card-cost">${v.cost}</span><span class="card-school">${v.school}</span><h3>${esc(v.name)}</h3><div class="card-art">${art(v.art)}</div><p>${esc(v.description)}</p><small>${v.rarity==='rare'?'稀有指令':v.rarity==='uncommon'?'精良指令':'航海指令'}${card.upgraded?' · 已升级':''}</small></button>`;}
function buildingCard(type,action,extra='',disabled=false){const b=B[type];return `<button class="engineering ${b.category}" data-a="${action}" ${extra} ${disabled?'disabled':''}><span>${b.category}建筑</span><h3>${b.name}</h3>${art(type)}<p>${b.description}</p><small>${b.combo}</small></button>`;}
function render(){
  const info=R.actInfo(s),stats=R.stats(s),combat=s.phase==='combat';document.body.classList.toggle('in-combat',combat);document.body.dataset.biome=info.biome;
  $('#resources').innerHTML=`<div class="hull">${icon('heart')}<b>${s.hp}<small> / ${s.maxHp}</small></b><i><em style="width:${s.hp/s.maxHp*100}%"></em></i></div>${[['wood',s.wood,'木材'],['coins',s.coins,'零件'],['food',s.food,'食物']].map(([i,n,l])=>`<div title="${l}">${icon(i)}<b>${n}</b><small>${l}</small></div>`).join('')}`;
  $('#deck-count').textContent=s.deck.length;$('#chapter').textContent=`第 ${info.act} 幕 · ${info.name} / 航行节点 ${s.day}`;
  $('#title').textContent=combat?`${s.enemy.name}正在逼近。`:s.phase==='prep'?'让木筏成为你的牌组。':'大海，仍有未知。';
  $('#subtitle').textContent=combat?`回合 ${s.battle.turn} · 自主选择武器与出牌顺序，结束后承受敌方意图。`:`本幕 ${info.step} / ${R.ACT_LENGTH} · ${info.step===R.ACT_LENGTH?'海域霸主等待挑战':'构筑船体，选择航路，寻找下一张关键指令。'}`;
  $('#enemy').innerHTML=combat?enemyPanel():'';
  $('#relics').innerHTML=s.relics.map(t=>`<button data-a="relic-info" data-type="${t}" title="${R.RELICS[t].name}：${R.RELICS[t].description}">${art(t)}<span>${R.RELICS[t].name}</span></button>`).join('');
  $('#ship-count').textContent=`${s.grid[0].length} × ${s.grid.length} 船体 · ${R.cells(s).filter(c=>c.building).length} 座建筑 · 齐备时均伤 ${stats.damage.toFixed(1)}`;
  $('#seed').textContent=`种子 ${s.seed} · ${message}`;
  const chosen=selected?.id?s.inventory.find(b=>b.id===selected.id):selected?.cell?s.grid[selected.cell.y]?.[selected.cell.x]?.building:null;
  $('#inspect').innerHTML=chosen?`${art(chosen.type)}<div><strong>${B[chosen.type].name}</strong><p>${B[chosen.type].description}</p><small>${B[chosen.type].combo}</small></div>${selected.cell?'<button data-a="stow">收回舱内</button>':''}<button data-a="cancel" aria-label="取消选择">×</button>`:'';$('#inspect').hidden=!chosen||combat;
  $('#hint').textContent=combat?'点击武器消耗 1 指令开火，或按顺序出牌；结束回合不会自动攻击。':selected?'点击空船板放置或移动。':R.cells(s).some(c=>c.building)?'建筑提供持续能力，牌组决定你如何指挥它们。':'打开「建造」，将弩炮、渔网、信标、火炮和珊瑚部署上船。';
  $('#dock').innerHTML=combat?`<div class="combat-meter"><span class="energy">${s.battle.energy}<small>指令</small></span><span>${icon('cannon')} ${s.battle.ammo} 弹药</span><span>${icon('shield')} ${s.battle.block} 格挡</span>${s.battle.thorns?`<span>反刺 ${s.battle.thorns}</span>`:''}${s.battle.poison?`<span>侵蚀 ${s.battle.poison}</span>`:''}${s.battle.echo?`<span>回响 ${s.battle.echo}</span>`:''}<button data-a="zones">抽牌 ${s.battle.zones.draw.length} / 弃牌 ${s.battle.zones.discard.length}</button></div><button class="end-turn" data-a="end">结束回合 ${icon('arrow')}</button>`:`<div class="tool-dock"><button data-a="build">${icon('plus')} 建造 <b>${s.inventory.length}</b></button><button data-a="map">${icon('compass')} 航线</button><button data-a="deck">${icon('wreck')} 牌组 ${s.deck.length}</button><button data-a="log">${icon('rest')} 日志</button></div><button class="sail" data-a="sail" ${s.phase!=='prep'||stats.damage<=0?'disabled':''}>${info.step===R.ACT_LENGTH?'挑战海域霸主':`驶向${R.routes(s)[routeIndex]?.name||'下一站'}`} ${icon('arrow')}</button>`;
  $('#hand').hidden=!combat;$('#hand').innerHTML=combat?`<div class="weapon-orders">${R.cells(s).filter(c=>c.building&&B[c.building.type].damage).map(c=>`<button data-a="weapon" data-id="${c.building.id}" ${R.weaponReady(s,c.building.id)?'':'disabled'}>${B[c.building.type].name} · 1 指令${B[c.building.type].ammo?' / '+B[c.building.type].ammo+' 弹药':''}</button>`).join('')}</div><div class="hand-label">手牌 ${s.battle.zones.hand.length} / 10<small>本轮结束后弃掉余牌，下回合抽 5 张</small></div><div class="hand-cards">${s.battle.zones.hand.map(c=>viewCard(c,'play',`data-id="${c.id}"`,!R.canPlay(s,c.id))).join('')}</div>`:'';
  sea.redraw(selected);renderPanel();renderModal();
}
function enemyPanel(){const b=s.battle,e=s.enemy,i=R.currentIntent(s);return `<div class="enemy-card"><span class="intent ${i.kind}">${icon(i.kind==='attack'?'battle':i.kind==='defend'?'shield':'coral')}<strong>${i.label}</strong></span><small>${i.description}</small><div class="enemy-hp"><em style="width:${e.hp/e.maxHp*100}%"></em></div><b>${e.hp} / ${e.maxHp}</b><p class="muted">${e.tactic||'观察意图，手动决定攻击顺序。'}</p><div class="enemy-tags">${e.armor?`护甲 ${e.armor}　`:''}${e.block?`临时护甲 ${e.block}　`:''}${b.weak?`虚弱 ${b.weak}　`:''}${b.vulnerable?`破绽 ${b.vulnerable}`:''}</div></div>`;}
function renderPanel(){
  const el=$('#drawer');el.hidden=!panel;$('#scrim').hidden=!panel;if(!panel)return;
  let html=`<button class="drawer-close" data-a="close-panel" aria-label="关闭">×</button>`;
  if(panel==='build'){html+=`<h2>工程图与建筑舱</h2><p class="muted">永久部署，不进入战斗抽牌堆。整备期间可免费重排。</p><div class="engineering-grid">${s.inventory.map(b=>buildingCard(b.type,'select',`data-id="${b.id}"`,s.phase!=='prep')).join('')||'<p class="empty">工程图已全部部署，航海奖励会带来新的构筑。</p>'}</div><div class="expand"><h3>拓展甲板 · 14 木材</h3><button data-a="expand" data-dir="east" ${s.phase!=='prep'||s.wood<14||s.grid[0].length>=5?'disabled':''}>增加一列</button><button data-a="expand" data-dir="south" ${s.phase!=='prep'||s.wood<14||s.grid.length>=5?'disabled':''}>增加一行</button></div><details class="keyboard-grid"><summary>键盘格子布置</summary><div style="grid-template-columns:repeat(${s.grid[0].length},1fr)">${R.cells(s).map(c=>`<button data-a="cell" data-x="${c.x}" data-y="${c.y}" aria-label="第${c.y+1}行第${c.x+1}列，${c.building?B[c.building.type].name:'空船板'}">${c.building?icon(B[c.building.type].art):'·'}</button>`).join('')}</div></details>`;}
  if(panel==='map'){
    const info=R.actInfo(s),start=(info.act-1)*R.ACT_LENGTH+1;html+=`<h2>第 ${info.act} 幕 · ${info.name}</h2><p class="muted">相邻航道可达。第 ${R.ACT_LENGTH} 节点迎战霸主，之后可以继续航行。</p><div class="map-rows">`;
    for(let n=start;n<start+R.ACT_LENGTH;n++){const old=s.route.find(r=>r.day===n),available=R.routes(s,n);html+=`<div class="map-row ${n===s.day?'current':''} ${n<s.day?'past':''}"><span>${n-start+1}</span><div>${n<s.day?`<span class="visited">✓ ${old?.name||'已经驶过'}</span>`:available.map((r,index)=>`<button data-a="route" data-index="${index}" class="map-stop ${n===s.day&&routeIndex===index?'chosen':''}" ${n!==s.day||s.phase!=='prep'?'disabled':''} title="${r.subtitle}">${icon(r.type)}<strong>${r.name}</strong><small>${r.risk}</small></button>`).join('')}</div></div>`;}
    html+=`</div><h3>当前航路预告</h3><div class="forecast">${(R.routes(s)[routeIndex]?.forecast||[]).map((t,i)=>`<span>${i+1} 站后 ${icon(t)}${{battle:'战斗',elite:'精英',shop:'商船',event:'事件',rest:'休整',wreck:'沉船',boss:'霸主'}[t]}</span>`).join('')}</div>`;
  }
  if(panel==='deck'){html+=`<h2>永久牌组 · ${s.deck.length} 张</h2><button data-a="codex">查看全部 40 张指令图鉴</button><p class="muted">每回合抽 5 张。添加新牌会稀释关键牌，奖励可以跳过，商店可以删牌。</p><div class="deck-grid">${s.deck.map(c=>viewCard(c)).join('')}</div>`;}
  if(panel==='codex'){html+=`<h2>指令图鉴 · 40 张</h2><p class="muted">炮击经营弹药，壁垒兑现格挡，异变积累侵蚀与复制效果。图鉴不代表已经拥有。</p><div class="deck-grid">${Object.keys(R.CARDS).map(type=>viewCard({type})).join('')}</div>`;}
  if(panel==='zones'){html+=`<h2>本场战斗牌区</h2><p class="muted">抽牌堆顺序隐藏。抽尽后重新洗入弃牌，消耗区本场不再抽到。</p>${['draw','discard','exhaust'].map((zone,i)=>`<h3>${['抽牌堆','弃牌堆','消耗区'][i]} · ${s.battle.zones[zone].length}</h3><div class="zone-list">${[...s.battle.zones[zone]].sort((a,b)=>a.type.localeCompare(b.type)).map(c=>`<span>${R.cardView(c).name}</span>`).join('')||'暂无'}</div>`).join('')}`;}
  if(panel==='log')html+=`<h2>航海日志</h2><div class="log-list">${s.log.map(t=>`<p>${esc(t)}</p>`).join('')}</div>`;
  el.innerHTML=html;
}
function modalHeader(tag,title,text=''){return `<span class="eyebrow">${tag}</span><h2>${title}</h2>${text?`<p class="muted">${text}</p>`:''}`;}
function renderModal(){
  const d=$('#modal');let html='';
  if(overlay==='help')html=`<button class="modal-close" data-a="close">×</button>${modalHeader('船长手册','你用牌下令，木筏决定结果。')}<div class="help-grid"><div><h3>整备：空间构筑</h3><p>工程图永久放在船板上，一格一座建筑。可免费重排，花木材扩建。珊瑚强化周围 8 格，信标强化上下左右的武器。弹药坞、反击棘轮和孢潮设备需要不同邻接。</p></div><div><h3>战斗：指令与意图</h3><p>每回合 3 指令，抽 5 张牌。攻击、格挡、装填、侵蚀或回响按出牌顺序结算。结束回合后：侵蚀 → 敌方已预告行动 → 下一回合；武器必须主动点击或用齐射牌触发。余牌弃掉，费用恢复；抽尽重新洗牌。</p></div><div><h3>成长：选择也包括放弃</h3><p>18 种建筑、40 种指令、6 件遗物。战后选牌可跳过；商店可删牌，礁湾可在修复与升级中二选一。新牌越多，关键牌越难抽到。</p></div><div><h3>航路：没有七日截止</h3><p>每幕 12 个节点，三幕抵达灯塔。节点 12、24、36 的霸主各有不同意图。可以选择结束远征，也可以继续深海，每 12 站迎接更强霸主。</p></div></div><button class="primary" data-a="close">回到木筏</button>`;
  else if(overlay==='new')html=`<button class="modal-close" data-a="close">×</button>${modalHeader('一张新航海图','让下一艘船，走向不同的海。','开始新航程将替换卡牌版存档。')}<form id="new-form"><label>航程种子<input name="seed" type="number" min="0" max="999999999" value="${Date.now()%1000000}" required></label><label>开局流派<select name="school"><option value="炮击">炮击 · 装填与破绽</option><option value="壁垒">壁垒 · 反刺与格挡兑现</option><option value="异变">异变 · 侵蚀与虚弱</option></select></label><label>航行方式<select name="mode"><option value="route">自选航路</option><option value="random">随机漂流</option></select></label><button class="primary" type="submit">开始航程</button></form>`;
  else if(overlay==='remove'||overlay==='upgrade')html=`<button class="modal-close" data-a="close">×</button>${modalHeader(overlay==='remove'?'精简牌组':'礁湾升级',overlay==='remove'?`移除指令 · ${15+s.removals*5} 零件`:'选择一张指令永久升级',overlay==='remove'?'删除会使剩余关键牌更容易抽到。':'本次休整只能升级一张牌，随后继续航程。')}<div class="deck-grid">${s.deck.map(c=>viewCard(c,overlay==='remove'?'remove':'upgrade',`data-id="${c.id}"`,overlay==='upgrade'&&!R.cardView(c).upgradeable)).join('')}</div>`;
  else if(s.phase==='reward'){
    const r=s.reward,kind=rewardTab,done=r[`${kind}Taken`],pool=r[{card:'cards',building:'buildings',relic:'relics'}[kind]];
    html=modalHeader(`节点 ${s.day} · ${s.encounter?.type==='boss'?'霸主战利品':'航海所得'}`,'选择能让构筑运转的那一张。','指令进入永久牌组，工程图进入建筑舱；两类各可选一。跳过也是一种选择。')+`<div class="reward-tabs">${[['card','指令牌'],['building','工程图'],['relic','遗物']].filter(([k])=>k!=='relic'||r.relics.length).map(([k,l])=>`<button data-a="reward-tab" data-tab="${k}" class="${kind===k?'active':''}">${l} ${r[`${k}Taken`]?'✓':''}</button>`).join('')}</div>`;
    html+=done?'<div class="reward-done">✓ 这一类奖励已经处理。可以查看其他奖励或继续航行。</div>':`<div class="reward-options">${pool.map((t,i)=>kind==='card'?viewCard({type:t},'reward',`data-kind="card" data-index="${i}"`):kind==='building'?buildingCard(t,'reward',`data-kind="building" data-index="${i}"`):`<button class="relic-offer" data-a="reward" data-kind="relic" data-index="${i}">${art(t)}<h3>${R.RELICS[t].name}</h3><p>${R.RELICS[t].description}</p></button>`).join('')}</div>`;
    html+=`<div class="modal-actions">${!done?`<button data-a="reward" data-kind="${kind}" data-index="-1">跳过${kind==='card'?'这次选牌':'这类奖励'}</button>`:''}<button class="primary" data-a="finish-reward">继续航程${!r.cardTaken||!r.buildingTaken?' · 跳过未选奖励':''}</button></div>`;
  }
  else if(s.phase==='shop')html=modalHeader('漂流商船',`可用零件 ${s.coins}`,'购买指令或工程图，也可以删除不需要的牌。')+`<div class="shop-grid">${s.shop.map((o,i)=>!o?'<div class="sold">已售出</div>':`<div class="shop-item">${o.kind==='card'?viewCard({type:o.type},'buy',`data-index="${i}"`,s.coins<o.price):buildingCard(o.type,'buy',`data-index="${i}"`,s.coins<o.price)}<strong>${o.price} 零件</strong></div>`).join('')}</div><div class="modal-actions"><button data-a="shop-remove" ${s.coins<15+s.removals*5||s.deck.length<=5?'disabled':''}>删牌 · ${15+s.removals*5} 零件</button><button data-a="repair" ${s.coins<10||s.hp===s.maxHp?'disabled':''}>修复 25 · 10 零件</button><button class="primary" data-a="leave-shop">离开商船</button></div>`;
  else if(s.phase==='rest')html=modalHeader('避风礁湾','停下来，决定明天如何出航。','休整只能选择一项：立即修复，或永久升级一张牌。')+`<div class="rest-options"><button data-a="rest">${icon('heart')}<h3>修复船体</h3><p>恢复 ${Math.ceil(s.maxHp*.3)} 船体，当前 ${s.hp} / ${s.maxHp}。</p></button><button data-a="camp-upgrade">${icon('plus')}<h3>升级指令</h3><p>改善数值或降低费用，本局永久生效。</p></button></div>`;
  else if(s.phase==='event'){const e=R.EVENTS[s.eventIndex];html=modalHeader('海上事件',e.name,e.text)+`<div class="event-options">${e.choices.map((t,i)=>`<button data-a="event" data-index="${i}" ${i===0&&s.eventIndex===1&&s.coins<15?'disabled':''}>${t}</button>`).join('')}</div>`;}
  else if(s.phase==='crossroads')html=modalHeader(`第 ${Math.floor(s.day/R.ACT_LENGTH)} 幕已突破`,'远方，仍有海。',s.day>=3*R.ACT_LENGTH?'你已完成三幕寻光航程。此刻可以抵达灯塔结算，也可以继续深海远征。':'下一片海域有新的敌人意图、更强的霸主与更丰富的构筑机会。')+`<div class="end-stats"><span><b>${s.day}</b>航海节点</span><span><b>${s.deck.length}</b>永久指令</span><span><b>${s.relics.length}</b>遗物</span></div><div class="modal-actions">${s.day>=3*R.ACT_LENGTH?'<button data-a="finish">抵达灯塔 · 结算航程</button>':''}<button class="primary" data-a="continue">继续深海 · 修复 20 并补给</button></div>`;
  else if(['lost','won'].includes(s.phase))html=modalHeader(s.phase==='won'?'灯塔已抵达':'一次航程的终点',s.phase==='won'?'这艘船，驶出了自己的路。':'带着新的构筑思路，再出发。',s.endReason)+`<div class="end-stats"><span><b>${s.day}</b>节点</span><span><b>${s.score}</b>远征分数</span><span><b>${s.deck.length}</b>指令牌</span></div><button class="primary" data-a="new">开始新航程</button>`;
  if(html){d.innerHTML=html;if(!d.open)d.showModal();}else if(d.open)d.close();
}
function applyEffects(result){const fx=Array.isArray(result)?result:result?.effects||[];sea.effects(fx.filter(e=>['shot','shield','heal','hit'].includes(e.kind)));for(const e of fx){if(e.kind==='cardDamage'&&e.amount)sea.float(825,185,`−${e.amount}`,'#f2cf9a');if(e.kind==='cardBlock'&&e.amount)sea.float(490,340,`+${e.amount} 格挡`,'#a9d2e7');if(e.kind==='cardHeal'&&e.amount)sea.float(490,340,`+${e.amount}`,'#b5dbb4');}}
document.addEventListener('click',event=>{const el=event.target.closest('[data-a]');if(!el||el.disabled)return;const a=el.dataset.a,index=Number(el.dataset.index);let effects=null;
  if(['build','map','deck','log','zones','codex'].includes(a)){openPanel(a);return;}
  if(a==='close-panel'){closePanel();return;}
  if(a==='cell'){cell(Number(el.dataset.x),Number(el.dataset.y));return;}
  if(a==='select'){selected={id:Number(el.dataset.id)};closePanel();}
  if(a==='cancel')selected=null;
  if(a==='stow'&&selected?.cell){R.stow(s,selected.cell.x,selected.cell.y);selected=null;}
  if(a==='expand'){if(R.expand(s,el.dataset.dir))tell('船体已扩建，上限 +10。');}
  if(a==='route'){routeIndex=index;closePanel();}
  if(a==='sail'){closePanel();selected=null;if(!R.depart(s,routeIndex))tell('先部署一座攻击建筑。');rewardTab='card';}
  if(a==='play'){closePanel();effects=R.play(s,el.dataset.id);}
  if(a==='end'){closePanel();effects=R.endTurn(s);}
  if(a==='weapon'){effects=R.fireWeapon(s,Number(el.dataset.id));}
  if(a==='reward-tab')rewardTab=el.dataset.tab;
  if(a==='reward'){R.chooseReward(s,el.dataset.kind,index);if(el.dataset.kind==='card'&&!s.reward.buildingTaken)rewardTab='building';else if(s.reward.relics.length&&!s.reward.relicTaken)rewardTab='relic';}
  if(a==='finish-reward'){if(!R.finishReward(s)){rewardTab='relic';tell('请选择或跳过遗物。');}routeIndex=0;}
  if(a==='buy')R.buy(s,index);
  if(a==='repair')R.repair(s);
  if(a==='shop-remove')overlay='remove';
  if(a==='remove'){if(R.removeCard(s,el.dataset.id))overlay=null;}
  if(a==='leave-shop'){R.leaveShop(s);routeIndex=0;}
  if(a==='rest'){R.rest(s);routeIndex=0;}
  if(a==='camp-upgrade')overlay='upgrade';
  if(a==='upgrade'){if(R.upgradeCard(s,el.dataset.id)){overlay=null;routeIndex=0;}}
  if(a==='event'){R.resolveEvent(s,index);routeIndex=0;}
  if(a==='continue'){R.sailOn(s);routeIndex=0;}
  if(a==='finish')R.finishVoyage(s);
  if(a==='help'){closePanel();overlay='help';}
  if(a==='new'){closePanel();overlay='new';}
  if(a==='close')overlay=null;
  if(a==='relic-info')tell(R.RELICS[el.dataset.type].description);
  sync();if(effects)applyEffects(effects);
});
document.addEventListener('submit',event=>{if(event.target.id!=='new-form')return;event.preventDefault();const data=new FormData(event.target),seed=Number(data.get('seed'));if(!Number.isInteger(seed)||seed<0||seed>999999999)return;s=R.createRun(seed,data.get('mode'),data.get('school'));overlay=null;selected=null;routeIndex=0;closePanel();sync();});
$('#modal').addEventListener('cancel',event=>{event.preventDefault();if(overlay){overlay=null;renderModal();}});
document.addEventListener('keydown',event=>{if(['INPUT','SELECT','TEXTAREA'].includes(event.target.tagName))return;if(event.key==='Escape'){closePanel();selected=null;sync();}if(event.key==='?'&&!$('#modal').open){overlay='help';renderModal();}if(event.code==='Space'&&event.target===document.body&&!$('#modal').open){event.preventDefault();$(`[data-a="${s.phase==='combat'?'end':'sail'}"]`)?.click();}});
window.game.events.on('sea-ready',()=>render());sync();
