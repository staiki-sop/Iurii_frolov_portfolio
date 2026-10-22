const { chromium } = require('/Users/staikimac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({headless:true});
  const results = [];
  for (const width of [375,768,1280]) {
    const page = await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
    const requests = [], failures = [], errors = [];
    page.on('request', r => requests.push(r.url()));
    page.on('requestfailed', r => failures.push(r.url()));
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:8765/',{waitUntil:'networkidle'});
    await page.screenshot({path:path.join(__dirname,`portfolio-${width}.png`),fullPage:true});
    const layout = await page.evaluate(() => ({
      viewport:innerWidth, scrollWidth:document.documentElement.scrollWidth,
      links:[...document.querySelectorAll('a')].map(a=>a.getAttribute('href')),
      externalDependencies:document.querySelectorAll('script[src],link[rel="stylesheet"],iframe').length
    }));
    await page.emulateMedia({reducedMotion:'reduce'});
    const animations = await page.evaluate(()=>document.getAnimations().length);
    const externalRequests = requests.filter(url=>!url.startsWith('http://127.0.0.1:8765/'));
    const passed = layout.scrollWidth === width && externalRequests.length === 0 && failures.length === 0 && errors.length === 0 && animations === 0;
    results.push({width,passed,...layout,requests,externalRequests,failures,errors,reducedMotionAnimations:animations});
    await page.close();
  }
  await browser.close();
  const report={htmlBytes:fs.statSync(path.join(__dirname,'../index.html')).size, results};
  fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  if(results.some(r=>!r.passed)) process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
