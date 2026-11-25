import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseAmount, crc16, buildPix, decimal} from '../pix.mjs';

function fields(payload) {
  const result = {};
  for (let i=0; i<payload.length;) {
    const id = payload.slice(i,i+2);
    const len = Number(payload.slice(i+2,i+4));
    assert.ok(Number.isInteger(len) && len>0);
    const value = payload.slice(i+4,i+4+len);
    assert.equal(value.length,len);
    assert.equal(result[id],undefined);
    result[id] = value;
    i += 4+len;
  }
  return result;
}
test('CRC-16/CCITT-FALSE e vetor de referência da aplicação', () => {
  assert.equal(crc16('123456789'),'29B1');
  assert.equal(buildPix(2450),'00020126420014br.gov.bcb.pix0120saulrabelo@gmail.com520400005303986540524.505802BR5917Saul Rabelo Filho6006VIAMAO62070503***6304A35B');
});
for (const [raw,cents] of [['0,01',1],['12',1200],['24,5',2450],['R$ 1.234,56',123456],['0002,03',203],['9.999.999.999,99',999999999999]]) {
  test('valor e campos do BR Code para '+raw, () => {
    assert.equal(parseAmount(raw),cents);
    const payload = buildPix(cents), tags = fields(payload);
    assert.deepEqual(fields(tags['26']),{'00':'br.gov.bcb.pix','01':'saulrabelo@gmail.com'});
    assert.deepEqual(fields(tags['62']),{'05':'***'});
    for (const [id,val] of Object.entries({'00':'01','52':'0000','53':'986','54':decimal(cents),'58':'BR','59':'Saul Rabelo Filho','60':'VIAMAO','63':crc16(payload.slice(0,-4))}))
      assert.equal(tags[id],val);
  });
}
for (const raw of ['', '0','0,00','-1','+1','1.2','1,234','NaN','Infinity','1e3','12abc','1.23,45','10.000.000.000,00','10000000000','R$']) {
  test('entrada inválida '+JSON.stringify(raw), () => assert.throws(() => parseAmount(raw)));
}
test('recusa centavos inválidos na API', () => {
  for (const value of [0,-1,1.2,NaN,Infinity,1e12,'10']) assert.throws(()=>buildPix(value));
});
