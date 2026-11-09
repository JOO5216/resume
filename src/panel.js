import {schema,flattenResume,validateResume,matchField} from './core.js';
import {providers,parseResume,mapFields,requestJSON} from './ai.js';
import {extractText} from './parser.js';
const $=s=>document.querySelector(s);
let resume={},entries=[],scanTab=null,scanURL='',rows=[],draft=null,operation=false;
let aiConfig={provider:'local',model:providers.local.model},keys={};
const status=t=>$('#status').textContent=t;
function node(tag,text){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;}
function empty(){return Object.fromEntries(Object.keys(schema).map(s=>[s,['教育经历','工作经历','实习经历','项目经历'].includes(s)?[]:{}]));}
function edit(){
 $('#editor').replaceChildren();
 for(const [section,fields] of Object.entries(schema)){
  const box=node('fieldset');box.append(node('legend',section));
  const repeated=Array.isArray(resume[section]);
  (repeated?resume[section]:[resume[section]]).forEach((record,index)=>{
   const group=node('div');
   if(repeated){group.append(node('h3',`${section} ${index+1}`));const del=node('button','删除这条经历');del.onclick=()=>{resume[section].splice(index,1);edit();};group.append(del);}
   for(const key of fields){const label=node('label',key);const input=node(/描述|评价|技能|经历/.test(key)?'textarea':'input');input.value=record[key]??'';input.oninput=()=>record[key]=input.value;label.append(input);group.append(label);}
   box.append(group);
  });
  if(repeated){const add=node('button','＋ 添加'+section);add.onclick=()=>{resume[section].push({});edit();};box.append(add);}
  $('#editor').append(box);
 }
}
async function save(){validateResume(resume);await chrome.storage.local.set({resume});entries=flattenResume(resume);invalidate();status('简历已保存。请重新识别网页。');}
function invalidate(){rows=[];$('#fields').replaceChildren();$('#apply').disabled=true;scanTab=null;}
async function active(){const [tab]=await chrome.tabs.query({active:true,currentWindow:true});if(!tab?.id)throw Error('没有可用网页');return tab;}
async function inject(allowPrompt=true){const tab=await active();if(!/^https?:\/\//.test(tab.url||''))throw Error('请先打开普通招聘网页');const origin=new URL(tab.url).origin+'/*';if(!await chrome.permissions.contains({origins:[origin]})&&(!allowPrompt||!await chrome.permissions.request({origins:[origin]})))throw Error('请点击“重新识别”并授权读取这个网站');await chrome.scripting.executeScript({target:{tabId:tab.id},files:['src/content.js']});try{await chrome.scripting.executeScript({target:{tabId:tab.id,allFrames:true},files:['src/content.js']});}catch{}return tab;}
async function scan(allowPrompt=true){
 entries=flattenResume(resume);
 invalidate();const tab=await inject(allowPrompt);scanTab=tab.id;scanURL=tab.url;
 let results;const func=()=>({fields:globalThis.__resumeCopilot?.scan()||[]});
 try{results=await chrome.scripting.executeScript({target:{tabId:tab.id,allFrames:true},func});}catch{results=await chrome.scripting.executeScript({target:{tabId:tab.id},func});}
 for(const frame of results){for(const f of frame.result.fields){
  const field=matchField(f.label);let candidates=entries.filter(e=>e.field===field);
  if(f.section)candidates=candidates.filter(e=>f.section===e.section);
  if(Number.isInteger(f.recordIndex))candidates=candidates.filter(e=>e.index===f.recordIndex);
  const card=node('div');card.className='card';const label=node('label');const check=node('input');check.type='checkbox';check.checked=candidates.length===1&&!f.value;label.append(check,document.createTextNode(` ${f.label}${f.required?' *':''}`));card.append(label);
  if(f.section)card.append(node('p',f.section));
  const select=node('select');const blank=node('option','请选择简历字段');blank.value='';select.append(blank);
  entries.forEach(e=>{const o=node('option',e.label);o.value=e.id;select.append(o);});
  const input=node('textarea');input.rows=2;
  if(candidates.length===1){select.value=candidates[0].id;input.value=candidates[0].value;}
  select.onchange=()=>{input.value=entries.find(e=>e.id===select.value)?.value||'';check.checked=!!input.value&&!f.value;};
  const result=node('p',f.custom?'将尝试选择唯一匹配选项，请核对内容':f.value?'网页已有内容，默认跳过':candidates.length>1?'多条经历，请选择具体来源':candidates.length===1?'已对应，填写前请核对':'请选择简历字段');result.className='result';
  card.append(select,input,result);$('#fields').append(card);rows.push({f,frameId:frame.frameId,check,input,result,select});
 }}
 $('#apply').disabled=!rows.length;status(`识别到 ${rows.length} 个字段。${entries.length?'请核对对应关系。':'尚未导入简历，当前仅检查字段识别。'}`);
}
async function apply(){
 const tab=await active();if(tab.id!==scanTab||tab.url!==scanURL)throw Error('网页已切换，请重新识别');
 const selected=rows.filter(r=>r.check.checked);if(!selected.length)throw Error('请先勾选要填写的字段');
 for(const frameId of new Set(selected.map(r=>r.frameId))){
  const subset=selected.filter(r=>r.frameId===frameId);
  const result=await chrome.tabs.sendMessage(scanTab,{type:'rc-fill',overwrite:$('#overwrite').checked,items:subset.map(r=>({id:r.f.id,value:r.input.value}))},{frameId});
  if(result.error)throw Error(result.error);
  result.forEach(x=>{subset.find(r=>r.f.id===x.id).result.textContent=x.status;});
 }
 $('#apply').disabled=true;status('填写操作结束，请逐项检查结果。再次填写前请重新识别。');
}
function guard(fn){return async()=>{if(operation)return;operation=true;document.body.setAttribute('aria-busy','true');document.body.inert=true;try{await fn();}catch(e){status('操作未完成：'+e.message);}finally{operation=false;document.body.inert=false;document.body.removeAttribute('aria-busy');}};}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{['resume','fill','settings'].forEach(id=>$('#'+id).hidden=id!==b.dataset.tab);document.querySelectorAll('[data-tab]').forEach(tab=>tab.setAttribute('aria-current',tab===b?'page':'false'));if(b.dataset.tab==='fill')guard(()=>scan(false))();});
$('#save').onclick=guard(save);$('#scan').onclick=guard(()=>scan());$('#apply').onclick=guard(apply);
$('#export').onclick=guard(async()=>{validateResume(resume);const url=URL.createObjectURL(new Blob([JSON.stringify(resume,null,2)],{type:'application/json'}));const a=node('a');a.href=url;a.download='我的简历.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('#import').onchange=guard(async()=>{const file=$('#import').files[0];if(!file)return;const data=validateResume(JSON.parse(await file.text()));resume={...empty(),...data};edit();await save();});
$('#clear').onclick=guard(async()=>{if(!confirm('删除本浏览器保存的简历？'))return;await chrome.storage.local.remove('resume');resume=empty();entries=[];invalidate();edit();status('本地简历已删除。');});


async function configured(){
 const provider=providers[aiConfig.provider];
 if(!await chrome.permissions.contains({origins:[provider.origin]}))throw Error('请先在 AI 设置点击“保存并授权连接”');
 return {...aiConfig,key:keys[aiConfig.provider]||''};
}
function showProvider(){
 const id=$('#provider').value;
 $('#providerInfo').textContent=id==='local'?'连接本机 127.0.0.1:18765。先启动本机模型，再导入“本机连接.json”。不上传简历到云端。':id==='ollama'?'连接本机 localhost:11434；模型需先下载。为当前扩展配置 OLLAMA_ORIGINS。':id==='groq'?'连接 api.groq.com。使用 Free Plan 有额度限制，简历解析文字将发送到 Groq。':'连接 openrouter.ai。仅使用免费模型，并禁用允许数据收集的服务路由；可能因此没有可用提供商。';
 $('#apiKey').value=keys[id]||'';
}
for(const [id,provider] of Object.entries(providers)){const option=node('option',provider.name);option.value=id;$('#provider').append(option);}
$('#provider').onchange=()=>{$('#model').value=providers[$('#provider').value].model;showProvider();};
$('#saveAI').onclick=guard(async()=>{
 const provider=$('#provider').value,model=$('#model').value.trim(),key=$('#apiKey').value.trim();
 if(!model)throw Error('请填写模型 ID');
 if(provider!=='ollama'&&!key)throw Error('请填写 API Key 或导入本机连接文件');
 if(provider==='openrouter'&&model!=='openrouter/free'&&!model.endsWith(':free'))throw Error('请选择免费模型');
 if(!await chrome.permissions.request({origins:[providers[provider].origin]}))throw Error('未获得服务连接权限');
 aiConfig={provider,model};keys[provider]=key;
 await chrome.storage.local.set({aiConfig});await chrome.storage.session.set({aiKeys:keys});status('AI 设置已保存；口令仅保存在本次浏览器会话。');
});
$('#localConfig').onchange=guard(async()=>{
 const file=$('#localConfig').files[0];if(!file)return;
 const data=JSON.parse(await file.text());
 if(data.provider!=='local'||data.model!==providers.local.model||typeof data.key!=='string'||data.key.length<20)throw Error('不是有效的本机连接文件');
 $('#provider').value='local';showProvider();$('#model').value=data.model;$('#apiKey').value=data.key;status('本机连接已载入，请点击“保存并授权连接”。');
});
$('#forgetKey').onclick=guard(async()=>{delete keys[$('#provider').value];$('#apiKey').value='';await chrome.storage.session.set({aiKeys:keys});status('口令已从本次会话清除。');});
$('#testAI').onclick=guard(async()=>{status('正在测试 AI 连接，本机模型首次加载可能较慢…');await requestJSON(await configured(),'只返回 JSON {"ok":true}',{test:true});status('AI 连接成功。');});
$('#sourceFile').onchange=guard(async()=>{
 const file=$('#sourceFile').files[0];if(!file)return;draft=null;$('#draft').hidden=true;$('#sourceText').value='';status('正在本机提取简历文字…');
 const result=await extractText(file);$('#sourceText').value=result.text;
 status(`已提取 ${result.text.length} 个字符。${result.warnings.join('；')} 请检查顺序和内容后点击 AI 整理。`);
});
$('#parseResume').onclick=guard(async()=>{
 draft=null;$('#draft').hidden=true;status('正在整理简历草稿，原简历保持不变…');
 draft=await parseResume(await configured(),$('#sourceText').value);
 $('#draftFields').replaceChildren();
 for(const entry of flattenResume(draft.resume)){
  const card=node('div');card.className='card';const label=node('label',entry.label);const input=node('textarea');input.value=entry.value;input.rows=2;
  input.oninput=()=>{const section=draft.resume[entry.section];(Array.isArray(section)?section[entry.index]:section)[entry.field]=input.value;};
  label.append(input);card.append(label,node('p','原文：'+draft.evidence.find(e=>e.path===entry.id).quote));$('#draftFields').append(card);
 }
 $('#draftWarnings').textContent=draft.warnings.join('；')||'未报告额外问题。请核对是否遗漏经历及是否准确。';
 $('#draft').hidden=false;status('草稿已生成。核对后点击“确认并保存”，才会替换当前简历。');
});
$('#acceptDraft').onclick=guard(async()=>{if(!draft)throw Error('没有可保存的草稿');validateResume(draft.resume);resume={...empty(),...draft.resume};edit();await save();draft=null;$('#draft').hidden=true;status('已保存核对后的简历。');});
$('#discardDraft').onclick=()=>{draft=null;$('#draft').hidden=true;status('已丢弃草稿，原简历未修改。');};
$('#aiMap').onclick=guard(async()=>{
 if(!rows.length)throw Error('请先识别当前网页');
 const tab=await active();if(tab.id!==scanTab||tab.url!==scanURL)throw Error('页面已切换，请重新识别');
 const pending=rows.filter(r=>!r.select.value);if(!pending.length){status('所有字段已有对应；你仍可手动修改。');return;}
 const config=await configured();let count=0;
 for(let offset=0;offset<pending.length;offset+=20){
  const batch=pending.slice(offset,offset+20);status(`正在识别未对应字段 ${offset+1}–${Math.min(offset+20,pending.length)}…`);
  const fields=batch.map(r=>({...r.f,id:`${r.frameId}:${r.f.id}`}));
  const mappings=await mapFields(config,fields,entries);
  const current=await active();if(current.id!==scanTab||current.url!==scanURL)throw Error('等待 AI 时网页已切换，请重新识别');
  for(const m of mappings){
   const row=batch.find(r=>`${r.frameId}:${r.f.id}`===m.fieldId),entry=entries.find(e=>e.id===m.entryId);
   row.select.value=entry.id;row.input.value=entry.value;row.check.checked=m.confidence>=0.9&&!row.f.value;
   row.result.textContent=`AI 对应（置信度 ${Math.round(m.confidence*100)}%，不是准确率保证）：${m.reason||'请核对分区和经历序号'}`;count++;
  }
 }
 status(`AI 补充 ${count} 个字段对应。请核对预览后再点击填写。`);
});
$('#records').onclick=guard(async()=>{
 if(!rows.length)throw Error('请先识别当前网页');
 const tab=await active();if(tab.id!==scanTab||tab.url!==scanURL)throw Error('页面已切换，请重新识别');
 const perFrame=new Map(),notes=[];
 for(const section of ['教育经历','工作经历','实习经历','项目经历']){
  const count=resume[section]?.length||0;if(!count)continue;
  const frames=[...new Set(rows.filter(r=>r.f.section===section).map(r=>r.frameId))];
  if(frames.length!==1){notes.push(section+'：页面区域不唯一或未展开，请手动新增');continue;}
  const counts=perFrame.get(frames[0])||{};counts[section]=count;perFrame.set(frames[0],counts);
 }
 for(const [frameId,counts] of perFrame){
  const result=await chrome.tabs.sendMessage(scanTab,{type:'rc-records',counts},{frameId});
  if(result.error)throw Error(result.error);notes.push(...result.map(r=>`${r.section}：新增 ${r.added} 条，${r.status}`));
 }
 await scan();status(notes.join('；')||'没有需要补齐的经历');
});
const stored=await chrome.storage.local.get(['resume','aiConfig']);
resume={...empty(),...(stored.resume||{})};
entries=flattenResume(resume);
if(stored.aiConfig&&providers[stored.aiConfig.provider])aiConfig=stored.aiConfig;
keys=(await chrome.storage.session.get('aiKeys')).aiKeys||{};
$('#provider').value=aiConfig.provider;$('#model').value=aiConfig.model;showProvider();
$('#extensionOrigin').textContent='当前扩展来源：'+location.origin;
edit();
let scanTimer;
function autoScan(){if($('#fill').hidden)return;clearTimeout(scanTimer);scanTimer=setTimeout(()=>guard(()=>scan(false))(),300);}
chrome.tabs?.onActivated?.addListener(autoScan);
chrome.tabs?.onUpdated?.addListener(async(tabId,change)=>{if(change.status==='complete'&&(await active()).id===tabId)autoScan();});
if(entries.length){document.querySelector('[data-tab="fill"]').click();}
