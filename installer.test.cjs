const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawn, spawnSync} = require('node:child_process');
const http = require('node:http');
const {setTimeout: delay} = require('node:timers/promises');

test('el paquete extraído arranca el puente sin instalar Node y restringe los orígenes', async () => {
  const installer=path.join(__dirname,'dist','Instalar-Galtech-v6-prueba.exe');
  assert.ok(fs.existsSync(installer),'Primero hay que construir el instalador');
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'galtech-installer-test-'));
  const output=path.join(temp,'contenido');
  let service;
  try {
    const result=spawnSync(installer,['--test-extract',output],{timeout:120000});
    assert.equal(result.status,0,'No se pudieron extraer los componentes');
    for(const file of ['server.cjs','app.js','index.html','styles.css','ejemplo.csv','list-printers.ps1','print-raw.ps1','network-scan.cjs']) {
      const digest=filePath=>crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
      assert.equal(digest(path.join(output,file)),digest(path.join(__dirname,file)),`${file} no coincide con el código probado`);
    }
    const version=spawnSync(path.join(output,'node.exe'),['--version'],{encoding:'utf8',timeout:10000});
    assert.equal(version.status,0);
    assert.match(version.stdout,/^v22\./);
    assert.ok(fs.existsSync(path.join(output,'NODE-LICENSE.txt')));
    const request = origin => new Promise((resolve,reject)=>{ const req=http.get('http://127.0.0.1:4173/api/printers',{headers:{Origin:origin}},res=>{res.resume();res.on('end',()=>resolve({status:res.statusCode,allowed:res.headers['access-control-allow-origin']}));});req.on('error',reject); });
    const occupied=await new Promise(resolve=>{const socket=require('node:net').connect(4173,'127.0.0.1');socket.on('connect',()=>{socket.destroy();resolve(true)});socket.on('error',()=>resolve(false));});
    assert.equal(occupied,false,'El puerto de prueba 4173 está ocupado');
    service=spawn(path.join(output,'node.exe'),[path.join(output,'server.cjs')],{cwd:output,windowsHide:true,stdio:'ignore'});
    let ready=false;
    for(let attempt=0;attempt<40;attempt++) { try { await request('https://sitio-ajeno.example'); ready=true; break; } catch { await delay(250); } }
    assert.ok(ready,'El puente extraído no inició');
    const rejected=await request('https://sitio-ajeno.example');
    assert.equal(rejected.status,403);
    const allowed=await request('https://galtech-etiquetas.netlify.app');
    assert.equal(allowed.status,200);
    assert.equal(allowed.allowed,'https://galtech-etiquetas.netlify.app');
    const preview=await request('https://deploy-preview-2--galtech-etiquetas.netlify.app');
    assert.equal(preview.status,200);
    assert.equal(preview.allowed,'https://deploy-preview-2--galtech-etiquetas.netlify.app');
    const manual=await request('https://deploy-preview-4--galtech-etiquetas.netlify.app');
    assert.equal(manual.status,200);
    assert.equal(manual.allowed,'https://deploy-preview-4--galtech-etiquetas.netlify.app');
    const longText=await request('https://deploy-preview-5--galtech-etiquetas.netlify.app');
    assert.equal(longText.status,200);
    assert.equal(longText.allowed,'https://deploy-preview-5--galtech-etiquetas.netlify.app');
  } finally { if(service && service.exitCode===null){service.kill();await new Promise(resolve=>service.once('exit',resolve));} fs.rmSync(temp,{recursive:true,force:true}); }
});
