const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const out=path.join(__dirname,'..','test-results');fs.mkdirSync(out,{recursive:true});
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1});
  const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR:',e.message);});
  page.on('console',m=>{if(m.type()==='warning'||m.type()==='error')console.log(m.type(),m.text().slice(0,300));});
  page.on('response',r=>{if(r.status()===404)console.log('MISSING',r.url());});
  await page.goto(process.env.ROOM_QA_URL||'http://127.0.0.1:4173/game.html',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(700);
  console.log('menu ready',await page.locator('.menuTitle').textContent());
  // An isolated browser profile is seeded; no real player data is accessed.
  await page.evaluate(()=>{
    state=JSON.parse(JSON.stringify(NEW_GAME_STATE));
    state.soundEnabled=false;state.musicEnabled=false;state.menuMusicEnabled=false;
    state.tutorialSeen=true;state.language='es';saveGame(true);continueGame(1);
  });
  await page.waitForSelector('#mainScene[data-room-state="ready"]',{timeout:25000});
  await page.waitForTimeout(1200);
  await page.screenshot({path:path.join(out,'room-desktop.png')});
  console.log('room ready',await page.locator('#mainScene').boundingBox());
  await page.getByRole('button',{name:'Mercado',exact:true}).click();
  await page.waitForSelector('#screenTrade.active');
  assert.equal(await page.evaluate(()=>state.cash),500,'Opening the market must not alter cash');
  await page.locator('#screenTrade .backBtn').click();
  await page.waitForSelector('#screenMain.active');
  await page.getByRole('button',{name:'Banco',exact:true}).filter({has:page.locator('svg')}).click();
  await page.waitForSelector('#screenBank.active');
  await page.locator('#screenBank .backBtn').click();
  await page.locator('.room-hotspot[data-action="upgrades"]').click();
  await page.waitForSelector('#screenShop.active');
  await page.locator('#screenShop .backBtn').click();
  await page.locator('#screenExtra .bnav[onclick="goHome()"]').click();
  await page.waitForSelector('#screenMain.active');
  for(const [name,width,height] of [['mobile',390,844],['small',320,568],['landscape',844,390]]) {
    await page.setViewportSize({width,height});await page.waitForTimeout(500);
    await page.screenshot({path:path.join(out,`room-${name}.png`)});
    const layout=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth,height:innerHeight,scroll:document.documentElement.scrollHeight,hotspots:[...document.querySelectorAll('.room-hotspot')].map(b=>{const r=b.getBoundingClientRect();return {action:b.dataset.action,x:r.x,y:r.y,w:r.width,h:r.height};})}));
    assert.ok(layout.width<=width,`${name}: horizontal overflow`);
    assert.ok(layout.scroll<=height,`${name}: vertical overflow`);
    for(const b of layout.hotspots)assert.ok(b.w>40&&b.h>=44&&b.x>=0&&b.y>=0&&b.x+b.w<=width&&b.y+b.h<=height,`${name}: ${b.action} hidden or clipped`);
    for(let i=0;i<layout.hotspots.length;i++)for(let j=i+1;j<layout.hotspots.length;j++){
      const a=layout.hotspots[i],b=layout.hotspots[j];
      assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,`${name}: ${a.action}/${b.action} overlap`);
    }
    console.log(name,JSON.stringify(layout));
  }
  await page.setViewportSize({width:1024,height:900});
  // Real purchase through the shop UI, then re-equip and reload the saved game.
  await page.evaluate(()=>{state.cash=10000;goScreen('screenShop');setShopFilter('inmueble');});
  await page.locator('button[onclick="buyShopItem(\'home1\')"]').click();
  for(let i=0;i<6&&await page.locator('#achievementOverlay.show').count();i++)await page.locator('#achievementOverlay button').click();
  assert.equal(await page.evaluate(()=>state.cash),7100);
  await page.locator('#screenShop .bnav[onclick="goHome()"]').click();
  await page.waitForSelector('#mainScene[data-room-home="home1"]');
  await page.screenshot({path:path.join(out,'room-purchased.png')});
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fundTycoonSave_v2_slot1')));
  assert.equal(saved.state.shop.equipped.inmueble,'home1');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('.slotBtnPlay').first().click();
  await page.waitForSelector('#mainScene[data-room-state="ready"][data-room-home="home1"]');
  assert.equal(await page.evaluate(()=>state.cash),7100);
  await page.getByRole('button',{name:'Ver habitación en 2D',exact:true}).click();
  assert.equal(await page.locator('#mainScene').evaluate(e=>e.classList.contains('room-rendered')),false);
  await page.getByRole('button',{name:'Ver habitación en 3D',exact:true}).click();
  await page.waitForSelector('#mainScene.room-rendered');
  for(const [name,p] of [['dawn',.10],['day',.36],['sunset',.65],['night',.89]]){
    await page.evaluate(p=>{dayCycleStart=Date.now()-p*DAY_DURATION_MS;},p);
    await page.waitForTimeout(2200);
    await page.screenshot({path:path.join(out,`room-${name}.png`)});
    assert.equal(await page.locator('#mainScene').evaluate(e=>e.classList.contains('room-rendered')),true);
  }
  // The day counter follows the lighting clock, including menu/resume.
  const dayBefore=await page.evaluate(()=>state.day);
  await page.evaluate(()=>{dayCycleStart=Date.now()-DAY_DURATION_MS-1;});
  await page.waitForTimeout(1400);
  for(let i=0;i<6&&await page.locator('#achievementOverlay.show').count();i++)await page.locator('#achievementOverlay button').click();
  if(await page.locator('#steveOverlay.show').count())await page.locator('#steveOverlay .steveContinue').click();
  assert.equal(await page.evaluate(()=>state.day),dayBefore+1);
  await page.evaluate(()=>{openPauseMenu();dayCycleStart=Date.now()-DAY_DURATION_MS-1;});
  await page.waitForTimeout(1300);
  assert.equal(await page.evaluate(()=>state.day),dayBefore+1);
  await page.locator('.slotBtnPlay').first().click();
  await page.waitForTimeout(1200);
  assert.equal(await page.evaluate(()=>state.day),dayBefore+1);
  for(const [lang,market] of [['en','Market'],['zh','市场'],['es','Mercado']]){
    await page.locator('#languageHomeSelect').selectOption(lang);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('.slotBtnPlay').first().click();
    await page.waitForSelector('#mainScene.room-rendered');
    await page.waitForTimeout(600);
    await page.getByRole('button',{name:market,exact:true}).click();
    await page.waitForSelector('#screenTrade.active');
    await page.locator('#screenTrade .backBtn').click();
    await page.screenshot({path:path.join(out,`room-${lang}.png`)});
  }
  // Each equipped property has its own geometry, and both themes follow the same save.
  const homes=['home1b','home1','home5','home2','home6','home3','home7','home8','home4','home9'];
  for(const [tier,home] of homes.entries()) {
    await page.evaluate(home=>{state.shop.equipped.inmueble=home;updateRoomPhoto();},home);
    await page.waitForFunction(home=>document.getElementById('mainScene').dataset.roomHome===home,home);
    assert.equal(await page.locator('#mainScene').getAttribute('data-room-variant'),String(tier));
    assert.equal(await page.locator('#mainScene').getAttribute('data-room-landscape'),[3,4].includes(tier)?'countryside':[6,8].includes(tier)?'coast':'city');
    await page.waitForTimeout(200);
    await page.screenshot({path:path.join(out,`property-${home}.png`)});
    if([4,8].includes(tier)) {
      await page.setViewportSize({width:390,height:844});await page.waitForTimeout(350);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
      await page.screenshot({path:path.join(out,`outdoor-mobile-${home}.png`)});
      await page.setViewportSize({width:1024,height:900});await page.waitForTimeout(200);
    }
  }
  await page.evaluate(()=>{state.shop.equipped.inmueble='home1';updateRoomPhoto();});
  await page.waitForFunction(()=>document.getElementById('mainScene').dataset.roomHome==='home1');
  await page.getByRole('button',{name:'Ver habitación en 2D',exact:true}).click();
  assert.equal(await page.locator('body').getAttribute('data-game-theme'),'2d');
  assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('room-enabled')),false);
  await page.evaluate(()=>goScreen('screenTrade'));
  await page.screenshot({path:path.join(out,'theme-2d-market.png')});
  const classicCard=await page.locator('.assetCard').first().evaluate(e=>getComputedStyle(e).backgroundImage);
  await page.evaluate(()=>openChart(ASSETS[0].id));
  await page.screenshot({path:path.join(out,'theme-2d-chart.png')});
  await page.evaluate(()=>{closeChart();goHome();});
  await page.getByRole('button',{name:'Ver habitación en 3D',exact:true}).click();
  assert.equal(await page.locator('body').getAttribute('data-game-theme'),'3d');
  await page.evaluate(()=>goScreen('screenTrade'));
  const modernCard=await page.locator('.assetCard').first().evaluate(e=>getComputedStyle(e).backgroundImage);
  assert.notEqual(classicCard,modernCard);
  await page.screenshot({path:path.join(out,'theme-3d-market.png')});
  await page.evaluate(()=>openChart(ASSETS[0].id));
  assert.ok((await page.locator('#chartModal .chartLiveChart').innerHTML()).includes('#78c5ab'));
  await page.screenshot({path:path.join(out,'theme-3d-chart.png')});
  await page.evaluate(()=>{closeChart();goHome();});
  // A fresh slot starts fresh, even after loading another player's progress.
  await page.evaluate(()=>{openPauseMenu();startNewGame(2);});
  assert.equal(await page.evaluate(()=>state.cash),500);
  assert.equal(await page.evaluate(()=>state.day),1);
  assert.equal(await page.evaluate(()=>state.shop.equipped.inmueble),'home1b');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('fundTycoonSave_v2_slot1')).state.shop.equipped.inmueble),'home1');
  // GPU failure must keep the original game playable rather than show a blank room.
  const noGpu=await browser.newContext({viewport:{width:390,height:844}});
  await noGpu.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(String(type).includes('webgl'))return null;return original.call(this,type,...args);};});
  const fallback=await noGpu.newPage();
  await fallback.goto(process.env.ROOM_QA_URL||'http://127.0.0.1:4173/game.html',{waitUntil:'domcontentloaded'});
  await fallback.evaluate(()=>{state.soundEnabled=false;saveGame(true);continueGame(1);});
  await fallback.waitForSelector('#mainScene[data-room-state="fallback"]');
  assert.equal(await fallback.locator('#mainScene').evaluate(e=>e.classList.contains('room-rendered')),false);
  await fallback.locator('#screenMain .bnav[onclick="goScreen(\'screenTrade\')"]').click();
  await fallback.waitForSelector('#screenTrade.active');
  await noGpu.close();
  console.log('errors',JSON.stringify(errors));assert.equal(errors.length,0);
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
