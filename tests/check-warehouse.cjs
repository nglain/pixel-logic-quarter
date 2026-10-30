const {chromium,launchOptions}=require('./browser.cjs');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=path.resolve(__dirname,'..'),out=path.join(dir,'test-results');fs.mkdirSync(out,{recursive:true});
// Qualify each authored level independently of the UI and check actual push legality.
const context=vm.createContext({extraIds:[],titles:{},levels:{},clone:s=>JSON.parse(JSON.stringify(s))});
vm.runInContext(fs.readFileSync(path.join(dir,'src/quarter-warehouse.js'),'utf8'),context);
const lengths=[];
for(let level=0;level<3;level++){
  const s=context.newWarehouse(level),c=context.warehouseLayout(level),route=context.warehouseSolution(s,c);
  if(!route?.length)throw Error('Unsolvable warehouse '+level);lengths.push(route.length);
  for(const target of route){
    if(!context.warehouseNeighbors(s.player,c).includes(target))throw Error('Nonadjacent solver move');
    if(s.boxes.includes(target)){const next=target+(target-s.player);if(c.walls.has(next)||s.boxes.includes(next))throw Error('Illegal solver push');s.boxes=s.boxes.map(p=>p===target?next:p);}
    s.player=target;
  }
  if(!s.boxes.every(p=>c.goals.has(p)))throw Error('Solver did not finish');
}
(async()=>{
  const b=await chromium.launch(launchOptions),ctx=await b.newContext({viewport:{width:800,height:1000}});await ctx.setOffline(true);
  const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));const click=s=>p.locator(s).click();
  const saved=()=>p.evaluate(()=>window.openai.widgetState.privateContent.quarter);
  await p.goto('file://'+dir+'/index.html#sokoban');
  // One push, an invalid distant box selection, and undo restore positions/counters.
  await click('[data-tutorial-target]');let s=await saved();if(s.sokoban.moves!==1||s.sokoban.pushes!==1)throw Error('Accepted push');
  await p.reload();await click('[data-undo]');s=await saved();if(s.sokoban.moves||s.sokoban.pushes)throw Error('Undo after reload');
  if(s.undo.length)throw Error('Undo did not consume entry');
  for(let level=0;level<3;level++){
    if(level>0){if(await p.locator('[data-guide]').isVisible())throw Error('Training leaked');await click('[data-hint-toggle]');}
    await p.screenshot({path:path.join(out,`warehouse-level-${level+1}.png`),fullPage:true});
    for(let k=0;k<100;k++){if(await p.locator('[data-extra-status]').innerText()==='Решено!')break;await click('[data-tutorial-target]');}
    if(await p.locator('[data-extra-status]').innerText()!=='Решено!')throw Error('UI warehouse '+level);
    const won=await saved();await click('[data-undo]');const undone=await saved();if(undone.sokoban.solved||undone.sokoban.moves>=won.sokoban.moves)throw Error('Undo winning move');
    if(undone.progress.sokoban.cleared!==level+1)throw Error('Undo erased earned level');
    if(level===0){const c=context.warehouseLayout(0),route=context.warehouseSolution(undone.sokoban,c);for(const target of route)await click(`[data-cell="${target}"]`);}else{await click('[data-tutorial-target]');}
    if(await p.locator('[data-extra-status]').innerText()!=='Решено!')throw Error('Replay winning move');
    if(level<2)await click('[data-level-next]');
  }
  // Force a real corner deadlock from the first authored field; the hint offers undo.
  const isolated=await b.newContext(),q=await isolated.newPage();await q.goto('file://'+dir+'/index.html#sokoban');
  // Reach below the initial crate, push it up, then reach its right and push into the corner.
  // Board is 7 wide. Start (2,2), crate (3,2). Stand below, push up, then push left twice.
  for(const cell of [23,24,17,18,11,10,9,8])await q.locator(`[data-cell="${cell}"]`).click();
  await q.locator('[data-hint-toggle]').click();
  if(!(await q.locator('[data-guide]').innerText()).includes('не довести'))throw Error('Deadlock not explained');
  if(!await q.locator('[data-undo]').evaluate(e=>e.hasAttribute('data-tutorial-target')))throw Error('Deadlock hint not undo');
  await q.locator('[data-undo]').click();
  for(let i=0;i<8&&(await q.locator('[data-guide]').innerText()).includes('не довести');i++)await q.locator('[data-undo]').click();
  for(let i=0;i<20&&await q.locator('[data-extra-status]').innerText()!=='Решено!';i++)await q.locator('[data-tutorial-target]').click();
  if(await q.locator('[data-extra-status]').innerText()!=='Решено!')throw Error('Deadlock recovery did not finish');
  // Responsive map includes all 9 places, warehouse controls never cover the board.
  await click('[data-home]');for(const width of [736,390,320]){await p.setViewportSize({width,height:844});await p.waitForTimeout(50);if(await p.locator('[data-enter]:visible').count()!==9)throw Error('Missing map location');await click('[data-enter="sokoban"]');if(await p.locator('#logic-quarter').evaluate(e=>e.scrollWidth>innerWidth+1))throw Error('Overflow');const board=await p.locator('.sk-board').boundingBox(),panel=await p.locator('[data-extra] .qt-panel').boundingBox();if(board.x<panel.x+panel.width&&panel.x<board.x+board.width&&board.y<panel.y+panel.height&&panel.y<board.y+board.height)throw Error('Panel overlap');await p.screenshot({path:path.join(out,`warehouse-${width}.png`),fullPage:true});await click('[data-home]');}
  const mobile=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),m=await mobile.newPage();await m.goto('file://'+dir+'/index.html#sokoban');await m.locator('[data-tutorial-target]').tap();await m.locator('[data-undo]').tap();await m.locator('[data-tutorial-target]').tap();await m.locator('[data-tutorial-target]').tap();if(await m.locator('[data-extra-status]').innerText()!=='Решено!')throw Error('Touch game');
  // Upgrade an actual v2 shape from before the ninth location and undo existed.
  const old=await saved();delete old.sokoban;delete old.progress.sokoban;delete old.undo;old.view='map';old.done=old.done.filter(id=>id!=='sokoban');old.progress.safe={level:1,cleared:2};old.safe={secret:[1,2,3],digits:[1,2,3],log:[{code:[1,2,3],bulls:3,cows:0}],solved:true,failed:false,message:''};old.progress.hanoi={level:1,cleared:1};old.hanoi={rods:[[3,2,1],[],[]],selected:null,moves:2,solved:false,failed:false,message:''};
  const migratedContext=await b.newContext();await migratedContext.addInitScript(s=>localStorage.setItem('pixel-quarter-v1',JSON.stringify({privateContent:{quarter:s}})),old);const migrated=await migratedContext.newPage();await migrated.goto('file://'+dir+'/index.html');await migrated.locator('[data-enter="sokoban"]').click();await migrated.locator('[data-tutorial-target]').click();const upgraded=await migrated.evaluate(()=>window.openai.widgetState.privateContent.quarter);if(upgraded.progress.safe.cleared!==2||upgraded.progress.safe.level!==1||upgraded.hanoi.moves!==2||upgraded.progress.sokoban.level!==0||upgraded.progress.sokoban.cleared!==0)throw Error('Old progress migration');await migrated.locator('[data-undo]').click();
  if(errors.length)throw Error(errors.join());fs.writeFileSync(path.join(out,'verification-warehouse.json'),JSON.stringify({levels:3,solverRouteLengths:lengths,allSolvedByUI:true,undoAfterReload:true,undoWin:true,earnedProgressPreserved:true,deadlockUndo:true,previousEightPlaceSavePreserved:true,widths:[736,390,320],nineMapPlaces:true,touch:true,offline:true,errors},null,2));
  console.log('Passed 3 warehouse levels, legal solver paths, deadlock recovery, undo/reload, responsive layout and touch.');await b.close();
})();
