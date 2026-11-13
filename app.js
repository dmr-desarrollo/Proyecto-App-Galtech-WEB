/* El archivo CSV se procesa localmente. La plantilla TSPL necesita calibración. */
const $ = id => document.getElementById(id);
let rows = [], selected = new Set(), previewIndex = 0, printing = false;

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
  return `SIZE 60 mm, 40 mm\r\nGAP 2 mm, 0 mm\r\nDIRECTION 1\r\nCODEPAGE 1252\r\nCLS\r\nTEXT 24,60,"3",0,1,1,"${r.name}"\r\nTEXT 24,180,"3",0,1,1,"${r.company}"\r\nPRINT 1\r\n`;
}
function refresh() {
  const query = normalize($('search').value), list = $('list'); list.replaceChildren();
  rows.forEach((r,i) => { if (!normalize(r.name+' '+r.company).includes(query)) return; const label = document.createElement('label'); label.className='person'; const box=document.createElement('input'); box.type='checkbox'; box.checked=selected.has(i); box.addEventListener('change',()=>{box.checked ? selected.add(i) : selected.delete(i); refresh();}); const text=document.createElement('span'), name=document.createElement('strong'), company=document.createElement('small'); name.textContent=r.name; company.textContent=r.company; text.append(name,document.createElement('br'),company); label.append(box,text); list.append(label); });
  if (!list.children.length) { const p=document.createElement('p'); p.textContent=rows.length ? 'No hay coincidencias.' : 'Cargá un CSV para ver las personas aquí.'; list.append(p); }
  $('count').textContent=`${selected.size} seleccionadas`; $('clear').disabled=!selected.size;
  const chosen=[...selected].sort((a,b)=>a-b).map(i=>rows[i]);
  previewIndex=Math.min(previewIndex,Math.max(0,chosen.length-1));
  $('preview-name').textContent=chosen[previewIndex]?.name || 'Nombre Apellido'; $('preview-company').textContent=chosen[previewIndex]?.company || 'Empresa';
  $('preview-position').textContent=chosen.length ? `Etiqueta ${previewIndex+1} de ${chosen.length} · 60 × 40 mm` : 'Seleccioná una persona · 60 × 40 mm';
  $('previous').disabled=previewIndex===0; $('next').disabled=previewIndex>=chosen.length-1;
  try { chosen.forEach(commandFor); $('print').disabled=!chosen.length || printing; $('print-status').textContent=''; }
  catch(e) { $('print-status').textContent=e.message; $('print').disabled=true; }
}
$('file').addEventListener('change', async e => { const file=e.target.files[0]; if (!file) return; try { const bytes=await file.arrayBuffer(); let text; try { text=new TextDecoder('utf-8',{fatal:true}).decode(bytes); } catch { text=new TextDecoder('windows-1252').decode(bytes); } const result=loadCSV(text); rows=result.valid; selected=new Set(); $('search').value=''; $('search').disabled=!rows.length; $('all').disabled=!rows.length; $('status').textContent=`${rows.length} personas cargadas.`+(result.invalid.length ? ` Filas incompletas omitidas: ${result.invalid.join(', ')}.` : ''); refresh(); } catch(err) { $('status').textContent=err.message+' No se reemplazó la lista anterior.'; } e.target.value=''; });
$('search').addEventListener('input',refresh);
$('all').addEventListener('click',()=>{const q=normalize($('search').value);rows.forEach((r,i)=>{if(normalize(r.name+' '+r.company).includes(q))selected.add(i)});refresh()});
$('clear').addEventListener('click',()=>{selected.clear();refresh()});
$('previous').addEventListener('click',()=>{previewIndex--;refresh()});
$('next').addEventListener('click',()=>{previewIndex++;refresh()});
$('print').addEventListener('click',async()=>{
  const chosen=[...selected].sort((a,b)=>a-b).map(i=>rows[i]);
  if (!chosen.length || printing || !confirm(`Se enviarán ${chosen.length} etiquetas a la impresora. ¿Continuar?`)) return;
  if (location.protocol === 'file:') { $('print-status').textContent='Para imprimir, iniciá el servicio local y abrí http://127.0.0.1:4173.'; return; }
  printing=true; refresh(); $('print-status').textContent='Enviando a la impresora…';
  try { const response=await fetch('/api/print',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rows:chosen})}); const data=await response.json(); if(!response.ok) throw new Error(data.error || 'No se pudo enviar el trabajo.'); $('print-status').textContent=`Se enviaron ${chosen.length} etiquetas a la cola de Windows. Revisá la impresora.`; }
  catch(e) { $('print-status').textContent=`No se pudo confirmar el envío: ${e.message} Revisá la cola antes de reintentar.`; }
  finally { printing=false; $('print').disabled=false; }
});
