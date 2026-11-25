// Executa os manipuladores reais em um DOM mínimo. As APIs de cópia são simuladas.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildPix} from '../pix.mjs';
class Element {
  events = {}; attrs = {}; children = []; value = ''; textContent = '';
  addEventListener(name,fn){this.events[name]=fn;}
  emit(name){return this.events[name]({preventDefault(){}});}
  setAttribute(k,v){this.attrs[k]=v;}
  removeAttribute(k){delete this.attrs[k];}
  replaceChildren(...els){this.children=els;}
  append(el){this.children.push(el);}
  focus(){}
  select(){}
  setSelectionRange(a,b){this.selection=[a,b];}
}
const dom = new Map();
function el(id){if (!dom.has(id)) dom.set(id,new Element());return dom.get(id);}
globalThis.document={getElementById:el,createElementNS:()=>new Element()};
let copied;
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async text=>{copied=text;}}}});
await import('../app.mjs');
const dir=mkdtempSync(join(tmpdir(),'pix-flow-'));
try {
  el('amount').value='1,234';
  el('entry').emit('submit');
  assert.equal(el('amount').attrs['aria-invalid'],'true');
  for (const [input,cents] of [['0,01',1],['24,50',2450],['1.234,56',123456],['9.999.999.999,99',999999999999]]) {
    el('amount').value=input;
    el('amount').emit('input');el('amount').emit('blur');el('entry').emit('submit');
    const svg=el('qr').children[0], path=svg.children[0];
    const source='<svg xmlns="http://www.w3.org/2000/svg" width="264" height="264" viewBox="'+svg.attrs.viewBox+'" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="white"/><path d="'+path.attrs.d+'"/></svg>';
    const file=join(dir,'qr.svg'), png=join(dir,'qr.png');
    writeFileSync(file,source);
    execFileSync('inkscape',[file,'--export-filename='+png],{stdio:['ignore','ignore','pipe']});
    const decoded=execFileSync('python3',[fileURLToPath(new URL('decode.py',import.meta.url)),png],{encoding:'utf8'}).trim();
    await el('copy').emit('click');
    assert.equal(decoded,buildPix(cents));assert.equal(copied,decoded);assert.equal(el('code').value,decoded);
    assert.match(el('status').textContent,/copiado/);
    el('reset').emit('click');assert.equal(el('code').value,'');assert.equal(el('amount').value,'');
    console.log(input+' OK: QR rasterizado e decodificado, cópia e reinício.');
  }
  el('amount').value='12';el('entry').emit('submit');
  navigator.clipboard.writeText=async()=>{throw Error('denied')};
  document.execCommand=()=>true;await el('copy').emit('click');assert.match(el('status').textContent,/copiado/);
  document.execCommand=()=>false;await el('copy').emit('click');assert.match(el('status').textContent,/selecionado/);
  assert.deepEqual(el('code').selection,[0,el('code').value.length]);
  console.log('OK: cópia alternativa e seleção manual.');
} finally {rmSync(dir,{recursive:true,force:true});}
