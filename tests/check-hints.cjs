const {chromium, launchOptions}=require('./browser.cjs');const fs=require('fs');const dir=require('node:path').resolve(__dirname,'..');const out=require('node:path').join(dir,'test-results');fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch(launchOptions),ctx=await b.newContext({viewport:{width:800,height:900}});await ctx.setOffline(true);const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(7000);await p.goto('file://'+dir+'/index.html');const click=s=>p.locator(s).click();
for(const width of [736,390,320]){await p.setViewportSize({width,height:844});await p.waitForTimeout(50);if(await p.locator('[data-enter]:visible').count()!==25)throw Error('Not all locations visible');const boxes=await p.locator('[data-enter]').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)if(boxes[i].x<boxes[j].right&&boxes[j].x<boxes[i].right&&boxes[i].y<boxes[j].bottom&&boxes[j].y<boxes[i].bottom)throw Error('Map hitboxes overlap');if(boxes.some(r=>r.bottom>844))throw Error('Map exceeds screen');await p.screenshot({path:out+`/all-places-${width}.png`,fullPage:true});}
await p.setViewportSize({width:800,height:900});let passed=0;
const selectors={cafe:'[data-status]',safe:'[data-safe-status]',scales:'[data-scale-status]',river:'[data-river-status]',hanoi:'[data-extra-status]',jugs:'[data-extra-status]',bridge:'[data-extra-status]',lights:'[data-extra-status]'};
const isSolved=(id,text)=>id==='cafe'?text==='Верно!':id==='safe'?text==='Сейф открыт!':id==='scales'?text.startsWith('Верно:'):id==='river'?text==='Все на другом берегу!':text==='Решено!';
for(const id of Object.keys(selectors)){
await click(`[data-enter="${id}"]`);
for(let level=0;level<3;level++){
if(await p.locator('[data-hint-toggle]').count()!==1)throw Error('Duplicate hint control');
if(level>0&&(await p.locator('[data-guide]').isVisible()||await p.locator('.qt-teach').count()))throw Error('Automatic hint on later level');
await click('[data-hint-toggle]');let solved=false;
for(let step=0;step<450;step++){
if(isSolved(id,await p.locator(selectors[id]).innerText())){solved=true;break;}
const target=p.locator('[data-tutorial-target]');if(await target.count()!==1)throw Error('No single hint target '+id+' '+level+' '+await p.locator('[data-guide]').innerText());
if(await target.evaluate(e=>e.tagName==='SELECT')){const text=await p.locator('[data-guide]').innerText(),value=text.includes('— чай')?'0':text.includes('— кофе')?'1':'2';await target.selectOption(value);}else await target.click();
}
if(!solved)throw Error('Hints did not solve '+id+' '+level);passed++;
if(level===1){await click('[data-hint-toggle]');if(await p.locator('[data-guide]').isVisible())throw Error('Cannot hide hint');await click('[data-hint-toggle]');}
if(level<2)await click('[data-level-next]');
}
await click('[data-home]');}
if(await p.locator('.qt-place.done').count()!==8)throw Error('Expected all eight complete');await p.reload();if(await p.locator('.qt-place.done').count()!==8)throw Error('Progress restore');
if(errors.length)throw Error(errors.join());fs.writeFileSync(out+'/verification-hints.json',JSON.stringify({passed,all24SolvedUsingCommonHint:true,oneHintControl:true,all25OnScreen:true,noOverlappingMapTargets:true,laterLevelsOptIn:true,toggleOff:true,saveAndReload:true,widths:[736,390,320],offline:true,errors},null,2));console.log('Passed all 24 levels using the common hint, all 25 map locations on desktop/mobile, opt-in and hide, and saved completion.');await b.close();})();
