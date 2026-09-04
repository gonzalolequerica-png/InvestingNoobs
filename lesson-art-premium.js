/* Editorial layer for the lesson artwork. It uses each lesson's goal and terms
   so the visual cover explains the lesson instead of being decorative only. */
(()=>{
  const art=window.INVESTINGNOOBS_ART||{},details=window.INVESTINGNOOBS_DETAILS||{};
  const id=new URLSearchParams(location.search).get('id')||'',item=art[id],detail=details[id];
  const article=document.getElementById('article'),heading=article&&article.querySelector('h1');
  const figure=article&&article.querySelector('.lesson-art'),svg=figure&&figure.querySelector('svg');
  if(!item||!detail||!heading||!figure||!svg||figure.dataset.enhanced==='true')return;

  const NS='http://www.w3.org/2000/svg',accent=item.accent||'#eabd64',terms=(detail.terms||[]).map(v=>String(v).split(' — ')[0].trim());
  const clean=v=>String(v).replace(/\s+/g,' ').trim();
  const truncate=(v,n)=>{const s=clean(v);return s.length>n?s.slice(0,n-1)+'…':s};
  const wrap=(v,n,max=2)=>{const words=clean(v).split(' '),lines=[];let line='';for(const word of words){const next=line?line+' '+word:word;if(next.length>n&&line){lines.push(line);line=word}else line=next}if(line)lines.push(line);return lines.slice(0,max)};
  const make=(tag,attrs={},content)=>{const el=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([key,value])=>el.setAttribute(key,String(value)));if(content!==undefined)el.textContent=content;return el};
  const textLines=(parent,x,y,lines,attrs={},step=16)=>lines.forEach((line,i)=>parent.appendChild(make('text',Object.assign({x,y:y+i*step},attrs),line)));
  const motif=svg.querySelector('g[aria-hidden="true"]');

  figure.dataset.enhanced='true';figure.dataset.lesson=id;figure.dataset.kind=item.kind||'guide';
  svg.setAttribute('viewBox','0 0 1200 430');svg.setAttribute('role','img');svg.setAttribute('aria-labelledby','art-title-'+id+' art-desc-'+id);
  svg.prepend(make('desc',{id:'art-desc-'+id},clean(detail.goal)+' Key terms: '+terms.join(', ')+'.'));
  svg.prepend(make('title',{id:'art-title-'+id},heading.textContent.trim()+' — InvestingNoobs lesson visual'));
  svg.querySelectorAll('rect').forEach(rect=>{if(!rect.closest('defs')&&rect.getAttribute('width')==='1200')rect.setAttribute('height','430')});
  const oldPractical=[...svg.querySelectorAll('text')].find(el=>el.textContent.includes('PRACTICAL INVESTING EDUCATION'));if(oldPractical)oldPractical.remove();
  const oldRule=[...svg.querySelectorAll('path')].find(el=>el.getAttribute('d')==='M74 286h1052');if(oldRule)oldRule.setAttribute('d','M74 322h1052');

  const underlay=make('g',{'aria-hidden':'true','class':'art-underlay'});
  underlay.appendChild(make('rect',{x:728,y:45,width:405,height:265,rx:20,fill:'#07111f','fill-opacity':'.62',stroke:accent,'stroke-opacity':'.2'}));
  underlay.appendChild(make('rect',{x:744,y:61,width:373,height:233,rx:14,fill:'none',stroke:'#9ab0ca','stroke-opacity':'.1'}));
  underlay.appendChild(make('path',{d:'M760 84h96M1034 84h62',stroke:accent,'stroke-opacity':'.62','stroke-width':'2','stroke-linecap':'round'}));
  underlay.appendChild(make('circle',{cx:1092,cy:84,r:4,fill:accent}));
  if(motif)svg.insertBefore(underlay,motif);else svg.appendChild(underlay);

  const overlay=make('g',{'aria-hidden':'true','class':'art-overlay'});
  overlay.appendChild(make('text',{x:760,y:78,fill:'#8fa5be','font-family':"'IBM Plex Mono',monospace",'font-size':'11','letter-spacing':'2'},'CONCEPT MAP'));
  overlay.appendChild(make('text',{x:760,y:101,fill:accent,'font-family':"'IBM Plex Mono',monospace",'font-size':'10','letter-spacing':'1.5'},truncate(item.label,28).toUpperCase()));
  overlay.appendChild(make('path',{d:'M760 292h342',stroke:accent,'stroke-opacity':'.22','stroke-width':'2'}));
  overlay.appendChild(make('text',{x:760,y:310,fill:'#71859d','font-family':"'IBM Plex Mono',monospace",'font-size':'10','letter-spacing':'1.4'},'READ · TEST · APPLY'));
  svg.appendChild(overlay);

  const lessonBand=make('g',{'aria-hidden':'true','class':'art-lesson-brief'});
  lessonBand.appendChild(make('rect',{x:62,y:236,width:650,height:76,rx:13,fill:'#0b1625','fill-opacity':'.84',stroke:accent,'stroke-opacity':'.25'}));
  lessonBand.appendChild(make('rect',{x:62,y:236,width:5,height:76,rx:2,fill:accent}));
  lessonBand.appendChild(make('text',{x:86,y:258,fill:accent,'font-family':"'IBM Plex Mono',monospace",'font-size':'10','letter-spacing':'1.7'},'WHAT THIS LESSON UNLOCKS'));
  textLines(lessonBand,86,281,wrap(detail.goal,78,2),{fill:'#d7e2ef','font-family':'Arial,sans-serif','font-size':'13'},17);
  svg.appendChild(lessonBand);

  const termBand=make('g',{'aria-hidden':'true','class':'art-term-cards'}),cardWidth=204,cardGap=16,startX=62;
  terms.slice(0,3).forEach((term,index)=>{
    const x=startX+index*(cardWidth+cardGap);
    termBand.appendChild(make('rect',{x,y:337,width:cardWidth,height:62,rx:11,fill:'#101c2c','fill-opacity':'.92',stroke:'#9ab0ca','stroke-opacity':'.16'}));
    termBand.appendChild(make('circle',{cx:x+20,cy:357,r:7,fill:accent,'fill-opacity':'.9'}));
    termBand.appendChild(make('text',{x:x+35,y:361,fill:'#8fa5be','font-family':"'IBM Plex Mono',monospace",'font-size':'9','letter-spacing':'1.2'},'0'+(index+1)+' / KEY IDEA'));
    textLines(termBand,x+16,383,wrap(truncate(term,28),24,1),{fill:'#f1f5fa','font-family':'Arial,sans-serif','font-size':'12','font-weight':'700'},14);
  });
  svg.appendChild(termBand);
  svg.appendChild(make('text',{x:74,y:28,fill:'#8193aa','font-family':"'IBM Plex Mono',monospace",'font-size':'10','letter-spacing':'2'},clean(detail.module||'Learning series').toUpperCase()));
  const cap=figure.querySelector('figcaption');
  if(cap)cap.textContent=item.label+' · '+clean(detail.module||'Learning series')+' · visual guide built from the lesson';
})();
