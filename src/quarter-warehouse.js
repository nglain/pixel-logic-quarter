// Small authored Sokoban levels. State stores positions, not the board definition.
extraIds.push('sokoban');
titles.sokoban='Склад';
levels.sokoban=[
  {name:'Один ящик',board:['#######','#     #','# @$ .#','#     #','#######']},
  {name:'Освободи проход',board:['########','#      #','# .#   #','#  $$@ #','#  .   #','#      #','########']},
  {name:'Сначала дальняя цель',board:['########','#  .   #','#  .#  #','# $$ $ #','#   .@ #','#      #','########']}
];
const warehouseLayouts=[];
function warehouseLayout(level=state.progress.sokoban.level){if(warehouseLayouts[level])return warehouseLayouts[level];const board=levels.sokoban[level].board,w=board[0].length,h=board.length,walls=new Set(),goals=new Set(),boxes=[];let player=-1;board.forEach((row,y)=>{if(row.length!==w)throw Error('Invalid warehouse row');[...row].forEach((tile,x)=>{const p=y*w+x;if(tile==='#')walls.add(p);if(tile==='.'||tile==='*'||tile==='+')goals.add(p);if(tile==='$'||tile==='*')boxes.push(p);if(tile==='@'||tile==='+')player=p;});});return warehouseLayouts[level]={w,h,walls,goals,boxes:boxes.sort((a,b)=>a-b),player};}
function newWarehouse(level=0){const c=warehouseLayout(level);return {player:c.player,boxes:c.boxes.slice(),moves:0,pushes:0,solved:false,failed:false,message:''};}
function warehouseValid(a,level){const c=warehouseLayout(level),floor=p=>Number.isInteger(p)&&p>=0&&p<c.w*c.h&&!c.walls.has(p);return !!a&&floor(a.player)&&Array.isArray(a.boxes)&&a.boxes.length===c.goals.size&&new Set(a.boxes).size===a.boxes.length&&a.boxes.every(p=>floor(p)&&p!==a.player)&&Number.isInteger(a.moves)&&a.moves>=0&&Number.isInteger(a.pushes)&&a.pushes>=0;}
function warehouseNeighbors(p,c){const x=p%c.w,y=Math.floor(p/c.w);return [[0,-1],[1,0],[0,1],[-1,0]].flatMap(([dx,dy])=>{const nx=x+dx,ny=y+dy;return nx>=0&&nx<c.w&&ny>=0&&ny<c.h?[ny*c.w+nx]:[];});}
function warehouseReach(player,boxes,c){const blocked=new Set(boxes),paths=new Map([[player,[]]]),queue=[player];for(let k=0;k<queue.length;k++)for(const to of warehouseNeighbors(queue[k],c))if(!c.walls.has(to)&&!blocked.has(to)&&!paths.has(to)){paths.set(to,[...paths.get(queue[k]),to]);queue.push(to);}return paths;}
function warehouseCorner(p,c){if(c.goals.has(p))return false;const x=p%c.w,y=Math.floor(p/c.w),wall=(x,y)=>x<0||y<0||x>=c.w||y>=c.h||c.walls.has(y*c.w+x);return (wall(x-1,y)||wall(x+1,y))&&(wall(x,y-1)||wall(x,y+1));}
function warehouseSolution(s,c){
  if(s.boxes.every(p=>c.goals.has(p)))return [];
  const queue=[{player:s.player,boxes:s.boxes.slice(),path:[]}],seen=new Set();
  for(let head=0;head<queue.length;head++){
    const current=queue[head],reach=warehouseReach(current.player,current.boxes,c),key=current.boxes.join(',')+':'+Math.min(...reach.keys());
    if(seen.has(key))continue;seen.add(key);
    if(current.boxes.every(p=>c.goals.has(p)))return current.path;
    const blocked=new Set(current.boxes);
    for(const box of current.boxes)for(const stand of warehouseNeighbors(box,c)){
      if(!reach.has(stand))continue;const delta=box-stand,to=box+delta;
      if(!warehouseNeighbors(box,c).includes(to)||c.walls.has(to)||blocked.has(to)||warehouseCorner(to,c))continue;
      const boxes=current.boxes.map(p=>p===box?to:p).sort((a,b)=>a-b);
      queue.push({player:box,boxes,path:[...current.path,...reach.get(stand),box]});
    }
  }
  return null;
}
function warehouseHint(){const s=state.sokoban,c=warehouseLayout(),path=warehouseSolution(s,c);if(!path?.length)return {target:canUndo('sokoban')?'[data-undo]':'[data-extra-reset]',text:'Из этого положения ящики уже не довести до целей. Отмени ход ↶ или начни заново.'};return {target:`[data-cell="${path[0]}"]`,text:s.boxes.includes(path[0])?'Толкни подсвеченный ящик. Держи проходы свободными и не занимай ближнюю цель раньше дальней.':'Нажми подсвеченную клетку: подойди к ящику с нужной стороны.'};}
function warehouseArt(){const s=state.sokoban,c=warehouseLayout();return `<div class="sk-board" style="--columns:${c.w};--rows:${c.h}">${Array.from({length:c.w*c.h},(_,p)=>{if(c.walls.has(p))return '<span class="sk-wall" aria-hidden="true"></span>';const box=s.boxes.includes(p),goal=c.goals.has(p),player=s.player===p;return `<button data-cell="${p}" class="sk-cell ${goal?'goal':''} ${box?'box':''} ${player?'player':''}" aria-label="${player?'Игрок':box?'Ящик':goal?'Цель':'Пол'}, строка ${Math.floor(p/c.w)+1}, столбец ${p%c.w+1}" ${s.solved?'disabled':''}>${goal?'<span class="sk-goal" aria-hidden="true"></span>':''}${box?'<span class="sk-crate" aria-hidden="true"></span>':''}${player?'<span class="sk-person" aria-hidden="true"><i></i><b></b></span>':''}</button>`;}).join('')}</div>`;}
function warehouseClick(to){const s=state.sokoban,c=warehouseLayout();if(s.solved)return false;const blocked=new Set(s.boxes);if(blocked.has(to)){
  if(!warehouseNeighbors(s.player,c).includes(to)){s.message='Подойди к ящику сбоку.';return false;}
  const next=to+(to-s.player);if(!warehouseNeighbors(to,c).includes(next)||c.walls.has(next)||blocked.has(next)){s.message='Ящик упирается в препятствие.';return false;}
  recordUndo('sokoban');s.boxes=s.boxes.map(p=>p===to?next:p).sort((a,b)=>a-b);s.player=to;s.moves++;s.pushes++;s.message=warehouseCorner(next,c)?'Ящик в углу. Можно отменить ↶.':'';
}else{const path=warehouseReach(s.player,s.boxes,c).get(to);if(!path){s.message='Сюда нет свободного пути.';return false;}if(!path.length)return false;recordUndo('sokoban');s.player=to;s.moves+=path.length;s.message='';}
s.solved=s.boxes.every(p=>c.goals.has(p));return true;}
