const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
fs.mkdirSync('test-results',{recursive:true});
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.ROOM_QA_URL||'http://127.0.0.1:4173/game.html');
    await page.evaluate(()=>{state.soundEnabled=false;state.tutorialSeen=true;state.language='es';saveGame(true);continueGame(1);});
    await page.waitForSelector('#mainScene.room-rendered');
    await page.getByRole('button',{name:'Ajustar vista 3D'}).click();
    await page.getByRole('button',{name:'Solo interior',exact:true}).click();
    await page.locator('#room-zoom').focus();await page.locator('#room-zoom').press('ArrowRight');
    await page.getByRole('button',{name:'Listo',exact:true}).click();
    await page.reload();await page.locator('.slotBtnPlay').first().click();
    await page.waitForSelector('#mainScene.room-rendered');
    assert.equal(await page.locator('#mainScene').getAttribute('data-room-focus'),'inside');
    await page.getByRole('button',{name:'Ajustar vista 3D'}).click();
    assert.equal(await page.locator('#room-zoom').inputValue(),'105');
    await page.getByRole('button',{name:'Restablecer vista'}).click();
    assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('ct_room_camera'))),{focus:'all',zoom:1,yaw:0});
    await page.getByRole('button',{name:'Listo',exact:true}).click();
    await page.evaluate(()=>{state.shop.equipped.inmueble='home4';dayCycleStart=Date.now()-.9*DAY_DURATION_MS;});
    await page.waitForFunction(()=>document.getElementById('mainScene').dataset.roomHome==='home4');
    await page.waitForTimeout(3000);await page.screenshot({path:'test-results/night-garden.png'});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
    await page.evaluate(()=>localStorage.setItem('ct_room_camera','not-json'));
    await page.reload();await page.locator('.slotBtnPlay').first().click();
    await page.waitForSelector('#mainScene.room-rendered');
    assert.equal(await page.locator('#mainScene').getAttribute('data-room-focus'),'all');
    assert.deepEqual(errors,[]);console.log('Camera persistence, reset, corrupt preference and night scene OK');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
