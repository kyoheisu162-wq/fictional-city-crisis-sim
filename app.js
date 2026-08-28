(() => {
  const mapCanvas = document.querySelector('#city-map');
  const mapContext = mapCanvas.getContext('2d');
  const state = { running:false, speed:1, minutes:360, selected:null, tick:0 };
  const facilities = [
    { id:'hospital', name:'市民総合病院', icon:'✚', x:7.5, y:2.2, type:'医療', status:'稼働', capacity:'救急受入 82%' },
    { id:'power', name:'中央変電所', icon:'ϟ', x:4.1, y:5.7, type:'電力', status:'稼働', capacity:'出力 91%' },
    { id:'water', name:'西部浄水場', icon:'≈', x:1.8, y:3.1, type:'水道', status:'稼働', capacity:'供給 100%' },
    { id:'fire', name:'港湾消防署', icon:'✦', x:9.2, y:5.4, type:'消防', status:'待機', capacity:'出動可能 6隊' },
    { id:'logistics', name:'東物流センター', icon:'▣', x:10.1, y:2.8, type:'物流', status:'稼働', capacity:'備蓄 72%' }
  ];
  const systems = [{name:'電力',value:'96%',note:'NORMAL'},{name:'水道',value:'100%',note:'NORMAL'},{name:'通信',value:'98%',note:'NORMAL'},{name:'医療',value:'82%',note:'STABLE'},{name:'物流',value:'89%',note:'WATCH'},{name:'道路',value:'100%',note:'CLEAR'}];
  const districts = ['西浜','中央','北新','港南','東丘','海岸','桜台','新川'];
  const feed = [
    ['06:00','SYSTEM','訓練シナリオを読み込みました。都市モデルを初期化しています。'],
    ['05:45','METEO','台風「白波」の進路予測を更新。新港市に接近中です。'],
    ['05:30','INFO','すべての重要インフラが通常運用を継続しています。']
  ];
  const timeText = () => `DAY 01 · ${String(Math.floor(state.minutes / 60)).padStart(2,'0')}:${String(state.minutes % 60).padStart(2,'0')}`;
  function log(category, message, type='info') { feed.unshift([timeText().replace('DAY 01 · ', ''), category, message, type]); renderFeed(); }
  function renderFeed() { document.querySelector('#event-feed').innerHTML = feed.slice(0,5).map(([time,category,message,type]) => `<li class="${type || ''}"><time>${time}</time><b>${category}</b><span>${message}</span></li>`).join(''); }
  function renderPanels() {
    document.querySelector('#facility-list').innerHTML = facilities.map(item => `<li><span class="facility-name"><i class="facility-icon">${item.icon}</i>${item.name}</span><span class="facility-state">${item.status}</span></li>`).join('');
    document.querySelector('#system-grid').innerHTML = systems.map(item => `<article class="system"><p>${item.name}</p><strong>${item.value}</strong><small>${item.note}</small></article>`).join('');
    renderFeed();
  }
  function updateDistrictCard(item) {
    const card = document.querySelector('#district-card');
    if (!item) return;
    card.innerHTML = `<p class="eyebrow">${item.type.toUpperCase()} FACILITY</p><h3>${item.name}</h3><p>${item.capacity}。台風接近に備え、現在は通常運用を継続しています。</p><dl><div><dt>稼働状態</dt><dd class="safe">${item.status}</dd></div><div><dt>座標</dt><dd>${item.x.toFixed(1)} / ${item.y.toFixed(1)}</dd></div></dl>`;
  }
  function resizeCanvas() { const rect = mapCanvas.getBoundingClientRect(); const ratio = devicePixelRatio || 1; mapCanvas.width = rect.width * ratio; mapCanvas.height = rect.height * ratio; mapContext.setTransform(ratio,0,0,ratio,0,0); drawMap(); }
  function drawMap() {
    const width = mapCanvas.clientWidth, height = mapCanvas.clientHeight; if (!width) return;
    const cellW = width / 12, cellH = height / 8;
    mapContext.clearRect(0,0,width,height);
    mapContext.fillStyle = '#081c25'; mapContext.fillRect(0,0,width,height);
    for(let row=0; row<8; row++) for(let col=0; col<12; col++) {
      const noise = ((col*7 + row*11)%5) * 0.008;
      mapContext.fillStyle = `rgba(36,87,88,${0.12 + noise})`; mapContext.fillRect(col*cellW+2,row*cellH+2,cellW-4,cellH-4);
      mapContext.strokeStyle = 'rgba(105,201,181,.13)'; mapContext.strokeRect(col*cellW+2,row*cellH+2,cellW-4,cellH-4);
    }
    mapContext.fillStyle = 'rgba(31,92,111,.40)'; mapContext.fillRect(0,height-cellH*1.1,width,cellH*1.1);
    mapContext.strokeStyle = 'rgba(106,208,191,.4)'; mapContext.lineWidth=1;
    for(let i=1;i<12;i+=2) { mapContext.beginPath(); mapContext.moveTo(i*cellW,0); mapContext.lineTo(i*cellW,height-cellH*.7); mapContext.stroke(); }
    for(let i=1;i<8;i+=2) { mapContext.beginPath(); mapContext.moveTo(0,i*cellH); mapContext.lineTo(width,i*cellH); mapContext.stroke(); }
    mapContext.strokeStyle = 'rgba(247,199,106,.8)'; mapContext.lineWidth=2; mapContext.setLineDash([5,5]); mapContext.beginPath(); mapContext.moveTo(0,cellH*1.5); mapContext.bezierCurveTo(width*.25,cellH*3,width*.72,cellH*.8,width,cellH*3); mapContext.stroke(); mapContext.setLineDash([]);
    districts.forEach((name,index) => { const col=(index*3+1)%11, row=(index*2+1)%6; mapContext.fillStyle='rgba(188,229,219,.45)'; mapContext.font='10px "Noto Sans JP"'; mapContext.fillText(name,col*cellW+8,row*cellH+18); });
    facilities.forEach(item => { const x=item.x*cellW,y=item.y*cellH, selected=state.selected?.id===item.id; mapContext.beginPath(); mapContext.arc(x,y,selected?13:9,0,Math.PI*2); mapContext.fillStyle=selected?'#f7c76a':'#5cf2c2'; mapContext.shadowBlur=selected?20:10; mapContext.shadowColor=mapContext.fillStyle; mapContext.fill(); mapContext.shadowBlur=0; mapContext.fillStyle='#071019'; mapContext.textAlign='center'; mapContext.textBaseline='middle'; mapContext.font='bold 12px sans-serif'; mapContext.fillText(item.icon,x,y+1); mapContext.textAlign='left'; mapContext.textBaseline='alphabetic'; });
  }
  function onMapClick(event) { const rect=mapCanvas.getBoundingClientRect(), cellW=rect.width/12, cellH=rect.height/8, x=event.clientX-rect.left, y=event.clientY-rect.top; const near=facilities.find(item => Math.hypot(item.x*cellW-x,item.y*cellH-y)<23); if (near) { state.selected=near; updateDistrictCard(near); document.querySelector('#map-readout').textContent=`選択: ${near.name}`; log('SELECT',`${near.name}の状況を確認しています。`); } else { state.selected=null; const col=Math.min(11,Math.floor(x/cellW)),row=Math.min(7,Math.floor(y/cellH)); document.querySelector('#map-readout').textContent=`区域 ${String.fromCharCode(65+row)}-${String(col+1).padStart(2,'0')}`; } drawMap(); }
  function tick() { if(!state.running) return; state.minutes += 5*state.speed; state.tick++; if(state.minutes >= 1440) state.minutes -= 1440; document.querySelector('#game-time').textContent=timeText(); document.querySelector('#arrival-time').textContent=`${String(Math.max(0,18 - Math.floor(state.minutes/60))).padStart(2,'0')}:00`; if(state.tick===12) { log('METEO','気圧低下を観測。港湾部での高波に注意してください。','info'); document.querySelector('#ticker-text').textContent='港湾部の注意報を更新しました'; } if(state.tick===30) { log('INFO','災害対策本部の設置準備を開始できます。','info'); } }
  document.querySelector('#pause-button').addEventListener('click', () => { state.running=!state.running; const button=document.querySelector('#pause-button'); button.textContent=state.running?'Ⅱ 停止':'▶ 開始'; button.setAttribute('aria-pressed',String(state.running)); document.querySelector('#simulation-status').textContent=state.running?'シミュレーション中':'監視中'; log('SYSTEM',state.running?'時間進行を開始しました。':'時間進行を停止しました。'); });
  document.querySelectorAll('.speed-button').forEach(button => button.addEventListener('click', () => { state.speed=Number(button.dataset.speed); document.querySelectorAll('.speed-button').forEach(item=>item.classList.toggle('active',item===button)); }));
  mapCanvas.addEventListener('click',onMapClick); window.addEventListener('resize',resizeCanvas); renderPanels(); resizeCanvas(); setInterval(tick,500);
})();