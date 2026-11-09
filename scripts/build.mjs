import {build} from 'esbuild';
import {mkdir,copyFile,cp,writeFile,readFile} from 'node:fs/promises';
await mkdir('vendor',{recursive:true});
await build({stdin:{contents:"import mammoth from 'mammoth/mammoth.browser.js'; export default mammoth;",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'browser',outfile:'vendor/mammoth.js',minify:true});
await copyFile('node_modules/pdfjs-dist/build/pdf.mjs','vendor/pdf.mjs');
await copyFile('node_modules/pdfjs-dist/build/pdf.worker.mjs','vendor/pdf.worker.mjs');
await cp('node_modules/pdfjs-dist/cmaps','vendor/cmaps',{recursive:true});
await cp('node_modules/pdfjs-dist/standard_fonts','vendor/standard_fonts',{recursive:true});
let licenses='Bundled third-party software\n\n';
for(const name of ['pdfjs-dist','mammoth']){
 const pkg=JSON.parse(await readFile(`node_modules/${name}/package.json`,'utf8'));
 licenses+=`${name} ${pkg.version}\n${await readFile(`node_modules/${name}/LICENSE`,'utf8')}\n\n`;
}
await writeFile('vendor/LICENSES.txt',licenses);
console.log('本地解析库已构建；插件运行不加载 CDN 代码。');
