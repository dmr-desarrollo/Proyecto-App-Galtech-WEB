const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const fakeElement = {addEventListener(){}};
const context = vm.createContext({document:{getElementById(){return fakeElement},addEventListener(){}}, TextDecoder});
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
  assert.match(context.commandFor({name:'María Pérez',company:'Galtech'}),/TEXT 240,60,"0",0,16,16,2,"María Pérez"/);
  assert.match(context.commandFor({name:'María Pérez',company:'Galtech'}),/TEXT 240,180,"0",0,16,16,2,"Galtech"/);
  assert.throws(()=>context.commandFor({name:'Ana"\r\nPRINT 99',company:'Galtech'}));
});
test('combina los filtros de persona y empresa sin distinguir acentos',()=>{
  const person={name:'María Pérez',company:'Tecnología Sur'};
  assert.equal(context.matchesFilters(person,'maria','tecnologia'),true);
  assert.equal(context.matchesFilters(person,'maria','otro'),false);
  assert.equal(context.matchesFilters(person,'juan','tecnologia'),false);
});
test('prepara una etiqueta por cada persona seleccionada en el orden de la lista',()=>{
  const result=context.labelsForBrowser([{name:'Ana',company:'A'},{name:'Luis',company:'B'}],new Set([1,0]));
  assert.deepEqual(JSON.parse(JSON.stringify(result)),[{name:'Ana',company:'A'},{name:'Luis',company:'B'}]);
});
