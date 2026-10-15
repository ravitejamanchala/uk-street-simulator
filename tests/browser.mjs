import {chromium,webkit,devices} from 'playwright';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const url=process.env.TEST_URL||'http://127.0.0.1:8088/';await mkdir('artifacts',{recursive:true});const results=[];
const specs=[{name:'desktop-chrome',engine:chromium,options:{viewport:{width:1440,height:900}}},{name:'pixel-7-layout',engine:chromium,options:devices['Pixel 7']},{name:'iphone-13-webkit',engine:webkit,options:devices['iPhone 13']},{name:'phone-landscape',engine:chromium,options:{...devices['Pixel 7'],viewport:{width:915,height:412},screen:{width:915,height:412}}}];
for(const spec of specs){if(process.env.TEST_DEVICE&&spec.name!==process.env.TEST_DEVICE)continue;let browser;const result={name:spec.name,status:'running',errors:[]};results.push(result);
 try{
 browser=await spec.engine.launch(spec.engine===chromium?{executablePath:process.env.CHROMIUM_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--use-angle=metal']}:{});const context=await browser.newContext(spec.options),page=await context.newPage();page.on('pageerror',e=>result.errors.push(e.message));
 await page.goto(url);await page.waitForFunction(()=>window.sim?.ready,{}, {timeout:60000});await page.locator('#start').click();if(!spec.options.hasTouch)await page.evaluate(()=>window.sim.setQuality('desktop'));await page.locator('#observe').click();
 if(spec.options.hasTouch){
  const rects=await page.locator('[data-input]').evaluateAll(buttons=>buttons.map(b=>{const r=b.getBoundingClientRect();return {id:b.dataset.input,x:r.x,y:r.y,w:r.width,h:r.height,hit:b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};}));
  for(const r of rects){assert.ok(r.w>=44&&r.h>=44);assert.ok(r.x>=0&&r.y>=0&&r.x+r.w<=spec.options.viewport.width+1&&r.y+r.h<=spec.options.viewport.height+1,JSON.stringify(r));assert.ok(r.hit,JSON.stringify(r));}
  // Pointer events exercise the actual touch handlers, including cancellation and simultaneous steering.
  await page.locator('[data-input=throttle]').dispatchEvent('pointerdown',{pointerId:1,pointerType:'touch',bubbles:true});await page.locator('[data-input=left]').dispatchEvent('pointerdown',{pointerId:2,pointerType:'touch',bubbles:true});await page.waitForTimeout(550);
  await page.locator('[data-input=left]').dispatchEvent('pointercancel',{pointerId:2,pointerType:'touch',bubbles:true});await page.locator('[data-input=throttle]').dispatchEvent('pointerup',{pointerId:1,pointerType:'touch',bubbles:true});
 }else{await page.keyboard.down('KeyW');await page.waitForTimeout(1300);await page.keyboard.up('KeyW');}
 assert.ok(await page.evaluate(()=>window.sim.player.z<-7.05),'accelerator must move the simulated car');
 const before=await page.evaluate(()=>Math.abs(window.sim.player.v));await page.keyboard.down('Space');await page.waitForTimeout(900);await page.keyboard.up('Space');assert.ok(await page.evaluate(()=>Math.abs(window.sim.player.v))<before);
 await page.locator('#reset').click();assert.ok(Math.abs(await page.evaluate(()=>window.sim.player.z)+7)<.1);assert.equal(await page.evaluate(()=>window.sim.test.D),0);
 await page.locator('#camera').click();await page.locator('#camera').click();assert.equal(await page.locator('#cameraLabel').textContent(),'CHASE');await page.locator('#camera').click();
 // Actual controller + physical collision against an original parked vehicle.
 await page.evaluate(()=>{const s=window.sim;s.observe();s.player.place(2.3,-107,0);s.keys.add('KeyW');});await page.waitForTimeout(2100);await page.evaluate(()=>window.sim.keys.clear());
 assert.ok(await page.evaluate(()=>window.sim.player.z>-115),'parked vehicle must block motion');assert.ok(await page.evaluate(()=>window.sim.test.S>0),'closing impact must retain the examiner collision fault');
 await page.locator('#reset').click();await page.locator('#observe').click();await page.waitForTimeout(300);result.stats=await page.evaluate(()=>window.sim.stats());
 assert.ok(result.stats.buffer[0]*result.stats.buffer[1]<= (spec.options.hasTouch?650000:2073600));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:'artifacts/'+spec.name+'.png'});assert.deepEqual(result.errors,[]);result.status='passed';
 }catch(e){result.status='failed';result.error=e.message;}
 finally{await browser?.close();console.log(JSON.stringify(result));await writeFile('artifacts/browser-results.json',JSON.stringify(results,null,2));}
}
if(results.some(r=>r.status!=='passed'))process.exitCode=1;
