const el = {
  cepeaSlider: document.getElementById('cepeaSlider'), cepeaInput: document.getElementById('cepeaInput'),
  cmeSlider: document.getElementById('cmeSlider'), cmeInput: document.getElementById('cmeInput'),
  processSlider: document.getElementById('processSlider'), processInput: document.getElementById('processInput'),
  fobSlider: document.getElementById('fobSlider'), fobInput: document.getElementById('fobInput'),
  freightSlider: document.getElementById('freightSlider'), freightInput: document.getElementById('freightInput'),
  insuranceSlider: document.getElementById('insuranceSlider'), insuranceInput: document.getElementById('insuranceInput'),
  otherSlider: document.getElementById('otherSlider'), otherInput: document.getElementById('otherInput'),
  portSlider: document.getElementById('portSlider'), portInput: document.getElementById('portInput'),
  exchangeSlider: document.getElementById('exchangeSlider'), exchangeInput: document.getElementById('exchangeInput'),
  tariffSelect: document.getElementById('tariffSelect'),
  lastUpdate: document.getElementById('last-update'),
  fobWeighted: document.getElementById('fobWeighted'),
  cifPrice: document.getElementById('cifPrice'),
  totalUsd: document.getElementById('totalUsd'),
  totalCny: document.getElementById('totalCny'),
  diffPct: document.getElementById('diffPct'),
  suggestion: document.getElementById('suggestion'),
  chartCanvas: document.getElementById('costChart'),
  costDetails: document.getElementById('costDetails'),
};
const CHINA_MARKET = 5213; // 人民币市场均价

function sync(slider, input){
  if (!slider || !input) return;
  slider.addEventListener('input', () => {input.value = slider.value; render();});
  input.addEventListener('input', () => {slider.value = input.value; render();});
}
function initSync(){
  [
    ['cepeaSlider','cepeaInput'],
    ['cmeSlider','cmeInput'],
    ['processSlider','processInput'],
    ['fobSlider','fobInput'],
    ['freightSlider','freightInput'],
    ['insuranceSlider','insuranceInput'],
    ['otherSlider','otherInput'],
    ['portSlider','portInput'],
    ['exchangeSlider','exchangeInput'],
  ].forEach(([sid,iid]) => { sync(document.getElementById(sid), document.getElementById(iid)); });
  if(el.tariffSelect) el.tariffSelect.addEventListener('change', render);
}
function weightedFOB(cepea, cme, process, baseFob){
  // CME转换为美元/吨：美分/磅 × 22.0462
  const cmeUsdTon = Number(cme) * 22.0462;
  // 权重可调，示例合计为 0.3*CEPEA + 0.2*基准FOB + 0.2*CME + 0.3*加工
  return Number(cepea)*0.3*1000 + Number(cmeUsdTon)*0.2 + Number(process)*0.3 + Number(baseFob)*0.2;
}
function calc() {
  const cepea = parseFloat(el.cepeaInput.value);
  const cme = parseFloat(el.cmeInput.value);
  const process = parseFloat(el.processInput.value);
  const baseFob = parseFloat(el.fobInput.value);
  const freight = parseFloat(el.freightInput.value);
  const insurance = parseFloat(el.insuranceInput.value);
  const other = parseFloat(el.otherInput.value);
  const port = parseFloat(el.portInput.value);
  const ex = parseFloat(el.exchangeInput.value);
  const tariffSel = parseFloat(el.tariffSelect.value);

  const fobW = weightedFOB(cepea, cme, process, baseFob);
  const cif = fobW + freight + insurance + other;
  const tariff = cif * (tariffSel/100);
  const preVat = cif + tariff + port;
  const vat = preVat * 0.09;
  const totalUsd = preVat + vat;
  const totalCny = totalUsd * ex;
  const diffPct = ((totalCny - CHINA_MARKET) / CHINA_MARKET) * 100;

  return { cepea, cme, process, baseFob, freight, insurance, other, port, ex, tariffSel, fobW, cif, tariff, preVat, vat, totalUsd, totalCny, diffPct };
}
function renderPanels(m){
  el.fobWeighted.textContent = `$${m.fobW.toFixed(2)}`;
  el.cifPrice.textContent = `$${m.cif.toFixed(2)}`;
  el.totalUsd.textContent = `$${m.totalUsd.toFixed(2)}`;
  el.totalCny.textContent = `¥${Math.round(m.totalCny)}`;
  el.diffPct.textContent = `${m.diffPct.toFixed(1)}%`;
  if(m.diffPct <= 5){
    el.suggestion.textContent = `可以进口，价差在合理范围内 ( + ${m.diffPct.toFixed(1)}% )`;
    el.suggestion.style.background = '#dff4eb';
    el.suggestion.style.color = '#0e7b63';
  }else if(m.diffPct <= 10){
    el.suggestion.textContent = `谨慎进口，价差较大 ( + ${m.diffPct.toFixed(1)}% )`;
    el.suggestion.style.background = '#fff4e6';
    el.suggestion.style.color = '#a35a00';
  }else{
    el.suggestion.textContent = `暂缓进口，价差过大 ( + ${m.diffPct.toFixed(1)}% )`;
    el.suggestion.style.background = '#ffe9e6';
    el.suggestion.style.color = '#bf2e2e';
  }
  // 明细
  el.costDetails.innerHTML = `
    <div class="cost-row"><span>加权FOB</span> <span>$${m.fobW.toFixed(2)}</span></div>
    <div class="cost-row"><span>运费</span> <span>$${m.freight.toFixed(2)}</span></div>
    <div class="cost-row"><span>保险费</span> <span>$${m.insurance.toFixed(2)}</span></div>
    <div class="cost-row"><span>其他费用</span> <span>$${m.other.toFixed(2)}</span></div>
    <div class="cost-row"><span>关税</span> <span>$${m.tariff.toFixed(2)} (${m.tariffSel}%)</span></div>
    <div class="cost-row"><span>港口杂费</span> <span>$${m.port.toFixed(2)}</span></div>
    <div class="cost-row"><span>增值税(9%)</span> <span>$${m.vat.toFixed(2)}</span></div>
    <div class="cost-row final-cost"><span>最终到岸成本</span> <span>$${m.totalUsd.toFixed(2)} / ¥${Math.round(m.totalCny)}</span></div>
  `;
  // 图表
  renderChart(m);
}
let chart;
function renderChart(m){
  const ctx = el.chartCanvas.getContext('2d');
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['FOB','运费','保险','其他','关税','港口费','增值税'],
      datasets: [{
        label: '分项 (美元/吨)',
        data: [m.fobW, m.freight, m.insurance, m.other, m.tariff, m.port, m.vat],
        backgroundColor: ['#3296e0','#a7e0c9','#ffe2a0','#f7b99f','#c2c8e6','#fdd8b2','#bfecd1']
      }]
    },
    options: {
      plugins: {legend:{display:false}},
      scales: {y:{beginAtZero:true}}
    }
  });
}
function render(){
  const m = calc();
  renderPanels(m);
}
initSync();
render();
// 最新数据日期（如无API可设为当天）
el.lastUpdate.textContent = `最后更新: ${new Date().toLocaleDateString()}`;

