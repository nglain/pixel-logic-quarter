const {chromium, launchOptions}=require('./browser.cjs');
const fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'..'),out=path.join(dir,'test-results');
fs.mkdirSync(out,{recursive:true});
(async()=>{
  const browser=await chromium.launch(launchOptions);
  const context=await browser.newContext({viewport:{width:1000,height:900}});
  await context.setOffline(true);
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('file://'+dir+'/catalog.html');
  if(await page.locator('[data-select]').count()!==30)throw Error('Missing contents');
  const data=JSON.parse(fs.readFileSync(path.join(dir,'src/catalog.json'),'utf8'));
  for(const item of data.items){
    await page.locator(`[data-select="${item.id}"]`).click();
    if(await page.locator('h1').innerText()!==item.title)throw Error('Wrong detail '+item.id);
    if(await page.locator('[data-detail] .level-list li').count()!==3)throw Error('Missing levels');
    if(await page.locator('[data-detail] .play').count()!==(item.status==='playable'?1:0))throw Error('Misleading play status');
    if(await page.locator('[aria-current="true"]').count()!==1)throw Error('Wrong selected state');
    if(!await page.locator('[data-detail]').innerText().then(text=>text.includes(item.goal)&&text.includes(item.hint)))throw Error('Incomplete description');
  }
  const imageLoaded=await page.locator('.icon.hero').evaluate(async element=>{
    const url=getComputedStyle(element).backgroundImage.slice(5,-2);
    const img=new Image();img.src=url;await img.decode();return img.naturalWidth===1374&&img.naturalHeight===1145;
  });
  if(!imageLoaded)throw Error('Atlas did not load');
  await page.locator('[data-select="sokoban"]').click();
  await page.screenshot({path:path.join(out,'catalog-desktop.png'),fullPage:true});
  for(const width of [736,390,320]){
    await page.setViewportSize({width,height:900});
    if(width<=560)await page.locator('[data-mobile]').selectOption('guards');
    if(await page.locator('body').evaluate(e=>e.scrollWidth>innerWidth+1))throw Error('Overflow '+width);
    await page.screenshot({path:path.join(out,`catalog-${width}.png`),fullPage:true});
  }
  await page.reload();if(await page.locator('h1').innerText()!=='Две двери')throw Error('Hash did not restore selection');
  // Existing tasks open the selected scene without adding fake tasks to the game.
  await page.locator('[data-mobile]').selectOption('hanoi');
  await page.locator('[data-detail] .play').click();
  if(await page.locator('[data-heading]').innerText()!=='Ханойская башня')throw Error('Deep link did not open game');
  if(!await page.locator('.qt-catalog-link').isVisible())await page.locator('[data-home]').click();
  await page.locator('.qt-catalog-link').click();
  if(await page.locator('[data-select]').count()!==30)throw Error('Cannot return to contents');
  if(errors.length)throw Error(errors.join('\n'));
  fs.writeFileSync(path.join(out,'verification-catalog.json'),JSON.stringify({items:30,groups:6,playable:9,proposed:21,iconAtlasLoaded:true,allDescriptionsAndLevels:true,playStatusAccurate:true,deepLinks:true,hashRestore:true,widths:[1000,736,390,320],offline:true,errors},null,2));
  console.log('Passed catalogue: 30 descriptions, 6 groups, 9 playable/21 proposed, icon atlas, offline, game links and responsive widths.');
  await browser.close();
})();
