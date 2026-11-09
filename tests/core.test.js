import {test} from 'node:test';
import assert from 'node:assert/strict';
import {matchField, flattenResume, validateResume} from '../src/core.js';
test('中英文字段对应，避免姓名与学校名称混淆',()=>{
 assert.equal(matchField('姓名'),'姓名');
 assert.equal(matchField('School name'),'学校');
 assert.equal(matchField('Email address'),'邮箱');
 assert.equal(matchField('验证码'),null);
 assert.equal(matchField('紧急联系人姓名'),null);
});
test('重复经历保留每一条，禁止非法简历结构',()=>{
 const r={基本信息:{姓名:'测试'},教育经历:[{学校:'甲'},{学校:'乙'}]};
 assert.equal(flattenResume(r).filter(x=>x.field==='学校').length,2);
 assert.throws(()=>validateResume({基本信息:{姓名:{bad:true}}}));
 assert.throws(()=>validateResume([]));
});
