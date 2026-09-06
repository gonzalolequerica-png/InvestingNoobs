/* Investing Noobs — an interactive, locally rendered isometric studio.
   Three.js r180 is shipped with the game; no network service or 3D asset API.
   The game bridge is read-only except for ordinary screen navigation. */
const bridge = window.TycoonRoomBridge;
const host = document.getElementById('mainScene');
const COPY = {
  es: { studio:'Mi primer estudio', apartment:'Mi apartamento', house:'Mi casa', loft:'Mi ático', estate:'Mi residencia', empire:'Mi sede', eyebrow:'TU CENTRO DE OPERACIONES', phases:['Amanecer','Día','Atardecer','Noche'], hint:'Toca los objetos para explorar', market:'Mercado', bank:'Banco', upgrades:'Mejoras', business:'Negocios', loading:'Preparando tu habitación 3D…', fallback:'La vista 3D no está disponible. Puedes seguir jugando en 2D.', classic:'Ver habitación en 2D', three:'Ver habitación en 3D', reset:'Centrar la vista', scene:'Habitación 3D interactiva. Usa Mercado, Banco o Mejoras para jugar.' },
  en: { studio:'My first studio', apartment:'My apartment', house:'My home', loft:'My penthouse', estate:'My residence', empire:'My headquarters', eyebrow:'YOUR BASE OF OPERATIONS', phases:['Dawn','Day','Sunset','Night'], hint:'Tap the objects to explore', market:'Market', bank:'Bank', upgrades:'Upgrades', business:'Businesses', loading:'Preparing your 3D room…', fallback:'3D is unavailable. You can keep playing in 2D.', classic:'View room in 2D', three:'View room in 3D', reset:'Center the view', scene:'Interactive 3D room. Use Market, Bank or Upgrades to play.' },
  zh: { studio:'我的第一个工作室', apartment:'我的公寓', house:'我的家', loft:'我的顶层公寓', estate:'我的住宅', empire:'我的总部', eyebrow:'你的运营中心', phases:['黎明','白天','日落','夜晚'], hint:'点击物品开始探索', market:'市场', bank:'银行', upgrades:'升级', business:'企业', loading:'正在准备你的3D房间…', fallback:'暂时无法使用3D。你可以继续使用2D模式。', classic:'切换到2D房间', three:'切换到3D房间', reset:'重置视角', scene:'互动3D房间。使用市场、银行或升级按钮开始游戏。' }
};
const ICONS = {
  market:'<path d="M3 3v14h14M6 12l4-5 3 3 4-6"/>',
  bank:'<path d="M2 7l8-5 8 5H2zm2 2v6m4-6v6m4-6v6m4-6v6M2 18h16"/>',
  upgrades:'<path d="M2 9l8-6 8 6M4 8v10h12V8M8 18v-6h4v6"/>',
  reset:'<path d="M4 7a7 7 0 1 1-1 7M4 3v5h5"/>',
  view:'<path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5Z"/><circle cx="10" cy="10" r="2.5"/>'
};
const icon = name => `<svg viewBox="0 0 20 20" aria-hidden="true">${ICONS[name]}</svg>`;
const text = (el, value) => { if (el.textContent !== value) el.textContent = value; };
const setAttr = (el, name, value) => { if (el.getAttribute(name) !== value) el.setAttribute(name, value); };
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
function savedCamera(){
  try{const p=JSON.parse(localStorage.getItem('ct_room_camera')||'{}')||{};
    return {focus:p.focus==='inside'?'inside':'all',zoom:Number.isFinite(p.zoom)?Math.max(.85,Math.min(1.1,p.zoom)):1,yaw:Number.isFinite(p.yaw)?Math.max(-.18,Math.min(.18,p.yaw)):0};
  }catch{return {focus:'all',zoom:1,yaw:0};}
}
function rememberCamera(view){try{localStorage.setItem('ct_room_camera',JSON.stringify({focus:view.focus,zoom:view.zoom,yaw:view.yaw}));}catch{}}
const VIEW_COPY={
  es:{settings:'Ajustar vista 3D',title:'Tu punto de vista',all:'Casa y paisaje',inside:'Solo interior',zoom:'Acercamiento',reset:'Restablecer vista',close:'Listo'},
  en:{settings:'Adjust 3D view',title:'Your viewpoint',all:'Home and landscape',inside:'Interior only',zoom:'Zoom',reset:'Reset view',close:'Done'},
  zh:{settings:'调整3D视图',title:'你的视角',all:'房屋与景观',inside:'仅室内',zoom:'缩放',reset:'重置视图',close:'完成'}
};
let mode = '3d';
try { if (localStorage.getItem('ct_room_view') === '2d') mode = '2d'; } catch {}
let room, loading = false, failed = false, lastLanguage = '', lastHome = '', snap;
let active = false, raf = 0, previousFrame = 0, elapsed = 0, lastChart = 0;

if (bridge && host) {
  const status = document.createElement('div');
  status.className = 'room-mode-status';
  status.dataset.roomUi = ''; status.setAttribute('role', 'status'); status.hidden = true;
  const toolbar = document.createElement('div');
  toolbar.className = 'room-toolbar'; toolbar.dataset.roomUi = '';
  const reset = document.createElement('button'); reset.type = 'button'; reset.innerHTML = icon('reset'); reset.hidden = true;
  const toggle = document.createElement('button'); toggle.type = 'button';
  const settings=document.createElement('button');settings.type='button';settings.innerHTML=icon('view');settings.hidden=true;
  toolbar.append(reset, settings, toggle); host.append(status, toolbar);
  const viewDialog=document.createElement('dialog');viewDialog.className='room-view-dialog';viewDialog.dataset.roomUi='';
  viewDialog.innerHTML='<form method="dialog"><h2 id="room-view-title"></h2><div class="room-view-options"><button type="button" data-view="all"></button><button type="button" data-view="inside"></button></div><label for="room-zoom"></label><input id="room-zoom" type="range" min="85" max="110" value="100" step="5"><output for="room-zoom">100%</output><button type="button" data-view-reset></button><button value="close" data-view-close></button></form>';
  viewDialog.setAttribute('aria-labelledby','room-view-title');document.body.append(viewDialog);
  const zoomInput=viewDialog.querySelector('input');
  const resetView=()=>{if(room){room.yaw=0;room.zoom=1;room.focus='all';room.fit();rememberCamera(room);}zoomInput.value='100';viewDialog.querySelector('output').textContent='100%';syncView();};
  const syncView=()=>viewDialog.querySelectorAll('[data-view]').forEach(b=>setAttr(b,'aria-pressed',String(b.dataset.view===(room?.focus||'all'))));
  reset.addEventListener('click', resetView);
  settings.addEventListener('click',()=>{syncView();zoomInput.value=String(Math.round((room?.zoom||1)*100));viewDialog.querySelector('output').textContent=zoomInput.value+'%';viewDialog.showModal();});
  viewDialog.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{if(room){room.focus=b.dataset.view;room.zoom=1;zoomInput.value='100';viewDialog.querySelector('output').textContent='100%';room.fit();rememberCamera(room);syncView();}}));
  zoomInput.addEventListener('input',()=>{if(room){room.zoom=Number(zoomInput.value)/100;room.fit();rememberCamera(room);viewDialog.querySelector('output').textContent=zoomInput.value+'%';}});
  viewDialog.querySelector('[data-view-reset]').addEventListener('click',resetView);
  toggle.addEventListener('click', () => {
    mode = mode === '3d' ? '2d' : '3d';
    if(failed && mode === '3d') { room?.dispose(); room = null; failed = false; }
    try { localStorage.setItem('ct_room_view', mode); } catch {}
    sync();
  });

  function copy() { return COPY[snap?.language] || COPY.es; }
  function sync() {
    snap = bridge.snapshot();
    const c = copy();
    const v=VIEW_COPY[snap.language]||VIEW_COPY.es;
    setAttr(settings,'aria-label',v.settings);setAttr(settings,'title',v.settings);
    text(viewDialog.querySelector('h2'),v.title);
    viewDialog.querySelectorAll('[data-view]').forEach(b=>text(b,v[b.dataset.view]));
    text(viewDialog.querySelector('label'),v.zoom);text(viewDialog.querySelector('[data-view-reset]'),v.reset);text(viewDialog.querySelector('[data-view-close]'),v.close);
    text(toggle, mode === '3d' && !failed ? '2D' : '3D');
    setAttr(toggle, 'aria-label', mode === '3d' && !failed ? c.classic : c.three);
    setAttr(toggle, 'title', toggle.getAttribute('aria-label'));
    setAttr(reset, 'aria-label', c.reset);
    toolbar.hidden = !snap.playing;
    const shown = snap.visible && !document.hidden && mode === '3d' && !failed;
    if (shown && !room && !loading) start();
    const rendered = !!room && mode === '3d' && !failed;
    const theme = mode === '3d' && !failed ? '3d' : '2d';
    document.body.classList.toggle('room-enabled', theme === '3d');
    if(document.body.dataset.gameTheme !== theme) {
      document.body.dataset.gameTheme = theme;
      window.dispatchEvent(new Event('tycoon-theme-change'));
    }
    host.classList.toggle('room-rendered', rendered);
    reset.hidden = !rendered;
    settings.hidden = !rendered;
    status.hidden = !(snap.visible && (loading || failed));
    if (!status.hidden) text(status, failed ? c.fallback : c.loading);
    if (room) {
      room.root.hidden = !rendered;
      if (snap.home !== lastHome || room.gender !== snap.gender) {
        room.setHome(snap.home, snap.gender); lastHome = snap.home; lastLanguage = '';
      }
      if (lastLanguage !== snap.language) {
        room.localize(c); lastLanguage = snap.language;
      }
      room.updateProgress(snap);
    }
    if (shown && room && !active) {
      active = true; previousFrame = 0; room.fit(); raf = requestAnimationFrame(frame);
    } else if (!shown && active) {
      active = false; cancelAnimationFrame(raf); raf = 0;
    }
  }

  async function start() {
    loading = true; status.hidden = false; text(status, copy().loading);
    try {
      const THREE = await import('./vendor/three/three.module.min.js');
      room = createRoom(THREE, host);
      room.setHome(snap.home, snap.gender); lastHome = snap.home;
      room.localize(copy()); lastLanguage = snap.language;
      room.fit(); room.light(snap.phase, true); room.renderer.render(room.scene, room.camera);
      host.dataset.roomState = 'ready';
    } catch (error) {
      failed = true; mode = '2d'; host.dataset.roomState = 'fallback';
      document.querySelector('.tycoon-room')?.remove();
      console.warn('3D room unavailable; using the original room.', error.message);
    } finally { loading = false; sync(); }
  }

  function frame(now) {
    if (!active || !room) return;
    raf = requestAnimationFrame(frame);
    const interval = (innerWidth < 700 || reduced.matches) ? 1000 / 30 : 1000 / 60;
    if (previousFrame && now - previousFrame < interval - 1) return;
    const dt = previousFrame ? Math.min(.08, (now - previousFrame) / 1000) : 0;
    previousFrame = now; elapsed += dt;
    const live = bridge.snapshot();
    room.light(live.phase, false, dt);
    if (!reduced.matches) room.animate(elapsed, dt);
    if (now - lastChart > 2800) { room.updateChart(live); lastChart = now; }
    room.renderer.render(room.scene, room.camera);
  }
  const poll = setInterval(sync, 400);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => { active = false; cancelAnimationFrame(raf); });
  window.addEventListener('pageshow', sync);
  window.addEventListener('beforeunload', () => { clearInterval(poll); room?.dispose(); });
  host.addEventListener('room-context-lost', () => {
    failed = true; mode = '2d'; host.dataset.roomState = 'fallback'; sync();
  });
  sync();
}

function createRoom(T, host) {
  const root = document.createElement('div'); root.className = 'tycoon-room'; root.dataset.roomUi = '';
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true');
  root.append(canvas);
  const overlay = document.createElement('div'); overlay.className = 'room-overlay';
  overlay.innerHTML = '<div class="room-heading"><span class="room-eyebrow"></span><strong class="room-title"></strong></div><div class="room-period"></div><div class="room-caption"></div>';
  root.append(overlay); host.prepend(root);
  const renderer = new T.WebGLRenderer({canvas, antialias:true, alpha:false, powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1.5 : 2));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  const scene = new T.Scene(); scene.background = new T.Color('#132333');
  const camera = new T.OrthographicCamera(-6,6,5,-5,.1,80);
  const target = new T.Vector3(0,1.1,0);
  camera.position.set(8.5,8,10.5); camera.lookAt(target);
  const clock = overlay.querySelector('.room-period');
  let w = 1, h = 1, labels, phaseShown = -1, phaseSmooth = -1;
  let currentHome = '', currentTier = 0, currentBusinesses = -1, celebrating = 0;
  const meshes = [], surfaces = [], interactionMeshes = [], hot = [];
  const group = new T.Group(); scene.add(group);
  const geometryCache = new Map(), materialCache = new Map();
  const textures = new Set();
  // Small, deterministic material maps: no downloads or per-frame generation.
  let randomSeed=137;
  const random=()=>{randomSeed=(randomSeed*1664525+1013904223)>>>0;return randomSeed/4294967296;};
  function texture(width,height,draw,repeat=[1,1]) {
    const c=document.createElement('canvas');c.width=width;c.height=height;draw(c.getContext('2d'),width,height);
    const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
    map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(...repeat);
    map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());textures.add(map);return map;
  }
  const oak=texture(512,256,(ctx,w,h)=>{
    ctx.fillStyle='#f1e8d9';ctx.fillRect(0,0,w,h);
    for(let i=0;i<260;i++){
      const y=random()*h;ctx.strokeStyle=`rgba(83,55,29,${.025+random()*.08})`;ctx.lineWidth=.35+random()*1.2;
      ctx.beginPath();ctx.moveTo(-10,y);ctx.bezierCurveTo(w*.3,y+Math.sin(i)*8,w*.7,y-Math.cos(i)*10,w+10,y+Math.sin(i)*3);ctx.stroke();
    }
    for(let i=0;i<4;i++){
      const x=random()*w,y=random()*h;
      for(let r=4;r<35;r+=5){ctx.strokeStyle='rgba(96,65,38,.045)';ctx.beginPath();ctx.ellipse(x,y,r*2,r*.18,0,0,Math.PI*2);ctx.stroke();}
    }
  });
  const linen=texture(128,128,(ctx,w,h)=>{
    ctx.fillStyle='#eeeeea';ctx.fillRect(0,0,w,h);
    for(let i=0;i<w;i+=3){ctx.fillStyle=i%2?'#d8d9d4':'#e5e5df';ctx.fillRect(i,0,1,h);ctx.fillStyle='#c9cbc224';ctx.fillRect(0,i,w,1);}
  },[4,4]);
  const plaster=texture(128,128,(ctx,w,h)=>{
    ctx.fillStyle='#f3f1e9';ctx.fillRect(0,0,w,h);
    for(let i=0;i<2200;i++){ctx.fillStyle=random()>.5?'#8c938a15':'#ffffff38';ctx.fillRect(random()*w,random()*h,1,1);}
  },[3,3]);
  const softShadow=texture(128,128,(ctx,w,h)=>{
    const g=ctx.createRadialGradient(w/2,h/2,4,w/2,h/2,w/2);g.addColorStop(0,'rgba(6,15,19,.65)');g.addColorStop(.42,'rgba(6,15,19,.35)');g.addColorStop(1,'rgba(6,15,19,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  });
  const environmentFaces=Array.from({length:6},(_,i)=>{
    const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');
    const g=ctx.createLinearGradient(0,0,0,64);g.addColorStop(0,i===2?'#f5ecdb':'#bdcfd8');g.addColorStop(.5,'#657a80');g.addColorStop(1,'#363c3d');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
    if(i===0||i===4){ctx.fillStyle='#f7e9d6';ctx.fillRect(12,9,14,37);}return c;
  });
  const environmentCube=new T.CubeTexture(environmentFaces);environmentCube.colorSpace=T.SRGBColorSpace;environmentCube.needsUpdate=true;
  const pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromCubemap(environmentCube);
  scene.environment=environment.texture;scene.environmentIntensity=.34;environmentCube.dispose();pmrem.dispose();
  const mat = (color, extra = {}) => {
    const key = JSON.stringify([color,extra]);
    if(!materialCache.has(key)) materialCache.set(key, new T.MeshStandardMaterial({color, roughness:.82, ...extra}));
    return materialCache.get(key);
  };
  function roundedGeometry() {
    if (geometryCache.has('round')) return geometryCache.get('round');
    const s = new T.Shape(), r = .12, x = -.5, y = -.5;
    s.moveTo(x+r,y); s.lineTo(x+1-r,y); s.quadraticCurveTo(x+1,y,x+1,y+r);
    s.lineTo(x+1,y+1-r); s.quadraticCurveTo(x+1,y+1,x+1-r,y+1);
    s.lineTo(x+r,y+1); s.quadraticCurveTo(x,y+1,x,y+1-r);
    s.lineTo(x,y+r); s.quadraticCurveTo(x,y,x+r,y);
    const g = new T.ExtrudeGeometry(s,{depth:.85,bevelEnabled:true,bevelThickness:.075,bevelSize:.055,bevelSegments:3,steps:1,curveSegments:5});
    g.center(); g.computeBoundingBox(); const size = new T.Vector3();g.boundingBox.getSize(size); g.scale(1/size.x,1/size.y,1/size.z);
    geometryCache.set('round',g); return g;
  }
  function box(parent, size, pos, color, rounded = false, options = {}) {
    if (!geometryCache.has('box')) geometryCache.set('box',new T.BoxGeometry(1,1,1));
    const obj = new T.Mesh(rounded ? roundedGeometry() : geometryCache.get('box'), typeof color === 'string' ? mat(color,options) : color);
    obj.scale.set(...size); obj.position.set(...pos); obj.castShadow = true; obj.receiveShadow = true;
    parent.add(obj); meshes.push(obj); return obj;
  }
  function cylinder(parent, radiusTop, radiusBottom, height, pos, color, sides=16) {
    const key = ['cyl',radiusTop,radiusBottom,height,sides].join('|');
    if(!geometryCache.has(key)) geometryCache.set(key,new T.CylinderGeometry(radiusTop,radiusBottom,height,sides));
    const obj = new T.Mesh(geometryCache.get(key),typeof color==='string'?mat(color):color);
    obj.position.set(...pos);obj.castShadow=true;obj.receiveShadow=true;parent.add(obj);meshes.push(obj);return obj;
  }
  function sphere(parent, radius, pos, color, scale = [1,1,1]) {
    if (!geometryCache.has('sphere')) geometryCache.set('sphere',new T.SphereGeometry(1,20,14));
    const o = new T.Mesh(geometryCache.get('sphere'),typeof color==='string'?mat(color):color);
    o.position.set(...pos);o.scale.set(radius*scale[0],radius*scale[1],radius*scale[2]);o.castShadow=true;parent.add(o);meshes.push(o);return o;
  }
  function sub(parent, pos=[0,0,0], ry=0) {const g=new T.Group();g.position.set(...pos);g.rotation.y=ry;parent.add(g);return g;}
  function tube(parent, a, b, radius, color) {
    const va=new T.Vector3(...a),vb=new T.Vector3(...b),delta=vb.clone().sub(va);
    const c=cylinder(parent,radius,radius,delta.length(),va.add(vb).multiplyScalar(.5).toArray(),color,8);
    c.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return c;
  }
  const palette = { wall:mat('#5f7b7c'), wallLeft:mat('#455f64'), wood:mat('#b98d63'), trim:mat('#dfceb0'), accent:mat('#b3684e'), fabric:mat('#718575') };
  palette.wood.map=oak;palette.wood.roughness=.58;
  palette.wall.map=palette.wallLeft.map=plaster;
  palette.fabric.map=palette.accent.map=linen;
  const brass = mat('#cfad77',{metalness:.68,roughness:.28});
  const ink = '#172d3a', cream = '#e9ddc7', walnut = '#654733';
  const glow = new T.MeshBasicMaterial({color:'#ffe4ab'}); materialCache.set('bulb',glow);
  function contact(x,z,width,depth,y=.081,opacity=.32){
    const m=new T.MeshBasicMaterial({map:softShadow,transparent:true,opacity,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
    materialCache.set('contact'+surfaces.length,m);
    const p=new T.Mesh(new T.PlaneGeometry(width,depth),m);p.rotation.x=-Math.PI/2;p.position.set(x,y,z);p.renderOrder=1;group.add(p);surfaces.push(p);return p;
  }
  contact(0,0,9.6,7.8,-.395,.35);
  // A solid cutaway foundation, with individually laid oak planks and joinery.
  box(group,[7,.3,5.8],[0,-.23,0],'#172732',true);
  box(group,[6.8,.12,5.6],[0,-.025,0],palette.wood);
  const planks=['#b58f66','#bb956c','#b38b62','#bc9770','#b78f65'].map(c=>{const m=mat(c);m.map=oak;m.roughness=.68;return m;});
  for(let row=0;row<14;row++) {
    for(let col=0;col<3;col++) {
      box(group,[2.24,.028,.385],[-2.26+col*2.26,.05,-2.6+row*.4],planks[(row*3+col)%planks.length]);
    }
  }
  // Back wall is built around a real window opening (no sky image or texture).
  box(group,[6.9,1,.16],[0,.56,-2.82],palette.wall);
  box(group,[6.9,.45,.16],[0,3.075,-2.82],palette.wall);
  box(group,[2.1,1.8,.16],[-2.4,1.95,-2.82],palette.wall);
  box(group,[.7,1.8,.16],[3.1,1.95,-2.82],palette.wall);
  box(group,[.16,3.3,5.75],[-3.45,1.65,-.025],palette.wallLeft);
  box(group,[6.98,.10,.20],[0,3.35,-2.82],palette.trim);
  box(group,[.22,.1,5.8],[-3.45,3.35,0],palette.trim);
  box(group,[6.85,.15,.08],[0,.17,-2.71],palette.trim);
  box(group,[.07,.15,5.6],[-3.34,.17,0],palette.trim);
  const wainscot=sub(group);
  box(wainscot,[.035,.055,5.5],[-3.30,1.13,-.02],palette.trim,true);
  for(let i=0;i<7;i++)box(wainscot,[.035,.79,.022],[-3.30,.66,-2.40+i*.72],palette.trim,true);
  // Window, deep sill and skyline. Emissive windows switch on gradually at dusk.
  const windowGroup = sub(group,[.7,0,-2.78]);
  [-1.9,1.9].forEach(x=>box(windowGroup,[.12,1.92,.27],[x,1.95,0],cream));
  [1.02,2.89].forEach(y=>box(windowGroup,[3.9,.1,.27],[0,y,0],cream));
  [-.65,.65].forEach(x=>box(windowGroup,[.065,1.8,.19],[x,1.95,0],cream));
  box(windowGroup,[3.92,.08,.45],[0,1.01,.12],palette.wood,true);
  // Folded linen and metal curtain rings, modeled rather than photographed.
  tube(windowGroup,[-2.13,3.04,.18],[2.13,3.04,.18],.024,brass);
  const curtainMat=mat('#d8ccb4');curtainMat.map=linen;curtainMat.side=T.DoubleSide;
  for(const side of [-1,1]) {
    const g=new T.PlaneGeometry(.50,1.93,16,12),p=g.attributes.position;
    for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setZ(i,Math.cos((x+.25)*Math.PI*18)*.035);p.setX(i,x+(1-(y+.965)/1.93)*side*.09);}
    g.computeVertexNormals();const drape=new T.Mesh(g,curtainMat);drape.position.set(side*1.90,1.98,.17);drape.castShadow=true;drape.receiveShadow=true;windowGroup.add(drape);surfaces.push(drape);
    for(let i=0;i<5;i++){const ring=new T.Mesh(new T.TorusGeometry(.035,.008,5,10),brass);ring.position.set(side*1.9-.2+i*.1,3.02,.18);windowGroup.add(ring);surfaces.push(ring);}
  }
  const skyMaterial=new T.MeshBasicMaterial({color:'#88aaba'});materialCache.set('sky',skyMaterial);
  box(windowGroup,[3.78,1.8,.018],[0,1.95,-.42],skyMaterial);
  const cityMat = mat('#507080'); const cityWindows = mat('#e4cc89',{emissive:'#e4b86e',emissiveIntensity:.3});
  const cityGroup = sub(windowGroup);
  for(let i=0;i<13;i++) {
    const bw=.19+(i%3)*.055, bh=.27+((i*7)%9)*.065;
    box(cityGroup,[bw,bh,.055],[-1.72+i*.287,1.075+bh/2,-.34],cityMat);
    for(let f=0;f<3;f++) for(let j=0;j<2;j++) {
      const win=box(cityGroup,[.027,.039,.008],[-1.72+i*.287+(j-.5)*.085,1.16+f*.12,-.306],cityWindows);
      win.castShadow=false;
    }
  }
  const sunMaterial=new T.MeshBasicMaterial({color:'#ffe4ab',transparent:true,depthWrite:false});materialCache.set('sun',sunMaterial);
  const sun = sphere(windowGroup,.19,[1.2,2.5,-.35],sunMaterial,[1,1,.25]);sun.castShadow=false;
  // Framed artwork: an abstract rising horizon, constructed from geometry.
  const artwork=sub(group,[-2.38,2,-2.68]);
  box(artwork,[1.03,1.30,.065],[0,0,0],walnut,true);
  box(artwork,[.9,1.17,.025],[0,0,.045],cream);
  const artDisc=cylinder(artwork,.24,.24,.016,[0,.15,.07],'#c38a51',32);artDisc.rotation.x=Math.PI/2;
  box(artwork,[.88,.38,.02],[0,-.38,.072],'#5c7971');
  box(artwork,[.48,.15,.025],[-.2,-.12,.073],'#8da091');
  // Soft local occlusion anchors furniture to the floor and to the rug.
  contact(.55,-1.48,3.5,1.7,.083,.36);
  contact(-2.6,.54,1.6,2.9,.111,.38);
  contact(-.74,1.10,1.75,1.60,.113,.33);
  contact(-.12,-.43,1.3,1.4,.084,.38);
  contact(2.5,.95,1.05,.95,.084,.45);
  contact(2.76,-2.02,.9,.9,.084,.38);
  contact(1.55,1.92,1.15,.9,.084,.4);
  // Desk, drawers and brass feet. Screens display actual simulated game prices.
  const desk=sub(group,[.55,0,-1.53]);
  box(desk,[2.8,.13,.97],[0,1.02,0],palette.wood,true);
  [-1.18,1.18].forEach(x=>[-.33,.32].forEach(z=>box(desk,[.07,1,.07],[x,.48,z],ink,true)));
  box(desk,[.60,.68,.73],[1,.62,0],palette.wallLeft,true);
  [.45,.69,.91].forEach(y=>{box(desk,[.51,.017,.01],[1,y,.38],ink);box(desk,[.14,.028,.03],[1,y+.07,.4],brass,true);});
  const chartCanvas=document.createElement('canvas');chartCanvas.width=512;chartCanvas.height=300;
  const chartContext=chartCanvas.getContext('2d');
  const chartTexture=new T.CanvasTexture(chartCanvas);chartTexture.colorSpace=T.SRGBColorSpace;textures.add(chartTexture);
  const screenMat=new T.MeshBasicMaterial({map:chartTexture});materialCache.set('chart',screenMat);
  function monitor(x, scale=1) {
    const m=sub(desk,[x,1.1,-.12]);m.scale.setScalar(scale);
    box(m,[.45,.03,.25],[0,0,.04],ink,true);box(m,[.065,.30,.06],[0,.15,0],ink,true);
    box(m,[1.08,.70,.065],[0,.56,0],ink,true);
    const display=new T.Mesh(new T.PlaneGeometry(.98,.59),screenMat);display.position.set(0,.56,.035);m.add(display);surfaces.push(display);
    interactionMeshes.push({object:m,action:'market'});return m;
  }
  monitor(-.53);const secondMonitor=monitor(.60,.82);
  box(desk,[.81,.035,.26],[-.48,1.12,.25],'#d9d3c6',true);
  for(let row=0;row<3;row++) for(let col=0;col<9;col++)box(desk,[.056,.009,.043],[-.79+col*.075,1.142,.18+row*.065],row===2&&col===4?'#b77b4b':'#aab4ae',true);
  box(desk,[.25,.012,.28],[.18,1.10,.26],'#4a6362',true);
  sphere(desk,.052,[.18,1.13,.25],'#d8d8cd',[.75,.45,1.1]);
  cylinder(desk,.075,.065,.13,[-1.10,1.17,.16],cream);
  const mugHandle=new T.Mesh(new T.TorusGeometry(.044,.012,6,12),mat(cream));mugHandle.position.set(-1.02,1.17,.16);desk.add(mugHandle);surfaces.push(mugHandle);
  // Articulated desk lamp with a warm pool of light.
  const lamp=sub(desk,[1.14,1.1,-.3]);
  cylinder(lamp,.115,.13,.035,[0,.01,0],brass);
  tube(lamp,[0,.03,0],[0,.5,0],.019,brass);tube(lamp,[0,.5,0],[-.23,.62,0],.019,brass);
  cylinder(lamp,.04,.13,.15,[-.23,.55,0],ink);
  cylinder(lamp,.105,.105,.012,[-.23,.472,0],glow);
  const lampLight=new T.PointLight('#ffbc72',1.3,4,2);lampLight.position.set(1.45,1.60,-1.78);scene.add(lampLight);
  // Chair and a seated character, built with deliberately simple soft shapes.
  const chair=sub(group,[-.12,0,-.43]);
  cylinder(chair,.27,.31,.055,[0,.15,0],ink,8);
  cylinder(chair,.037,.037,.44,[0,.36,0],brass);
  box(chair,[.67,.13,.62],[0,.61,0],ink,true);
  box(chair,[.64,.68,.12],[0,.96,.27],ink,true);
  [-.38,.38].forEach(x=>{box(chair,[.06,.32,.05],[x,.73,.03],ink,true);box(chair,[.09,.055,.4],[x,.91,.015],ink,true);});
  const person=sub(chair,[0,.69,-.04]);
  const jacket=mat('#c27f53'), skin=mat('#cc956e'), hair=mat('#3d2a23');
  jacket.map=linen;jacket.roughness=.95;skin.roughness=.65;hair.roughness=.88;
  const torso=sphere(person,.27,[0,.39,0],jacket,[.9,1.15,.67]);
  cylinder(person,.18,.20,.08,[0,.13,0],jacket,20);
  const collar=new T.Mesh(new T.TorusGeometry(.073,.016,8,20),mat('#dfc9ac'));collar.rotation.x=Math.PI/2;collar.position.set(0,.69,0);person.add(collar);surfaces.push(collar);
  cylinder(person,.071,.08,.09,[0,.73,0],skin,12);
  const head=sub(person,[0,.91,-.035]);
  sphere(head,.20,[0,0,0],skin,[.90,1.08,.88]);
  sphere(head,.205,[0,.085,.029],hair,[.96,.79,.90]);
  sphere(head,.135,[0,.015,.117],hair,[1.37,1.12,.59]);
  for(let i=0;i<4;i++){
    const lock=sphere(head,.07,[-.10+i*.055,.193,-.074],hair,[1.2,.60,1.1]);lock.rotation.z=-.24;
  }
  [-.175,.175].forEach(x=>sphere(head,.05,[x,-.02,0],skin,[.5,1,1]));
  [-.09,.09].forEach(x=>sphere(head,.02,[x,.017,-.169],ink,[1,.8,.4]));
  sphere(head,.035,[0,-.035,-.172],skin,[.65,.75,1]);
  const glasses=mat('#b69a73',{metalness:.25,roughness:.4});
  for(const x of [-.083,.083]){
    const rim=new T.Mesh(new T.TorusGeometry(.054,.006,6,18),glasses);rim.position.set(x,.019,-.167);head.add(rim);surfaces.push(rim);
    tube(head,[x,.029,-.16],[Math.sign(x)*.172,.036,.04],.005,glasses);
  }
  tube(head,[-.03,.027,-.181],[.03,.027,-.181],.005,glasses);
  const ponytail=sphere(head,.15,[.02,-.02,.28],hair,[.65,1.6,.65]);
  [-.15,.15].forEach(x=>{
    box(person,[.18,.17,.40],[x,.01,-.12],'#364653',true);
    box(person,[.16,.40,.17],[x,-.20,-.31],'#364653',true);
    box(person,[.185,.10,.29],[x,-.44,-.37],cream,true);
  });
  const arms=[];
  [-1,1].forEach(sign=>{
    const arm=sub(person,[sign*.26,.55,-.02]);
    const upper=sphere(arm,.084,[0,-.13,-.05],jacket,[1,2.1,1]);upper.rotation.x=.32;
    sphere(arm,.075,[0,-.255,-.20],jacket,[.92,.95,2.05]);
    sphere(arm,.077,[0,-.24,-.37],skin,[.8,.7,1.15]);arms.push(arm);
  });
  // Lounge corner: wool rug, a deep sofa, stitched cushions and nesting table.
  box(group,[3.9,.023,2.62],[-.7,.084,.95],'#ddd0b3',true);
  const rugMat=mat('#98a99c');rugMat.map=linen;
  box(group,[3.61,.008,2.35],[-.7,.101,.95],rugMat,true);
  for(let i=0;i<5;i++)box(group,[3.5,.002,.027],[-.7,.107,.10+i*.42],'#82978a');
  for(let i=0;i<22;i++)for(const side of [-1,1])box(group,[.015,.007,.11],[-2.42+i*.163,.097,.95+side*1.30],'#d9cfb9');
  const sofa=sub(group,[-2.64,0,.54],Math.PI/2);
  box(sofa,[2.09,.28,.81],[0,.40,0],palette.fabric,true);
  box(sofa,[2.12,.59,.18],[0,.77,-.34],palette.fabric,true);
  [-.97,.97].forEach(x=>box(sofa,[.19,.42,.87],[x,.64,0],palette.fabric,true));
  const cushionMat=mat('#a4b3a0');cushionMat.map=linen;
  [-.47,.47].forEach(x=>{
    box(sofa,[.85,.18,.64],[x,.58,.03],cushionMat,true);
    tube(sofa,[x-.38,.602,.347],[x+.38,.602,.347],.007,'#c1ccb6');
    for(const dx of [-.17,.17])sphere(sofa,.015,[x+dx,.866,-.235],'#657d6a',[1,1,.4]);
  });
  [-.73,.73].forEach(x=>[-.26,.26].forEach(z=>cylinder(sofa,.04,.035,.19,[x,.15,z],walnut,8)));
  const pillow=box(sofa,[.38,.34,.14],[-.58,.86,-.18],palette.accent,true);pillow.rotation.z=.16;
  const pillow2=box(sofa,[.35,.31,.13],[.54,.86,-.17],cream,true);pillow2.rotation.z=-.12;
  const throwGeo=new T.PlaneGeometry(.43,.95,10,18),throwPos=throwGeo.attributes.position;
  for(let i=0;i<throwPos.count;i++){
    const x=throwPos.getX(i),t=(throwPos.getY(i)+.475)/.95;
    throwPos.setXYZ(i,x,.50+Math.sin(t*Math.PI*.9)*.31,.37-t*.78+Math.cos(x*28)*.012);
  }
  throwGeo.computeVertexNormals();const throwMat=mat('#d1b080');throwMat.map=linen;throwMat.side=T.DoubleSide;
  const blanket=new T.Mesh(throwGeo,throwMat);blanket.position.x=.48;blanket.castShadow=true;blanket.receiveShadow=true;sofa.add(blanket);surfaces.push(blanket);
  const table=sub(group,[-.74,0,1.10]);
  cylinder(table,.62,.62,.08,[0,.55,0],palette.wood,32);
  [0,2.1,4.2].forEach(a=>cylinder(table,.035,.04,.48,[Math.cos(a)*.38,.28,Math.sin(a)*.38],ink,8));
  box(table,[.38,.055,.26],[.06,.62,0],'#304d54',true);
  box(table,[.32,.035,.23],[.02,.665,0],cream,true);
  cylinder(table,.09,.075,.13,[-.29,.655,.13],'#b36c50');
  cylinder(table,.047,.047,.012,[-.29,.725,.13],'#593727');
  // Shelves with individual books, speaker and a small sculptural object.
  const shelf=sub(group,[-3.18,0,-1.36]);
  [.68,1.42,2.18].forEach(y=>box(shelf,[.50,.06,1.36],[0,y,0],palette.wood,true));
  const bookColors=['#b5684e','#d4b875','#d9d6bd','#51716a','#384e60'];
  for(let i=0;i<7;i++)box(shelf,[.28,.36+(i%3)*.04,.08],[.02,1.63,-.48+i*.12],bookColors[i%5],true);
  for(let i=0;i<4;i++)box(shelf,[.29,.055,.40],[.02,.745+i*.056,-.29],bookColors[(i+2)%5],true);
  box(shelf,[.24,.36,.25],[.04,.89,.36],ink,true);
  const speaker=cylinder(shelf,.067,.067,.015,[.17,.91,.36],'#80978c');speaker.rotation.z=Math.PI/2;
  cylinder(shelf,.10,.15,.24,[.01,2.33,-.28],'#c9b690',16);
  sphere(shelf,.14,[.01,2.52,-.28],'#c9b690',[1,.4,1]);
  // Bank safe and plant are distinct, touchable destinations in the room.
  const safe=sub(group,[2.50,0,.95],-.16);
  box(safe,[.69,.87,.61],[0,.48,0],ink,true);
  box(safe,[.58,.66,.055],[0,.49,.327],palette.wallLeft,true);
  const dial=cylinder(safe,.085,.085,.045,[.04,.52,.374],brass);dial.rotation.x=Math.PI/2;
  box(safe,[.20,.025,.04],[-.04,.70,.38],brass,true);
  box(safe,[.28,.045,.19],[0,.96,0],'#506c55',true);
  box(safe,[.05,.051,.20],[0,.96,0],cream);
  interactionMeshes.push({object:safe,action:'bank'});
  const upgrades=sub(group,[1.55,0,1.92]);
  box(upgrades,[.83,.42,.53],[0,.26,0],palette.wood,true);
  box(upgrades,[.87,.07,.57],[0,.51,0],palette.wood,true);
  box(upgrades,[.18,.022,.035],[0,.36,.29],brass,true);
  box(upgrades,[.49,.045,.29],[-.10,.575,0],'#7596a3',true);
  box(upgrades,[.29,.035,.20],[-.08,.61,0],cream,true);
  interactionMeshes.push({object:upgrades,action:'upgrades'});
  function plant(x,z,scale=1) {
    const p=sub(group,[x,0,z]);p.scale.setScalar(scale);
    cylinder(p,.20,.135,.33,[0,.235,0],'#ad6c50');cylinder(p,.19,.19,.025,[0,.415,0],'#45392d');
    for(let i=0;i<9;i++) {
      const angle=i*2.4, height=.67+(i%3)*.18;
      const end=[Math.cos(angle)*.21,height,Math.sin(angle)*.21];
      tube(p,[0,.39,0],end,.013,'#537455');
      const leaf=sphere(p,.16,end,i%2?'#72946a':'#466b58',[.56,1.7,.24]);leaf.rotation.z=Math.cos(angle)*.56;leaf.rotation.y=angle;
    }
    return p;
  }
  plant(2.76,-2.02,1.16); plant(-2.61,2.25,.78);
  const bonusPlant=plant(2.75,2.26,.75);
  // Build each property once. Switching equipment swaps geometry atomically;
  // no image download, empty frame or fallback background between properties.
  const propertyViews = new Map();
  const marble=texture(256,256,(ctx,w,h)=>{
    ctx.fillStyle='#e0ddd4';ctx.fillRect(0,0,w,h);
    for(let i=0;i<17;i++){ctx.strokeStyle=i%3?'#b5b6b244':'#9caaa050';ctx.lineWidth=i%3?.8:2;ctx.beginPath();ctx.moveTo(i*27-160,0);ctx.bezierCurveTo(i*27-100,80,i*27+80,155,i*27+90,h);ctx.stroke();}
  });
  const wallFinishes=new Map();
  function wallFinish(tier){
    if(wallFinishes.has(tier))return wallFinishes.get(tier);
    const map=texture(768,448,(ctx,w,h)=>{
      const colors=['#aaa68f','#d0c1aa','#a56e54','#b9b49a','#a89c7f','#617580','#e7ddc5','#cbd4d1','#acc8b4','#3d5667'];
      ctx.fillStyle=colors[tier];ctx.fillRect(0,0,w,h);
      if(tier===0){
        // Peeling plaster, damp patches and branching cracks, baked once per room.
        for(let i=0;i<70;i++){ctx.fillStyle=i%2?'#76765d30':'#ddd2b936';ctx.beginPath();ctx.ellipse(random()*w,random()*h,15+random()*70,8+random()*30,random()*3,0,7);ctx.fill();}
        ctx.fillStyle='#776951';ctx.fillRect(430,255,215,140);
        for(let row=0;row<5;row++)for(let col=0;col<5;col++){ctx.fillStyle=(row+col)%2?'#9e755a':'#ad8162';ctx.fillRect(435+col*40+(row%2)*8,260+row*25,35,20);}
        const crack=(x,y,dx,dy,n)=>{ctx.beginPath();ctx.moveTo(x,y);for(let i=0;i<n;i++){x+=dx+(random()-.5)*17;y+=dy;ctx.lineTo(x,y);}ctx.stroke();return [x,y];};
        ctx.strokeStyle='#514e43';ctx.lineWidth=2.5;
        crack(160,0,6,20,12);crack(195,110,-12,11,7);crack(230,210,15,9,6);crack(650,0,-6,15,11);crack(602,115,13,11,8);
      }else if(tier===2){
        for(let r=0;r<15;r++)for(let c=0;c<11;c++){ctx.fillStyle=(c+r)%3?'#9d6952':'#b17b60';ctx.fillRect(c*76-(r%2)*38,r*31,71,26);}
      }else if(tier===4){
        ctx.fillStyle='#8c795a';ctx.fillRect(0,h*.55,w,h*.45);ctx.strokeStyle='#584c3a';ctx.lineWidth=3;
        for(let x=0;x<w;x+=42){ctx.beginPath();ctx.moveTo(x,h*.55);ctx.lineTo(x,h);ctx.stroke();}
      }else if(tier===5||tier===7||tier===9){
        ctx.strokeStyle=tier===9?'#98b8ba66':'#ded4b699';ctx.lineWidth=3;
        for(let x=35;x<w;x+=145)ctx.strokeRect(x,28,114,h-56);
      }else if(tier===6){
        for(let x=0;x<w;x+=32){ctx.fillStyle=x%64?'#5e929c':'#d6e4d6';ctx.fillRect(x,h-65,29,54);}
      }else if(tier===1){
        ctx.strokeStyle='#b8a58b';ctx.lineWidth=1;for(let x=0;x<w;x+=24){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
      }
    });
    const m=new T.MeshStandardMaterial({map,roughness:tier>=5?.6:.95});materialCache.set('wall-finish-'+tier,m);wallFinishes.set(tier,m);return m;
  }
  const pathLamp=mat('#d5b77f',{emissive:'#ffd08a',emissiveIntensity:0,roughness:.35});
  const pathGlowMap=texture(64,64,(ctx,w,h)=>{
    const g=ctx.createRadialGradient(w/2,h/2,1,w/2,h/2,w/2);g.addColorStop(0,'rgba(255,222,156,.8)');g.addColorStop(1,'rgba(255,222,156,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  });
  const pathGlow=new T.MeshBasicMaterial({map:pathGlowMap,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending});materialCache.set('pathGlow',pathGlow);
  const propertyNames = {
    es:['Mi primer estudio','Mi apartamento','Mi ático de soltero','Mi casa','Mi casa con viñedo','Mi penthouse de lujo','Mi villa mediterránea','Mi palacio de cristal','Mi isla privada','Mi sede mundial'],
    en:['My first studio','My apartment','My bachelor loft','My house','My vineyard house','My luxury penthouse','My Mediterranean villa','My crystal palace','My private island','My global headquarters'],
    zh:['我的第一个工作室','我的公寓','我的单身阁楼','我的家','我的葡萄园住宅','我的豪华顶层公寓','我的地中海别墅','我的水晶宫','我的私人岛屿','我的全球总部']
  };
  function propertyView(tier) {
    if(propertyViews.has(tier))return propertyViews.get(tier);
    const interior=sub(group), exterior=sub(windowGroup), landscape=sub(group);
    const finish=new T.Mesh(new T.PlaneGeometry(5.57,3.10),wallFinish(tier));finish.rotation.y=Math.PI/2;finish.position.set(-3.355,1.72,-.02);finish.receiveShadow=true;interior.add(finish);surfaces.push(finish);
    if(![3,4,6,8].includes(tier)){
      box(landscape,[10.2,.18,8.4],[.65,-.51,-.15],tier===0?'#4d5352':tier===7?'#6f8e75':'#6e7981',true);
      box(landscape,[1.8,.08,7.2],[4.37,-.36,-.1],tier===0?'#777870':tier===2?'#8d7661':'#b5b5a6',true);
      if(tier===0){
        const bin=sub(landscape,[4.65,-.32,-2.15]);box(bin,[.76,.67,.70],[0,.34,0],'#456556',true);box(bin,[.83,.08,.76],[0,.72,0],'#304b41',true);
        for(let i=0;i<4;i++)box(landscape,[.64,.07,.40],[4.45,-.22+i*.09,1.5],'#998468');
        for(let i=0;i<6;i++)sphere(landscape,.1,[4.0+(i%2)*.6,-.27,-.9+Math.floor(i/2)*.62],'#706b60',[1,.2,.6]);
      }else{
        for(let i=0;i<8;i++)box(landscape,[.035,.65,.035],[5.32,0,-3.6+i*.99],tier>=5?'#b0c4c1':'#455761');
        box(landscape,[.05,.05,7.0],[5.32,.34,-.15],tier>=5?brass:ink,true);
        if(tier===1||tier===2){
          cylinder(landscape,.36,.36,.06,[4.4,.2,.4],palette.wood);cylinder(landscape,.03,.03,.5,[4.4,-.06,.4],ink);
          for(const z of [-.3,1.1])box(landscape,[.45,.1,.45],[4.4,.02,z],tier===1?'#d1bd94':'#73594a',true);
          box(landscape,[.58,.33,1.1],[4.4,-.13,-2.3],'#8c735a',true);
          for(let i=0;i<4;i++)sphere(landscape,.17,[4.4,.12,-2.7+i*.25],'#597b58');
        }
        if(tier===5){
          box(landscape,[1.27,.09,3.7],[4.4,-.25,-.1],'#d0d2c2',true);
          box(landscape,[1.02,.035,3.42],[4.4,-.19,-.1],'#488e9f',true);
          for(let i=0;i<5;i++)box(landscape,[.66,.005,.016],[4.4,-.167,-1.45+i*.66],'#a9d0cf');
        }
        if(tier===7){
          for(const z of [-2.8,2.5]){box(landscape,[1.4,.36,.5],[4.4,-.17,z],'#55745b',true);}
          cylinder(landscape,.62,.65,.18,[4.4,-.21,0],'#d7d4bf',32);
          cylinder(landscape,.51,.51,.025,[4.4,-.105,0],'#6697a1',32);
          cylinder(landscape,.15,.23,.54,[4.4,.12,0],cream,16);
          sphere(landscape,.13,[4.4,.47,0],brass);
        }
        if(tier===9){
          cylinder(landscape,.77,.77,.025,[4.4,-.29,0],'#273c49',32);
          for(const x of [4.18,4.62])box(landscape,[.075,.01,.72],[x,-.27,0],'#d5c48c');
          box(landscape,[.46,.01,.075],[4.4,-.27,0],'#d5c48c');
          for(const z of [-2.5,2.3]){box(landscape,[.85,.14,.65],[4.4,-.22,z],'#233b4c');const panel=box(landscape,[.77,.045,.57],[4.4,-.10,z],'#4c738a');panel.rotation.z=-.15;}
        }
      }
    }
    const rural=tier===3||tier===4, seaside=tier===6||tier===8;
    if(rural||seaside) {
      // Warm path lighting shares one material and does not add costly shadow lights.
      for(const z of [-2.2,.1,2.35]){
        const x=3.70;
        cylinder(landscape,.035,.055,.41,[x,-.10,z],'#344b48',10);
        cylinder(landscape,.085,.085,.12,[x,.16,z],pathLamp,12);
        cylinder(landscape,.11,.11,.035,[x,.24,z],'#344b48',12);
        const pool=new T.Mesh(new T.PlaneGeometry(1.0,1.0),pathGlow);pool.rotation.x=-Math.PI/2;pool.position.set(x,-.245,z);landscape.add(pool);surfaces.push(pool);
      }
      // A real outdoor plot around the cutaway house, not a backdrop image.
      box(landscape,[10.2,.20,8.4],[.65,-.51,-.15],seaside?'#357f90':'#617d52',true);
      box(landscape,[8.0,.10,6.5],[.1,-.37,-.04],seaside?'#d7c396':'#859762',true);
      if(rural) {
        // Stone garden path, fence, trees and rows of trained vines.
        for(let i=0;i<8;i++)box(landscape,[.53,.06,.48],[3.87,-.27,-2.9+i*.80],i%2?'#b7ad91':'#c3bba2',true);
        for(let i=0;i<7;i++)box(landscape,[.08,.54,.08],[5.30,-.08,-3.6+i*1.14],'#a38e69',true);
        for(const y of [-.04,.16])box(landscape,[.05,.05,7.3],[5.30,y,-.18],'#b9a780',true);
        const tree=(x,z,scale=1)=>{
          const t=sub(landscape,[x,-.34,z]);t.scale.setScalar(scale);
          cylinder(t,.055,.095,.8,[0,.4,0],'#776048');
          for(let i=0;i<4;i++)sphere(t,.34,[Math.sin(i*2)*.19,.88+(i%2)*.22,Math.cos(i*2)*.19],i%2?'#708c59':'#486e50',[1,1.1,1]);
        };
        tree(-3.96,-3.65,1.15);tree(4.75,-3.28,.9);tree(-3.98,2.5,.7);
        if(tier===4) {
          for(let row=0;row<3;row++) {
            const x=4.42+row*.30;
            box(landscape,[.12,.02,4.45],[x,-.38,.35],'#675b40',true);
            for(let j=0;j<6;j++) {
              const z=-1.5+j*.73;
              box(landscape,[.035,.43,.035],[x,-.12,z],'#aa9771');
              sphere(landscape,.13,[x,.10,z],'#537746',[.72,.82,1.9]);
              sphere(landscape,.045,[x+.07,.06,z+.07],'#656086');
            }
            tube(landscape,[x,.04,-1.65],[x,.04,2.35],.012,'#8d967b');
          }
        } else {
          for(let i=0;i<8;i++) {
            const x=4.55+(i%2)*.32,z=-1.75+Math.floor(i/2)*.85;
            sphere(landscape,.19,[x,-.23,z],'#58794b',[1,.55,1]);
            sphere(landscape,.045,[x,.0,z],i%2?'#e3c373':'#b78fa5');
          }
        }
      } else {
        // Beach on one side, water on the other. Wavelets stay below the floor.
        box(landscape,[1.46,.035,6.9],[4.42,-.36,-.22],'#daca9f',true);
        for(let i=0;i<12;i++)box(landscape,[.20+(i%3)*.12,.012,.025],[4.9+(i%2)*.36,-.398,-3.7+i*.63],'#aed7d0',true);
        for(let i=0;i<6;i++)box(landscape,[.53,.012,.025],[-3.6+i*1.42,-.397,3.7],'#aed7d0',true);
        const palm=(x,z,scale=1)=>{
          const t=sub(landscape,[x,-.32,z]);t.scale.setScalar(scale);
          tube(t,[0,0,0],[.10,1.35,0],.065,'#9c8059');
          for(let i=0;i<7;i++){
            const a=i*Math.PI*2/7,leaf=sphere(t,.30,[.1+Math.sin(a)*.28,1.37,Math.cos(a)*.28],'#547d65',[.48,.14,1.65]);
            leaf.rotation.y=a;leaf.rotation.x=.15;
          }
        };
        palm(4.54,-2.85,1.12);palm(-3.92,-3.58,.9);palm(4.65,2.72,.75);
        if(tier===6){
          // Shaded Mediterranean pergola, distinct from the open island beach.
          for(const x of [3.83,5.03])for(const z of [.60,2.15])box(landscape,[.085,1.55,.085],[x,.45,z],'#e4d7b8',true);
          for(let i=0;i<6;i++)box(landscape,[1.43,.075,.075],[4.43,1.26,.55+i*.33],'#b09670',true);
          for(let i=0;i<7;i++)sphere(landscape,.13,[4.83,1.27,.55+i*.24],i%2?'#936184':'#708451',[1.6,.5,1]);
          for(let i=0;i<6;i++)box(landscape,[.47,.025,.48],[3.92,-.29,-1.6+i*.68],'#bb9470',true);
          cylinder(landscape,.20,.14,.35,[4.6,-.16,.35],'#b27455');
          sphere(landscape,.27,[4.6,.15,.35],'#80926b',[1,.8,1]);
        } else {
          for(let i=0;i<8;i++)box(landscape,[.66,.045,.19],[4.43,-.24,-.63+i*.20],'#b59469',true);
          const chair=sub(landscape,[4.43,-.15,.07]);
          box(chair,[.47,.08,.85],[0,.16,0],'#e6d8b6',true);
          const back=box(chair,[.47,.42,.07],[0,.36,-.39],'#e6d8b6',true);back.rotation.x=-.25;
        }
      }
    }
    // All exterior silhouettes stay inside the real window aperture.
    if([3,4,6,8].includes(tier)) {
      const coast=tier===6||tier===8;
      box(exterior,[3.74,.62,.025],[0,1.36,-.35],coast?'#3e9caa':'#78916a');
      for(let i=0;i<5;i++) {
        if(coast)box(exterior,[.46,.014,.016],[-1.42+i*.66,1.18+(i%3)*.12,-.31],'#a3d4ca',true);
        else sphere(exterior,.43,[-1.45+i*.72,1.54,-.36],i%2?'#6c875c':'#93a477',[1.2,.43,.05]);
      }
      if(tier===4)for(let row=0;row<4;row++)for(let vine=0;vine<7;vine++) {
        const x=-1.55+vine*.5,y=1.12+row*.095;
        box(exterior,[.025,.075,.025],[x,y,-.29],'#806849');
        sphere(exterior,.055,[x,y+.038,-.28],'#456f4d',[2,.45,.35]);
      }
      if(tier===3){
        box(exterior,[.65,.26,.05],[-.8,1.4,-.26],'#dfc9a6');
        const roof=cylinder(exterior,.01,.48,.23,[-.8,1.64,-.26],'#a9674e',4);roof.scale.z=.2;roof.rotation.y=Math.PI/4;
      }
      if(coast) {
        sphere(exterior,.43,[1.08,1.25,-.28],'#d9c68e',[1.6,.24,.06]);
        for(const x of [.92,1.29]){
          tube(exterior,[x,1.29,-.24],[x-.05,1.86,-.24],.022,'#846343');
          for(let j=0;j<5;j++){const leaf=sphere(exterior,.16,[x-.05+(j-2)*.09,1.85-Math.abs(j-2)*.04,-.24],'#426f57',[1.05,.22,.09]);leaf.rotation.z=(j-2)*.22;}
        }
      }
    } else if(tier===7) {
      box(exterior,[3.74,.40,.025],[0,1.24,-.34],'#738a83');
      for(let i=0;i<9;i++){const tree=cylinder(exterior,.015,.13,.57,[-1.65+i*.41,1.5,-.29],'#3b6659',8);tree.scale.z=.25;}
    }
    // Architectural and furnishing signatures, not just a different label.
    if(tier===0){
      box(interior,[.85,.47,1.55],[-2.55,.33,-1.75],'#8a9fa3',true);
      box(interior,[.8,.10,.45],[-2.55,.62,-2.21],cream,true);
      for(let i=0;i<3;i++)box(interior,[.60,.34,.49],[-2.64+i*.58,.27,.62],'#a38c67',true);
      box(interior,[.20,.012,.51],[-2.05,.45,.62],'#d1bd89');
      for(let i=0;i<3;i++)box(interior,[.20,.004,.07],[.52+i*.14,1.089,-1.12],'#b8a57f');
    }
    if(tier===1||tier===2){
      const cabinet=sub(interior,[-2.76,0,-1.75]);
      box(cabinet,[.75,1.5,.70],[0,.83,0],tier===1?'#957554':'#414e5e',true);
      for(const y of [.38,.78,1.18])box(cabinet,[.60,.025,.72],[0,y,.02],cream);
      if(tier===2)for(let i=0;i<5;i++)box(interior,[.09,3,.10],[-3.20,1.6,-2.32+i*.21],'#8d6350',true);
      if(tier===2)box(interior,[6.5,.16,.14],[0,3.13,-2.62],'#3a4148',true);
    }
    if(tier===3||tier===4){
      const hearth=sub(interior,[-3.03,0,-1.75]);
      box(hearth,[.57,1.35,1.15],[0,.74,0],'#aa9b83',true);
      box(hearth,[.04,.64,.73],[.30,.53,0],'#302d2b',true);
      box(hearth,[.74,.12,1.29],[0,1.43,0],walnut,true);
      if(tier===4){
        for(let i=0;i<3;i++){const barrel=cylinder(interior,.19,.19,.47,[-2.64+i*.37,.34,-2.29],'#896044',16);barrel.scale.z=.8;}
        for(const z of [-2.35,.2,2.35])box(interior,[.13,.16,.55],[-3.14,3.15,z],'#6f533b',true);
        const rack=sub(interior,[-3.18,1.65,.36]);
        box(rack,[.17,.95,1.15],[0,0,0],'#6f533b',true);
        for(let row=0;row<3;row++)for(let col=0;col<4;col++){const bottle=cylinder(rack,.045,.045,.24,[.16,-.31+row*.29,-.42+col*.27],'#435c45',8);bottle.rotation.z=Math.PI/2;}
      }
    }
    if(tier>=5){
      for(const z of [-2.48,2.50]){
        cylinder(interior,.11,.14,3.08,[-3.17,1.65,z],tier===7?'#a9c1c5':'#c6bfa8');
        box(interior,[.35,.12,.35],[-3.17,.18,z],brass,true);
      }
      if(tier===5||tier===9){
        const dashboard=sub(interior,[-3.29,2.1,.25],Math.PI/2);
        box(dashboard,[1.80,.92,.06],[0,0,0],ink,true);
        const screen=new T.Mesh(new T.PlaneGeometry(1.67,.78),screenMat);screen.position.z=.04;dashboard.add(screen);surfaces.push(screen);
      }
      if(tier===6||tier===8){
        box(interior,[.90,.14,1.78],[-2.54,.52,-1.72],'#d4c4a3',true);
        box(interior,[.88,.15,1.55],[-2.54,.65,-1.65],cream,true);
        const back=box(interior,[.88,.55,.14],[-2.54,.86,-2.34],cream,true);back.rotation.x=-.22;
      }
      if(tier===7){
        const glass=mat('#92b7bf',{transparent:true,opacity:.36,metalness:.25,roughness:.12});
        for(let i=0;i<5;i++)box(interior,[.035,2.65,.59],[-3.29,1.72,-2.33+i*.70],glass);
        for(let i=0;i<4;i++)sphere(interior,.12,[-1.6+i*.42,3.03,-1.8],brass,[.6,1.6,.6]);
      }
      if(tier===9){
        const globe=sub(interior,[-2.60,0,-1.85]);
        cylinder(globe,.32,.38,.12,[0,.18,0],walnut);
        tube(globe,[0,.24,0],[0,.88,0],.055,brass);
        sphere(globe,.42,[0,1.2,0],'#638e9a');
        for(let i=0;i<6;i++)sphere(globe,.13,[Math.sin(i)*.33,1.2+Math.cos(i)*.26,.22],'#a6b58d',[1,.7,.3]);
      }
    }
    const result={interior,exterior,landscape};propertyViews.set(tier,result);return result;
  }
  const trophyGroup=sub(group,[1.72,1.10,-1.43]);
  box(trophyGroup,[.20,.05,.20],[0,0,0],walnut,true);
  cylinder(trophyGroup,.023,.035,.16,[0,.10,0],brass);
  cylinder(trophyGroup,.10,.028,.14,[0,.24,0],brass,12);
  const watch=box(person,[.155,.047,.045],[.26,.28,-.21],brass,true);
  // Lighting passes through continuous keyframes, including night -> dawn.
  const hemi=new T.HemisphereLight('#d5e5eb','#6c6556',2.3);scene.add(hemi);
  const key=new T.DirectionalLight('#ffe4b5',3.2);key.position.set(-1,7,4);key.castShadow=true;
  key.shadow.mapSize.set(innerWidth<700?1024:2048,innerWidth<700?1024:2048);
  Object.assign(key.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.5,far:25});
  key.shadow.normalBias=.035;key.shadow.bias=-.0002;key.shadow.radius=3;scene.add(key);
  const fill=new T.DirectionalLight('#a6cee0',1.05);fill.position.set(4,3,5);scene.add(fill);
  const monitorLight=new T.PointLight('#8fcab6',.35,2,2);monitorLight.position.set(.05,1.75,-1.5);scene.add(monitorLight);
  // Soft window-light footprint, with mullions and feathered edges.
  const sunlightMap=texture(256,256,(ctx,w,h)=>{
    const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(255,237,197,0)');g.addColorStop(.13,'rgba(255,237,197,.8)');g.addColorStop(.72,'rgba(255,237,197,.65)');g.addColorStop(1,'rgba(255,237,197,0)');ctx.fillStyle=g;ctx.fillRect(12,0,w-24,h);
    ctx.clearRect(82,0,8,h);ctx.clearRect(165,0,8,h);ctx.clearRect(0,132,w,7);
  });
  const sunlightMat=new T.MeshBasicMaterial({map:sunlightMap,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending});materialCache.set('sunlight',sunlightMat);
  const sunlight=new T.Mesh(new T.PlaneGeometry(3.3,2.3),sunlightMat);sunlight.rotation.x=-Math.PI/2;sunlight.rotation.z=-.18;sunlight.position.set(.55,.12,.48);sunlight.renderOrder=2;group.add(sunlight);surfaces.push(sunlight);
  const warmPool=contact(1.23,-1.47,1.3,1.1,1.092,.24);
  warmPool.material.map=texture(128,128,(ctx,w,h)=>{
    const glow=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);
    glow.addColorStop(0,'rgba(255,255,255,.65)');glow.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
  });
  warmPool.material.color.set('#ffbb65');warmPool.material.blending=T.AdditiveBlending;
  let shadowTime=0;
  const lightKeys=[
    {p:0,bg:'#142333',sky:'#a29ba7',sun:'#f2baa0',int:1.4,ambient:1.7,lamp:.95},
    {p:.14,bg:'#233643',sky:'#e6bb9a',sun:'#ffce92',int:2.6,ambient:2.2,lamp:.25},
    {p:.37,bg:'#1d3548',sky:'#8bbfd5',sun:'#fff1d2',int:3.1,ambient:2.55,lamp:.1},
    {p:.60,bg:'#2f3040',sky:'#d8a090',sun:'#ffb987',int:2.25,ambient:2.1,lamp:.45},
    {p:.74,bg:'#181e33',sky:'#6d7399',sun:'#a7b9e2',int:1.2,ambient:1.5,lamp:1.3},
    {p:.87,bg:'#101c2c',sky:'#3f5574',sun:'#93b5df',int:.9,ambient:1.45,lamp:1.6},
    {p:1,bg:'#142333',sky:'#a29ba7',sun:'#f2baa0',int:1.4,ambient:1.7,lamp:.95}
  ].map(k=>({...k,bg:new T.Color(k.bg),sky:new T.Color(k.sky),sun:new T.Color(k.sun)}));

  function hotspot(action, point) {
    const button=document.createElement('button');button.type='button';button.className='room-hotspot';
    button.dataset.action=action;button.innerHTML=icon(action)+'<span></span>';
    button.addEventListener('click',()=>bridge.open(action));overlay.append(button);
    hot.push({button,point:new T.Vector3(...point),span:button.querySelector('span')});
  }
  hotspot('market',[.10,2.24,-1.55]);hotspot('bank',[2.5,1.36,.95]);hotspot('upgrades',[1.55,.88,1.92]);
  const raycaster=new T.Raycaster(),pointer=new T.Vector2();
  function pick(event) {
    const r=canvas.getBoundingClientRect();pointer.set(((event.clientX-r.left)/r.width)*2-1,-((event.clientY-r.top)/r.height)*2+1);
    raycaster.setFromCamera(pointer,camera);
    const hits=raycaster.intersectObjects(interactionMeshes.map(h=>h.object),true);
    if(hits.length) {
      let o=hits[0].object;
      while(o){const hit=interactionMeshes.find(h=>h.object===o);if(hit)return hit.action;o=o.parent;}
    }
    return null;
  }
  let drag=null;
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,yaw:api.yaw,moved:false};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{
    if(drag) {
      if(Math.abs(e.clientX-drag.x)>8||Math.abs(e.clientY-drag.y)>8)drag.moved=true;
      if(drag.moved){api.yaw=Math.max(-.18,Math.min(.18,drag.yaw+(e.clientX-drag.x)*.0018));fit();}
    } else if(e.pointerType==='mouse')canvas.style.cursor=pick(e)?'pointer':'grab';
  });
  canvas.addEventListener('pointerup',e=>{if(drag&&!drag.moved){const action=pick(e);if(action)bridge.open(action);}if(drag?.moved)rememberCamera(api);drag=null;});
  canvas.addEventListener('pointercancel',()=>{drag=null;});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();host.dispatchEvent(new Event('room-context-lost'));});

  function positionHotspots() {
    camera.updateMatrixWorld();
    // On narrow/tall displays, a fixed action row stays clear of the character
    // and guarantees separated 44px touch targets at every device size.
    if(w<480 || h<300) {
      const gap=6, rowWidth=Math.min(w-22,330), step=rowWidth/3;
      hot.forEach((item,i)=>{
        item.button.style.left=(w-rowWidth)/2+step*(i+.5)+'px';
        item.button.style.top=(h-(h<300?29:78))+'px';
        item.button.style.maxWidth=(step-gap)+'px';
      });
      return;
    }
    const rects=[];
    hot.forEach((item,i)=>{
      const v=item.point.clone().project(camera);
      const bw=item.button.offsetWidth||90,bh=44;
      let x=Math.max(bw/2+8,Math.min(w-bw/2-8,(v.x*.5+.5)*w));
      let y=Math.max(65,Math.min(h-56,(-v.y*.5+.5)*h));
      for(const r of rects)if(Math.abs(x-r.x)<(bw+r.w)/2+6&&Math.abs(y-r.y)<bh+5)y=Math.min(h-56,r.y+bh+6);
      item.button.style.left=x+'px';item.button.style.top=y+'px';rects.push({x,y,w:bw});
    });
  }
  function fit() {
    const r=host.getBoundingClientRect();if(r.width<1||r.height<1)return;
    w=r.width;h=r.height;renderer.setSize(w,h,false);
    const a=Math.atan2(8.5,10.5)+api.yaw;camera.position.set(Math.sin(a)*13.5,8,Math.cos(a)*13.5);camera.lookAt(target);camera.updateMatrixWorld();
    // Project the room's bounding corners to fit BOTH height and width, including portrait.
    const outdoors=api.focus!=='inside';
    propertyViews.forEach(v=>{v.landscape.visible=v.interior.visible&&api.focus!=='inside';});
    host.dataset.roomFocus=api.focus;
    const bounds=new T.Box3(new T.Vector3(outdoors?-4.55:-3.62,outdoors?-.66:-.42,outdoors?-4.42:-3.25),new T.Vector3(outdoors?5.85:3.55,3.48,outdoors?4.12:2.96));
    let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity;
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
      const p=new T.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);left=Math.min(left,p.x);right=Math.max(right,p.x);bottom=Math.min(bottom,p.y);top=Math.max(top,p.y);
    }
    const aspect=w/h,sceneWidth=right-left,sceneHeight=top-bottom;
    const narrow=w<480||h<300;
    const compact=h<300;
    const padTop=narrow?(compact?37:55):22,padBottom=narrow?(compact?59:111):22;
    const usable=Math.max(60,h-padTop-padBottom);
    const spanY=Math.max(sceneHeight*h/usable,sceneWidth/aspect*1.10)/api.zoom;
    const cy=(top+bottom)/2+(padTop-padBottom)/2/h*spanY,cx=(left+right)/2;
    camera.left=cx-spanY*aspect/2;camera.right=cx+spanY*aspect/2;
    camera.top=cy+spanY/2;camera.bottom=cy-spanY/2;camera.updateProjectionMatrix();positionHotspots();
  }
  const resizeObserver=new ResizeObserver(fit);resizeObserver.observe(host);
  function localize(c) {
    labels=c;phaseShown=-1;
    text(overlay.querySelector('.room-eyebrow'),c.eyebrow);
    const language=Object.keys(COPY).find(key=>COPY[key]===c)||'es';
    text(overlay.querySelector('.room-title'),propertyNames[language][currentTier]);
    text(overlay.querySelector('.room-caption'),c.hint);
    setAttr(root,'aria-label',c.scene);
    hot.forEach(item=>{text(item.span,c[item.button.dataset.action]);setAttr(item.button,'aria-label',c[item.button.dataset.action]);});
    positionHotspots();
  }
  function setHome(id,gender) {
    const changed=currentHome&&currentHome!==id;
    currentHome=id;api.gender=gender;
    currentTier={default:0,home1b:0,home1:1,home5:2,home2:3,home6:4,home3:5,home7:6,home8:7,home4:8,home9:9}[id]||0;
    const view=propertyView(currentTier);
    propertyViews.forEach(v=>{v.interior.visible=v===view;v.exterior.visible=v===view;v.landscape.visible=v===view;});
    host.dataset.roomLandscape=[3,4].includes(currentTier)?'countryside':[6,8].includes(currentTier)?'coast':'city';
    cityGroup.visible=[0,1,2,5,9].includes(currentTier);
    cityGroup.scale.y=currentTier===5?1.35:currentTier===9?1.65:1;
    if(currentTier>=5)cityGroup.position.y=1.075*(1-cityGroup.scale.y);
    else cityGroup.position.y=0;
    host.dataset.roomVariant=String(currentTier);
    const scheme=[
      ['#5f7b7c','#455f64','#b98d63','#dfceb0','#b3684e','#718575'],
      ['#728785','#4c676a','#be966d','#e0d3b8','#b57857','#85948b'],
      ['#765f59','#4b4c55','#8b6c51','#d1bca0','#c88b4d','#626b77'],
      ['#89917b','#5c7469','#b38b5c','#e3cbaa','#b77451','#71846c'],
      ['#96876d','#627453','#987146','#e1cb9e','#9b5c56','#7c8560'],
      ['#4a6173','#354958','#aeb5b6','#d8c291','#7b9195','#a4b2b0'],
      ['#d2c7ad','#899d9b','#c8aa75','#e9dbc0','#c67e58','#8fada7'],
      ['#aac0c4','#678790','#d2d4cb','#dfcda5','#9dbbb7','#c0caca'],
      ['#8daca2','#4e817e','#bf9d67','#ead8b2','#d0a068','#8fb3a0'],
      ['#465d70','#2d4356','#828c93','#bcb6a3','#647e89','#92a6aa']
    ][currentTier];
    Object.values(palette).forEach((m,i)=>m.color.set(scheme[i]));
    planks.forEach((m,i)=>{m.color.set(scheme[2]).multiplyScalar(.94+i*.018);m.roughness=currentTier>=5?.42:.68;});
    ponytail.visible=gender==='F';jacket.color.set(gender==='F'?'#a6664f':'#bd835b');
    sofa.visible=currentTier>0;artwork.visible=currentTier>0;wainscot.visible=currentTier!==0&&currentTier!==2&&currentTier!==4;
    shelf.visible=currentTier<3||currentTier===6||currentTier===8;
    rugMat.color.set(currentTier===0?'#817c65':currentTier===2?'#886b56':currentTier>=5?'#bbc6bd':'#98a99c');
    planks.forEach(m=>{m.map=[5,7,9].includes(currentTier)?marble:oak;m.needsUpdate=true;});
    secondMonitor.visible=currentTier>=1;
    bonusPlant.visible=currentTier>=2;
    trophyGroup.visible=currentTier>=3;
    if(changed)celebrating=1.3;
    renderer.shadowMap.needsUpdate=true;
    host.dataset.roomHome=id;
    if(labels)localize(labels);
    fit();
  }
  function updateProgress(data) {
    currentBusinesses=data.businesses;
    trophyGroup.visible=currentTier>=3||currentBusinesses>=3;
    watch.visible=!!data.equipment.reloj;
    const outfit=data.equipment.ropa||'';
    if(outfit)jacket.color.set(currentTier>=3?'#33495b':'#546d66');
  }
  function light(phase,instant=false,dt=.033) {
    if(phaseSmooth<0||instant)phaseSmooth=phase;
    else {let diff=phase-phaseSmooth;if(diff<-.5)diff+=1;if(diff>.5)diff-=1;phaseSmooth=(phaseSmooth+diff*Math.min(1,dt*2.5)+1)%1;}
    const p=Math.max(0,Math.min(1,phaseSmooth));
    let k=0;while(k<lightKeys.length-2&&p>lightKeys[k+1].p)k++;
    const a=lightKeys[k],b=lightKeys[k+1],raw=(p-a.p)/(b.p-a.p),t=raw*raw*(3-2*raw);
    scene.background.copy(a.bg).lerp(b.bg,t);skyMaterial.color.copy(a.sky).lerp(b.sky,t);key.color.copy(a.sun).lerp(b.sun,t);
    key.intensity=T.MathUtils.lerp(a.int,b.int,t);hemi.intensity=T.MathUtils.lerp(a.ambient,b.ambient,t);lampLight.intensity=T.MathUtils.lerp(a.lamp,b.lamp,t);
    glow.color.copy(key.color).lerp(new T.Color('#ffcd8a'),.6);
    cityWindows.emissiveIntensity=.05+lampLight.intensity*.75;
    sun.position.x=-1.45+Math.sin(p*Math.PI)*2.7;sun.position.y=2.13+Math.sin(p*Math.PI)*.45;
    // Fade below the horizon, then fade in at dawn; never pop in/out at a phase boundary.
    sunMaterial.opacity=T.MathUtils.smoothstep(p,0,.09)*(1-T.MathUtils.smoothstep(p,.65,.77));
    sunMaterial.color.copy(key.color);
    sunlightMat.opacity=T.MathUtils.smoothstep(p,.04,.2)*(1-T.MathUtils.smoothstep(p,.56,.77))*.24;
    sunlight.rotation.z=-.35+p*.5;sunlight.position.x=.25+Math.sin(p*Math.PI)*.35;
    warmPool.material.opacity=.07+lampLight.intensity*.23;
    const night=Math.min(1,lampLight.intensity/1.2);
    pathLamp.emissiveIntensity=night*2.2;pathGlow.opacity=night*.50;
    const period=Math.min(3,Math.floor(phase*4));
    if(labels&&period!==phaseShown){phaseShown=period;text(clock,labels.phases[period]);}
  }
  function updateChart(data) {
    const ctx=chartContext;if(!ctx)return;
    ctx.fillStyle='#102530';ctx.fillRect(0,0,512,300);
    ctx.fillStyle='#b5c7cd';ctx.font='500 22px system-ui';ctx.fillText(data.asset||'BitKoin',24,38);
    ctx.fillStyle='#f2d9a8';ctx.font='600 36px system-ui';ctx.fillText('$'+Number(data.price||0).toLocaleString('en-US',{maximumFractionDigits:2}),24,82);
    ctx.strokeStyle='#203f4b';ctx.lineWidth=1;
    for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(24,118+i*34);ctx.lineTo(488,118+i*34);ctx.stroke();}
    const values=(data.history||[]).filter(Number.isFinite);if(values.length<2)values.push(data.price||1,data.price||1);
    const low=Math.min(...values),high=Math.max(...values),range=high-low||1;
    const up=values.at(-1)>=values[0];ctx.strokeStyle=up?'#8ccdae':'#dba093';ctx.lineWidth=3;ctx.beginPath();
    values.forEach((v,i)=>{const x=24+i/(values.length-1)*464,y=260-(v-low)/range*138;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();
    ctx.fillStyle='#758f99';ctx.font='16px system-ui';ctx.fillText('INVESTING NOOBS',24,286);
    chartTexture.needsUpdate=true;
  }
  function animate(t,dt) {
    shadowTime+=dt;if(shadowTime>.12){renderer.shadowMap.needsUpdate=true;shadowTime=0;}
    torso.position.y=.39+Math.sin(t*1.6)*.008;head.rotation.y=Math.sin(t*.48)*.09;
    arms[0].rotation.x=Math.sin(t*6.4)*.025;arms[1].rotation.x=Math.sin(t*6.4+1)*.023;
    if(celebrating>0){celebrating=Math.max(0,celebrating-dt);arms[1].rotation.z=-Math.sin(celebrating/1.3*Math.PI)*1.0;}
    else arms[1].rotation.z=0;
  }
  function dispose() {
    resizeObserver.disconnect();renderer.dispose();environment.dispose();
    geometryCache.forEach(g=>g.dispose());materialCache.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
    surfaces.forEach(m=>{m.geometry.dispose();});root.remove();
  }
  const api={root,scene,camera,renderer,...savedCamera(),gender:'M',fit,localize,setHome,updateProgress,light,updateChart,animate,dispose};
  updateChart(bridge.snapshot());return api;
}
