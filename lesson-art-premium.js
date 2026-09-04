/* Minimal editorial treatment for each lesson cover. */
(()=>{
  const art=window.INVESTINGNOOBS_ART||{},details=window.INVESTINGNOOBS_DETAILS||{};
  const id=new URLSearchParams(location.search).get('id')||'',item=art[id],detail=details[id];
  const article=document.getElementById('article'),heading=article&&article.querySelector('h1');
  const figure=article&&article.querySelector('.lesson-art'),svg=figure&&figure.querySelector('svg');
  if(!item||!detail||!heading||!figure||!svg||figure.dataset.enhanced==='true')return;
  const NS='http://www.w3.org/2000/svg',accent=item.accent||'#eabd64';
  const clean=v=>String(v).replace(/\s+/g,' ').trim();
  const shorten=(v,n)=>{const s=clean(v);return s.length>n?s.slice(0,n-1)+'…':s};
  const wrap=(v,n,max=2)=>{const lines=[],words=clean(v).split(' ');let line='';for(const word of words){const next=line?line+' '+word:word;if(next.length>n&&line){lines.push(line);line=word}else line=next}if(line)lines.push(line);return lines.slice(0,max)};
  const make=(tag,attrs={},content)=>{const el=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([key,value])=>el.setAttribute(key,String(value)));if(content!==undefined)el.textContent=content;return el};
  const addLines=(parent,x,y,lines,attrs={},step=16)=>lines.forEach((line,i)=>parent.appendChild(make('text',Object.assign({x,y:y+i*step},attrs),line)));
  const terms=(detail.terms||[]).map(v=>shorten(String(v).split(' — ')[0],27));
  const motif=svg.querySelector('g[aria-hidden="true"]');

  figure.dataset.enhanced='true';figure.dataset.lesson=id;figure.dataset.kind=item.kind||'guide';
  svg.setAttribute('viewBox','0 0 1200 390');svg.setAttribute('role','img');svg.setAttribute('aria-labelledby','art-title-'+id+' art-desc-'+id);
  svg.prepend(make('desc',{id:'art-desc-'+id},clean(detail.goal)+' Key terms: '+terms.join(', ')+'.'));
  svg.prepend(make('title',{id:'art-title-'+id},heading.textContent.trim()+' — InvestingNoobs lesson visual'));
  svg.querySelectorAll('rect').forEach(rect=>{if(!rect.closest('defs')&&rect.getAttribute('width')==='1200')rect.setAttribute('height','390')});
  const oldPractical=[...svg.querySelectorAll('text')].find(el=>el.textContent.includes('PRACTICAL INVESTING EDUCATION'));if(oldPractical)oldPractical.remove();
  const oldRule=[...svg.querySelectorAll('path')].find(el=>el.getAttribute('d')==='M74 286h1052');if(oldRule)oldRule.setAttribute('d','M74 311h1052');

  const underlay=make('g',{'aria-hidden':'true','class':'art-underlay'});
  underlay.appendChild(make('rect',{x:758,y:62,width:344,height:226,rx:18,fill:'none',stroke:accent,'stroke-opacity':'.2'}));
  underlay.appendChild(make('path',{d:'M780 87h72M1040 87h38',stroke:accent,'stroke-opacity':'.55','stroke-width':'2','stroke-linecap':'round'}));
  underlay.appendChild(make('circle',{cx:1082,cy:87,r:3.5,fill:accent}));
  underlay.appendChild(make('path',{d:'M734 62v226',stroke:'#9ab0ca','stroke-opacity':'.1','stroke-width':'1'}));
  if(motif)svg.insertBefore(underlay,motif);else svg.appendChild(underlay);

  const overlay=make('g',{'aria-hidden':'true','class':'art-overlay'});
  overlay.appendChild(make('text',{x:780,y:81,fill:'#8fa5be','font-family':"'IBM Plex Mono',monospace",'font-size':'10','letter-spacing':'2'},'TOPIC'));
  overlay.appendChild(make('text',{x:780,y:103,fill:accent,'font-family':"'IBM Plex Mono',monospace",'font-size':'10','letter-spacing':'1.3'},shorten(item.label,25).toUpperCase()));
  overlay.appendChild(make('text',{x:780,y:307,fill:'#71859d','font-family':"'IBM Plex Mono',monospace",'font-size':'10','letter-spacing':'1.4'},'LEARN · THINK · APPLY'));
  svg.appendChild(overlay);

  const brief=make('g',{'aria-hidden':'true','class':'art-lesson-brief'});
  brief.appendChild(make('rect',{x:62,y:229,width:648,height:78,rx:12,fill:'#0b1625','fill-opacity':'.58'}));
  brief.appendChild(make('rect',{x:62,y:229,width:3,height:78,rx:1.5,fill:accent}));
  brief.appendChild(make('text',{x:85,y:251,fill:accent,'font-family':"'IBM Plex Mono',monospace",'font-size':'10','letter-spacing':'1.6'},'THE IDEA'));
  addLines(brief,85,275,wrap(detail.goal,76,2),{fill:'#d7e2ef','font-family':'Arial,sans-serif','font-size':'13'},16);
  svg.appendChild(brief);

  const termBand=make('g',{'aria-hidden':'true','class':'art-term-cards'}),startX=62,cardWidth=204,gap=16;
  terms.slice(0,3).forEach((term,index)=>{
    const x=startX+index*(cardWidth+gap);
    if(index)termBand.appendChild(make('path',{d:`M${x-8} 333v43`,stroke:'#9ab0ca','stroke-opacity':'.14'}));
    termBand.appendChild(make('circle',{cx:x+5,cy:347,r:4,fill:accent,'fill-opacity':'.9'}));
    termBand.appendChild(make('text',{x:x+18,y:350,fill:'#8193aa','font-family':"'IBM Plex Mono',monospace",'font-size':'9','letter-spacing':'1.1'},'0'+(index+1)+' / KEY IDEA'));
    termBand.appendChild(make('text',{x,y:372,fill:'#edf2f8','font-family':'Arial,sans-serif','font-size':'12','font-weight':'700'},term));
  });
  svg.appendChild(termBand);
  svg.appendChild(make('text',{x:74,y:28,fill:'#8193aa','font-family':"'IBM Plex Mono',monospace",'font-size':'10','letter-spacing':'2'},clean(detail.module||'Learning series').toUpperCase()));
  const cap=figure.querySelector('figcaption');if(cap)cap.textContent=item.label+' · '+clean(detail.module||'Learning series');
})();
