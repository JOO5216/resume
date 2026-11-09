import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateMappings,validateDraft,requestJSON,providers,fieldPayload} from '../ai.js';
const fields=[{id:'1',label:'毕业院校',section:'教育经历',recordIndex:1,value:'不应发送的已有内容'}];
const entries=[{id:'教育经历.1.学校',section:'教育经历',index:1,field:'学校',value:'测试大学'}];
test('AI 映射只允许已知字段和简历来源，拒绝重复与虚构动作',()=>{
 assert.equal(validateMappings({mappings:[{fieldId:'1',entryId:entries[0].id,confidence:.95}]},fields,entries).length,1);
 assert.throws(()=>validateMappings({mappings:[{fieldId:'missing',entryId:entries[0].id,confidence:1}]},fields,entries));
 assert.throws(()=>validateMappings({mappings:[{fieldId:'1',entryId:'invented',confidence:1}]},fields,entries));
 assert.throws(()=>validateMappings({mappings:[{fieldId:'1',entryId:entries[0].id,confidence:1},{fieldId:'1',entryId:entries[0].id,confidence:1}]},fields,entries));
 assert.throws(()=>validateMappings({mappings:[],code:'click submit'},fields,entries));
 assert.throws(()=>validateMappings({mappings:[{fieldId:'1',entryId:'教育经历.0.学校',confidence:1}]},fields,[...entries,{...entries[0],id:'教育经历.0.学校',index:0}]),/序号/);
 assert.equal(JSON.stringify(fieldPayload(fields,entries)).includes('测试大学'),false);
 assert.equal(JSON.stringify(fieldPayload(fields,entries)).includes('不应发送'),false);
});
test('解析草稿必须逐项有原文依据，未知值不被写入',()=>{
 const draft={resume:{基本信息:{姓名:'小明'}},evidence:[{path:'基本信息.0.姓名',quote:'小明'}],warnings:[]};
 assert.equal(validateDraft(draft,'简历：小明').resume.基本信息.姓名,'小明');
 assert.throws(()=>validateDraft(draft,'没有这个名字'));
 assert.throws(()=>validateDraft({...draft,evidence:[]},'小明'));
});
test('API 限流、截断、恶意 JSON 和付费 OpenRouter 模型不静默降级',async()=>{
 const config={provider:'groq',model:'test',key:'secret'};
 await assert.rejects(requestJSON(config,'sys',{},async()=>new Response('{}',{status:429})),/额度|限流/);
 await assert.rejects(requestJSON(config,'sys',{},async()=>Response.json({choices:[{finish_reason:'length',message:{content:'{}'}}]})),/截断/);
 await assert.rejects(requestJSON({...config,provider:'openrouter',model:'paid/model'},'sys',{},async()=>{}),/免费/);
 let request;
 const answer=await requestJSON(config,'sys',{},async(url,options)=>{request={url,options};return Response.json({choices:[{finish_reason:'stop',message:{content:'{"ok":true}'}}]});});
 assert.equal(answer.ok,true);assert.equal(request.url,providers.groq.url);
 assert.equal(request.options.redirect,'error');assert.equal(request.options.headers.Authorization,'Bearer secret');
});
