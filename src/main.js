import * as T from 'three';
import {loadAssets,createEnvironment,createSky} from './environment.js';
import {createCockpit,vehicleModel} from './cockpit.js';
import {createTraffic} from './traffic.js';
import {streetNetwork} from './network.js';
import {QUALITY,resolution} from './quality.js';
import {overlap} from './collision.js';
import {createTest} from '../core/test.js';
import {createAutomaticState,selectGear} from '../core/vehicle-state.js';
import {nearest} from '../core/net.js';
const $=id=>document.getElementById(id);globalThis.THREE=T;
let createPlayer;
const coarse=matchMedia('(pointer:coarse)').matches;let preset=coarse?'mobile':'desktop';
try{const saved=localStorage.getItem('elmfield.quality');if(QUALITY[saved])preset=saved;}catch{}
let quality=QUALITY[preset];$('quality').value=preset;
let renderer,scene,camera,environment,assets,player,test,traffic,cockpit,sky,mirrorTarget,mirrorCamera;
let started=false,paused=true,initialBrake=true,clock=0,accumulator=0,cameraMode=0,toastUntil=0,mirrorAt=-1;
const keys=new Set(),touch=new Map();const input={throttle:0,brake:0,steer:0};let previous=performance.now(),renderDeadline=0,lastHud=0;
const samples=[],cpuSamples=[];let lastActualRender=0;let rendered=0,lastFps=performance.now(),fpsFrames=0,fps=0,lastMirrorCalls=0;
const cameraLocal=new T.Vector3(),target=new T.Vector3(),up=new T.Vector3(0,1,0),rotation=new T.Quaternion();
function toast(text){$('toast').textContent=text;$('toast').hidden=false;toastUntil=clock+4;}
function clearInput(){keys.clear();touch.clear();Object.assign(input,{throttle:0,brake:1,steer:0});document.querySelectorAll('.pressed').forEach(b=>b.classList.remove('pressed'));}
function pause(value=!paused){paused=value;clearInput();document.body.classList.toggle('paused',paused);$('pause').textContent=paused?'▶':'Ⅱ';$('pause').setAttribute('aria-label',paused?'Resume':'Pause');}
function observe(){if(!player)return;player.lookAt=traffic.clock;player.observations.push({view:'surroundings',at:traffic.clock});toast('Surroundings check recorded');}
function signal(dir){player?.signal(dir);}
function gear(value){if(!player)return;const brake=input.brake;const changed=selectGear(player.operation,value,player.v,brake,traffic.clock);if(!changed&&player.operation.gear!==value)toast('Stop and hold the brake to change gear');$('gearLabel').textContent=player.operation.gear;}
function changeCamera(){cameraMode=(cameraMode+1)%3;$('cameraLabel').textContent=['COCKPIT','BONNET','CHASE'][cameraMode];toast(['Right-hand-drive cockpit','Bonnet camera','Chase camera'][cameraMode]);}
function reset(){
 clearInput();player.place(-1.65,-7,0);player.operation={...createAutomaticState(),parkingBrake:false,gear:'D'};player.lookAt=-1e9;player.observations=[];player.hold=0;player.lean=0;
 traffic.reset();test.setRoute(streetNetwork().route,[0,1,2]);test.reset();test.running=true;test.startedAt=traffic.clock;test.context={lessonId:'elmfield-street',scenarioId:'street-400m',areaId:'fictional-elmfield'};initialBrake=true;physicalContacts.clear();
 $('faultCount').textContent='0 faults';$('faultList').textContent='No faults recorded.';$('gearLabel').textContent='D';$('guideTitle').textContent='Check surroundings, then move off';$('guideDetail').textContent='B or the observation button · keep left';
 if(started)pause(false);player.sync(clock);toast('Reset · check surroundings before moving off');
}
function applyQuality(){
 renderDeadline=performance.now();quality=QUALITY[preset];scene.fog.density=preset==='mobile'?.0075:preset==='balanced'?.006:.0048;$('preset').textContent=preset.toUpperCase();$('quality').value=preset;
 sky.sun.shadow.mapSize.set(quality.shadow,quality.shadow);if(sky.sun.shadow.map){sky.sun.shadow.map.dispose();sky.sun.shadow.map=null;}
 mirrorTarget?.dispose();mirrorTarget=new T.WebGLRenderTarget(quality.mirrorSize,Math.round(quality.mirrorSize/2.8),{minFilter:T.LinearFilter,magFilter:T.LinearFilter,generateMipmaps:false});cockpit.mirror.material.map=mirrorTarget.texture;cockpit.mirror.material.toneMapped=false;cockpit.mirror.material.needsUpdate=true;
 resize();try{localStorage.setItem('elmfield.quality',preset);}catch{}
}
function resize(){if(!renderer)return;const w=innerWidth,h=innerHeight;const r=resolution(w,h,devicePixelRatio,quality);renderer.setSize(r.width,r.height,false);camera.aspect=w/h;camera.fov=cameraMode===2?60:65;camera.updateProjectionMatrix();}
function refreshInput(){
 const values=new Set([...keys,...touch.values()]);input.throttle=values.has('KeyW')||values.has('ArrowUp')||values.has('throttle')?1:0;
 input.brake=values.has('KeyS')||values.has('ArrowDown')||values.has('Space')||values.has('brake')?1:0;
 input.steer=(values.has('KeyA')||values.has('ArrowLeft')||values.has('left')?1:0)-(values.has('KeyD')||values.has('ArrowRight')||values.has('right')?1:0);
 if(initialBrake){if(input.throttle>0)initialBrake=false;else input.brake=1;}
}
const physicalContacts=new Set();let bodyHeight=0;
function physics(dt){
 refreshInput();traffic.update(dt,player,quality);const nr=nearest(network.net,player.x,player.z);player.update(dt,input,nr&&nr.d<=nr.way.w/2+.2?'road':'off');
 // Run the unchanged examiner before collision response removes closing velocity.
 test.update(dt,input.steer);
 const nowContacts=new Set();
 const obstacles=environment.colliders.concat(traffic.cars.filter(c=>c.alive).map(c=>({...c,hx:.88,hz:2.13,kind:'vehicle',identity:c})));
 for(let i=0;i<obstacles.length;i++){
  const other=obstacles[i];if(Math.abs(other.x-player.x)>8||Math.abs(other.z-player.z)>8)continue;
  const hit=overlap({...player,hx:.88,hz:2.1},other);if(!hit)continue;
  const id=other.identity||other;nowContacts.add(id);
  if(other.kind==='vehicle'&&Math.abs(player.v)>1.5&&!test.contacts.has(id)&&!physicalContacts.has(id)){const dx=other.x-player.x,dz=other.z-player.z;const closing=(dx*(-Math.sin(player.th)*player.v)+dz*(-Math.cos(player.th)*player.v))/Math.max(.1,Math.hypot(dx,dz));if(closing>1.5){test.fault('S','Control – collision','Contact with another vehicle','physical-'+other.index,4);test.contacts.add(id);other.identity.v=0;other.identity.ghost=1.5;}}
  if(other.kind!=='vehicle'&&Math.abs(player.v)>1.5&&!physicalContacts.has(id))test.fault('S','Control – collision','Contact with a '+other.kind,'static-'+i,4);
  player.x+=hit.x*(hit.depth+.012);player.z+=hit.z*(hit.depth+.012);player.v=0;
 }
 physicalContacts.clear();for(const id of nowContacts)physicalContacts.add(id);
 if(player.z>10||player.z<-414||Math.abs(player.x)>55){player.v=0;player.z=Math.max(-413.8,Math.min(9.8,player.z));player.x=Math.max(-54.8,Math.min(54.8,player.x));toast('End of the small environment · reset to drive again');}
 const onSideRoad=Math.abs(player.z+200)<3&&player.x>3;const mounted=Math.abs(player.x)>3.25&&!onSideRoad&&Math.abs(player.x)<5.3;
 bodyHeight+=( (mounted?.14:0)-bodyHeight)*Math.min(1,dt*9);player.sync(traffic.clock);player.mesh.position.y=bodyHeight;cockpit.update(player,Math.round(Math.abs(player.v)*2.23694));
}
let network;
function updateCamera(dt){
 rotation.setFromAxisAngle(up,player.th);
 if(cameraMode===0){cameraLocal.set(.37,1.22+Math.sin(clock*12)*Math.min(.005,Math.abs(player.v)*.0006),.23);target.set(.37,1.17,-30);}
 else if(cameraMode===1){cameraLocal.set(.28,1.05,-1.65);target.set(.28,1.04,-35);}
 else{cameraLocal.set(0,2.9,7);target.set(0,1.05,-8);}
 cameraLocal.applyQuaternion(rotation).add(new T.Vector3(player.x,bodyHeight,player.z));target.applyQuaternion(rotation).add(new T.Vector3(player.x,bodyHeight,player.z));
 if(cameraMode===2&&dt>0){camera.position.lerp(cameraLocal,1-Math.exp(-dt*6));}else camera.position.copy(cameraLocal);
 camera.lookAt(target);cockpit.root.visible=cameraMode===0;player.mesh.visible=cameraMode!==0;
 // The player's exterior glass is hidden in cockpit view; the bonnet and A pillars are supplied by the cockpit framing.
}
function drawMirror(){
 if(cameraMode!==0||clock-mirrorAt<1/quality.mirrorHz)return;mirrorAt=clock;
 const local=new T.Vector3(.25,1.26,.45).applyQuaternion(rotation).add(new T.Vector3(player.x,bodyHeight,player.z));mirrorCamera.position.copy(local);mirrorCamera.lookAt(new T.Vector3(0,1.26,40).applyQuaternion(rotation).add(new T.Vector3(player.x,bodyHeight,player.z)));
 const cv=cockpit.root.visible,pv=player.mesh.visible;cockpit.root.visible=player.mesh.visible=false;renderer.shadowMap.needsUpdate=false;
 renderer.setRenderTarget(mirrorTarget);renderer.render(scene,mirrorCamera);lastMirrorCalls=renderer.info.render.calls;renderer.setRenderTarget(null);cockpit.root.visible=cv;player.mesh.visible=pv;
}
function hud(now){
 if(now-lastHud<150)return;lastHud=now;const mph=Math.round(Math.abs(player.v)*2.23694);$('mph').textContent=mph;$('distance').textContent=Math.min(400,Math.round(test.sRoute))+' / 400 m';$('fps').textContent=Math.round(fps)+' FPS';$('gearLabel').textContent=player.operation.gear;
 $('signalLeft').classList.toggle('active',player.indicator==='L');$('signalRight').classList.toggle('active',player.indicator==='R');
 if(test.done){$('guideTitle').textContent='Practice complete';$('guideDetail').textContent=test.D+' driving · '+test.S+' serious faults · R to try again';}
 else if(player.z<-355){$('guideTitle').textContent='Pull up safely on the left';$('guideDetail').textContent='Check surroundings, slow down and stop';}
 else if(player.z<-160&&player.z>-225){$('guideTitle').textContent='Side road ahead — watch for traffic';$('guideDetail').textContent='Continue straight · maintain a safe speed';}
 else if(!initialBrake){$('guideTitle').textContent='Follow Elmfield Road';$('guideDetail').textContent='Keep left · 20 mph · anticipate parked cars';}
 if(!$('toast').hidden&&clock>toastUntil)$('toast').hidden=true;
}
function loop(now){
 requestAnimationFrame(loop);const raw=(now-previous)/1000;previous=now;const dt=Math.min(.1,Math.max(0,raw));clock+=dt;
 if(!paused&&started){accumulator+=dt;let steps=0;while(accumulator>=1/60&&steps++<6){physics(1/60);accumulator-=1/60;}}else accumulator=0;
 updateCamera(dt);environment.update(player.x,player.z,quality);sky.update(player.x,player.z,quality.shadow);hud(now);
 const interval=1000/quality.fps;if(now<renderDeadline-.35)return;
 const actualGap=lastActualRender?now-lastActualRender:0;lastActualRender=now;
 renderDeadline=Math.max(renderDeadline+interval,now+interval*.5);const before=performance.now();drawMirror();renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);const cpu=performance.now()-before;
 rendered++;fpsFrames++;if(now-lastFps>=1000){fps=fpsFrames*1000/(now-lastFps);fpsFrames=0;lastFps=now;}
 if(started&&!paused){samples.push({at:now,gap:raw*1000,frameMs:actualGap,preset,render:rendered});cpuSamples.push(cpu);if(samples.length>10000)samples.shift();if(cpuSamples.length>10000)cpuSamples.shift();}
}
async function boot(){
 ({createPlayer}=await import('../core/car.js'));
 renderer=new T.WebGLRenderer({canvas:$('view'),antialias:true,powerPreference:coarse?'low-power':'high-performance'});renderer.setPixelRatio(1);renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.91;renderer.physicallyCorrectLights=true;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
 scene=new T.Scene();camera=new T.PerspectiveCamera(65,innerWidth/innerHeight,.035,420);mirrorCamera=new T.PerspectiveCamera(54,2.8,.1,135);$('loadStatus').textContent='Loading metre-scale meshes and shared textures';
 assets=await loadAssets(v=>{$('progress').value=v;$('loadStatus').textContent='Street assets '+Math.round(v*100)+'%';});
 environment=createEnvironment(scene,assets);sky=createSky(scene,renderer);player=createPlayer(scene);player.setModel(vehicleModel(assets.car,'#52665d'));cockpit=createCockpit(scene);network=streetNetwork();traffic=createTraffic(scene,assets,network.net);test=createTest(network.net,traffic,player);
 test.onFault=()=>{$('faultCount').textContent=test.D+' D · '+test.S+' S';$('faultList').replaceChildren(...test.faults.slice(0,20).map(f=>{const p=document.createElement('p');p.textContent=(f.kind==='S'?'Serious':'Driving')+' · '+f.cat+': '+f.text;return p;}));toast(test.faults[0].text);};
 test.onFinish=()=>{initialBrake=true;toast('Practice complete · '+test.D+' driving / '+test.S+' serious faults');};
 applyQuality();reset();updateCamera(0);$('load').hidden=true;$('intro').hidden=false;previous=performance.now();requestAnimationFrame(loop);
 const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');const gpu=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
 window.sim={ready:true,player,test,traffic,scene,renderer,get quality(){return preset;},setQuality(value){if(!QUALITY[value])throw Error('Unknown preset');preset=value;applyQuality();},start(){started=true;$('intro').hidden=true;pause(false);},pause,reset,observe,gear,changeCamera,input,keys,
 stats(){const quantile=(a,p)=>{if(!a.length)return 0;const b=a.slice().sort((x,y)=>x-y);return b[Math.floor((b.length-1)*p)];};const s=samples.filter(x=>x.preset===preset);return {preset,targetFps:quality.fps,gpu,viewport:[innerWidth,innerHeight],buffer:[renderer.domElement.width,renderer.domElement.height],fps,frames:s.length,elapsedMs:s.length?s.at(-1).at-s[0].at:0,averageFps:s.length>1?(s.length-1)*1000/(s.at(-1).at-s[0].at):0,rafGapP95:quantile(s.map(x=>x.gap),.95),frameMsP95:quantile(s.map(x=>x.frameMs),.95),renderCpuP50:quantile(cpuSamples,.5),renderCpuP95:quantile(cpuSamples,.95),drawCalls:renderer.info.render.calls,mirrorDrawCalls:lastMirrorCalls,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries,driverEyeMetres:[.37,1.22,.23],position:[player.x,player.z]};},clearSamples(){samples.length=0;cpuSamples.length=0;},camera};
}
$('start').onclick=()=>{started=true;$('intro').hidden=true;pause(false);};$('pause').onclick=()=>pause();$('observe').onclick=observe;$('signalLeft').onclick=()=>signal('L');$('signalRight').onclick=()=>signal('R');$('camera').onclick=changeCamera;$('reset').onclick=()=>{if(player)reset();};$('reverse').onclick=()=>gear('R');$('drive').onclick=()=>gear('D');
function showHelp(){pause(true);$('helpPanel').hidden=false;}$('help').onclick=showHelp;$('closeHelp').onclick=()=>{$('helpPanel').hidden=true;if(started)pause(false);};$('faults').onclick=()=>{$('faultPanel').hidden=!$('faultPanel').hidden;};
$('quality').onchange=e=>{preset=e.target.value;if(renderer&&sky)applyQuality();};
addEventListener('keydown',e=>{if(/SELECT|INPUT|TEXTAREA/.test(e.target.tagName))return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.repeat)return;
 const actions={KeyB:observe,KeyQ:()=>signal('L'),KeyE:()=>signal('R'),KeyC:changeCamera,KeyR:()=>player&&reset(),KeyP:()=>pause(),Escape:()=>pause(),KeyH:showHelp,Digit1:()=>gear('D'),Digit2:()=>gear('R')};actions[e.code]?.();});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{if(started)pause(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden&&started)pause(true);});
for(const button of document.querySelectorAll('[data-input]')){
 button.addEventListener('pointerdown',e=>{e.preventDefault();try{button.setPointerCapture(e.pointerId);}catch{}touch.set(e.pointerId,button.dataset.input);button.classList.add('pressed');});
 const release=e=>{touch.delete(e.pointerId);if(![...touch.values()].includes(button.dataset.input))button.classList.remove('pressed');};button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
}
addEventListener('resize',resize);$('view').addEventListener('webglcontextlost',e=>{e.preventDefault();pause(true);$('load').hidden=false;$('loadStatus').textContent='Graphics context lost. Reload to resume.';});
boot().catch(e=>{console.error(e);$('loadStatus').textContent='Unable to load: '+e.message;});
