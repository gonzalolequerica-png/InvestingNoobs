"""Genera las 50 paginas estaticas de leccion a partir de article.html.

Cuando cambies el texto de una leccion (lesson-data.js, lesson-details.js o
lesson-longform.js), vuelve a ejecutar esto para regenerar las paginas:

    python3 -m http.server 8098          # desde la raiz del repo
    python3 build-lesson-index.py && python3 build-lesson-pages.py

Requiere playwright (pip install playwright && playwright install chromium).
El indice lessons-index.json lo genera
build-lesson-index.py.
"""
import json,re,html
from playwright.sync_api import sync_playwright
L=json.load(open('lessons-index.json'))
SITE='https://investingnoobs.com/'
order=sorted(L,key=lambda k:L[k]['n'])
ok=[];bad=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':1280,'height':900})
    ctx.route("**/fonts.googleapis.com/**", lambda r: r.abort())
    for k in order:
        it=L[k]; pg=ctx.new_page()
        pg.add_init_script(f"window.__LESSON_ID__={json.dumps(k)}")
        pg.goto(f'http://localhost:8098/article.html?prerender=1', wait_until='load', timeout=60000)
        pg.wait_for_timeout(600)
        txt=pg.evaluate("document.getElementById('article').innerText")
        if len(txt)<800: bad.append((k,len(txt))); pg.close(); continue
        doc=pg.evaluate("document.documentElement.outerHTML")
        pg.close()
        url=SITE+it['file']
        doc=doc.replace('http://localhost:8098/article.html?prerender=1',url)
        doc=doc.replace('http://localhost:8098/article.html',url)
        doc=doc.replace('http://localhost:8098/',SITE)
        # canonical y og:url definitivos
        doc=re.sub(r'<link rel="canonical" href="[^"]*"',f'<link rel="canonical" href="{url}"',doc,count=1)
        doc=re.sub(r'<meta property="og:url" content="[^"]*"',f'<meta property="og:url" content="{url}"',doc,count=1)
        # id de la leccion, antes que ningun script
        doc=doc.replace('<head>', f'<head>\n<script>window.__LESSON_ID__={json.dumps(k)};</script>',1)
        # datos estructurados escritos en el HTML
        img=f'{SITE}og-images/lesson-{it["n"]}.png'
        ld={"@context":"https://schema.org","@type":"Article","headline":it['t'],"description":it['s'],"url":url,"image":img,
            "author":{"@type":"Organization","name":"InvestingNoobs"},
            "publisher":{"@type":"Organization","name":"InvestingNoobs","url":SITE},
            "mainEntityOfPage":{"@type":"WebPage","@id":url},
            "isPartOf":{"@type":"Course","name":"InvestingNoobs Crypto & Investing Course","url":SITE+"blog.html"},
            "inLanguage":"en"}
        bc={"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
            {"@type":"ListItem","position":1,"name":"InvestingNoobs","item":SITE},
            {"@type":"ListItem","position":2,"name":"Crypto & Investing Course","item":SITE+"blog.html"},
            {"@type":"ListItem","position":3,"name":it['t'],"item":url}]}
        blob=('<script type="application/ld+json" data-static>'+json.dumps(ld,ensure_ascii=False)+'</script>\n'
              '<script type="application/ld+json" data-static>'+json.dumps(bc,ensure_ascii=False)+'</script>\n</head>')
        doc=doc.replace('</head>',blob,1)
        open(it['file'],'w',encoding='utf-8').write('<!doctype html>\n'+doc)
        ok.append(it['file'])
    b.close()
print('generadas:',len(ok))
print('fallidas:',bad)
