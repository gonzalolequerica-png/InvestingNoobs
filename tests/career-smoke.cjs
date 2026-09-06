const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.ROOM_QA_URL||'http://127.0.0.1:4173/game.html');
 await page.evaluate(()=>{state=JSON.parse(JSON.stringify(NEW_GAME_STATE));state.soundEnabled=false;state.musicEnabled=false;state.tutorialSeen=true;state.language='es';saveGame(true);continueGame(1);});
 await page.waitForSelector('#mainScene.room-rendered');await page.locator('.career-launch').click();
 await page.locator('[data-reserve="0.5"]').click();assert.equal(await page.evaluate(()=>state.career.reserve),250);
 await page.locator('[data-go="screenTrade"]').click();
 const id=await page.evaluate(()=>ASSETS[0].id);
 await page.evaluate(id=>setQuick(id,1),id);assert.equal(await page.evaluate(id=>getAmt(id),id),250);
 await page.evaluate(id=>{inputValues[id]=300;const e=document.getElementById('inp_'+id);if(e)e.value='300';buyAsset(id);},id);
 assert.equal(await page.evaluate(()=>state.cash),500,'Protected cash cannot be spent');
 await page.evaluate(id=>openShort(id),id);assert.equal(await page.evaluate(()=>state.cash),500,'Short margin must respect the reserve');
 await page.evaluate(id=>{inputValues[id]=100;const e=document.getElementById('inp_'+id);if(e)e.value='100';buyAsset(id);},id);
 assert.equal(await page.evaluate(()=>state.cash),400);
 await page.reload();await page.locator('.slotBtnPlay').first().click();await page.waitForSelector('#mainScene.room-rendered');
 assert.equal(await page.evaluate(()=>state.career.reserve),250);
 await page.locator('.career-launch').click();assert.equal(await page.locator('.career-missions .completed').count(),3);
 await page.locator('[data-reserve="0"]').click();assert.equal(await page.evaluate(()=>state.career.reserve),0);
 await page.screenshot({path:'test-results/career-mobile.png'});
 await page.locator('.career-dialog form button').click();
 for(const language of ['en','zh']){await page.evaluate(l=>state.language=l,language);await page.locator('.career-launch').click();assert.ok((await page.locator('#career-title').textContent()).length>0);await page.locator('.career-dialog form button').click();}
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);assert.deepEqual(errors,[]);console.log('Reserve enforcement, savings, missions and locales OK');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
