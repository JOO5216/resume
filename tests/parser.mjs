import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();
 await page.route('http://copilot.test/**',async route=>{
  const path=new URL(route.request().url()).pathname.slice(1);
  if(!path)return route.fulfill({body:'<!doctype html><title>解析测试</title>',contentType:'text/html'});
  await route.fulfill({body:await readFile(new URL('../'+path,import.meta.url)),contentType:/\.m?js$/.test(path)?'text/javascript':'application/octet-stream'});
 });
 await page.goto('http://copilot.test/');
 const results=await page.evaluate(async()=>{
  const {extractText}=await import('/src/parser.js');const results={};
  for(const ext of ['pdf','docx']){const response=await fetch(`/tests/fixtures/resume.${ext}`);results[ext]=await extractText(new File([await response.arrayBuffer()],`resume.${ext}`));}
  return results;
 });
 assert.match(results.pdf.text,/Resume Python SQL/);assert.match(results.docx.text,/测试简历 Python SQL/);
 console.log('PASS: 浏览器本地 PDF worker、PDF 文字提取、DOCX 文字提取');
}finally{await browser.close();}
