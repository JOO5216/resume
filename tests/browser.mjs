import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();
 await page.setContent(await readFile(new URL('../demo.html',import.meta.url),'utf8'));
 await page.evaluate(()=>{globalThis.chrome={runtime:{onMessage:{addListener(){}}}};globalThis.submits=0;document.querySelector('form').addEventListener('submit',()=>globalThis.submits++);});
 await page.addScriptTag({path:new URL('../content.js',import.meta.url).pathname.replace(/^\/(\w:)/,'$1')});
 const fields=await page.evaluate(()=>globalThis.__resumeCopilot.scan());
 assert.equal(fields.some(f=>f.label==='密码'),false);
 const id=label=>fields.find(f=>f.label===label).id;
 const results=await page.evaluate(async({ids})=>globalThis.__resumeCopilot.fill([{id:ids[0],value:'测试姓名'},{id:ids[1],value:'新号码'},{id:ids[2],value:'女'},{id:ids[3],value:'北京'}],false),{ids:[id('姓名'),id('手机号'),id('性别'),id('居住城市')]});
 assert.match(results[0].status,/已填写/);assert.match(results[1].status,/跳过/);assert.match(results[3].status,/手动/);
 assert.equal(await page.locator('#name').inputValue(),'测试姓名');assert.equal(await page.locator('#phone').inputValue(),'已有号码');assert.equal(await page.locator('#gender').inputValue(),'f');
 assert.equal(await page.evaluate(()=>globalThis.submits),0);
 await page.locator('#name').evaluate(e=>e.remove());
 const stale=await page.evaluate(id=>globalThis.__resumeCopilot.fill([{id,value:'不能写入'}],true),id('姓名'));
 assert.match(stale[0].status,/重新识别/);
 await page.setContent('<div class="info_box"><div class="subtitle must">期望工作城市</div><div class="input_box"><div class="el-select"><input><div>深圳北京上海广州</div></div></div></div>');
 assert.equal((await page.evaluate(()=>globalThis.__resumeCopilot.scan()))[0].label,'期望工作城市');
 console.log('PASS: 浏览器扫描、文本填写、原生下拉框、已有值保护、自定义控件提示、失效节点保护、不提交申请');
}finally{await browser.close();}
