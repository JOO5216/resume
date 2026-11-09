import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://copilot.test/**',async route=>{
  const path=new URL(route.request().url()).pathname.slice(1)||'panel.html';
  await route.fulfill({body:await readFile(new URL('../'+path,import.meta.url)),contentType:path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html'});
 });
 await page.addInitScript(()=>{globalThis.saved={};globalThis.chrome={storage:{session:{get:async()=>({}),set:async()=>{}},local:{get:async()=>globalThis.saved,set:async v=>Object.assign(globalThis.saved,v),clear:async()=>globalThis.saved={}}},permissions:{contains:async()=>true,request:async()=>true}};});
 await page.goto('http://copilot.test/src/panel.html');
 await page.getByLabel('姓名',{exact:true}).fill('测试用户');
 await page.getByRole('button',{name:'＋ 添加教育经历'}).click();
 await page.getByLabel('学校',{exact:true}).fill('测试大学');
 await page.getByRole('button',{name:'保存简历',exact:true}).click();
 await page.waitForFunction(()=>globalThis.saved.resume?.基本信息.姓名==='测试用户');
 assert.equal(await page.evaluate(()=>globalThis.saved.resume.教育经历[0].学校),'测试大学');
 await page.locator('#import').setInputFiles({name:'resume.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({基本信息:{姓名:'导入测试'}}))});
 await page.waitForFunction(()=>globalThis.saved.resume?.基本信息.姓名==='导入测试');
 assert.equal(await page.getByLabel('姓名',{exact:true}).inputValue(),'导入测试');
 await page.evaluate(()=>{globalThis.scanCalls=0;chrome.tabs={query:async()=>[{id:1,url:'https://career.example.com/resume'}]};chrome.scripting={executeScript:async options=>{if(options.func){globalThis.scanCalls++;return [{frameId:0,result:{fields:[{id:'1',label:'姓名',value:'',section:'',recordIndex:null,custom:false,required:false}]}}];}return [];}};});
 await page.getByRole('button',{name:'当前页面'}).click();
 await page.waitForFunction(()=>globalThis.scanCalls===1);
 assert.equal(await page.getByRole('button',{name:'填写勾选字段'}).isEnabled(),true);
 assert.deepEqual(errors,[]);
 console.log('PASS: 侧栏渲染、编辑、多条经历、保存、JSON 导入，无页面脚本错误');
}finally{await browser.close();}
