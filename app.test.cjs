const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const fakeElement = {addEventListener(){}};
const context = vm.createContext({document:{getElementById(){return fakeElement}}, TextDecoder});
vm.runInContext(fs.readFileSync('app.js','utf8'),context);
test('lee columnas en distinto orden, comillas y acentos',()=>{
  const result=context.loadCSV('Empresa;Apellido;Nombre\n"A; B";Pérez;María\nAcme;;Juan');
  assert.equal(result.valid[0].name,'María Pérez');
  assert.equal(result.valid[0].company,'A; B');
  assert.equal(result.invalid[0],3);
});
test('rechaza encabezados incompletos y CSV mal formado',()=>{
  assert.throws(()=>context.loadCSV('Nombre;Empresa\nAna;A'));
  assert.throws(()=>context.parseCSV('Nombre;Apellido\n"Ana;Pérez'));
});
test('genera TSPL e impide insertar comandos',()=>{
  assert.match(context.commandFor({name:'María Pérez',company:'Galtech'}),/SIZE 60 mm, 40 mm/);
  assert.throws(()=>context.commandFor({name:'Ana"\r\nPRINT 99',company:'Galtech'}));
});
