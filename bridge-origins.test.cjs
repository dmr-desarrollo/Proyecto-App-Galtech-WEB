const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

test('el puente acepta los orígenes autorizados y rechaza otros',async()=>{
  let handle;
  const fakeHttp={createServer(fn){handle=fn;return {listen(){}}}};
  const context={require:name=>name==='node:http'?fakeHttp:require(name),__dirname:__dirname,console,Buffer};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'server.cjs'),'utf8'),context);
  async function preflight(origin){
    const result={headers:{}};
    const res={setHeader(k,v){result.headers[k]=v},writeHead(code,headers={}){result.status=code;Object.assign(result.headers,headers)},end(){}};
    await handle({headers:{host:'127.0.0.1:4173',origin},url:'/api/print',method:'OPTIONS'},res);
    return result;
  }
  for(const origin of ['https://galtech-etiquetas.netlify.app','https://deploy-preview-2--galtech-etiquetas.netlify.app','https://deploy-preview-4--galtech-etiquetas.netlify.app','https://deploy-preview-5--galtech-etiquetas.netlify.app']){
    const result=await preflight(origin);
    assert.equal(result.status,204);
    assert.equal(result.headers['Access-Control-Allow-Origin'],origin);
  }
  assert.equal((await preflight('https://sitio-ajeno.example')).status,403);
});
