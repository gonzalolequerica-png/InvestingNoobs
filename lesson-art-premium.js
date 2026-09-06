/* Minimal, topic-specific SVG artwork for the InvestingNoobs learning series. */
(()=>{
  const art=window.INVESTINGNOOBS_ART||{},details=window.INVESTINGNOOBS_DETAILS||{};
  const id=new URLSearchParams(location.search).get('id')||'',item=art[id],detail=details[id];
  const article=document.getElementById('article'),heading=article&&article.querySelector('h1');
  const figure=article&&article.querySelector('.lesson-art'),svg=figure&&figure.querySelector('svg');
  if(!item||!detail||!heading||!figure||!svg||figure.dataset.enhanced==='true')return;

  const NS='http://www.w3.org/2000/svg',accent=item.accent||'#eabd64';
  const muted='#a9bad0',bright='#f4f7fb';
  const clean=v=>String(v).replace(/\s+/g,' ').trim();
  const esc=v=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const make=(tag,attrs={},content)=>{const el=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([key,value])=>el.setAttribute(key,String(value)));if(content!==undefined)el.textContent=content;return el};
  const stroke=`fill="none" stroke="${accent}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"`;
  const soft=`fill="none" stroke="${muted}" stroke-opacity=".55" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"`;
  const thin=`fill="none" stroke="${muted}" stroke-opacity=".35" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"`;
  const solid=`fill="${accent}" fill-opacity=".18" stroke="${accent}" stroke-width="6" stroke-linejoin="round"`;
  const dot=`fill="${accent}"`;

  const motifs={
    crypto:`<circle cx="600" cy="190" r="82" ${solid}/><circle cx="600" cy="190" r="58" ${thin}/><path d="M600 137v106M562 166h76M562 214h76" ${stroke}/><path d="M579 151l42 78" ${soft}/>`,
    stock:`<path d="M434 274h350M465 274V142h56v132M558 274V103h56v171M651 274V160h56v114" ${soft}/><path d="M454 121l70-43 62 27 91-66 91 19" ${stroke}/><path d="M739 39h29v29" ${stroke}/>`,
    metal:`<ellipse cx="600" cy="205" rx="130" ry="42" ${solid}/><path d="M470 205v35c0 24 58 44 130 44s130-20 130-44v-35" ${soft}/><ellipse cx="600" cy="205" rx="130" ry="42" ${stroke}/><path d="M548 205h104M575 185v40M625 185v40" ${soft}/>`,
    compare:`<circle cx="520" cy="190" r="78" ${solid}/><circle cx="680" cy="190" r="78" ${solid}/><path d="M598 190h-36M638 190h-36" ${stroke}/><path d="M520 160v60M492 190h56M680 160v60M652 190h56" ${soft}/>`,
    market:`<path d="M420 274h360M460 274V155M535 274V105M610 274V175M685 274V82" ${soft}/><path d="M440 230l66-35 54 21 58-78 52 45 89-76" ${stroke}/><circle cx="759" cy="107" r="9" ${dot}/>`,
    volatility:`<path d="M420 206h360" ${thin}/><path d="M434 206l34-72 35 119 42-179 43 155 44-92 44 69 46-123 43 88" ${stroke}/><circle cx="721" cy="83" r="10" ${dot}/>`,
    inflation:`<circle cx="525" cy="247" r="38" ${solid}/><circle cx="600" cy="247" r="38" ${solid}/><circle cx="675" cy="247" r="38" ${solid}/><path d="M600 213V112M600 112l-30 30M600 112l30 30" ${stroke}/><path d="M487 247h76M562 247h76M637 247h76" ${soft}/>`,
    fees:`<circle cx="560" cy="194" r="74" ${solid}/><path d="M528 170h64M528 194h64M528 218h40" ${stroke}/><path d="M664 144v100M624 194h80" ${soft}/><circle cx="664" cy="194" r="7" ${dot}/>`,
    exchange:`<path d="M430 151h255l-35-35M770 229H515l35 35" ${stroke}/><path d="M450 229h46M704 151h46" ${soft}/><circle cx="478" cy="151" r="8" ${dot}/><circle cx="722" cy="229" r="8" ${dot}/>`,
    wallet:`<path d="M468 142h228c17 0 30 13 30 30v105H468c-22 0-40-18-40-40v-55c0-22 18-40 40-40z" ${solid}/><path d="M468 142h180c20 0 36 16 36 36v20h-83c-25 0-45 20-45 45s20 45 45 45h83" ${stroke}/><circle cx="611" cy="243" r="8" ${dot}/>`,
    stable:`<circle cx="600" cy="190" r="86" ${solid}/><path d="M548 166h104M548 190h104M548 214h104" ${stroke}/><path d="M560 258h80" ${soft}/>`,
    plan:`<rect x="500" y="102" width="200" height="176" rx="18" ${solid}/><path d="M542 145h112M542 190h112M542 235h62" ${soft}/><path d="M530 145l7 7 15-18M530 190l7 7 15-18M530 235l7 7 15-18" ${stroke}/>`,
    risk:`<path d="M600 91l118 45v72c0 71-49 111-118 141-69-30-118-70-118-141v-72z" ${solid}/><path d="M600 134v132M548 205h104" ${stroke}/><path d="M565 174l35-35 35 35 35-35" ${soft}/>`,
    diversify:`<circle cx="600" cy="110" r="28" ${solid}/><circle cx="490" cy="260" r="28" ${solid}/><circle cx="600" cy="260" r="28" ${solid}/><circle cx="710" cy="260" r="28" ${solid}/><path d="M600 138v56M600 194l-110 38M600 194v38M600 194l110 38" ${stroke}/>`,
    chart:`<path d="M430 280h350M465 280V112" ${soft}/><path d="M490 245l54-41 48 20 55-83 47 51 54-27" ${stroke}/><circle cx="693" cy="165" r="10" ${dot}/><path d="M490 245h36M591 224h36M694 165h36" ${thin}/>`,
    prop:`<path d="M600 274V108M600 108l82 31-82 31" ${stroke}/><path d="M510 274h180" ${soft}/><path d="M535 236h130" ${thin}/><circle cx="600" cy="108" r="13" ${dot}/>`,
    leverage:`<path d="M430 245h345" ${soft}/><path d="M480 245l210-116" ${stroke}/><path d="M600 208l-34 66h68z" ${solid}/><circle cx="480" cy="245" r="13" ${dot}/><rect x="680" y="102" width="70" height="70" rx="12" ${solid}/>`,
    drawdown:`<path d="M430 120h340M430 260h340" ${thin}/><path d="M446 146l74 54 56-28 55 87 55-54 70 36" ${stroke}/><path d="M690 241l-7-27M690 241l24-14" ${stroke}/><circle cx="631" cy="259" r="9" ${dot}/>`,
    derivative:`<rect x="494" y="104" width="212" height="172" rx="16" ${solid}/><path d="M540 151h120M540 193h120M540 235h72" ${soft}/><path d="M723 155l42 42-42 42M765 197H684" ${stroke}/>`,
    security:`<path d="M600 91l110 42v76c0 57-42 94-110 126-68-32-110-69-110-126v-76z" ${solid}/><rect x="552" y="180" width="96" height="78" rx="12" ${stroke}/><path d="M570 180v-23c0-36 60-36 60 0v23" ${stroke}/><circle cx="600" cy="218" r="8" ${dot}/>`,
    psychology:`<circle cx="600" cy="190" r="92" ${solid}/><path d="M552 177c18-45 80-62 112-19 21 28 9 51-12 64-20 12-26 24-26 47M600 235v1" ${stroke}/><path d="M548 264h104" ${soft}/>`,
    defi:`<circle cx="500" cy="190" r="32" ${solid}/><circle cx="700" cy="120" r="32" ${solid}/><circle cx="700" cy="260" r="32" ${solid}/><path d="M530 181l140-51M530 199l140 51" ${stroke}/><path d="M600 190h110" ${thin}/>`,
    ethereum:`<path d="M600 86l78 113-78 50-78-50z" ${solid}/><path d="M600 86v163M522 199l78 50 78-50" ${stroke}/><path d="M548 215l52 34 52-34" ${soft}/>`,
    blockchain:`<rect x="474" y="151" width="112" height="80" rx="12" ${solid}/><rect x="614" y="151" width="112" height="80" rx="12" ${solid}/><path d="M586 191h28" ${stroke}/><path d="M510 132h40M650 132h40M510 250h40M650 250h40" ${soft}/>`,
    staking:`<path d="M600 89l94 54-94 54-94-54zM600 143l94 54-94 54-94-54zM600 197l94 54-94 54-94-54z" ${solid}/><path d="M600 89v54M600 143v54M600 197v54" ${stroke}/>`,
    token:`<path d="M600 88l92 53v106l-92 53-92-53V141z" ${solid}/><path d="M508 141l92 53 92-53M600 194v106" ${stroke}/><circle cx="600" cy="194" r="25" ${thin}/>`,
    smart:`<rect x="515" y="108" width="170" height="168" rx="18" ${solid}/><path d="M550 151h100M550 194h100M550 237h55" ${soft}/><path d="M542 151l8 8 15-18M542 194l8 8 15-18" ${stroke}/><circle cx="704" cy="248" r="30" ${solid}/><path d="M704 230v36M686 248h36" ${stroke}/>`,
    dao:`<circle cx="600" cy="109" r="30" ${solid}/><circle cx="492" cy="245" r="30" ${solid}/><circle cx="708" cy="245" r="30" ${solid}/><path d="M582 132l-70 86M618 132l70 86M522 245h156" ${stroke}/><circle cx="600" cy="190" r="22" ${thin}/>`,
    bridge:`<path d="M430 255h120M650 255h120M550 255v-80h100v80" ${stroke}/><rect x="430" y="105" width="120" height="64" rx="12" ${solid}/><rect x="650" y="105" width="120" height="64" rx="12" ${solid}/><path d="M550 137h100" ${soft}/>`,
    liquidity:`<path d="M600 94c0 0-65 80-65 116a65 65 0 00130 0c0-36-65-116-65-116z" ${solid}/><path d="M570 222c15 24 42 31 67 22" ${stroke}/><circle cx="560" cy="143" r="8" ${dot}/>`,
    yield:`<path d="M600 278V173M600 206l-48-45M600 224l53-53" ${stroke}/><path d="M600 175c-2-50 39-80 81-71-2 42-31 72-81 71zM600 206c2-44-34-70-76-62 3 39 30 62 76 62z" ${solid}/><path d="M520 278h160" ${soft}/>`,
    bull:`<path d="M430 275h340" ${soft}/><path d="M450 250l75-37 54 20 58-76 55 26 82-102" ${stroke}/><path d="M717 81h57v57" ${stroke}/><circle cx="774" cy="81" r="9" ${dot}/>`,
    dca:`<rect x="492" y="111" width="216" height="164" rx="18" ${solid}/><path d="M492 158h216M546 91v43M654 91v43" ${stroke}/><circle cx="548" cy="201" r="11" ${dot}/><circle cx="600" cy="201" r="11" ${dot}/><circle cx="652" cy="201" r="11" ${dot}/><path d="M548 237h104" ${soft}/>`,
    order:`<path d="M455 150h290M455 196h190M455 242h245" ${soft}/><circle cx="690" cy="196" r="36" ${solid}/><path d="M675 196h30M690 181v30" ${stroke}/><path d="M715 221l35 35" ${stroke}/>`,
    fundamental:`<rect x="488" y="108" width="170" height="174" rx="16" ${solid}/><path d="M530 151h86M530 193h86M530 235h55" ${soft}/><circle cx="682" cy="214" r="52" ${stroke}/><path d="M720 252l43 43" ${stroke}/>`,
    rebalance:`<path d="M600 101v159M496 143h208M520 143l-52 112h104zM680 143l-52 112h104z" ${stroke}/><circle cx="600" cy="143" r="12" ${dot}/><path d="M450 278h300" ${soft}/>`,
    tax:`<rect x="510" y="98" width="180" height="188" rx="15" ${solid}/><path d="M550 142h100M550 184h100M550 226h62" ${soft}/><path d="M532 142l7 7 13-17M532 184l7 7 13-17" ${stroke}/><path d="M642 254h52" ${stroke}/>`,
    compareDefault:`<circle cx="600" cy="190" r="86" ${solid}/><path d="M558 190h84M600 148v84" ${stroke}/><circle cx="600" cy="190" r="20" ${thin}/>`
  };

  const key=motifs[item.kind]?item.kind:(['chart','market','order','fundamental'].includes(item.kind)?'chart':['risk','drawdown','security','wallet'].includes(item.kind)?'security':['defi','dao','bridge','liquidity','yield'].includes(item.kind)?'defi':['plan','dca','rebalance','tax','fees'].includes(item.kind)?'plan':'compareDefault');
  const hexToRgb=h=>{h=String(h).replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const v=parseInt(h,16)||0xeabd64;return [v>>16&255,v>>8&255,v&255]};
  const shade=(rgb,f)=>'rgb('+rgb.map(c=>Math.max(0,Math.min(255,Math.round(c*f)))).join(',')+')';
  const gemSVG=(cx,cy,r,hex,seed)=>{
    const rgb=hexToRgb(hex),nf=9,outer=[],inner=[];
    for(let i=0;i<nf;i++){const a=(i/nf)*Math.PI*2;const rr=r*(0.9+0.1*Math.sin(i*1.7+seed));outer.push([cx+rr*Math.cos(a),cy+rr*Math.sin(a)])}
    const innerR=r*0.4;
    for(let i=0;i<nf;i++){const a=((i+0.5)/nf)*Math.PI*2;inner.push([cx+innerR*Math.cos(a),cy+innerR*Math.sin(a)])}
    let s='<g opacity="0.5">';
    for(let i=0;i<nf;i++){const p2=inner[i],p3=inner[(i+1)%nf],b=0.5+0.45*Math.abs(Math.sin(i*2.3+seed));s+='<polygon points="'+cx+','+cy+' '+p2[0]+','+p2[1]+' '+p3[0]+','+p3[1]+'" fill="'+shade(rgb,b)+'"/>'}
    for(let i=0;i<nf;i++){const p1=inner[i],p2=outer[i],p3=outer[(i+1)%nf],p4=inner[(i+1)%nf],b1=0.7+0.5*Math.abs(Math.sin(i*1.9+seed+1)),b2=0.45+0.4*Math.abs(Math.cos(i*2.1+seed));s+='<polygon points="'+p1[0]+','+p1[1]+' '+p2[0]+','+p2[1]+' '+p3[0]+','+p3[1]+'" fill="'+shade(rgb,b1)+'"/>';s+='<polygon points="'+p1[0]+','+p1[1]+' '+p3[0]+','+p3[1]+' '+p4[0]+','+p4[1]+'" fill="'+shade(rgb,b2)+'"/>'}
    s+='</g><g opacity="0.55" stroke="'+shade(rgb,1.6)+'" stroke-width="1">';
    for(let i=0;i<nf;i++){s+='<line x1="'+cx+'" y1="'+cy+'" x2="'+inner[i][0]+'" y2="'+inner[i][1]+'"/><line x1="'+inner[i][0]+'" y1="'+inner[i][1]+'" x2="'+outer[i][0]+'" y2="'+outer[i][1]+'"/><line x1="'+outer[i][0]+'" y1="'+outer[i][1]+'" x2="'+outer[(i+1)%nf][0]+'" y2="'+outer[(i+1)%nf][1]+'"/>'}
    s+='</g><ellipse cx="'+(cx-r*0.32)+'" cy="'+(cy-r*0.35)+'" rx="'+(r*0.14)+'" ry="'+(r*0.42)+'" fill="#ffffff" opacity="0.16" transform="rotate(-35 '+(cx-r*0.32)+' '+(cy-r*0.35)+')"/>';
    return s;
  };
  const gem=gemSVG(600,190,172,accent,Number(id.slice(1))||1);
  const number=String(id.slice(1)).padStart(2,'0');
  const title=heading.textContent.trim();

  figure.dataset.enhanced='true';figure.dataset.lesson=id;figure.dataset.kind=item.kind||'guide';
  svg.setAttribute('viewBox','0 0 1200 360');svg.setAttribute('role','img');svg.setAttribute('aria-labelledby','art-title-'+id+' art-desc-'+id);svg.innerHTML='';
  const defs=make('defs');
  const bg=make('linearGradient',{id:'art-bg-'+id,x1:'0',y1:'0',x2:'1',y2:'1'});bg.appendChild(make('stop',{offset:'0','stop-color':'#172235'}));bg.appendChild(make('stop',{offset:'1','stop-color':'#0b111c'}));
  const glow=make('radialGradient',{id:'art-glow-'+id,cx:'.5',cy:'.5',r:'.5'});glow.appendChild(make('stop',{offset:'0','stop-color':accent,'stop-opacity':'.18'}));glow.appendChild(make('stop',{offset:'1','stop-color':accent,'stop-opacity':'0'}));
  defs.append(bg,glow);svg.appendChild(defs);
  svg.appendChild(make('title',{id:'art-title-'+id},title+' — minimal InvestingNoobs lesson visual'));
  svg.appendChild(make('desc',{id:'art-desc-'+id},clean(detail.goal)+' Topic: '+clean(item.label)+'.'));
  svg.appendChild(make('rect',{width:'1200',height:'360',fill:'url(#art-bg-'+id+')'}));
  svg.appendChild(make('circle',{cx:'600',cy:'180',r:'245',fill:'url(#art-glow-'+id+')'}));
  svg.appendChild(make('path',{d:'M92 304H1108',stroke:accent,'stroke-opacity':'.2','stroke-width':'2'}));
  svg.appendChild(make('text',{x:'92',y:'72',fill:accent,'font-family':"'IBM Plex Mono',monospace",'font-size':'12','letter-spacing':'3'},'INVESTINGNOOBS  /  LESSON '+number));
  svg.insertAdjacentHTML('beforeend','<g class="art-gem" aria-hidden="true">'+gem+'</g>');
  svg.insertAdjacentHTML('beforeend','<g class="art-minimal-motif" aria-hidden="true">'+motifs[key]+'</g>');
  const cap=figure.querySelector('figcaption');if(cap)cap.textContent=item.label+' · topic illustration';
})();
