// Render original procedural map drawings as GitHub-friendly PNG icons.
// Does not alter the separate ImageGen atlas.
const fs=require('node:fs'),path=require('node:path');
const {chromium,launchOptions}=require('../tests/browser.cjs');
(async()=>{
  const root=path.resolve(__dirname,'..'),out=path.join(root,'assets/locations');fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch(launchOptions);
  try{
    const context=await browser.newContext({viewport:{width:1000,height:900}});await context.setOffline(true);
    const page=await context.newPage();await page.goto('file://'+path.join(root,'index.html'));
    const icons=await page.evaluate(()=>{
      const map=document.querySelector('[data-map-art]'),columns=map.width/192;
      return [...document.querySelectorAll('[data-enter]')].map((button,i)=>{
        const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
        ctx.drawImage(map,i%columns*192+39,Math.floor(i/columns)*120+20,114,74,0,17,96,62);
        return {id:button.dataset.enter,png:canvas.toDataURL('image/png').split(',')[1]};
      });
    });
    if(icons.length!==25)throw Error('Expected all 25 map locations');
    for(const {id,png} of icons)fs.writeFileSync(path.join(out,id+'.png'),Buffer.from(png,'base64'));
    console.log('Rendered 25 location icons from the procedural map.');
  }finally{await browser.close();}
})();
