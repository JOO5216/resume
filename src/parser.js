export async function extractText(file){
 if(file.size>15*1024*1024)throw Error('文件超过 15 MB，请使用较小的简历文件');
 const ext=file.name.split('.').pop().toLowerCase();
 if(ext==='txt')return {text:await file.text(),warnings:[]};
 if(ext==='docx'){
  const {default:mammoth}=await import('../vendor/mammoth.js');
  const result=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});
  return {text:result.value,warnings:result.messages.map(m=>m.message)};
 }
 if(ext==='pdf'){
  const pdfjs=await import('../vendor/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc=new URL('../vendor/pdf.worker.mjs',import.meta.url).href;
  const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,useWasm:false,cMapUrl:new URL('../vendor/cmaps/',import.meta.url).href,cMapPacked:true,standardFontDataUrl:new URL('../vendor/standard_fonts/',import.meta.url).href});
  try{
   const pdf=await task.promise;if(pdf.numPages>30)throw Error('简历超过30页，请提取相关页面');
   const pages=[],warnings=[];
   for(let i=1;i<=pdf.numPages;i++){
    const page=await pdf.getPage(i);const content=await page.getTextContent();
    let lastY=null;let line='';
    for(const item of content.items){if(!('str' in item))continue;const y=item.transform[5];if(lastY!==null&&Math.abs(y-lastY)>3)line+='\n';line+=item.str+(item.hasEOL?'\n':' ');lastY=y;}
    if(line.trim().length<10)warnings.push(`第 ${i} 页文字较少，可能是扫描图片，当前版本不含 OCR`);
    pages.push(line.trim());
   }
   const text=pages.join('\n\n');if(!text.trim())throw Error('此 PDF 没有可提取文字，可能是扫描件。请先 OCR 或粘贴文字');
   return {text,warnings};
  }finally{await task.destroy();}
 }
 throw Error('支持 PDF、DOCX、TXT；旧版 .doc 请先另存为 .docx');
}
