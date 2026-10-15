import {build} from 'esbuild';
import {cp,mkdir,rm,readFile,writeFile} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});await cp('public','dist',{recursive:true});
await build({entryPoints:['src/main.js'],bundle:true,minify:true,format:'esm',target:['es2020'],outfile:'dist/app.js',legalComments:'eof'});
await cp('index.html','dist/index.html');await cp('src/style.css','dist/style.css');
await writeFile('dist/build.json',JSON.stringify({name:'uk-street-simulator',version:JSON.parse(await readFile('package.json','utf8')).version,builtAt:new Date().toISOString()}));
