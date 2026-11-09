import {readFile,writeFile} from 'node:fs/promises';
import {parseResume,mapFields} from '../ai.js';
const config=JSON.parse(await readFile('../resume-copilot-local/本机连接.json','utf8'));
const started=Date.now();
const fields=[{id:'a',label:'您的称呼',section:'',recordIndex:null},{id:'b',label:'就读院校',section:'教育经历',recordIndex:1}];
const entries=[{id:'基本信息.0.姓名',section:'基本信息',index:0,field:'姓名',value:'测试'},...['甲大学','乙大学'].map((value,index)=>({id:`教育经历.${index}.学校`,section:'教育经历',index,field:'学校',value}))];
try {
 const mapping=await mapFields(config,fields,entries);console.log('MAPPING',JSON.stringify(mapping),'ms',Date.now()-started);
 const t=Date.now();const draft=await parseResume(config,'姓名：林测试\n邮箱：test@example.com\n教育经历：2020-09 至 2024-06，就读示例大学，计算机科学专业，本科。\n实习经历：2023-07 至 2023-09，示例科技公司，数据分析实习生，使用 Python 清洗销售数据。\n技能：Python、SQL。');
 console.log('PARSE',JSON.stringify(draft),'ms',Date.now()-t);
 await writeFile('tests/local-model-result.json',JSON.stringify({mapping,draft,totalMs:Date.now()-started},null,2));
} catch(e){console.error(e.message);process.exitCode=1;}
