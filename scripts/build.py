from pathlib import Path

root = Path(__file__).resolve().parents[1]
folder = root / 'src'
cafe = (folder / 'pixel-cafe.html').read_text()
start = cafe.index('<script>')
markup = cafe[:start]
script = cafe[start:]
script = script.replace("const root=document.getElementById('lying-machines'),q=s=>root.querySelector(s);", "const root=document.getElementById('lying-machines'),q=s=>root.querySelector(s),bridge=root.closest('#logic-quarter')._townApi;")
script = script.replace('window.openai?.setWidgetState?.(snapshot)', 'bridge.saveCafe(snapshot)')
script = script.replace('const initial=window.openai?.widgetState?.privateContent?.lyingMachines;', 'const initial=bridge.readCafe();')
script = script.replace("draw();\nwindow.addEventListener", "root._setCafeLevel=(mode,budget,reset=false)=>{if(reset||state.mode!==mode||state.budget!==budget){state=fresh(mode,budget,state);draw();save();}else draw();};\nroot._setCafeLevel(...bridge.cafeConfig(),false);\nwindow.addEventListener")
# New collection keeps the accepted café renderer and simulation as their owner.
source = (folder / 'quarter-source.html').read_text().replace('@@EXTRACODE@@', (folder / 'quarter-extra.js').read_text()).replace('@@WAREHOUSECSS@@', (folder / 'warehouse-style.css').read_text()).replace('@@WAREHOUSE@@', (folder / 'quarter-warehouse.js').read_text()).replace('@@ADVENTURECSS@@', (folder / 'adventures-style.css').read_text()).replace('@@ADVENTURES@@', (folder / 'quarter-adventures.js').read_text().replace('@@ADVENTUREDATA@@', (folder / 'adventures.json').read_text())).replace('@@LIFECSS@@', (folder / 'life-style.css').read_text()).replace('@@LIFECODE@@', (folder / 'quarter-life.js').read_text()).replace('@@HINTCODE@@', (folder / 'quarter-hints.js').read_text()).replace('@@CAFE@@', markup).replace('@@CAFESCRIPT@@', script)
# Keep both owners in one ordered bootstrap for inline hosts that extract scripts.
source = source.replace('</script>\n<script>', '\n')
shell = (folder / 'quarter-shell.html').read_text()
(root / 'index.html').write_text(shell.replace('<!-- GAME -->', source))
print('Built index.html from src/.')
