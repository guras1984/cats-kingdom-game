// Serve this repository locally, then run with Node and Playwright.
// TEST_URL, PLAYWRIGHT_MODULE and BROWSER_EXECUTABLE may override defaults.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,headless:true});let failed=0;const results=[];
 async function check(name,repo,fn,init){const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.setDefaultTimeout(6000);page.on('pageerror',e=>errors.push(e.message));try{if(init)await page.addInitScript(init);await page.goto(process.env.TEST_URL||'http://127.0.0.1:8000/',{waitUntil:'domcontentloaded'});await fn(page);assert.deepEqual(errors,[]);results.push({name,passed:true});console.log('PASS',name);}catch(e){failed++;results.push({name,passed:false,error:e.message,errors});console.log('FAIL',name,e.message,errors)}finally{await page.close()}}

 await check('cats corrupted progress cannot index a fractional level','cats-kingdom-game',async p=>{await p.waitForSelector('#board .tile');await p.locator('#mapBtn').click();assert.equal(await p.locator('[data-level]').count(),20);},()=>localStorage.setItem('cats-kingdom-v1',JSON.stringify({unlocked:1.5,stars:{1:-3,2:1e20}})));
 await browser.close();process.exitCode=failed?1:0;
})();
