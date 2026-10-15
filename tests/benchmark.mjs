import os from 'node:os';
import {chromium,webkit,devices} from 'playwright';import {mkdir,writeFile} from 'node:fs/promises';
const url=process.env.TEST_URL||'http://127.0.0.1:8088/';const mobile=process.env.BENCH_MOBILE==='1',engine=process.env.BENCH_ENGINE==='webkit'?webkit:chromium;
const browser=await engine.launch(engine===chromium?{executablePath:process.env.CHROMIUM_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--use-angle=metal']}:{});
const context=await browser.newContext(mobile?devices['iPhone 13']:{viewport:{width:1440,height:900}});const page=await context.newPage();const results=[];const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{await page.goto(url);await page.waitForFunction(()=>window.sim?.ready,{}, {timeout:60000});await page.locator('#start').click();
 for(const preset of (process.env.BENCH_PRESET?[process.env.BENCH_PRESET]:(mobile?['mobile']:['desktop','balanced','mobile']))){
  await page.evaluate(preset=>{const s=window.sim;s.setQuality(preset);s.reset();s.observe();},preset);await page.waitForTimeout(3000);await page.evaluate(()=>{window.sim.clearSamples();window.sim.keys.add('KeyW');});
  const duration=Number(process.env.BENCH_SECONDS||30);const start=Date.now();
  // Maintain a straight 18 mph drive. This is a measurement harness, not autonomous gameplay.
  for(let i=0;i<duration*4;i++){await page.waitForTimeout(250);await page.evaluate(()=>{const s=window.sim;if(s.player.v>8.0)s.keys.delete('KeyW');if(s.player.v<7.5)s.keys.add('KeyW');if(s.player.z<-365){s.player.place(-1.65,-12,0);s.test.reset();s.test.running=true;}});}
  const stats=await page.evaluate(()=>{window.sim.keys.clear();return window.sim.stats();});results.push({preset,method:'headless browser render submissions; hardware renderer shown below; warm-up excluded',host:process.env.BENCH_HOST||`${os.platform()} ${os.release()}, ${os.cpus()[0]?.model||os.arch()}, ${Math.round(os.totalmem()/2**30)} GB RAM`,browserVersion:browser.version(),engine:engine===webkit?'WebKit':'Chrome',mobileEmulation:mobile,physicalMobileDevice:false,wallDurationMs:Date.now()-start,...stats});console.log(JSON.stringify(results.at(-1)));
 }
 await mkdir('artifacts',{recursive:true});await writeFile('artifacts/performance-'+(mobile?(engine===webkit?'webkit-iphone-proxy':'chrome-mobile-proxy'):'desktop')+'.json',JSON.stringify({url,errors,results},null,2));
}finally{await browser.close();}
