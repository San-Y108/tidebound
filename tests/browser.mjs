import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import * as R from '../src/rules.js';
const url=process.env.GAME_URL||'http://127.0.0.1:5174/',out=process.env.SCREENSHOT_DIR||'playtest';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1050},offline:process.env.OFFLINE==='1'});const errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('tidebound.spire.v4')));
const click=(a,extra='')=>page.locator(`[data-a="${a}"]${extra}`).filter({visible:true}).first().click();
async function cell(x,y){await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const p=await page.evaluate(([x,y])=>{const scene=window.game.scene.getScene('sea'),p=scene.project(x,y),c=window.game.canvas.getBoundingClientRect();return{x:c.x+p.x*c.width/1000,y:c.y+p.y*c.height/700};},[x,y]);await page.mouse.click(p.x,p.y);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
async function place(id,x,y){await click('build');await click('select',`[data-id="${id}"]`);await cell(x,y);await page.waitForFunction(({id,x,y})=>JSON.parse(localStorage.getItem('tidebound.spire.v4')).grid[y][x].building?.id===id,{id,x,y});}
const buildingPriority=['coil','spore','counter','purifier','beacon','ammoDock','collector','repeater','ballista','harpoon','mortar','mirror','cannon','kelp','ram','battery','coral','net'];
const cardPriority=['spikes','powderKeg','spores','saltMist','mark','heavyShot','bloom','bulwark','patch','coverFire','broadside','powderCrew','retreat','ram','distill','awaken','doubleTap','transmute','echo','fortify','reload','insight'];
const pick=(types,order)=>types.map((type,i)=>({i,rank:order.indexOf(type)})).sort((a,b)=>(a.rank<0?999:a.rank)-(b.rank<0?999:b.rank))[0]?.i??-1;
async function deploy(){let s=await read();for(const item of [...s.inventory]){let empty=R.cells(s).filter(c=>!c.building);if(!empty.length){const dir=s.grid[0].length<=s.grid.length?'east':'south';if(s.wood<14||(dir==='east'?s.grid[0].length:s.grid.length)>=5)continue;await click('build');await click('expand',`[data-dir="${dir}"]`);await click('close-panel');s=await read();empty=R.cells(s).filter(c=>!c.building);}const rank=c=>{const near=R.cells(s).filter(n=>n.building&&Math.abs(n.x-c.x)+Math.abs(n.y-c.y)===1),coral=R.cells(s).some(n=>n.building?.type==='coral'&&Math.max(Math.abs(n.x-c.x),Math.abs(n.y-c.y))<=1);return(coral?3:0)+near.length+(R.BUILDINGS[item.type].damage?near.filter(n=>['beacon','ammoDock'].includes(n.building.type)).length*4:0)+(item.type==='counter'?near.filter(n=>n.building.type==='beacon').length*8:0)+(item.type==='spore'?near.filter(n=>R.BUILDINGS[n.building.type].category==='资源').length*5:0)+(item.type==='coil'?new Set(near.map(n=>R.BUILDINGS[n.building.type].category)).size*5:0);};empty.sort((a,b)=>rank(b)-rank(a));await place(item.id,empty[0].x,empty[0].y);s=await read();}}
function score(s,card){const x=structuredClone(s),a=x.battle,old={hp:s.hp,enemy:s.enemy.hp,block:a.block,poison:a.poison,thorns:a.thorns,strength:a.strength,energy:a.energy,hand:a.zones.hand.length,ammo:a.ammo},intent=R.intentFor(s.enemy,s.battle.turn),incoming=intent.kind==='attack'?intent.amount*intent.hits:0;R.play(x,card.id);if(x.phase==='reward')return 10000;const b=x.battle;return(old.enemy-x.enemy.hp)+(Math.min(incoming,b.block)-Math.min(incoming,old.block))*1.5+(b.poison-old.poison)*2.5+(b.thorns-old.thorns)*Math.max(2,intent.hits*2)+(b.strength-old.strength)*4+(x.hp-old.hp)*2+(b.energy-old.energy+R.cardView(card).cost)*5+(b.zones.hand.length-old.hand+1)*2+Math.min(5,b.ammo-old.ammo)*.8;}
let plays=0,seenShop=false,seenRest=false,savedReload=false,seenBosses=0;
try{
  await page.goto(url);await page.waitForFunction(()=>window.game?.scene.getScene('sea').ready);
  await click('new');await page.locator('input[name="seed"]').fill('0');await page.locator('#new-form button').click();
  assert.equal((await read()).deck.length,10);assert.equal(await page.locator('[data-a="sail"]').isDisabled(),true);
  for(const [id,x,y] of [[5,1,1],[3,1,0],[4,0,0],[1,0,1],[2,2,1]])await place(id,x,y);
  await cell(0,1);await cell(0,2);assert.equal((await read()).grid[2][0].building.id,1);await click('stow');await place(1,0,1);
  await click('build');await click('expand','[data-dir="east"]');assert.equal((await read()).grid[0].length,4);await click('close-panel');
  await click('deck');await click('codex');assert.equal(await page.locator('#drawer .command').count(),40);await page.screenshot({path:`${out}/card-codex.png`,fullPage:true});await click('close-panel');
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`${out}/mobile-prep.png`,fullPage:true});await page.setViewportSize({width:1440,height:1050});
  let count=0;
  while(count++<250){let s=await read();assert.notEqual(s.phase,'lost',`lost at node ${s.day}`);if(s.phase==='won')break;
    if(s.phase==='prep'){
      await deploy();s=await read();const order={rest:8,shop:7,wreck:6,event:5,battle:2,elite:1,boss:0},index=R.routes(s).map((r,i)=>({r,i})).sort((a,b)=>order[b.r.type]-order[a.r.type])[0].i;
      await click('map');await page.locator(`.map-row.current [data-a="route"][data-index="${index}"]`).click();await click('sail');
    }else if(s.phase==='combat'){
      if(s.day===1&&!savedReload){await page.screenshot({path:`${out}/combat-hand.png`,fullPage:true});await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`${out}/mobile-combat.png`,fullPage:true});await page.setViewportSize({width:1440,height:1050});const before=await read();await page.reload();await page.waitForFunction(()=>window.game?.scene.getScene('sea').ready);assert.deepEqual((await read()).battle.zones,before.battle.zones);savedReload=true;}
      for(let n=0;n<40;n++){s=await read();if(s.phase!=='combat')break;const options=s.battle.zones.hand.filter(c=>R.canPlay(s,c.id));if(!options.length)break;options.sort((a,b)=>score(s,b)-score(s,a));await click('play',`[data-id="${options[0].id}"]`);plays++;}
      s=await read();if(s.phase==='combat')await click('end');
    }else if(s.phase==='reward'){
      if(s.encounter.type==='boss'){seenBosses++;await page.screenshot({path:`${out}/boss-${seenBosses}-reward.png`,fullPage:true});}
      await click('reward-tab','[data-tab="card"]');await click('reward',`[data-kind="card"][data-index="${s.deck.length>=15?-1:pick(s.reward.cards,cardPriority)}"]`);
      await click('reward-tab','[data-tab="building"]');await click('reward',`[data-kind="building"][data-index="${pick(s.reward.buildings,buildingPriority)}"]`);
      if(s.reward.relics.length){await click('reward-tab','[data-tab="relic"]');await click('reward',`[data-kind="relic"][data-index="${pick(s.reward.relics,['chalice','anchor','compass','sail','pearl','ledger'])}"]`);}
      await click('finish-reward');
    }else if(s.phase==='shop'){
      seenShop=true;const offers=s.shop.map((item,i)=>({item,i})).filter(v=>v.item?.kind==='building').sort((a,b)=>buildingPriority.indexOf(a.item.type)-buildingPriority.indexOf(b.item.type));
      for(const {item,i} of offers){s=await read();if(buildingPriority.indexOf(item.type)<9&&s.coins>=item.price)await click('buy',`[data-index="${i}"]`);}
      s=await read();if(s.hp<s.maxHp-10)await click('repair');await click('leave-shop');
    }else if(s.phase==='rest'){seenRest=true;await click('rest');}
    else if(s.phase==='event')await click('event','[data-index="1"]');
    else if(s.phase==='crossroads'){await page.screenshot({path:`${out}/act-${s.day/8}-complete.png`,fullPage:true});if(s.day>=24){await click('finish');}else await click('continue');}
  }
  const won=await read();assert.equal(won.phase,'won');assert.equal(won.day,24);assert.equal(won.history.length,24);assert.equal(seenBosses,3);assert.ok(plays>100&&seenShop&&seenRest&&savedReload);await page.screenshot({path:`${out}/victory-24.png`,fullPage:true});
  // UI-only fixtures are generated by normal rules; they separately verify menus
  // without pretending to be part of the legitimate voyage above.
  const fixture=R.createRun(3);R.place(fixture,1,0,0);fixture.day=6;const restIndex=R.routes(fixture).findIndex(r=>r.type==='rest');R.depart(fixture,restIndex);assert.equal(fixture.phase,'rest');
  await page.evaluate(s=>localStorage.setItem('tidebound.spire.v4',JSON.stringify(s)),fixture);await page.reload();await page.waitForFunction(()=>window.game?.scene.getScene('sea').ready);await click('camp-upgrade');await click('upgrade','[data-id="c1"]');assert.equal((await read()).deck[0].upgraded,true);
  const shop=R.createRun(7);R.place(shop,1,0,0);shop.day=3;R.depart(shop,R.routes(shop).findIndex(r=>r.type==='shop'));await page.evaluate(s=>localStorage.setItem('tidebound.spire.v4',JSON.stringify(s)),shop);await page.reload();await page.waitForFunction(()=>window.game?.scene.getScene('sea').ready);await click('shop-remove');await click('remove','[data-id="c1"]');assert.equal((await read()).deck.length,9);
  const dead=R.createRun(2);R.place(dead,1,0,0);dead.day=24;R.depart(dead,0);while(dead.phase==='combat')R.endTurn(dead);assert.equal(dead.phase,'lost');await page.evaluate(s=>localStorage.setItem('tidebound.spire.v4',JSON.stringify(s)),dead);await page.reload();await page.waitForFunction(()=>window.game?.scene.getScene('sea').ready);assert.ok((await page.locator('#modal').innerText()).includes('被'));await click('new');await page.locator('#new-form button').click();assert.equal((await read()).phase,'prep');assert.equal((await read()).deck.length,10);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',legitimateVoyage:{node:won.day,bosses:seenBosses,commandsPlayed:plays,hp:won.hp,maxHp:won.maxHp},checks:['canvas placement/move/stow','40-card codex','mobile prep and hand overflow','combat save/reload','3 acts / 24 nodes','3 bosses','card and building rewards / skip','relic selection','shop purchase','camp upgrades','card removal','death/restart'],errors},null,2));
}catch(e){await page.screenshot({path:`${out}/failure.png`,fullPage:true});await writeFile(`${out}/failure-state.json`,JSON.stringify(await read(),null,2));throw e;}finally{await browser.close();}
