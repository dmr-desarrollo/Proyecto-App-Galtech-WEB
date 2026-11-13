// Servicio local: solo acepta solicitudes de la página servida por este proceso.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const vm = require('node:vm');
const root = __dirname;
const context = vm.createContext({document:{getElementById:()=>({addEventListener(){}}),addEventListener(){}}});
vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'), context);
const files = {'/':['index.html','text/html; charset=utf-8'], '/index.html':['index.html','text/html; charset=utf-8'], '/styles.css':['styles.css','text/css; charset=utf-8'], '/app.js':['app.js','text/javascript; charset=utf-8'], '/ejemplo.csv':['ejemplo.csv','text/csv; charset=utf-8']};
let busy=false;
function listPrinters() {
  return new Promise((resolve,reject)=>{
    const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-File',path.join(root,'list-printers.ps1')],{windowsHide:true}); let output='',error='';
    child.stdout.on('data',chunk=>{output+=chunk}); child.stderr.on('data',chunk=>{error+=chunk}); child.on('error',reject);
    child.on('close',code=>{if(code!==0) return reject(Error(error.trim()||'No se pudieron buscar impresoras.')); try{const parsed=JSON.parse(output);if(!Array.isArray(parsed))throw Error('Respuesta inesperada.');resolve(parsed);}catch(e){reject(e)}});
  });
}
const server=http.createServer(async(req,res)=>{
  const origin='http://127.0.0.1:4173';
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.headers.host!=='127.0.0.1:4173'){res.writeHead(403);return res.end('Forbidden');}
  if(req.method==='GET' && files[req.url]) {const [file,type]=files[req.url];res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});return fs.createReadStream(path.join(root,file)).pipe(res);}
  if(req.method==='GET' && req.url==='/api/printers') { try {const printers=await listPrinters(); res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify({printers}));} catch(e) {res.writeHead(500,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'No se pudieron buscar impresoras en Windows.'}));} }
  if(req.method!=='POST'||req.url!=='/api/print'||req.headers.origin!==origin||req.headers['content-type']!=='application/json') {res.writeHead(403);return res.end('Forbidden');}
  const reply=(status,obj)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(obj));};
  if(busy) return reply(409,{error:'Hay un trabajo en curso.'});
  busy=true;
  try {
    let body=''; for await(const chunk of req){body+=chunk;if(body.length>1000000) throw Error('La lista es demasiado grande.');}
    const payload=JSON.parse(body); if(!Array.isArray(payload.rows)||!payload.rows.length||payload.rows.length>2000) throw Error('Seleccioná entre 1 y 2000 personas.');
    const printers=await listPrinters(); if(typeof payload.printer!=='string'||!printers.some(p=>p.name===payload.printer)) throw Error('La impresora seleccionada no está disponible. Volvé a buscarla.');
    const commands=payload.rows.map(r=>{if(!r||typeof r.name!=='string'||typeof r.company!=='string'||!r.name.trim()||!r.company.trim()) throw Error('Datos incompletos.');return context.commandFor(r);}).join('');
    const encoded=Buffer.from(commands,'latin1').toString('base64');
    await new Promise((resolve,reject)=>{
      const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-File',path.join(root,'print-raw.ps1'),'-PrinterName',payload.printer],{windowsHide:true}); let error='';
      child.stderr.on('data',chunk=>{error+=chunk}); child.on('error',reject); child.on('close',code=>code===0?resolve():reject(Error(error.trim()||'Falló la cola de impresión.')));child.stdin.end(encoded);
    });
    reply(200,{ok:true});
  } catch(error) {reply(500,{error:error.message});} finally {busy=false;}
});
server.listen(4173,'127.0.0.1',()=>console.log('Etiquetas Galtech: http://127.0.0.1:4173'));
