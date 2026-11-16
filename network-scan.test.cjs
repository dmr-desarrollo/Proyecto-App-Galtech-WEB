const {test}=require('node:test');
const assert=require('node:assert/strict');
const {targets,scan}=require('./network-scan.cjs');
test('limita el sondeo a la subred privada local y omite la IP propia',()=>{
  const interfaces={ethernet:[{family:'IPv4',internal:false,address:'192.168.10.4',netmask:'255.255.255.252'}],loopback:[{family:'IPv4',internal:true,address:'127.0.0.1',netmask:'255.0.0.0'}]};
  assert.deepEqual(targets(interfaces),['192.168.10.5','192.168.10.6']);
});
test('la búsqueda devuelve únicamente los puertos encontrados sin sondear la red real',async()=>{
  const interfaces={wifi:[{family:'IPv4',internal:false,address:'10.1.2.1',netmask:'255.255.255.252'}]};
  assert.deepEqual(await scan(interfaces,async address=>address==='10.1.2.2'),{addresses:['10.1.2.2'],scanned:1});
});
