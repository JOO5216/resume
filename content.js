// 所有动作都受本地白名单约束；模型不提供选择器或可执行代码。
(() => {
 if(globalThis.__resumeCopilot?.version==='0.2.5') return;
 const nodes=new Map(); let serial=0;let scannedURL='';let busy=false;
 const groups=['教育经历','工作经历','实习经历','项目经历'];
 const blocked=/验证码|密码|紧急|推荐人|联系人|父亲|母亲|配偶|password|captcha|referr|emergency|协议|同意|consent/i;
 const visible=e=>!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const clean=s=>String(s??'').replace(/\s+/g,'').trim();
 function roots(root=document){return [root,...[...root.querySelectorAll('*')].filter(e=>e.shadowRoot).flatMap(e=>roots(e.shadowRoot))];}
 const query=selector=>roots().flatMap(root=>[...root.querySelectorAll(selector)]);
 const controls=()=>query('input,textarea,select,[contenteditable="true"],[role="combobox"]').filter(e=>!(e.getAttribute('role')==='combobox'&&!e.matches('input,textarea,select')&&e.querySelector('input')));
 function protectedContext(e){
  for(let parent=e.parentElement;parent&&parent!==document.body&&parent.tagName!=='FORM';parent=parent.parentElement){
   const heading=parent.querySelector(':scope > legend,:scope > h2,:scope > h3,:scope > h4,:scope > .section-title');
   if(heading&&blocked.test(heading.textContent))return true;
  }
  return false;
 }
 function label(e){
  const root=e.getRootNode();
  const labelled=(e.getAttribute('aria-labelledby')||'').split(/\s+/).map(id=>root.getElementById?.(id)?.textContent||'').join(' ').trim();
  const own=[...(e.labels||[])].map(l=>{const copy=l.cloneNode(true);copy.querySelectorAll('input,select,textarea,button').forEach(n=>n.remove());return copy.textContent;}).join(' ').trim();
  const wrap=e.closest('.aui-form-item,.el-form-item,.ant-form-item,.form-group,.form-item');
  const nearby=wrap?.querySelector('label,.aui-form-item__label,.el-form-item__label,.ant-form-item-label')?.textContent||e.closest('.info_box')?.querySelector(':scope > .subtitle')?.textContent;
  let sibling='';
  for(let parent=e.parentElement,depth=0;parent&&depth<5&&!sibling;parent=parent.parentElement,depth++){
   const matches=[...parent.children].filter(child=>!child.contains(e)&&!child.matches('button')&&!child.querySelector('input,textarea,select,button,[role="combobox"]'));
   sibling=matches.map(child=>child.textContent.replace(/[＊*：:]/g,'').trim()).find(s=>s.length>=2&&s.length<=35&&!/^\d+\s*\/\s*\d+$/.test(s)&&!/^(请选择|请输入|删除|添加|保存|清除|查看|请正确填写)/.test(s))||'';
  }
  const placeholder=/^(请选择|请输入|输入|选择)$/.test((e.placeholder||'').trim())?'':e.placeholder;
  return (own||labelled||e.getAttribute('aria-label')||nearby||sibling||placeholder||e.name||e.id||'未命名字段').trim().slice(0,160);
 }
 function sectionInfo(e){
  const module=e.closest('.educationExperienceModule,.projectExperienceModule,.workExperienceModule,.internshipExperienceModule');
  if(module){const key=module.matches('.educationExperienceModule')?'教育经历':module.matches('.projectExperienceModule')?'项目经历':module.matches('.internshipExperienceModule')?'实习经历':'工作经历';return {key,container:module};}
  for(let parent=e.parentElement;parent&&parent!==document.body;parent=parent.parentElement){
   const heading=parent.querySelector(':scope > legend,:scope > h1,:scope > h2,:scope > h3,:scope > h4,:scope > .section-title');
   const text=parent.getAttribute('data-section')||heading?.textContent||'';
   const key=groups.find(k=>text.includes(k));
   if(key)return {key,container:parent};
  }
  return {key:'',container:null};
 }
 const wrapper=e=>e.closest('.aui-select,.ant-select,.el-select,.el-cascader,.ant-cascader,.ant-picker,.el-date-editor')||e;
 function value(e){
  const selected=wrapper(e).querySelector('.ant-select-selection-item,.el-select__selected-item:not(.is-transparent)');
  return selected?.textContent?.trim()||(e.isContentEditable?e.textContent:(e.value??(e.getAttribute('role')==='combobox'?e.textContent:'')))||'';
 }
 function scan(){
  nodes.clear();scannedURL=location.href;
  const records=new Map();
  return [...new Set(controls())].filter(e=>visible(e)&&!e.disabled&&!['hidden','password','file','submit','button','reset','checkbox','radio','image'].includes(e.type)&&!blocked.test(label(e))&&!protectedContext(e)).map(e=>{
   const id=String(++serial);const section=sectionInfo(e);
   const row=e.closest('fieldset,[data-record],.education-item,.experience-item,.project-item,.module-main');
   let recordIndex=null;
   if(section.key&&row){
    const list=records.get(section.key)||[];if(!list.includes(row))list.push(row);records.set(section.key,list);recordIndex=list.indexOf(row);
   }
   const field={id,label:label(e),section:section.key,recordIndex,value:value(e),required:e.required||e.getAttribute('aria-required')==='true',custom:!!(e.readOnly||e.getAttribute('role')==='combobox'||wrapper(e)!==e),type:e.type||e.getAttribute('role')||e.tagName.toLowerCase(),options:e.tagName==='SELECT'?[...e.options].map(o=>o.text):null};
   nodes.set(id,{element:e,label:field.label,section:field.section});return field;
  });
 }
 function setValue(e,v){
  if(e.isContentEditable)e.textContent=v;
  else{
   const proto=e.tagName==='SELECT'?HTMLSelectElement.prototype:e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
   Object.getOwnPropertyDescriptor(proto,'value').set.call(e,v);
  }
  e.dispatchEvent(new Event('input',{bubbles:true,composed:true}));
  e.dispatchEvent(new Event('change',{bubbles:true,composed:true}));
 }
 const popupSelector='[role="listbox"],[role="tree"],[role="dialog"],.aui-select-dropdown,.el-select-dropdown,.ant-select-dropdown,.el-cascader-panel,.ant-cascader-menus,.el-picker-panel,.ant-picker-dropdown';
 function linkedPanels(e,before){
  const ids=[e,wrapper(e)].flatMap(n=>(`${n.getAttribute('aria-controls')||''} ${n.getAttribute('aria-owns')||''}`).split(/\s+/)).filter(Boolean);
  const linked=[...new Set(ids.map(id=>e.getRootNode().getElementById?.(id)||document.getElementById(id)).filter(n=>n&&visible(n)))];
  if(linked.length)return linked;
  const fresh=query(popupSelector).filter(n=>visible(n)&&!before.has(n));
  // 多个不相关浮层时不选择；嵌套面板合并到外层。
  const top=fresh.filter(n=>!fresh.some(other=>other!==n&&other.contains(n)));
  return top.length===1?top:[];
 }
 function optionNodes(panels){
  const selector='[role="option"],[role="treeitem"],.aui-select-dropdown__item,.el-select-dropdown__item,.ant-select-item-option,.el-cascader-node,.ant-cascader-menu-item';
  return [...new Set(panels.flatMap(p=>[...p.querySelectorAll(selector)]))].filter(n=>visible(n)&&!n.disabled&&n.getAttribute('aria-disabled')!=='true'&&!n.matches('.is-disabled,.ant-select-item-option-disabled,.ant-cascader-menu-item-disabled'));
 }
 async function chooseCustom(e,v){
  const original=value(e);const before=new Set(query(popupSelector).filter(visible));
  e.focus();e.click();await wait(180);
  let panels=linkedPanels(e,before);
  if(!panels.length){e.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));return '未识别到关联选项，请手动选择';}
  const parts=v.split(/\s*\/\s*/).filter(Boolean);
  let changed=false;
  async function stop(message){
   if(!changed&&e.matches('input,textarea')&&!e.readOnly&&value(e)!==original)setValue(e,original);
   e.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
   return (changed?'部分选项已选择，':'')+message;
  }
  // 支持具有完整 ISO 日期属性的日历；绝不按含糊的“1日”全局点击。
  if(/^\d{4}-\d{2}(?:-\d{2})?$/.test(v)&&!/combobox/.test(e.getAttribute('role')||'')){
   const dateNodes=panels.flatMap(p=>[...p.querySelectorAll('[data-date],[title],[aria-label]')]).filter(n=>visible(n)&&!n.disabled&&n.getAttribute('aria-disabled')!=='true'&&[n.getAttribute('data-date'),n.getAttribute('title'),n.getAttribute('aria-label')].includes(v));
   const matches=dateNodes.filter(n=>!dateNodes.some(other=>other!==n&&n.contains(other)));
   if(matches.length!==1)return stop('日历中没有唯一的完整日期，请手动选择');
   if(matches[0].matches('button')&&matches[0].type!=='button')return stop('日期按钮可能提交表单，请手动选择');
   matches[0].click();await wait(150);return clean(value(e))===clean(v)?'已填写（日期已回读）':'日期已点击但未确认生效，请核对';
  }
  for(let i=0;i<parts.length;i++){
   let matches=optionNodes(panels).filter(n=>clean(n.textContent)===clean(parts[i]));
   if(!matches.length&&i===0&&parts.length===1&&e.matches('input')&&!e.readOnly){
    setValue(e,parts[i]);await wait(350);
    for(let attempt=0;attempt<5;attempt++){panels=linkedPanels(e,before);matches=optionNodes(panels).filter(n=>clean(n.textContent)===clean(parts[i]));if(matches.length)break;await wait(150);}
   }
   if(matches.length!==1)return stop(matches.length?'发现多个相同选项，请手动选择':'没有唯一匹配选项，请手动选择');
   if(matches[0].matches('button')&&matches[0].type!=='button')return stop('选项按钮可能提交表单，请手动选择');
   matches[0].click();changed=true;await wait(180);panels=linkedPanels(e,before);
  }
  return clean(value(e))===clean(v)||clean(value(e))===parts.map(clean).join('')?'已填写（选项已回读）':'选项已点击但回读不一致，请核对';
 }
 function normalizeDate(e,v){
  if(e.type==='month'&&/^\d{4}[-/.]\d{1,2}$/.test(v)){const [y,m]=v.split(/[-/.]/);return `${y}-${m.padStart(2,'0')}`;}
  if(e.type==='date'&&/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(v)){const [y,m,d]=v.split(/[-/.]/);return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;}
  return v;
 }
 function validationError(e){
  const wrap=e.closest('.el-form-item,.ant-form-item,.form-group');
  const error=wrap?.querySelector('.el-form-item__error,.ant-form-item-explain-error,[role="alert"]');
  return e.getAttribute('aria-invalid')==='true'||(e.validity&&!e.validity.valid)||!!(error&&visible(error)&&error.textContent.trim());
 }
 async function fill(items,overwrite){
  if(busy)throw Error('正在执行另一项操作');busy=true;
  try{
   const results=[];
   for(const item of items){
    const ref=nodes.get(item.id),e=ref?.element;let status;
    if(location.href!==scannedURL||!e?.isConnected||!visible(e)||label(e)!==ref.label||sectionInfo(e).key!==ref.section)status='页面已变化，请重新识别';
    else if(e.disabled||blocked.test(label(e))||protectedContext(e))status='字段不可填写';
    else if(!overwrite&&String(value(e)).trim())status='已有内容，跳过';
    else if(typeof item.value!=='string'||!item.value.trim())status='内容为空，跳过';
    else{
     const original=value(e);let v=normalizeDate(e,item.value);
     try{
      if(e.maxLength>0&&v.length>e.maxLength)status='超过字数限制，请缩短';
      else if(e.readOnly||e.getAttribute('role')==='combobox'||wrapper(e)!==e)status=await chooseCustom(e,v);
      else{
       if(e.tagName==='SELECT'){
        const options=[...e.options].filter(o=>!o.disabled&&(o.text.trim()===v.trim()||o.value===v));
        if(options.length!==1){results.push({id:item.id,status:'没有唯一匹配选项，请手动选择'});continue;}v=options[0].value;
       }
       setValue(e,v);e.dispatchEvent(new FocusEvent('blur',{bubbles:true}));await wait(120);
       if(value(e)!==v){setValue(e,original);status='页面未接受，已尝试恢复原值，请核对';}
       else status='已填写（请核对）';
      }
      if(validationError(e))status='网站提示校验错误，请检查该字段';
     }catch{status='控件操作失败，请核对后手动填写';}
    }
    results.push({id:item.id,status});
   }
   return results;
  }finally{busy=false;}
 }
 function recordCount(container,key){
  const anchors={教育经历:/^(学校|学校名称|毕业院校|院校|school|university)$/i,工作经历:/^(公司|公司名称|工作单位|company|employer)$/i,实习经历:/^(公司|公司名称|实习单位|company|employer)$/i,项目经历:/^(项目名称|projectname)$/i};
  return controls().filter(e=>container.contains(e)&&visible(e)&&anchors[key].test(clean(label(e)))).length;
 }
 async function ensureRecords(counts){
  if(busy)throw Error('正在执行另一项操作');busy=true;
  try{
   const results=[];
   for(const [key,target] of Object.entries(counts)){
    if(!groups.includes(key)||!Number.isInteger(target)||target<1||target>10)continue;
    const candidates=query('button[type="button"],a[role="button"],[role="button"]:not(button)').filter(e=>visible(e)&&!e.disabled&&e.getAttribute('aria-disabled')!=='true'&&new RegExp(`^[+＋]?\\s*(新增|添加|增加)\\s*(${key}|经历)?\\s*$`).test(e.textContent.trim()));
    const buttons=candidates.filter(e=>sectionInfo(e).key===key);
    if(buttons.length!==1){results.push({section:key,added:0,status:'未找到唯一的安全新增按钮，请手动新增'});continue;}
    let button=buttons[0],container=sectionInfo(button).container;let count=recordCount(container,key),added=0;
    if(!count){results.push({section:key,added:0,status:'无法判断已有条数，请手动新增'});continue;}
    while(count<target){
     button.click();let next=count;
     for(let attempt=0;attempt<10;attempt++){await wait(120);if(!container.isConnected)break;next=recordCount(container,key);if(next>count)break;}
     if(next!==count+1)break;
     count=next;added++;
     if(!button.isConnected)break;
    }
    results.push({section:key,added,status:count>=target?'条目数量已就绪':'新增后未检测到预期条目，已停止，请核对'});
   }
   return results;
  }finally{nodes.clear();busy=false;}
 }
 globalThis.__resumeCopilot={version:'0.2.5',scan,fill,ensureRecords};
 chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
  if(msg.type==='rc-scan')reply({fields:scan(),url:location.href});
  if(msg.type==='rc-fill'){fill(msg.items,msg.overwrite).then(reply).catch(e=>reply({error:e.message}));return true;}
  if(msg.type==='rc-records'){ensureRecords(msg.counts).then(reply).catch(e=>reply({error:e.message}));return true;}
 });
})();
