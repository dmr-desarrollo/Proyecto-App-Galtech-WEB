// Servicio local: solo acepta solicitudes de la página servida por este proceso.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const vm = require('node:vm');
const root = __dirname;
const context = vm.createContext({document:{getElementById:()=>({addEventListener(){}})}});
vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'), context);
const files = {'/':['index.html','text/html; charset=utf-8'], '/index.html':['index.html','text/html; charset=utf-8'], '/styles.css':['styles.css','text/css; charset=utf-8'], '/app.js':['app.js','text/javascript; charset=utf-8'], '/ejemplo.csv':['ejemplo.csv','text/csv; charset=utf-8']};
let busy=false;
const server=http.createServer(async(req,res)=>{
  const origin='http://127.0.0.1:4173';
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.headers.host!=='127.0.0.1:4173'){res.writeHead(403);return res.end('Forbidden');}
  if(req.method==='GET' && files[req.url]) {const [file,type]=files[req.url];res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});return fs.createReadStream(path.join(root,file)).pipe(res);}
  if(req.method!=='POST'||req.url!=='/api/print'||req.headers.origin!==origin||req.headers['content-type']!=='application/json') {res.writeHead(403);return res.end('Forbidden');}
  const reply=(status,obj)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(obj));};
  if(busy) return reply(409,{error:'Hay un trabajo en curso.'});
  busy=true;
  try {
    let body=''; for await(const chunk of req){body+=chunk;if(body.length>1000000) throw Error('La lista es demasiado grande.');}
    const payload=JSON.parse(body); if(!Array.isArray(payload.rows)||!payload.rows.length||payload.rows.length>2000) throw Error('Seleccioná entre 1 y 2000 personas.');
    const commands=payload.rows.map(r=>{if(!r||typeof r.name!=='string'||typeof r.company!=='string'||!r.name.trim()||!r.company.trim()) throw Error('Datos incompletos.');return context.commandFor(r);}).join('');
    const encoded=Buffer.from(commands,'latin1').toString('base64');
    await new Promise((resolve,reject)=>{
      const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-File',path.join(root,'print-raw.ps1')],{windowsHide:true}); let error='';
      child.stderr.on('data',chunk=>{error+=chunk}); child.on('error',reject); child.on('close',code=>code===0?resolve():reject(Error(error.trim()||'Falló la cola de impresión.')));child.stdin.end(encoded);
    });
    reply(200,{ok:true});
  } catch(error) {reply(500,{error:error.message});} finally {busy=false;}
});
server.listen(4173,'127.0.0.1',()=>console.log('Etiquetas Galtech: http://127.0.0.1:4173'));
