export const schema={
 基本信息:['姓名','手机号','邮箱','性别','出生日期','居住城市','籍贯','政治面貌','求职意向','个人网站'],
 教育经历:['学校','专业','学历','学位','开始时间','结束时间','GPA','排名'],
 工作经历:['公司','职位','开始时间','结束时间','工作描述'],
 实习经历:['公司','职位','开始时间','结束时间','工作描述'],
 项目经历:['项目名称','项目角色','开始时间','结束时间','项目描述'],
 其他信息:['技能','证书','获奖经历','自我评价']
};
const aliases={姓名:['姓名','中文名','真实姓名','fullname','name'],手机号:['手机号','手机号码','联系电话','手机','mobile','phone','tel'],邮箱:['邮箱','电子邮箱','电子邮件','email','emailaddress'],性别:['性别','gender','sex'],出生日期:['出生日期','生日','dateofbirth','birthday'],居住城市:['居住城市','现居地','现居住地','city'],籍贯:['籍贯'],政治面貌:['政治面貌'],求职意向:['求职意向','意向岗位'],个人网站:['个人网站','个人主页','website','portfolio'],学校:['学校','学校名称','毕业院校','院校','school','schoolname','university'],专业:['专业','专业名称','major'],学历:['学历','最高学历','educationlevel'],学位:['学位','degree'],开始时间:['开始时间','开始日期','入学时间','入职时间','startdate','from'],结束时间:['结束时间','结束日期','毕业时间','离职时间','enddate','to'],GPA:['gpa','绩点'],排名:['排名','专业排名'],公司:['公司','公司名称','实习单位','工作单位','company','employer'],职位:['职位','岗位','职位名称','职务','jobtitle'],工作描述:['工作描述','实习描述','工作内容','实习内容','工作职责','职责描述','responsibilities'],项目名称:['项目名称','projectname'],项目角色:['项目角色','担任角色'],项目描述:['项目描述','项目介绍','项目内容','projectdescription'],技能:['技能','专业技能','技能特长','skills'],证书:['证书','资格证书','certificates'],获奖经历:['获奖经历','奖励','荣誉奖项','awards'],自我评价:['自我评价','个人简介','自我介绍','summary']};
const norm=s=>String(s).toLowerCase().replace(/[\s_*：:（）()\-]/g,'');
export function matchField(label){
 if(/验证码|密码|紧急|推荐人|联系人|父亲|母亲|配偶|password|captcha|referr|emergency/i.test(label)) return null;
 const n=norm(label);
 for(const [key,values] of Object.entries(aliases)) if(values.some(v=>norm(v)===n)) return key;
 const hits=Object.entries(aliases).filter(([,values])=>values.some(v=>/[\u4e00-\u9fff]/.test(v)&&v.length>=3&&n.includes(norm(v))));
 return hits.length===1?hits[0][0]:null;
}
export function validateResume(r){
 if(!r||Array.isArray(r)||typeof r!=='object') throw Error('简历必须是 JSON 对象');
 if(!Object.keys(r).some(k=>schema[k])) throw Error('请使用本插件的中文字段模板');
 for(const [section,value] of Object.entries(r)){
  if(!schema[section]) throw Error('未知分区：'+section);
  const repeated=['教育经历','工作经历','实习经历','项目经历'].includes(section);
  if(repeated!==Array.isArray(value)) throw Error(section+'格式错误');
  for(const row of repeated?value:[value]){
   if(!row||typeof row!=='object'||Array.isArray(row)) throw Error(section+'必须包含字段对象');
   for(const [k,v] of Object.entries(row)) if(!schema[section].includes(k)||!['string','number'].includes(typeof v)) throw Error('字段不合法：'+k);
  }
 }
 return r;
}
export function flattenResume(r){
 validateResume(r);
 return Object.entries(r).flatMap(([section,v])=>(Array.isArray(v)?v:[v]).flatMap((row,index)=>Object.entries(row).filter(([,value])=>String(value).trim()).map(([field,value])=>({id:`${section}.${index}.${field}`,section,index,field,value:String(value),label:`${section}${Array.isArray(v)?' '+(index+1):''} / ${field}`}))));
}
