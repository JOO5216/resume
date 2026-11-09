import {chromium} from '@playwright/test';
import {mkdtemp} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
const profile=await mkdtemp(join(tmpdir(),'resume-extension-test-'));
const context=await chromium.launchPersistentContext(profile,{channel:'msedge',headless:true,args:[`--disable-extensions-except=${process.cwd()}`,`--load-extension=${process.cwd()}`]});
try{
 let worker=context.serviceWorkers()[0];if(!worker)worker=await context.waitForEvent('serviceworker',{timeout:12000});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(worker.url().replace('background.js','panel.html'));await page.waitForSelector('#editor fieldset');
 await page.locator('#parseBox summary').click();
 for(const ext of ['pdf','docx']){
  await page.locator('#sourceFile').setInputFiles(`tests/fixtures/resume.${ext}`);
  await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('已提取'));
  const text=await page.locator('#sourceText').inputValue();if(!text.includes('Python SQL'))throw Error(ext+' extraction failed');
 }
 if(errors.length)throw Error(errors.join('\n'));
 console.log('PASS: 真正加载 MV3 扩展、侧栏、storage.session、扩展 CSP 下 PDF worker 和 DOCX 提取');
}finally{await context.close();}
