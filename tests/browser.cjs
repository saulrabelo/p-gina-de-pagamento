const {chromium,devices} = require('playwright');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM || undefined,headless:true});
  const temp = fs.mkdtempSync(path.join(os.tmpdir(),'pix-test-'));
  try {
    for (const [profile,settings] of [['Android',devices['Pixel 7']],['iPhone (viewport)',devices['iPhone 13']],['Estreito',{viewport:{width:320,height:568}}],['Desktop',{viewport:{width:1280,height:800}}]]) {
      const ctx = await browser.newContext({...settings, permissions:['clipboard-read','clipboard-write']});
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror',err=>errors.push(err.message));
      page.on('response',r=>{if(r.status()>=400)errors.push(r.url())});
      await page.goto(process.env.TEST_URL || 'http://localhost:8000/pix-corrida/');
      await page.locator('#amount').fill('-2');
      await page.getByText('Gerar Pix',{exact:false}).first().click();
      assert.equal(await page.locator('#amount').getAttribute('aria-invalid'),'true');
      for (const raw of ['0,01','24,50','1.234,56','9.999.999.999,99']) {
        await page.locator('#amount').fill(raw);
        await page.locator('#entry button').click();
        const payload = await page.locator('#code').inputValue();
        const png = path.join(temp,'qr.png');
        await page.locator('#qr').screenshot({path:png});
        assert.equal(execFileSync(process.env.PYTHON || 'python3',[path.join(__dirname,'decode.py'),png],{encoding:'utf8'}).trim(),payload);
        await page.locator('#copy').click();
        await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Código copiado'));
        assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),payload);
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        await page.locator('#reset').click();
        assert.equal(await page.locator('#amount').inputValue(),'');
        assert.equal(await page.locator('#code').inputValue(),'');
      }
      await page.evaluate(()=>{
        Object.defineProperty(navigator,'clipboard',{value:undefined,configurable:true});
        document.execCommand=()=>false;
      });
      await page.locator('#amount').fill('12');
      await page.locator('#entry button').click();
      await page.locator('#copy').click();
      assert.match(await page.locator('#status').textContent(),/selecionado/);
      assert.ok(await page.locator('#code').evaluate(e=>e.selectionEnd-e.selectionStart===e.value.length));
      assert.deepEqual(errors,[]);
      console.log(profile+' OK: QR decodificado, cópia, reinício e seleção manual.');
      await ctx.close();
    }
  } finally {await browser.close();fs.rmSync(temp,{recursive:true,force:true})}
})().catch(err=>{console.error(err);process.exitCode=1});
