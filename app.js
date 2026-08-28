(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const map = $("#city-map");
  const ctx = map.getContext("2d");
  const base = { name:"台風「白波」", start:360, rain:480, flood:600, peak:0.92, budget:680 };
  const facilities = [
    {id:"hospital",name:"市民総合病院",icon:"✚",x:7.5,y:2.2,type:"医療",base:92,deps:["power","water"]},
    {id:"power",name:"中央変電所",icon:"ϟ",x:4.1,y:5.7,type:"電力",base:96,deps:["road"]},
    {id:"water",name:"西部浄水場",icon:"≈",x:1.8,y:3.1,type:"水道",base:100,deps:["power"]},
    {id:"fire",name:"港湾消防署",icon:"✦",x:9.2,y:5.4,type:"消防",base:94,deps:["road","power"]},
    {id:"logistics",name:"東物流センター",icon:"▣",x:10.1,y:2.8,type:"物流",base:89,deps:["road","power"]}
  ];
  let config = {...base};
  let state;
  const clamp = (value,min=0,max=100) => Math.max(min,Math.min(max,value));
  function clock() {
    const day = Math.floor(state.minutes / 1440) + 1;
    const current = state.minutes % 1440;
    return "DAY " + String(day).padStart(2,"0") + " · " + String(Math.floor(current / 60)).padStart(2,"0") + ":" + String(current % 60).padStart(2,"0");
  }
  function event(type,text,kind="") {
    state.feed.unshift({time:clock().split(" · ")[1],type,text,kind});
    state.feed = state.feed.slice(0,9);
  }
  function start(next=base) {
    config = {...base,...next};
    state = {minutes:config.start,running:false,speed:1,spent:0,safety:100,trust:72,rumor:7,flood:0,roads:100,teams:0,shelters:0,evacuated:0,priority:"power",comms:"verify",feed:[],selected:null,flags:{},health:Object.fromEntries(facilities.map(item=>[item.id,item.base]))};
    event("SYSTEM","シナリオを初期化しました。災害対策本部は待機中。","info");
    render();
  }
  function simulate() {
    const hour = state.minutes / 60;
    state.flood = hour < config.flood / 60 ? 0 : clamp((hour - config.flood / 60) / 8 * config.peak * 100);
    state.roads = clamp(100 - state.flood * .68 + (state.teams ? 5 : 0));
    state.health.power = clamp(96 - Math.max(0,state.flood - 37) * 1.25 + (state.priority === "power" ? state.teams * 1.2 : 0));
    state.health.water = clamp(100 - Math.max(0,60 - state.health.power) * .72 - state.flood * .12 + (state.priority === "water" ? state.teams * 1.2 : 0));
    state.health.hospital = clamp(92 - Math.max(0,60 - state.health.power) * .5 - Math.max(0,55 - state.health.water) * .35 + (state.priority === "medical" ? state.teams * 1.5 : 0));
    state.health.fire = clamp(94 - Math.max(0,55 - state.roads) * .7);
    state.health.logistics = clamp(89 - Math.max(0,60 - state.roads) * .85);
    state.safety = clamp(100 - state.flood * .38 - Math.max(0,55 - state.roads) * .3 + state.evacuated * .26 + state.shelters * 3);
    const pressure = Math.max(0,state.flood - 18) * .11;
    state.rumor = clamp(state.rumor + pressure + (state.comms === "silent" ? 1.1 : state.comms === "rapid" ? .28 : .52) - (state.comms === "verify" ? .52 : .2));
    state.trust = clamp(state.trust + (state.comms === "verify" ? .14 : state.comms === "silent" ? -.16 : .02) - state.rumor * .007);
  }
  function tick() {
    if (!state.running) return;
    state.minutes += 15 * state.speed;
    simulate();
    if (state.flood > 22 && !state.flags.flood) { state.flags.flood=true; event("FLOOD","港南・海岸地区で道路冠水を確認。救助隊の経路が制限されています。","danger"); }
    if (state.health.power < 64 && !state.flags.power) { state.flags.power=true; event("POWER","中央変電所の浸水リスクが上昇。計画停電の可能性があります。","danger"); }
    if (state.rumor > 35 && !state.flags.rumor) { state.flags.rumor=true; event("MEDIA","避難所の満員を示す未確認情報が急速に拡散しています。","danger"); }
    render();
  }
  function stateClass(value) { return value >= 70 ? "" : value >= 40 ? "warn" : "fail"; }
  function render() {
    const infrastructure = Math.round((state.health.power + state.health.water + state.health.hospital + state.roads) / 4);
    $("#game-time").textContent = clock();
    $("#simulation-status").textContent = state.running ? "シミュレーション中" : "待機中";
    $("#pause-button").textContent = state.running ? "Ⅱ 停止" : "▶ 開始";
    $("#headline").textContent = state.flood ? "台風「白波」通過中 — 浸水指数 " + Math.round(state.flood) + " / 100" : "台風「白波」接近中 — 予想到達まで " + String(Math.max(0,18-Math.floor((state.minutes%1440)/60))).padStart(2,"0") + ":00";
    $("#ticker-text").textContent = state.rumor > 35 ? "未確認情報が拡散中。公式発表方針を見直してください。" : state.flood > 25 ? "低地で冠水を確認。道路と電力設備を監視中です。" : "災害対策本部は気象情報を監視中です。";
    $("#alert-level").textContent = state.flood > 60 ? "緊急対応" : state.flood > 25 ? "警戒レベル 3" : "訓練シナリオ";
    $("#alert-strip").classList.toggle("crisis",state.flood > 25);
    const metricRows = [["住民安全",state.safety,Math.round(128400*(100-state.safety)/100)+" 人が支援を必要とする可能性"],["インフラ",infrastructure,"重要施設・道路網の総合稼働率"],["市民信頼",state.trust,"デマ拡散指数 "+Math.round(state.rumor)+" / 100"],["予算",100-state.spent/config.budget,Math.round(config.budget-state.spent)+" / "+config.budget+" 対策ポイント"]];
    $("#metric-list").innerHTML = metricRows.map(row => '<article class="metric"><div class="metric-top"><span>'+row[0]+'</span><strong>'+Math.round(row[1])+(row[0]==="予算" ? "" : "%")+'</strong></div><div class="bar"><i style="width:'+clamp(row[1])+'%;background:'+(row[1]<40?"var(--danger)":row[1]<70?"var(--amber)":"var(--accent)")+'"></i></div><small>'+row[2]+'</small></article>').join("");
    $("#facility-list").innerHTML = facilities.map(item => '<li data-facility="'+item.id+'"><span class="facility-name"><i class="facility-icon">'+item.icon+'</i>'+item.name+'</span><span class="facility-state '+stateClass(state.health[item.id])+'">'+Math.round(state.health[item.id])+'%</span></li>').join("");
    $$("[data-facility]").forEach(element => element.onclick=()=>{state.selected=facilities.find(item=>item.id===element.dataset.facility);render();});
    const systems=[["電力",state.health.power],["水道",state.health.water],["通信",98-state.flood*.22],["医療",state.health.hospital],["物流",state.health.logistics],["道路",state.roads]];
    $("#system-grid").innerHTML=systems.map(row=>'<article class="system"><p>'+row[0]+'</p><strong>'+Math.round(row[1])+'%</strong><small class="'+stateClass(row[1])+'">'+(row[1]>=70?"NORMAL":row[1]>=40?"WATCH":"CRITICAL")+'</small></article>').join("");
    const selected=state.selected;
    $("#district-card").innerHTML=selected ? '<p class="eyebrow">'+selected.type+' FACILITY</p><h3>'+selected.name+'</h3><p>この施設は <b>'+selected.deps.map(key=>({power:"電力",water:"水道",road:"道路"}[key])).join(" / ")+'</b> に依存しています。</p><dl><div><dt>稼働状態</dt><dd>'+Math.round(state.health[selected.id])+'%</dd></div><div><dt>到達経路</dt><dd>'+(state.roads>=60?"確保":"迂回中")+'</dd></div></dl>' : '<p class="eyebrow">CITY OVERVIEW</p><h3>新港市 全域</h3><p>地区または施設を選択すると、被害と依存関係を確認できます。</p><dl><div><dt>警戒レベル</dt><dd class="safe">WATCH</dd></div><div><dt>復旧優先</dt><dd>'+state.priority+'</dd></div></dl>';
    const commands=[["evac","避難勧告を発令","早期実施ほど安全を守るが、市民信頼を少し消費。",70],["shelter","避難所を開設","収容力を確保し、避難勧告の効果を高める。",95],["dispatch","救助隊を派遣","道路状態に応じて迂回経路を探索する。",80],["repair","緊急復旧班を出動","選択中の復旧優先度に追加人員を配備。",105]];
    $("#command-grid").innerHTML=commands.map(item=>'<button class="command" data-command="'+item[0]+'" '+(config.budget-state.spent<item[3]?"disabled":"")+'><b>'+item[1]+'</b><small>'+item[2]+'</small><em>コスト '+item[3]+'</em></button>').join("");
    $$("[data-command]").forEach(element=>element.onclick=()=>command(element.dataset.command));
    $("#event-feed").innerHTML=state.feed.map(item=>'<li class="'+item.kind+'"><time>'+item.time+'</time><b>'+item.type+'</b><span>'+item.text+'</span></li>').join("");
    $("#route-readout").textContent="道路網: "+Math.round(state.roads)+"% 通行可能 / 救助隊 "+state.teams+"隊";
    draw();
  }
  function command(id) {
    const cost={evac:70,shelter:95,dispatch:80,repair:105}[id];
    if (config.budget-state.spent<cost) return;
    state.spent+=cost;
    if(id==="evac"){state.evacuated=clamp(state.evacuated+22);state.trust-=state.flood<10?4:1;event("ACTION","高リスク区域に避難勧告を発令しました。","info");}
    if(id==="shelter"){state.shelters=Math.min(12,state.shelters+3);event("ACTION","避難所を3か所開設しました。","info");}
    if(id==="dispatch"){state.teams=Math.min(8,state.teams+2);event("ACTION",state.roads<55?"冠水道路を避ける迂回経路を計算中。":"救助隊が主要道路を通り現地へ向かっています。","info");}
    if(id==="repair"){state.teams=Math.min(8,state.teams+3);event("ACTION",state.priority+"を最優先に緊急復旧班を配備しました。","info");}
    simulate();render();
  }
  function draw() {
    const width=map.clientWidth,height=map.clientHeight;
    if(!width)return;
    const cellWidth=width/12,cellHeight=height/8;
    ctx.clearRect(0,0,width,height);ctx.fillStyle="#081c25";ctx.fillRect(0,0,width,height);
    for(let row=0;row<8;row++) for(let col=0;col<12;col++){const coastal=row>=6||col===0;const flood=Math.max(0,(state.flood*(coastal?1.28:.58)-18)/100)*.72;ctx.fillStyle="rgba("+Math.round(30-10*flood)+","+Math.round(78+65*flood)+","+Math.round(84+125*flood)+","+(.22+flood)+")";ctx.fillRect(col*cellWidth+2,row*cellHeight+2,cellWidth-4,cellHeight-4);ctx.strokeStyle="rgba(105,201,181,.13)";ctx.strokeRect(col*cellWidth+2,row*cellHeight+2,cellWidth-4,cellHeight-4);}
    ctx.strokeStyle=state.roads<55?"rgba(255,119,103,.63)":"rgba(106,208,191,.40)";
    for(let i=1;i<12;i+=2){ctx.beginPath();ctx.moveTo(i*cellWidth,0);ctx.lineTo(i*cellWidth,height);ctx.stroke();}
    for(let i=1;i<8;i+=2){ctx.beginPath();ctx.moveTo(0,i*cellHeight);ctx.lineTo(width,i*cellHeight);ctx.stroke();}
    facilities.forEach(item=>{const value=state.health[item.id],x=item.x*cellWidth,y=item.y*cellHeight;ctx.beginPath();ctx.arc(x,y,state.selected===item?14:10,0,Math.PI*2);ctx.fillStyle=value<40?"#ff7767":value<70?"#f7c76a":"#5cf2c2";ctx.fill();ctx.fillStyle="#071019";ctx.textAlign="center";ctx.textBaseline="middle";ctx.font="bold 12px sans-serif";ctx.fillText(item.icon,x,y+1);ctx.textAlign="left";ctx.textBaseline="alphabetic";});
  }
  function resize(){const rect=map.getBoundingClientRect(),ratio=devicePixelRatio||1;map.width=rect.width*ratio;map.height=rect.height*ratio;ctx.setTransform(ratio,0,0,ratio,0,0);draw();}
  $("#pause-button").onclick=()=>{state.running=!state.running;event("SYSTEM",state.running?"時間進行を開始しました。":"時間進行を停止しました。","info");render();};
  $$(".speed-button").forEach(button=>button.onclick=()=>{state.speed=+button.dataset.speed;$$(".speed-button").forEach(item=>item.classList.toggle("active",item===button));});
  $$("[data-priority]").forEach(button=>button.onclick=()=>{state.priority=button.dataset.priority;$$("[data-priority]").forEach(item=>item.classList.toggle("active",item===button));$("#priority-note").textContent="選択した都市機能を優先復旧します。";});
  $$("[data-comms]").forEach(button=>button.onclick=()=>{state.comms=button.dataset.comms;$$("[data-comms]").forEach(item=>item.classList.toggle("active",item===button));$("#comms-note").textContent=button.dataset.comms==="verify"?"信頼を守りつつ情報を届けます。":button.dataset.comms==="rapid"?"情報は速いが、誤報は信頼を損ねます。":"デマが拡散しやすくなります。";});
  map.onclick=event=>{const rect=map.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top,cellWidth=rect.width/12,cellHeight=rect.height/8;const hit=facilities.find(item=>Math.hypot(item.x*cellWidth-x,item.y*cellHeight-y)<25);if(hit){state.selected=hit;$("#map-readout").textContent="選択: "+hit.name;render();}};
  $("#save-button").onclick=()=>{localStorage.setItem("shinko-save",JSON.stringify({config,state}));$("#save-status").textContent="現在の状況を保存しました。";};
  $("#load-button").onclick=()=>{const saved=localStorage.getItem("shinko-save");if(!saved){$("#save-status").textContent="保存データがありません。";return;}const data=JSON.parse(saved);config=data.config;state=data.state;state.running=false;render();$("#save-status").textContent="保存データを読み込みました。";};
  $("#editor-button").onclick=()=>{$("#scenario-json").value=JSON.stringify(config,null,2);$("#editor-dialog").showModal();};
  $("#apply-scenario").onclick=()=>{try{const next=JSON.parse($("#scenario-json").value);if(!next.name||typeof next.flood!=="number")throw Error("name と flood が必要です");$("#editor-dialog").close();start(next);}catch(error){alert("JSONを適用できません: "+error.message);}};
  $("#finish-button").onclick=()=>{state.running=false;const infra=Math.round((state.health.power+state.health.water+state.health.hospital+state.roads)/4);const score=Math.round(state.safety*.4+infra*.28+state.trust*.18+(100-state.spent/config.budget)*.14);$("#report-content").innerHTML='<div class="dialog-header"><div><p class="eyebrow">AFTER ACTION REPORT</p><h2>'+config.name+' 終了報告</h2></div><button class="close-button">×</button></div><div class="report-score">'+score+'<small> / 100</small></div><p>'+(score>=75?"都市機能をおおむね維持し、被害を抑制しました。":score>=50?"復旧の基盤は確保しましたが、改善の余地があります。":"連鎖被害が都市機能に大きく影響しました。")+'</p><ul class="report-list"><li><span>住民安全</span><b>'+Math.round(state.safety)+'%</b></li><li><span>インフラ</span><b>'+infra+'%</b></li><li><span>市民信頼</span><b>'+Math.round(state.trust)+'%</b></li><li><span>残予算</span><b>'+Math.round(config.budget-state.spent)+'</b></li></ul>';$("#report-dialog").showModal();};
  window.addEventListener("resize",resize);start();resize();setInterval(tick,500);
})();