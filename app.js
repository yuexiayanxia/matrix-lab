'use strict';
const $ = id => document.getElementById(id);
const example = [['1','2','-1','3'],['2','4','1','9'],['-1','-2','2','-2']];
let mode = 'row', gridRows = 3, gridCols = 4, computation = null, selectedStep = 0, allSteps = false, dirty = false;
let toastTimer;
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function readGrid() { return Array.from({length:gridRows}, (_,r) => Array.from({length:gridCols}, (_,c) => $(`cell-${r}-${c}`).value)); }
function renderGrid(values) {
  gridRows=values.length; gridCols=values[0].length;
  $('rows').value=gridRows; $('cols').value=gridCols; $('size-badge').textContent=`${gridRows} × ${gridCols}`;
  $('matrix-input').style.gridTemplateColumns=`repeat(${gridCols}, minmax(44px, 1fr))`;
  $('matrix-input').innerHTML=values.map((row,r)=>row.map((v,c)=>`<input id="cell-${r}-${c}" aria-label="第 ${r+1} 行第 ${c+1} 列" value="${esc(v)}" autocomplete="off" spellcheck="false">`).join('')).join('');
}
function markDirty() { if(!computation)return;dirty=true;$('result-status').textContent='输入已更改，请重新计算';$('result-status').classList.add('stale');$('copy').disabled=true; }
function showError(message) { $('error').textContent=message;$('error').hidden=false; }
function hideError() { $('error').hidden=true;document.querySelectorAll('.invalid').forEach(e=>e.classList.remove('invalid')); }
function toast(message) { clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,2200); }
function numberHTML(f) { const s=String(f);if(!s.includes('/'))return esc(s);const [n,d]=s.split('/');return `<span class="fraction" aria-label="${esc(n)} 除以 ${esc(d)}"><span>${esc(n)}</span><span>${esc(d)}</span></span>`; }
function matrixHTML(matrix, {pivots=[],affected=[],stepMode=mode}={}) {
  return `<div class="matrix" role="table" aria-label="${matrix.length} 行 ${matrix[0].length} 列矩阵" style="grid-template-columns:repeat(${matrix[0].length},max-content)">${matrix.map((row,r)=>row.map((v,c)=>`<span role="cell" aria-label="第 ${r+1} 行第 ${c+1} 列：${esc(v)}" class="cell ${v.zero?'zero':''} ${pivots.some(p=>p[0]===r&&p[1]===c)?'pivot':''} ${affected.includes(stepMode==='column'?c:r)?'affected':''}">${numberHTML(v)}</span>`).join('')).join('')}</div>`;
}
function calculate(isExample=false) {
  hideError();
  const intendedRows=Number($('rows').value), intendedCols=Number($('cols').value);
  if(intendedRows!==gridRows||intendedCols!==gridCols){showError('行数或列数已更改，请先点击“更新矩阵”，再填写并计算。');return;}
  const values=readGrid();
  try {
    const parsed=values.map((row,r)=>row.map((v,c)=>{try{return MatrixMath.Fraction.parse(v);}catch(e){const input=$(`cell-${r}-${c}`);input.classList.add('invalid');input.focus();throw new Error(`第 ${r+1} 行第 ${c+1} 列：${e.message}`);}}));
    computation=MatrixMath.reduce(parsed,mode);selectedStep=0;dirty=false;
    $('result-status').textContent=isExample?'示例结果':'计算完成';$('result-status').classList.remove('stale');$('copy').disabled=false;
    const name=mode==='row'?'行最简形':'列最简形';
    $('result-content').innerHTML=`<div class="result-display"><span class="result-prefix">${mode==='row'?'R':'C'} =</span>${matrixHTML(computation.result,{pivots:computation.pivots})}</div>`;
    $('result-summary').innerHTML=`${name} <span aria-hidden="true">·</span> 秩 <b>r(A) = ${computation.rank}</b> <span aria-hidden="true">·</span> ${gridRows} × ${gridCols}`;
    $('step-count').textContent=`${computation.steps.length-1} 次初等变换`;
    $('progress').max=computation.steps.length-1;
    renderSteps();
  }catch(e){showError(e.message);}
}
function stepHTML(step,i){return `<article class="${allSteps?'all-step':''}"><div class="step-heading"><span class="step-badge">${i===0?'START':`STEP ${String(i).padStart(2,'0')}`}</span><span class="step-operation">${esc(step.operation)}</span></div><p class="step-explanation">${esc(step.explanation)}</p><div class="step-matrix-wrap">${matrixHTML(step.matrix,{affected:step.affected,stepMode:computation.mode})}</div></article>`;}
function renderSteps(){
  if(!computation)return;
  const steps=computation.steps;
  $('single-tab').classList.toggle('active',!allSteps);$('all-tab').classList.toggle('active',allSteps);
  $('single-tab').setAttribute('aria-pressed',String(!allSteps));$('all-tab').setAttribute('aria-pressed',String(allSteps));
  $('steps-content').innerHTML=allSteps?`<div class="all-steps">${steps.map(stepHTML).join('')}</div>`:stepHTML(steps[selectedStep],selectedStep);
  $('player').hidden=allSteps;$('progress').value=selectedStep;
  $('progress-label').textContent=`${selectedStep===0?'原始矩阵':`第 ${selectedStep} 步` } / 共 ${steps.length-1} 步${selectedStep===steps.length-1?' · 已到最简形':''}`;
  $('prev').disabled=selectedStep===0;$('next').disabled=selectedStep===steps.length-1;$('progress').disabled=steps.length===1;
}
function changeMode(value){
  mode=value;const isRow=mode==='row';
  $('row-mode').classList.toggle('active',isRow);$('column-mode').classList.toggle('active',!isRow);
  $('row-mode').setAttribute('aria-pressed',String(isRow));$('column-mode').setAttribute('aria-pressed',String(!isRow));
  $('mode-description').textContent=isRow?'将主元化为 1，主元所在列的其余元素化为 0。':'将主元化为 1，主元所在行的其余元素化为 0。';
  $('learning-text').textContent=isRow?'行简化梯形阵（行最简形）中：零行位于底部；每个非零行的首个非零元素为 1；主元位置逐行右移；每个主元所在列的其他元素均为 0。':'列简化梯形阵（列最简形）中：零列位于右侧；每个非零列的首个非零元素为 1；主元位置逐列下移；每个主元所在行的其他元素均为 0。其结果等于原矩阵转置后的行最简形再转置。';
  document.querySelector('.note-decoration').textContent=isRow?'RREF':'CREF';markDirty();
}
$('row-mode').onclick=()=>changeMode('row');$('column-mode').onclick=()=>changeMode('column');
$('matrix-input').addEventListener('input',e=>{e.target.classList.remove('invalid');markDirty();});
for(const id of ['rows','cols'])$(id).addEventListener('input',markDirty);
$('resize').onclick=()=>{hideError();const r=Number($('rows').value),c=Number($('cols').value);if(!Number.isInteger(r)||!Number.isInteger(c)||r<1||c<1||r>10||c>10){showError('行数和列数必须是 1 到 10 之间的整数。');return;}const old=readGrid();renderGrid(Array.from({length:r},(_,i)=>Array.from({length:c},(_,j)=>old[i]?.[j]??'0')));markDirty();toast(`矩阵已更新为 ${r} × ${c}`);};
$('calculate').onclick=()=>calculate();
$('example').onclick=()=>{renderGrid(example);calculate(true);toast('已载入 3 × 4 示例');};
$('clear').onclick=()=>{renderGrid(Array.from({length:gridRows},()=>Array(gridCols).fill('')));hideError();markDirty();$('cell-0-0').focus();};
$('paste-toggle').onclick=()=>{const hidden=!$('paste-panel').hidden;$('paste-panel').hidden=hidden;$('paste-toggle').setAttribute('aria-expanded',String(!hidden));if(!hidden)$('paste-input').focus();};
$('paste-apply').onclick=()=>{
  hideError();const text=$('paste-input').value.trim();if(!text){showError('请先粘贴矩阵。');return;}
  const data=text.split(/\r?\n|;/).filter(s=>s.trim()).map(line=>line.trim().split(/[\s,，]+/));
  if(!data.length||!data[0].length||data.some(r=>r.length!==data[0].length)){showError('每行的元素数量必须一致。');return;}
  if(data.length>10||data[0].length>10){showError('矩阵最多支持 10 行、10 列。');return;}
  try{data.forEach((row,r)=>row.forEach((v,c)=>{try{MatrixMath.Fraction.parse(v);}catch(e){throw new Error(`粘贴内容第 ${r+1} 行第 ${c+1} 列：${e.message}`);}}));renderGrid(data);markDirty();$('paste-panel').hidden=true;$('paste-toggle').setAttribute('aria-expanded','false');toast('已填入矩阵，点击“开始简化”查看结果');}catch(e){showError(e.message);}
};
$('prev').onclick=()=>{if(selectedStep>0){selectedStep--;renderSteps();}};$('next').onclick=()=>{if(selectedStep<computation.steps.length-1){selectedStep++;renderSteps();}};
$('progress').oninput=e=>{selectedStep=Number(e.target.value);renderSteps();};
$('single-tab').onclick=()=>{allSteps=false;renderSteps();};$('all-tab').onclick=()=>{allSteps=true;renderSteps();};
$('copy').onclick=async()=>{if(!computation||dirty)return;const text=computation.result.map(row=>row.join('\t')).join('\n');try{await navigator.clipboard.writeText(text);toast('已复制矩阵，可粘贴到表格或笔记');}catch{const box=document.createElement('textarea');box.value=text;box.style.position='fixed';box.style.opacity='0';document.body.append(box);box.select();const success=document.execCommand('copy');box.remove();toast(success?'已复制矩阵':'复制受限，请手动选中结果复制');}};
$('help-button').onclick=()=>$('help').showModal();$('close-help').onclick=()=>$('help').close();$('help-done').onclick=()=>$('help').close();
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();calculate();}});
renderGrid(example);calculate(true);
