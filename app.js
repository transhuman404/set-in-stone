/* Set in Stone prototype: camera compositing and compass bearing, with a clear preview mode.
   Replace the image artwork with real GLB assets and a geospatial AR provider for production anchoring. */
const DEFAULTS = [
  { id:'princess',name:'Princess',city:'San Francisco',venue:'Oasis',address:'298 11th St, San Francisco, CA 94103',participants:['Tito Soto','Lisa Frankenstein'],image:null,lat:null,lng:null,radius:100,story:'A monument story is being prepared for this show.',link:'',linkLabel:'Explore the story',song:'' },
  { id:'monster',name:'Monster Show',city:'San Francisco',venue:'The Edge',address:'4149 18th St, San Francisco, CA 94114',participants:['KaiKai Bee Michaels','Oliver Branch','Elsa Touche','Otter'],image:null,lat:null,lng:null,radius:100,story:'A monument story is being prepared for this show.',link:'',linkLabel:'Explore the story',song:'' },
  { id:'clutch',name:'Clutch the Pearls',city:'San Francisco',venue:'Make-Out Room',address:'3225 22nd St, San Francisco, CA 94110',participants:['Churro Nomi','Mira','Major Hammy','Sir Acha','Sir Vesa','Fuchsia'],image:null,lat:null,lng:null,radius:100,story:'A monument story is being prepared for this show.',link:'',linkLabel:'Explore the story',song:'' },
  { id:'oaklash',name:'Oaklash',city:'Oakland',venue:'Old Oakland',address:'9th Street and Broadway, Oakland, CA 94607',participants:['Mama Celeste','OBSIDIENNE OBSURD'],image:'assets/oaklash-cutout.png',lat:null,lng:null,radius:100,story:'A tribute to the performers who make a temporary stage feel permanent. The monument turns a moment of presence into something the street can remember. Add the artists’ approved biographies and venue history here.',link:'',linkLabel:'Explore the story',song:'' },
  { id:'rebel-kings',name:'Rebel Kings of Oakland',city:'Oakland',venue:'White Horse Bar',address:'6551 Telegraph Avenue, Oakland, CA 94609',participants:['VERA!','Jota Mercury','Joey Gelato','Helixir Jynder Byntwell','Vegas Jake'],image:null,lat:null,lng:null,radius:100,story:'A monument story is being prepared for this show.',link:'',linkLabel:'Explore the story',song:'' },
  { id:'reparations',name:'Reparations',city:'San Francisco',venue:'Oasis',address:'298 11th St, San Francisco, CA 94103',participants:['Nicki Jizz','Mudd the Two Spirit'],image:'assets/reparations-cutout.png',lat:null,lng:null,radius:100,story:'A celebration of spectacle, transformation, and the spaces that bring people together. Add the artists’ approved story and the history of this performance site here.',link:'',linkLabel:'Explore the story',song:'' },
  { id:'pillows',name:'Pillows',city:'San Francisco',venue:'Powerhouse',address:'1347 Folsom St, San Francisco, CA 94103',participants:['Mary Vice','David Glamamore','Sir Joq','Mojo Carter','Luismi'],image:null,lat:null,lng:null,radius:100,story:'A monument story is being prepared for this show.',link:'',linkLabel:'Explore the story',song:'' }
];
const $ = id => document.getElementById(id);
const copy = value => JSON.parse(JSON.stringify(value));
let monuments = loadMonuments();
let selected = 0, preview = true, currentPosition = null, heading = null, cameraStream = null;
let watchId = null, audio = null, synth = null, synthTimer = null, playing = false, toastTimer = null;
function loadMonuments() {
  try { const saved = JSON.parse(localStorage.getItem('set-in-stone-monuments')||localStorage.getItem('afterglow-monuments')); if (Array.isArray(saved)) return DEFAULTS.map(d => { const previous=saved.find(s=>s.id===d.id)||{}; return {...d,...previous,venue:previous.venue||d.venue,address:previous.address||d.address,city:d.city,participants:d.participants,image:d.image}; }); } catch (_) {}
  return copy(DEFAULTS);
}
function saveMonuments() { localStorage.setItem('set-in-stone-monuments', JSON.stringify(monuments)); }
function hasPlace(m) { return Number.isFinite(m.lat) && Number.isFinite(m.lng); }
function safeUrl(value) { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : null; } catch (_) { return null; } }
function radians(deg) { return deg * Math.PI / 180; }
function distance(a, b) { const R = 6371000, p1 = radians(a.lat), p2 = radians(b.lat), dp = radians(b.lat-a.lat), dl = radians(b.lng-a.lng); const h = Math.sin(dp/2)**2 + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2; return 2*R*Math.atan2(Math.sqrt(h),Math.sqrt(1-h)); }
function bearing(a, b) { const p1 = radians(a.lat), p2 = radians(b.lat), dl = radians(b.lng-a.lng); return (Math.atan2(Math.sin(dl)*Math.cos(p2),Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl))*180/Math.PI+360)%360; }
function signedAngle(deg) { return (deg+540)%360-180; }
function toast(message) { const node=$('toast'); node.textContent=message; node.classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>node.classList.remove('visible'),3800); }
function renderCollection() {
  const list=$('monument-list'); list.replaceChildren();
  monuments.forEach((m,i)=>{ if(!m.image)return;
    const article=document.createElement('article'); article.className='monument-card';
    const image=document.createElement('img'); image.src=m.image; image.alt=m.name+' monument artwork';
    const top=document.createElement('div'); top.className='card-top'; top.innerHTML=`<span class="card-index">MONUMENT / 0${[...monuments.slice(0,i+1)].filter(item=>item.image).length}</span><span class="card-symbol">✳</span>`;
    const bottom=document.createElement('div'); bottom.className='card-bottom';
    const copyBox=document.createElement('div'), title=document.createElement('h3'), venue=document.createElement('p'); title.textContent=m.name; venue.textContent=m.venue || 'VENUE LOCATION TO BE SET'; copyBox.append(title,venue);
    const button=document.createElement('button'); button.className='card-button'; button.textContent='↗'; button.setAttribute('aria-label','View '+m.name); button.onclick=()=>openExperience(i);
    bottom.append(copyBox,button); article.append(image,top,bottom); list.append(article);
  });
}
let activeCity='all', mapScale=1, mapX=0, mapY=0;
const MARKER_PLACES={princess:[37,54],monster:[37,67],clutch:[43,73],oaklash:[62,61],'rebel-kings':[67,52],reparations:[49,62],pillows:[46,52]};
function makeSculpture(m,mode='marker') {
  const art=document.createElement('span');art.className='sculpture '+(m.image?'with-image':'abstract')+' '+m.id+' '+mode;
  const beam=document.createElement('span');beam.className='sculpture-beam';art.append(beam);
  if(m.image){const img=document.createElement('img');img.src=m.image;img.alt='';art.append(img);}
  else {const form=document.createElement('span');form.className='sculpture-form';form.append(document.createElement('i'),document.createElement('b'),document.createElement('em'));art.append(form);}
  const base=document.createElement('span');base.className='sculpture-base';art.append(base);return art;
}
function renderMarkers(){const layer=$('monument-markers');layer.replaceChildren();
  const ns='http://www.w3.org/2000/svg',lines=document.createElementNS(ns,'svg');lines.setAttribute('class','marker-connectors');lines.setAttribute('viewBox','0 0 100 100');lines.setAttribute('preserveAspectRatio','none');lines.setAttribute('aria-hidden','true');
  monuments.forEach(m=>{const line=document.createElementNS(ns,'line'),at=MARKER_PLACES[m.id],anchor=m.city==='Oakland'?[62,61]:[42.5,63];line.setAttribute('x1',at[0]);line.setAttribute('y1',at[1]);line.setAttribute('x2',anchor[0]);line.setAttribute('y2',anchor[1]);line.setAttribute('class','connector '+(m.city==='Oakland'?'oakland':'sf'));lines.append(line);});layer.append(lines);
  for(const city of ['San Francisco','Oakland']){const anchor=document.createElement('span');anchor.className='city-anchor';const point=city==='Oakland'?[62,61]:[42.5,63];anchor.style.left=point[0]+'%';anchor.style.top=point[1]+'%';anchor.title=city+' approximate location';layer.append(anchor);}
  monuments.forEach((m,i)=>{
  const button=document.createElement('button');button.className='monument-marker';button.dataset.city=m.city;button.dataset.index=i;button.style.left=MARKER_PLACES[m.id][0]+'%';button.style.top=MARKER_PLACES[m.id][1]+'%';button.setAttribute('aria-label',`${m.name}, ${m.venue} in ${m.city}`);
  const label=document.createElement('span');label.className='marker-label';label.textContent=m.name;const ordinal=document.createElement('span');ordinal.className='marker-ordinal';ordinal.textContent=String(i+1).padStart(2,'0');
  button.append(makeSculpture(m),ordinal,label);button.onclick=()=>showMapDetail(i);layer.append(button);
});}
function renderAtlas() {
  const list=$('atlas-list'); list.replaceChildren();
  monuments.forEach((m,i)=>{ if(activeCity!=='all'&&m.city!==activeCity)return;
    const button=document.createElement('button');button.className='atlas-item';button.setAttribute('aria-label',`${m.name} at ${m.venue}, ${m.city}`);
    const number=document.createElement('span');number.className='atlas-number';number.textContent=String(i+1).padStart(2,'0');
    const info=document.createElement('span'),title=document.createElement('strong'),place=document.createElement('small');title.textContent=m.name;place.textContent=m.venue+' · '+m.city;info.append(title,place);
    const arrow=document.createElement('span');arrow.className='atlas-arrow';arrow.textContent='↗';button.append(number,info,arrow);button.onclick=()=>showMapDetail(i);list.append(button);
  });
  document.querySelectorAll('.monument-marker').forEach(pin=>pin.classList.toggle('is-muted',activeCity!=='all'&&pin.dataset.city!==activeCity));document.querySelectorAll('.connector').forEach(line=>line.classList.toggle('is-muted',activeCity!=='all'&&((line.classList.contains('oakland')?'Oakland':'San Francisco')!==activeCity)));
}
function setCityFilter(city) { activeCity=city;document.querySelectorAll('.map-filter').forEach(button=>button.classList.toggle('active',button.dataset.city===city));renderAtlas(); }
function showMapDetail(index) {
  selected=index;const m=monuments[index];$('map-detail-title').textContent=m.name;$('map-detail-counter').textContent=String(index+1).padStart(2,'0')+' / 07';$('map-detail-venue').textContent=m.venue+' · '+m.city;$('map-detail-address').textContent=m.address;
  const participants=$('map-detail-participants');participants.replaceChildren();const caption=document.createElement('small');caption.textContent='FEATURED PARTICIPANTS';const names=document.createElement('p');names.textContent=m.participants.join(' · ');participants.append(caption,names);
  const display=$('map-detail-art');display.replaceChildren(makeSculpture(m,'detail'));if(!m.image){const note=document.createElement('small');note.textContent='SCULPTURAL CONCEPT · MONUMENT ARTWORK PENDING';display.append(note);}document.querySelectorAll('.monument-marker').forEach(button=>button.classList.toggle('is-selected',Number(button.dataset.index)===index));
  const action=$('map-detail-action');action.disabled=!m.image;action.firstChild.textContent=m.image?'VIEW MONUMENT ':'ARTWORK COMING SOON ';action.onclick=m.image?()=>{ $('map-detail').classList.add('hidden');openExperience(index);}:null;
  $('map-detail').classList.remove('hidden');
}
function applyMapTransform(){ const vp=$('map-viewport');const limitX=Math.max(0,(mapScale-1)*vp.clientWidth/2),limitY=Math.max(0,(mapScale-1)*vp.clientWidth*1100/1600/2);mapX=Math.max(-limitX,Math.min(limitX,mapX));mapY=Math.max(-limitY,Math.min(limitY,mapY));$('map-scene').style.transform=`translateY(-50%) translate(${mapX}px,${mapY}px) scale(${mapScale})`; }
function setMapZoom(next){mapScale=Math.max(1,Math.min(3.4,next));if(mapScale===1){mapX=0;mapY=0;}applyMapTransform();}
function installMapControls(){let dragging=false,startX=0,startY=0,oldX=0,oldY=0;const vp=$('map-viewport');
  vp.addEventListener('pointerdown',e=>{if(e.target.closest('.monument-marker'))return;dragging=true;startX=e.clientX;startY=e.clientY;oldX=mapX;oldY=mapY;vp.setPointerCapture(e.pointerId);});
  vp.addEventListener('pointermove',e=>{if(!dragging)return;mapX=oldX+e.clientX-startX;mapY=oldY+e.clientY-startY;applyMapTransform();});
  const stop=()=>dragging=false;vp.addEventListener('pointerup',stop);vp.addEventListener('pointercancel',stop);
  vp.addEventListener('wheel',e=>{e.preventDefault();setMapZoom(mapScale+(e.deltaY<0?.2:-.2));},{passive:false});
  $('map-zoom-in').onclick=()=>setMapZoom(mapScale+.4);$('map-zoom-out').onclick=()=>setMapZoom(mapScale-.4);$('map-reset').onclick=()=>setMapZoom(1);
  document.querySelectorAll('.map-filter').forEach(button=>button.onclick=()=>setCityFilter(button.dataset.city));
  $('close-map-detail').onclick=()=>{$('map-detail').classList.add('hidden');document.querySelectorAll('.monument-marker').forEach(button=>button.classList.remove('is-selected'));};
}
function setStatus(message) { $('location-status').textContent=message; }
function refreshStage() {
  if ($('experience').classList.contains('hidden')) return;
  const m=monuments[selected], stage=$('ar-stage'), direction=$('direction');
  $('ar-name').textContent=m.name; $('ar-object').src=m.image; $('ar-object').alt=m.name+' monument artwork';
  $('preview-note').textContent=preview ? 'Preview mode · Confirm coordinates in settings to enable on-site access.' : 'On-site mode · Location accuracy and surroundings may affect placement.';
  if (preview) { setStatus('PREVIEW · '+(m.venue || 'VENUE TO BE SET')); stage.classList.remove('is-hidden'); stage.style.transform='translateX(-50%)'; direction.classList.add('hidden'); return; }
  if (!currentPosition) { setStatus('Waiting for your location…'); stage.classList.add('is-hidden'); direction.classList.add('hidden'); return; }
  const meters=Math.round(distance(currentPosition,m));
  if (meters>m.radius) { setStatus(`${meters.toLocaleString()} m away · visit ${m.venue || 'the venue'} to unlock`); stage.classList.add('is-hidden'); direction.classList.add('hidden'); return; }
  if (currentPosition.accuracy>m.radius) { setStatus(`GPS accuracy ±${Math.round(currentPosition.accuracy)} m · move into open space`); stage.classList.add('is-hidden'); direction.classList.add('hidden'); return; }
  if (heading===null) { setStatus('ON SITE · Turn your phone to explore'); stage.classList.remove('is-hidden'); stage.style.transform='translateX(-50%)'; direction.classList.add('hidden'); return; }
  const angle=signedAngle(bearing(currentPosition,m)-heading), visible=Math.abs(angle)<53;
  setStatus('ON SITE · '+(m.venue || m.name)); stage.classList.toggle('is-hidden',!visible);
  stage.style.transform=`translateX(calc(-50% + ${Math.max(-35,Math.min(35,angle))*0.55}vw))`;
  direction.classList.toggle('hidden',visible);
  if (!visible) { $('direction-arrow').style.transform=angle>0?'none':'rotate(180deg)'; $('direction-arrow').style.display='inline-block'; $('direction-text').textContent=angle>0?'TURN RIGHT TO FIND THE MONUMENT':'TURN LEFT TO FIND THE MONUMENT'; }
}
function updatePosition(position) { currentPosition={lat:position.coords.latitude,lng:position.coords.longitude,accuracy:position.coords.accuracy}; refreshStage(); }
function locationError(error) { setStatus('Location unavailable · check permissions'); $('ar-stage').classList.add('is-hidden'); toast(error?.message || 'Allow location access to unlock this monument.'); }
function startLocation() { if (!navigator.geolocation) { locationError({message:'Geolocation is unavailable on this device.'}); return; } if (watchId!==null) navigator.geolocation.clearWatch(watchId); watchId=navigator.geolocation.watchPosition(updatePosition,locationError,{enableHighAccuracy:true,maximumAge:3000,timeout:15000}); }
async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) { toast('Camera unavailable. Showing the visual preview.'); return; }
  try { cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false}); const v=$('camera'); v.srcObject=cameraStream; v.style.display='block'; await v.play(); }
  catch (_) { toast('Camera access unavailable. Showing the visual preview.'); }
}
function onOrientation(event) {
  if (typeof event.webkitCompassHeading==='number') heading=event.webkitCompassHeading;
  else if (event.absolute && typeof event.alpha==='number') heading=(360-event.alpha)%360;
  else return;
  refreshStage();
}
async function startOrientation() {
  try { if (typeof DeviceOrientationEvent!=='undefined' && typeof DeviceOrientationEvent.requestPermission==='function') { const result=await DeviceOrientationEvent.requestPermission(); if (result!=='granted') return; } window.addEventListener('deviceorientationabsolute',onOrientation); window.addEventListener('deviceorientation',onOrientation); } catch (_) {}
}
async function openExperience(index) {
  selected=index; preview=!hasPlace(monuments[index]); currentPosition=null; heading=null;
  $('home').classList.add('hidden'); $('experience').classList.remove('hidden'); refreshStage();
  startCamera(); if (!preview) { startLocation(); startOrientation(); }
}
function closeExperience() { stopMusic(); cameraStream?.getTracks().forEach(t=>t.stop()); cameraStream=null; $('camera').style.display='none'; $('camera').srcObject=null; if (watchId!==null) navigator.geolocation.clearWatch(watchId); watchId=null; window.removeEventListener('deviceorientationabsolute',onOrientation); window.removeEventListener('deviceorientation',onOrientation); $('experience').classList.add('hidden'); $('story-panel').classList.add('hidden'); $('home').classList.remove('hidden'); }
function showStory() { const m=monuments[selected]; $('story-title').textContent=m.name; $('story-venue').textContent=m.venue ? 'AT '+m.venue.toUpperCase() : 'VENUE TO BE SET'; $('story-body').textContent=m.story; $('story-counter').textContent=`0${selected+1} / 0${monuments.length}`; const box=$('story-links'); box.replaceChildren(); const url=safeUrl(m.link); if (url) { const link=document.createElement('a'); link.href=url; link.target='_blank'; link.rel='noopener noreferrer'; link.textContent=(m.linkLabel || 'Learn more')+' ↗'; box.append(link); } else { const note=document.createElement('span'); note.className='no-link'; note.textContent='More links coming soon.'; box.append(note); } $('story-panel').classList.remove('hidden'); }
function note(ctx,freq,t,duration,gain=.065,type='sine') { const o=ctx.createOscillator(), g=ctx.createGain(); o.type=type; o.frequency.setValueAtTime(freq,t); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(gain,t+.025); g.gain.exponentialRampToValueAtTime(.0001,t+duration); o.connect(g).connect(ctx.destination); o.start(t); o.stop(t+duration+.02); }
function scheduleMusic() { if (!synth) return; const melody=[392,523.25,587.33,523.25,440,392,349.23,392,523.25,659.25,587.33,523.25,440,349.23,392,329.63], t=synth.currentTime+.08; melody.forEach((n,i)=>{note(synth,n,t+i*.32,.28,.045,'triangle'); if(i%4===0)note(synth,n/4,t+i*.32,1.15,.045,'sine');}); synthTimer=setTimeout(scheduleMusic,melody.length*320); }
function stopMusic() { if (audio) { audio.pause(); audio.src=''; audio=null; } clearTimeout(synthTimer); synthTimer=null; if (synth) { synth.close(); synth=null; } playing=false; $('music-label').textContent='PLAY SOUND'; $('music-icon').textContent='♫'; $('music').setAttribute('aria-label','Play soundtrack'); }
async function toggleMusic() {
  if (playing) { stopMusic(); return; } const url=safeUrl(monuments[selected].song);
  try { if (url) { audio=new Audio(url); audio.loop=true; await audio.play(); } else { const AudioContext=window.AudioContext||window.webkitAudioContext; if (!AudioContext) throw Error('Audio unavailable'); synth=new AudioContext(); await synth.resume(); scheduleMusic(); } playing=true; $('music-label').textContent='PAUSE SOUND'; $('music-icon').textContent='Ⅱ'; $('music').setAttribute('aria-label','Pause soundtrack'); }
  catch (_) { stopMusic(); toast('Song unavailable. Check the audio URL or device audio settings.'); }
}
function fillSettings() { const m=monuments[Number($('setting-monument').value)]; $('setting-venue').value=m.venue; $('setting-address').value=m.address; $('setting-lat').value=m.lat??''; $('setting-lng').value=m.lng??''; $('setting-radius').value=m.radius; $('setting-story').value=m.story; $('setting-link').value=m.link; $('setting-link-label').value=m.linkLabel; $('setting-song').value=m.song; $('settings-message').textContent=''; }
function openSettings() { $('setting-monument').value=String(selected); fillSettings(); $('settings').classList.remove('hidden'); }
function closeSettings() { $('settings').classList.add('hidden'); }
function saveSettings() {
  const i=Number($('setting-monument').value), m=monuments[i], latText=$('setting-lat').value.trim(), lngText=$('setting-lng').value.trim(), radius=Number($('setting-radius').value);
  if ((latText==='')!== (lngText==='')) { $('settings-message').textContent='Enter both coordinates, or leave both empty.'; return; }
  const lat=latText===''?null:Number(latText),lng=lngText===''?null:Number(lngText);
  if (lat!==null&&(!Number.isFinite(lat)||lat < -90||lat > 90||!Number.isFinite(lng)||lng < -180||lng > 180)) { $('settings-message').textContent='Enter a valid latitude and longitude.'; return; }
  if (!Number.isFinite(radius)||radius<20||radius>1000) { $('settings-message').textContent='Choose a radius between 20 and 1,000 meters.'; return; }
  const link=$('setting-link').value.trim(),song=$('setting-song').value.trim();
  if ((link&&!safeUrl(link))||(song&&!safeUrl(song))) { $('settings-message').textContent='Links must begin with https:// or http://.'; return; }
  Object.assign(m,{venue:$('setting-venue').value.trim(),address:$('setting-address').value.trim(),lat,lng,radius,story:$('setting-story').value.trim()||DEFAULTS[i].story,link,linkLabel:$('setting-link-label').value.trim()||'Learn more',song});
  saveMonuments(); renderCollection(); renderAtlas(); $('settings-message').textContent=m.name+' saved on this device.'; toast(m.name+' saved');
  if (!$('experience').classList.contains('hidden')&&selected===i) { stopMusic(); preview=!hasPlace(m); currentPosition=null; refreshStage(); if (!preview) {startLocation();startOrientation();} }
}
function exportSettings() { const data=monuments.map(({image,...rest})=>rest); const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url;a.download='set-in-stone-venues.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }
$('setting-monument').replaceChildren(...monuments.map((m,i)=>{const option=document.createElement('option');option.value=i;option.textContent=m.name;return option;}));
renderCollection();
renderMarkers();renderAtlas();installMapControls();
$('open-settings').onclick=openSettings;$('edit-venue').onclick=openSettings;$('close-settings').onclick=closeSettings;$('settings-backdrop').onclick=closeSettings;$('setting-monument').onchange=fillSettings;
$('save-settings').onclick=saveSettings;$('export-settings').onclick=exportSettings;
$('use-location').onclick=()=>{if(!navigator.geolocation){$('settings-message').textContent='Location is unavailable in this browser.';return;} $('settings-message').textContent='Finding your location…';navigator.geolocation.getCurrentPosition(p=>{ $('setting-lat').value=p.coords.latitude.toFixed(7);$('setting-lng').value=p.coords.longitude.toFixed(7);$('settings-message').textContent=`Location filled (±${Math.round(p.coords.accuracy)} m). Save to apply.`;},e=>{$('settings-message').textContent=e.message;},{enableHighAccuracy:true,timeout:15000});};
$('back').onclick=closeExperience;$('switch').onclick=()=>{stopMusic();const withArt=monuments.map((m,i)=>m.image?i:-1).filter(i=>i>=0);selected=withArt[(withArt.indexOf(selected)+1)%withArt.length];preview=!hasPlace(monuments[selected]);currentPosition=null;heading=null;refreshStage();if(!preview){startLocation();startOrientation();}else if(watchId!==null){navigator.geolocation.clearWatch(watchId);watchId=null;}};
$('music').onclick=toggleMusic;$('story').onclick=showStory;$('object-hotspot').onclick=showStory;$('close-story').onclick=()=>$('story-panel').classList.add('hidden');$('close-story-backdrop').onclick=()=>$('story-panel').classList.add('hidden');
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('settings').classList.contains('hidden'))closeSettings();else if(!$('story-panel').classList.contains('hidden'))$('story-panel').classList.add('hidden');else if(!$('experience').classList.contains('hidden'))closeExperience();else $('map-detail').classList.add('hidden');}});
