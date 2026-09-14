"""Extrae el indice de lecciones (id, titulo, resumen, slug, fichero) de lesson-data.js."""
import re,json,unicodedata
s=open('lesson-data.js',encoding='utf-8').read()
i=s.index('{'); depth=0; j=i; inq=None; esc=False
while j<len(s):
    c=s[j]
    if esc: esc=False
    elif inq:
        if c=='\\': esc=True
        elif c==inq: inq=None
    else:
        if c in "'\"`": inq=c
        elif c=='{': depth+=1
        elif c=='}':
            depth-=1
            if depth==0: break
    j+=1
block=s[i:j+1]
items=re.findall(r"\bl(\d+):\{t:(['\"`])(.*?)\2,s:(['\"`])(.*?)\4,", block, re.S)
def slug(t):
    t=unicodedata.normalize('NFKD',t).encode('ascii','ignore').decode().lower()
    t=re.sub(r"[’'`]",'',t)
    return re.sub(r'-+','-',re.sub(r'[^a-z0-9]+','-',t).strip('-'))[:70].strip('-')
out={}
for num,_,t,_,summ in items:
    n=int(num); sl=slug(t)
    out['l%d'%n]={'n':n,'t':t,'s':summ,'slug':sl,'file':'lesson-%02d-%s.html'%(n,sl)}
json.dump(out,open('lessons-index.json','w'),ensure_ascii=False,indent=1)
print('lecciones:',len(out))
