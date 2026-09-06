// Local QA only. Missing original media is streamed from the existing public site.
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.wav':'audio/wav'};
http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const name=decodeURIComponent(url.pathname==='/'?'/game.html':url.pathname);
  const file=path.resolve(root,'.'+name);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  res.setHeader('Cache-Control','no-store');
  if(fs.existsSync(file)&&fs.statSync(file).isFile()){res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');return fs.createReadStream(file).pipe(res);}
  if(/^\/(?:asset-|asesor-|companion-|personaje-|neon_lounge|movil-|menu-)/.test(name)){
    try {const upstream=await fetch('https://investingnoobs.com'+name);res.writeHead(upstream.status,{'Content-Type':upstream.headers.get('content-type')||'application/octet-stream'});return res.end(Buffer.from(await upstream.arrayBuffer()));}catch{}
  }
  res.writeHead(404);res.end('Not found');
}).listen(4173,'127.0.0.1',()=>console.log('Room QA: http://127.0.0.1:4173/game.html'));
