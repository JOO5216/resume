import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();
 await page.setContent(`<form><section><h2>教育经历</h2><fieldset><label>学校<input></label><label>开始时间<input type="month"></label></fieldset><button type="button" id="add">新增教育经历</button></section><label>学历<input id="degree" role="combobox" aria-controls="degree-options" readonly></label><ul id="degree-options" role="listbox" hidden><li role="option">本科</li><li role="option">硕士</li></ul><label>城市<input id="city" role="combobox" aria-controls="cities" readonly></label><ul id="cities" role="listbox" hidden><li role="option">浙江省</li></ul><label>搜索学校<input id="search-school" role="combobox" aria-controls="school-options"></label><ul id="school-options" role="listbox" hidden></ul><label>日期<input id="date" readonly aria-controls="calendar"></label><div id="calendar" role="dialog" hidden><button type="button" data-date="2027-06-01">1</button></div><fieldset><legend>紧急联系人</legend><label>姓名<input id="emergency"></label></fieldset><label>验证码<input></label><button>提交申请</button></form>`);
 await page.evaluate(()=>{
  globalThis.chrome={runtime:{onMessage:{addListener(){}}}};globalThis.submits=0;document.querySelector('form').onsubmit=e=>{e.preventDefault();globalThis.submits++;};
  document.querySelector('#add').onclick=()=>{const row=document.querySelector('fieldset').cloneNode(true);row.querySelectorAll('input').forEach(e=>e.value='');document.querySelector('#add').before(row);};
  document.querySelector('#degree').onclick=()=>document.querySelector('#degree-options').hidden=false;
  document.querySelector('#degree-options').onclick=e=>{document.querySelector('#degree').value=e.target.textContent;document.querySelector('#degree-options').hidden=true;};
  document.querySelector('#city').onclick=()=>document.querySelector('#cities').hidden=false;
  document.querySelector('#cities').onclick=e=>{if(e.target.textContent==='浙江省'){document.querySelector('#cities').innerHTML='<li role="option">杭州市</li>';}else{document.querySelector('#city').value='浙江省 / 杭州市';document.querySelector('#cities').hidden=true;}};
  document.querySelector('#search-school').onclick=()=>document.querySelector('#school-options').hidden=false;
  document.querySelector('#search-school').oninput=()=>{document.querySelector('#school-options').innerHTML='<li role="option">示例大学</li>';};
  document.querySelector('#school-options').onclick=e=>{document.querySelector('#search-school').value=e.target.textContent;document.querySelector('#school-options').hidden=true;};
  document.querySelector('#date').onclick=()=>document.querySelector('#calendar').hidden=false;
  document.querySelector('#calendar button').onclick=()=>{document.querySelector('#date').value='2027-06-01';document.querySelector('#calendar').hidden=true;};
 });
 await page.addScriptTag({path:fileURLToPath(new URL('../content.js',import.meta.url))});
 const added=await page.evaluate(()=>globalThis.__resumeCopilot.ensureRecords({教育经历:2}));
 assert.equal(added[0].added,1);
 let fields=await page.evaluate(()=>globalThis.__resumeCopilot.scan());
 assert.equal(fields.filter(f=>f.label==='学校')[1].recordIndex,1);
 assert.equal(fields.some(f=>f.label==='验证码'),false);assert.equal(fields.some(f=>f.label==='姓名'),false);
 const items=fields.filter(f=>['学校','开始时间','学历','城市','日期','搜索学校'].includes(f.label)).map(f=>({id:f.id,value:f.label==='学校'?['甲大学','乙大学'][f.recordIndex]:f.label==='开始时间'?'2023-09':f.label==='学历'?'硕士':f.label==='城市'?'浙江省 / 杭州市':f.label==='搜索学校'?'示例大学':'2027-06-01'}));
 const results=await page.evaluate(items=>globalThis.__resumeCopilot.fill(items,false),items);
 assert.ok(results.every(r=>r.status.includes('已填写')),JSON.stringify(results));
 assert.deepEqual(await page.locator('section fieldset input:not([type])').evaluateAll(es=>es.map(e=>e.value)),['甲大学','乙大学']);
 assert.equal(await page.locator('#city').inputValue(),'浙江省 / 杭州市');
 assert.equal(await page.evaluate(()=>globalThis.submits),0);
 // 重复选项必须保留原值，不擅自选第一个。
 await page.evaluate(()=>{document.querySelector('#degree').value='';document.querySelector('#degree-options').innerHTML='<li role="option">硕士</li><li role="option">硕士</li>';});
 fields=await page.evaluate(()=>globalThis.__resumeCopilot.scan());
 const ambiguous=await page.evaluate(id=>globalThis.__resumeCopilot.fill([{id,value:'硕士'}],false),fields.find(f=>f.label==='学历').id);
 assert.match(ambiguous[0].status,/唯一|多个/);assert.equal(await page.locator('#degree').inputValue(),'');
 await page.setContent('<div class="module-container projectExperienceModule"><div class="module-main"><div class="aui-form-item"><label class="aui-form-item__label">项目名称</label><div class="aui-form-item__content"><input placeholder="请输入"></div></div></div><div class="module-main"><div class="aui-form-item"><label class="aui-form-item__label">项目名称</label><div class="aui-form-item__content"><input placeholder="请输入"></div></div></div></div>');
 const huawei=await page.evaluate(()=>globalThis.__resumeCopilot.scan());
 assert.deepEqual(huawei.map(f=>[f.label,f.section,f.recordIndex]),[['项目名称','项目经历',0],['项目名称','项目经历',1]]);
 console.log('PASS: 新增经历、重复行索引、搜索/只读下拉、级联选项、日期选择、验证码排除、歧义停止、不提交');
}finally{await browser.close();}
