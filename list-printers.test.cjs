const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

test('el puente enumera las impresoras que ve PrintServiceLookup de Java', {timeout:120000}, (t)=>{
  const java=spawnSync('java',['-Dfile.encoding=UTF-8',path.join(__dirname,'test','PrintLookup.java')],{encoding:'utf8',timeout:60000,windowsHide:true});
  if(java.error && java.error.code==='ENOENT') return t.skip('Java no está disponible para la comparación');
  assert.equal(java.status,0,java.stderr);
  const expected=java.stdout.trim().split(/\r?\n/).filter(Boolean).map(x=>Buffer.from(x,'base64').toString('utf8')).sort();
  assert.ok(expected.length>0,'La comparación requiere impresoras instaladas');
  const result=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-File',path.join(__dirname,'list-printers.ps1')],{encoding:'utf8',timeout:60000,windowsHide:true});
  assert.equal(result.status,0,result.stderr);
  const actual=JSON.parse(result.stdout).map(p=>p.name).sort();
  assert.deepEqual(actual,expected,'La lista de Windows debe incluir las mismas impresoras que Java');
});
