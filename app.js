/* El archivo CSV se procesa localmente. La plantilla TSPL necesita calibración. */
const $ = id => document.getElementById(id);
let rows = [], selected = new Set(), previewIndex = 0, printing = false, printerName = '';
const bridgeBase = 'http://127.0.0.1:4173';
function bridgeFetch(path, options={}) { return fetch(bridgeBase+path,{...options,targetAddressSpace:'loopback'}); }

function parseCSV(text) {
  text = text.replace(/^\uFEFF/, '');
  const first = text.split(/\r?\n/, 1)[0];
  const separator = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ';' : ',';
  const result = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) { if (c === '"' && text[i+1] === '"') { field += '"'; i++; } else if (c === '"') quoted = false; else field += c; }
    else if (c === '"' && field === '') quoted = true;
    else if (c === separator) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i+1] === '\n') i++; row.push(field); result.push(row); row = []; field = ''; }
    else field += c;
  }
  if (quoted) throw new Error('Hay comillas sin cerrar en el CSV.');
  if (field || row.length) { row.push(field); result.push(row); }
  return result.filter(r => r.some(x => x.trim()));
}
function normalize(s) { return s.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
function matchesFilters(row, person, company) { return normalize(row.name).includes(normalize(person)) && normalize(row.company).includes(normalize(company)); }
function loadCSV(text) {
  const data = parseCSV(text); if (!data.length) throw new Error('El archivo está vacío.');
  const headings = data[0].map(normalize), indexes = ['nombre','apellido','empresa'].map(x => headings.indexOf(x));
  if (indexes.some(i => i < 0)) throw new Error('El CSV necesita encabezados Nombre, Apellido y Empresa.');
  const valid = [], invalid = [];
  data.slice(1).forEach((r,i) => { const values = indexes.map(j => (r[j] || '').trim().replace(/\s+/g,' ')); if (values.some(v => !v)) invalid.push(i+2); else valid.push({name: values[0]+' '+values[1], company: values[2]}); });
  return {valid, invalid};
}
function commandFor(r) {
  for (const value of [r.name,r.company]) {
    if (value.length > 35) throw new Error('Hay un texto de más de 35 caracteres; acortalo antes de generar la prueba.');
    if (/[^\x20-\x7e\xa0-\xff]/.test(value) || /["\\]/.test(value)) throw new Error('Hay caracteres que la plantilla de prueba no admite. Revisá comillas, símbolos o caracteres especiales.');
  }
  return `SIZE 60 mm, 40 mm\r\nGAP 2 mm, 0 mm\r\nDIRECTION 1\r\nCODEPAGE 1252\r\nCLS\r\nTEXT 240,60,"0",0,16,16,2,"${r.name}"\r\nTEXT 240,180,"0",0,16,16,2,"${r.company}"\r\nPRINT 1\r\n`;
}
function replaceCsvRows(csvRows) {
  const chosen = new Set([...selected].map(i => rows[i]));
  const manualRows = rows.filter(row => row.source === 'manual');
  rows = [...csvRows.map(row => ({...row, source:'csv'})), ...manualRows];
  selected = new Set(rows.map((row,i) => chosen.has(row) ? i : -1).filter(i => i >= 0));
  previewIndex = 0;
  $('search').disabled = !rows.length; $('company-search').disabled = !rows.length; $('all').disabled = !rows.length;
}
function refresh() {
  const person = $('search').value, companyQuery = $('company-search').value, list = $('list'); list.replaceChildren();
  rows.forEach((r,i) => { if (!matchesFilters(r,person,companyQuery)) return; const label = document.createElement('label'); label.className='person'; const box=document.createElement('input'); box.type='checkbox'; box.checked=selected.has(i); box.addEventListener('change',()=>{box.checked ? selected.add(i) : selected.delete(i); refresh();}); const text=document.createElement('span'), name=document.createElement('strong'), company=document.createElement('small'); name.textContent=r.name; company.textContent=r.company; text.append(name,document.createElement('br'),company); label.append(box,text); list.append(label); });
  if (!list.children.length) { const p=document.createElement('p'); p.textContent=rows.length ? 'No hay coincidencias.' : 'Cargá un CSV o agregá una persona manualmente.'; list.append(p); }
  $('count').textContent=`${selected.size} seleccionadas`; $('clear').disabled=!selected.size;
  const chosen=[...selected].sort((a,b)=>a-b).map(i=>rows[i]);
  previewIndex=Math.min(previewIndex,Math.max(0,chosen.length-1));
  $('preview-name').textContent=chosen[previewIndex]?.name || 'Nombre Apellido'; $('preview-company').textContent=chosen[previewIndex]?.company || 'Empresa';
  $('preview-position').textContent=chosen.length ? `Etiqueta ${previewIndex+1} de ${chosen.length} · 60 × 40 mm` : 'Seleccioná una persona · 60 × 40 mm';
  $('previous').disabled=previewIndex===0; $('next').disabled=previewIndex>=chosen.length-1;
  try { chosen.forEach(commandFor); $('print').disabled=!chosen.length || printing || !printerName; $('print-status').textContent=''; }
  catch(e) { $('print-status').textContent=e.message; $('print').disabled=true; }
}
$('file').addEventListener('change', async e => { const file=e.target.files[0]; if (!file) return; try { const bytes=await file.arrayBuffer(); let text; try { text=new TextDecoder('utf-8',{fatal:true}).decode(bytes); } catch { text=new TextDecoder('windows-1252').decode(bytes); } const result=loadCSV(text); replaceCsvRows(result.valid); $('search').value=''; $('company-search').value=''; $('remove-file').disabled=false; $('status').textContent=`${file.name}: ${result.valid.length} personas cargadas.`+(result.invalid.length ? ` Filas incompletas omitidas: ${result.invalid.join(', ')}.` : ''); refresh(); } catch(err) { $('status').textContent=err.message+' No se reemplazó la lista anterior.'; } e.target.value=''; });
$('remove-file').addEventListener('click',()=>{if(!confirm('¿Quitar las personas cargadas desde el CSV? Las personas agregadas manualmente se conservarán.')) return; replaceCsvRows([]); for(const id of ['search','company-search']) $(id).value=''; $('file').value='';$('remove-file').disabled=true;$('status').textContent='Todavía no cargaste ningún archivo.';refresh();});
$('manual-form').addEventListener('submit',e=>{
  e.preventDefault();
  const fields=['manual-name','manual-lastname','manual-company'].map(id=>$(id).value.trim().replace(/\s+/g,' '));
  if(fields.some(value=>!value)) { $('manual-status').textContent='Completá nombre, apellido y empresa.'; return; }
  const row={name:fields[0]+' '+fields[1],company:fields[2],source:'manual'};
  try { commandFor(row); } catch(err) { $('manual-status').textContent=err.message; return; }
  rows.push(row); selected.add(rows.length-1);
  for(const id of ['manual-name','manual-lastname','manual-company','search','company-search']) $(id).value='';
  $('search').disabled=false; $('company-search').disabled=false; $('all').disabled=false;
  previewIndex=selected.size-1; $('manual-status').textContent=`${row.name} se agregó y quedó seleccionada para imprimir.`;
  refresh(); $('manual-name').focus();
});
$('search').addEventListener('input',refresh);
$('company-search').addEventListener('input',refresh);
$('all').addEventListener('click',()=>{const person=$('search').value,company=$('company-search').value;rows.forEach((r,i)=>{if(matchesFilters(r,person,company))selected.add(i)});refresh()});
$('clear').addEventListener('click',()=>{selected.clear();refresh()});
$('previous').addEventListener('click',()=>{previewIndex--;refresh()});
$('next').addEventListener('click',()=>{previewIndex++;refresh()});
async function findPrinters() {
  const select=$('printer'); const previous=printerName; printerName=''; $('print').disabled=true; $('refresh-printers').disabled=true;
  $('printer-status').textContent='Buscando impresoras…'; select.hidden=true; $('printer-label').hidden=true;
  try {
    if(location.protocol==='file:') throw Error('Abrí la aplicación desde http://127.0.0.1:4173 para conectar la impresora.');
    const response=await bridgeFetch('/api/printers',{cache:'no-store'}); const data=await response.json(); if(!response.ok) throw Error(data.error || 'No se pudo buscar la impresora.');
    const printers=data.printers; select.replaceChildren();
    if(!printers.length) { $('printer-status').textContent='Windows no informó impresoras instaladas. Revisá la conexión y el controlador.'; }
    else {
      const placeholder=document.createElement('option'); placeholder.value=''; placeholder.textContent='Elegí una impresora'; select.append(placeholder);
      printers.forEach(p=>{const option=document.createElement('option');option.value=p.name;option.textContent=`${p.name} (${p.connection}${p.address ? ' · '+p.address : ''})`;select.append(option)});
      if(printers.some(p=>p.name===previous)) printerName=previous;
      else if(printers.length===1 && /tsc/i.test(printers[0].name)) printerName=printers[0].name;
      select.value=printerName; select.hidden=false; $('printer-label').hidden=false;
      $('printer-status').textContent=printerName ? 'Impresora seleccionada. Comprobá que esté encendida y tenga etiquetas.' : 'Elegí una impresora de etiquetas compatible con TSPL.';
    }
  } catch(e) { $('printer-status').textContent=`No se pudo obtener la lista de impresoras: ${e.message}. Revisá el puente local y los permisos del navegador.`; }
  finally { $('refresh-printers').disabled=false; refresh(); }
}
$('refresh-printers').addEventListener('click',findPrinters);
$('scan-network').addEventListener('click',async()=>{const button=$('scan-network'),list=$('scan-results');button.disabled=true;list.replaceChildren();$('scan-status').textContent='Buscando dispositivos en la red local…';try{const response=await bridgeFetch('/api/scan',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});const data=await response.json();if(!response.ok)throw Error(data.error||'No se pudo buscar.');$('scan-status').textContent=data.addresses.length?'Dispositivos con puerto 9100 abierto; verificá que sean impresoras TSC antes de instalarlos en Windows.':'No se encontraron dispositivos con el puerto 9100 abierto en las redes examinadas.';data.addresses.forEach(ip=>{const li=document.createElement('li');li.textContent=ip;list.append(li)});}catch(e){$('scan-status').textContent=`No se pudo buscar: ${e.message}`;}finally{button.disabled=false;}});
$('printer').addEventListener('change',()=>{printerName=$('printer').value;$('printer-status').textContent=printerName?'Impresora seleccionada. Comprobá que esté encendida y tenga etiquetas.':'Elegí una impresora.';refresh()});
document.addEventListener('DOMContentLoaded',()=>{if(location.origin==='http://127.0.0.1:4173')findPrinters();else $('printer-status').textContent='Para conectar la impresora, iniciá el servicio local y pulsá Buscar impresora instalada.';});
$('print').addEventListener('click',async()=>{
  const chosen=[...selected].sort((a,b)=>a-b).map(i=>rows[i]);
  if (!chosen.length || !printerName || printing || !confirm(`Se enviarán ${chosen.length} etiquetas a ${printerName}. ¿Continuar?`)) return;
  if (location.protocol === 'file:') { $('print-status').textContent='Para imprimir, iniciá el servicio local y abrí http://127.0.0.1:4173.'; return; }
  printing=true; refresh(); $('print-status').textContent='Enviando a la impresora…';
  try { const response=await bridgeFetch('/api/print',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rows:chosen,printer:printerName})}); const data=await response.json(); if(!response.ok) throw new Error(data.error || 'No se pudo enviar el trabajo.'); $('print-status').textContent=`Se enviaron ${chosen.length} etiquetas a la cola de Windows. Revisá la impresora.`; }
  catch(e) { $('print-status').textContent=`No se pudo confirmar el envío: ${e.message} Revisá la cola antes de reintentar.`; }
  finally { printing=false; $('print').disabled=!selected.size || !printerName; }
});
