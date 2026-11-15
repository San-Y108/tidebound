import Phaser from 'phaser';
import { cells, multiplier, BUILDINGS } from './rules.js';
import { ART } from './art.js';
const STEP_X=82,STEP_Y=41,ENEMY={x:825,y:255};
const VIEWS={ballista:[141,145],cannon:[145,140],net:[133,151],collector:[142,151],purifier:[140,156],beacon:[117,179],coral:[132,143],mast:[161,228]};
function diamond(g,x,y,color,alpha=1,width=1){
  const p=[{x,y:y-40},{x:x+80,y},{x,y:y+40},{x:x-80,y}];
  g.fillStyle(color,alpha);g.fillPoints(p,true);
  if(width){g.lineStyle(width,color,Math.min(1,alpha+.35));g.strokePoints(p,true);}
}
export class SeaScene extends Phaser.Scene {
  constructor(){super('sea');}
  preload(){for(const [key,url] of Object.entries(ART))this.load.image(key,url);}
  create(){
    this.reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.water=this.add.graphics();this.ambient=this.add.container();this.wake=this.add.graphics();
    this.ship=this.add.container();this.enemyDraw=this.add.container();this.fx=this.add.container();this.lastWater=0;
    for(let i=0;i<28;i++){
      const fleck=this.add.ellipse((i*173+13)%1000,(i*97+7)%700,2+i%4,1,0xffdfaa,.10+(i%3)*.035);
      this.ambient.add(fleck);
      if(!this.reducedMotion)this.tweens.add({targets:fleck,x:fleck.x+45,y:fleck.y+20,alpha:.01,duration:3500+i*160,repeat:-1,yoyo:true});
    }
    this.ready=true;this.redraw();this.game.events.emit('sea-ready');
  }
  connect(getState,onCell,onHover){this.getState=getState;this.onCell=onCell;this.onHover=onHover;if(this.ready)this.redraw();}
  project(x,y){
    const s=this.getState(),w=s.grid[0].length,h=s.grid.length;
    return {x:490+(x-y)*STEP_X-(w-h)*STEP_X/2,y:410+(x+y)*STEP_Y-(w+h-2)*STEP_Y/2};
  }
  redraw(selected=null,hover=null){
    if(!this.ready||!this.getState)return;
    this.ship.removeAll(true);
    const s=this.getState(),all=cells(s).sort((a,b)=>(a.x+a.y)-(b.x+b.y));this.selected=selected;
    const center=this.project((s.grid[0].length-1)/2,(s.grid.length-1)/2);
    this.ship.add(this.add.ellipse(center.x+12,center.y+42,s.grid[0].length*155+42,s.grid.length*73+27,0x051e24,.10));
    this.ship.add(this.add.ellipse(center.x+9,center.y+37,s.grid[0].length*146+18,s.grid.length*66+20,0x051e24,.12));
    // Separate sprites preserve the array's independently editable cells.
    for(const c of all){
      const {x,y}=this.project(c.x,c.y);
      const tile=this.add.image(x,y,'tile').setOrigin(.5,.436).setDisplaySize(165,99);
      if((c.x+c.y)%3===1)tile.setTint(0xe7e2ce);else if((c.x+c.y)%3===2)tile.setTint(0xd7d7ca);
      this.ship.add(tile);
    }
    const guides=this.add.graphics();this.ship.add(guides);
    const active=all.find(c=>selected?.cell&&c.x===selected.cell.x&&c.y===selected.cell.y);
    for(const c of all){
      const {x,y}=this.project(c.x,c.y),isSelected=selected?.cell?.x===c.x&&selected?.cell?.y===c.y;
      const inRange=active?.building&&(active.building.type==='coral'?Math.max(Math.abs(c.x-active.x),Math.abs(c.y-active.y))<=1:active.building.type==='beacon'?Math.abs(c.x-active.x)+Math.abs(c.y-active.y)===1:false);
      if(inRange&&!isSelected)diamond(guides,x,y,active.building.type==='coral'?0xb993d5:0x8ed8c4,.24,1.5);
      if(isSelected)diamond(guides,x,y,0xffd99c,.17,2.5);else if(hover?.x===c.x&&hover?.y===c.y)diamond(guides,x,y,0xe4e4c9,.12,1.5);
      if(!c.building&&s.phase==='prep'){guides.lineStyle(1,0xf7e1ae,.30);guides.lineBetween(x-5,y,x+5,y);guides.lineBetween(x,y-2.5,x,y+2.5);}
    }
    for(const c of all){
      if(!c.building)continue;
      const {x,y}=this.project(c.x,c.y),type=c.building.type,art=BUILDINGS[type].art||type,[w,h]=VIEWS[art];
      this.ship.add(this.add.ellipse(x+5,y+10,w*.7,23,0x13271f,.32));
      if(type==='beacon'||type==='coral')this.ship.add(this.add.ellipse(x,y-35,type==='beacon'?85:95,type==='beacon'?115:70,type==='beacon'?0xf4be55:0x9acbdb,.08));
      this.ship.add(this.add.image(x,y+15,art).setOrigin(.5,.875).setDisplaySize(w,h));
      if(multiplier(s,c.x,c.y)>1)this.ship.add(this.add.circle(x+44,y-27,3,0xf3dca1,.95));
    }
    const stern=this.project(0,s.grid.length-1);
    this.ship.add(this.add.image(stern.x-35,stern.y+12,'mast').setOrigin(.5,.875).setDisplaySize(...VIEWS.mast));
    // Input zones stay above tall sprites, so buildings cannot steal the tile behind them.
    for(const c of all){
      const {x,y}=this.project(c.x,c.y);
      const zone=this.add.zone(x,y,164,82).setInteractive(new Phaser.Geom.Polygon([{x:0,y:41},{x:82,y:0},{x:164,y:41},{x:82,y:82}]),Phaser.Geom.Polygon.Contains);
      zone.on('pointerdown',()=>this.onCell(c.x,c.y));
      zone.on('pointerover',()=>{this.input.setDefaultCursor('pointer');this.onHover?.(c.x,c.y);});
      zone.on('pointerout',()=>this.input.setDefaultCursor('default'));this.ship.add(zone);
    }
    const tag=this.add.text(center.x,center.y+(s.grid.length+s.grid[0].length)*20+42,`${s.grid[0].length} × ${s.grid.length} 船体  /  ${all.filter(c=>c.building).length} 座建筑`,{fontFamily:'sans-serif',fontSize:'13px',color:'#e1d9bb',shadow:{offsetX:0,offsetY:2,color:'#061b20',blur:6,fill:true}}).setOrigin(.5);
    tag.setVisible(false);this.ship.add(tag);this.drawEnemy();this.paintWater(this.time.now);
  }
  paintWater(time){
    if(!this.getState)return;const s=this.getState();this.wake.clear();this.water.clear();
    const phase=this.reducedMotion?0:time/2300;
    for(let ring=0;ring<3;ring++){
      const growth=((phase+ring*.34)%1),w=s.grid[0].length*153+growth*75+28,h=s.grid.length*65+growth*36+18;
      for(let a=0;a<30;a++){
        if((a+ring)%4===0)continue;
        const angle=a/30*Math.PI*2,angle2=angle+.10+Math.sin(a*17)*.025;
        this.wake.lineStyle(ring===0?1.7:1,0xcce0ce,(1-growth)*.13);
        this.wake.lineBetween(490+Math.cos(angle)*w/2,431+Math.sin(angle)*h/2,490+Math.cos(angle2)*w/2,431+Math.sin(angle2)*h/2);
      }
    }
    for(let i=0;i<24;i++){
      const x=(i*137+43+Math.sin(phase+i)*8)%1000,y=(i*83+35+Math.cos(phase+i)*4)%700;
      this.water.lineStyle(.7,0xd2dfc6,.035+Math.sin(phase+i)*.02);this.water.lineBetween(x,y,x+17+i%5*3,y-3);
    }
  }
  drawEnemy(){
    this.enemyDraw.each(obj=>this.tweens.killTweensOf(obj));this.enemyDraw.removeAll(true);const s=this.getState();if(s.phase!=='combat')return;
    const pirate=s.enemy.type==='elite',boss=s.enemy.type==='boss',size=boss?300:pirate?258:235;
    const shadow=this.add.ellipse(ENEMY.x+6,ENEMY.y+42,size*.75,size*.33,0x071e20,.26);
    const sprite=this.add.image(ENEMY.x,ENEMY.y,pirate?'pirate':'leviathan').setDisplaySize(size,size);this.enemyDraw.add([shadow,sprite]);
    if(!this.reducedMotion)this.tweens.add({targets:sprite,y:ENEMY.y+4,angle:pirate?.8:-.7,duration:1700,repeat:-1,yoyo:true});
  }
  update(time){
    if(!this.ready)return;
    if(!this.reducedMotion){this.ship.y=Math.sin(time/1500)*2;this.ship.rotation=Math.sin(time/2400)*.002;}
    if(time-this.lastWater>120){this.lastWater=time;this.paintWater(time);}
  }
  effects(list){
    for(const e of list){
      if(e.kind==='shot'){
        const p=this.project(e.x,e.y);
        if(this.reducedMotion){this.float(ENEMY.x,ENEMY.y-60,`−${e.amount}`,'#f1d2a3');continue;}
        const flash=this.add.ellipse(p.x+24,p.y-60,33,20,0xffd288,.8);this.fx.add(flash);
        this.tweens.add({targets:flash,scaleX:2,scaleY:1.5,alpha:0,duration:150,onComplete:()=>flash.destroy()});
        const shot=this.add.circle(p.x,p.y-45,3.5,0xffdeb0),tail=this.add.circle(p.x,p.y-45,8,0xfbc67d,.15);this.fx.add([shot,tail]);
        this.tweens.add({targets:[shot,tail],x:ENEMY.x-30,y:ENEMY.y+10,duration:340,onComplete:()=>{shot.destroy();tail.destroy();this.splash(ENEMY.x-30,ENEMY.y+15);this.float(ENEMY.x,ENEMY.y-65,`−${e.amount}`,'#f1d2a3');}});
      }else if(e.kind==='hit'){
        if(!this.reducedMotion)this.cameras.main.shake(150,.0025);this.float(490,370,`−${e.amount}`,'#f4ad93');if(!this.reducedMotion)this.splash(530,450);
      }else{const p=this.project(e.x,e.y);this.float(p.x,p.y-105,`+${e.amount}`,e.kind==='heal'?'#baedbb':'#a7deea');}
    }
  }
  splash(x,y){
    for(let i=0;i<8;i++){
      const drop=this.add.ellipse(x,y,2.5,5,0xd6e2c9,.7);this.fx.add(drop);const angle=i/8*Math.PI*2;
      this.tweens.add({targets:drop,x:x+Math.cos(angle)*28,y:y-15+Math.sin(angle)*13,alpha:0,duration:450,onComplete:()=>drop.destroy()});
    }
  }
  float(x,y,text,color){
    const label=this.add.text(x,y,text,{fontSize:'24px',fontFamily:'Georgia,serif',fontStyle:'bold',color,stroke:'#183932',strokeThickness:3}).setOrigin(.5);this.fx.add(label);
    this.tweens.add({targets:label,y:this.reducedMotion?y:y-38,alpha:0,duration:950,onComplete:()=>label.destroy()});
  }
}
