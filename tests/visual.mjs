import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';

const out=process.env.SCREENSHOT_DIR||'playtest/visual';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1080},offline:process.env.OFFLINE==='1'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(process.env.GAME_URL||'http://127.0.0.1:5174/');
  await page.waitForFunction(()=>window.game?.scene.getScene('sea').ready);
  await page.waitForSelector('.ocean-water.ready');
  await page.waitForFunction(()=>Number(document.querySelector('.ocean-water').dataset.frame)>=30);
  const loaded=await page.evaluate(()=>['tile','ballista','cannon','net','collector','purifier','beacon','coral','mast','leviathan','pirate'].every(key=>window.game.textures.exists(key)));
  assert.ok(loaded,'every gameplay sprite must be loaded');
  const before=await page.locator('.ocean-water').getAttribute('data-frame');
  await page.waitForFunction(before=>Number(document.querySelector('.ocean-water').dataset.frame)>Number(before),before);
  // Read immediately after a draw, before WebGL's non-preserved buffer swaps.
  await page.evaluate(()=>{const gl=document.querySelector('.ocean-water').getContext('webgl'),draw=gl.drawArrays.bind(gl);gl.drawArrays=(...args)=>{draw(...args);const pixel=new Uint8Array(4);gl.readPixels(150,150,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);window.waterTestPixel=[...pixel];gl.drawArrays=draw;};});
  await page.waitForFunction(()=>window.waterTestPixel?.slice(0,3).some(n=>n>0));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForTimeout(100);
  const gl=await page.evaluate(()=>{const c=document.querySelector('.ocean-water'),gl=c.getContext('webgl');return {frame:c.dataset.frame,pixel:window.waterTestPixel,error:gl.getError()};});
  assert.equal(gl.error,0);assert.ok(gl.pixel.slice(0,3).some(n=>n>0),'water must draw real pixels');
  await page.screenshot({path:`${out}/water-static.png`});
  await page.waitForTimeout(250);assert.equal(await page.locator('.ocean-water').getAttribute('data-frame'),gl.frame);
  await page.setViewportSize({width:360,height:780});
  await page.waitForTimeout(100);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`${out}/mobile-360.png`,fullPage:true});
  const ship=await page.evaluate(()=>localStorage.getItem('tidebound.spire.v4'));
  await page.evaluate(()=>document.querySelector('.ocean-water').getContext('webgl').getExtension('WEBGL_lose_context').loseContext());
  await page.waitForFunction(()=>!document.querySelector('.ocean-water').classList.contains('ready'));
  assert.equal(await page.evaluate(()=>localStorage.getItem('tidebound.spire.v4')),ship);
  assert.ok(await page.evaluate(()=>window.game.isRunning));
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({result:'PASS',checks:['all gameplay textures loaded','water animates','real rendered pixels','reduced motion freezes water','360px layout','WebGL loss falls back without affecting game'],errors},null,2));
}finally{await browser.close();}
