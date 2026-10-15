import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
const loader=new GLTFLoader(),textureLoader=new T.TextureLoader();
const unitBox=new T.BoxGeometry(1,1,1),matrix=new T.Matrix4(),q=new T.Quaternion(),scale=new T.Vector3(),pos=new T.Vector3();
const material=(color,roughness=.85)=>{const m=new T.MeshStandardMaterial({color,roughness,metalness:0});m.color.convertSRGBToLinear();return m;};
export async function loadAssets(progress){
 const names=['car','streetlight','tree-high','tree-low',...Array.from({length:6},(_,i)=>['house-'+i+'-high','house-'+i+'-low']).flat()];
 const result={},manager=new T.LoadingManager();let done=0;
 await Promise.all(names.map(async name=>{result[name]=(await loader.loadAsync('assets/'+name+'.glb')).scene;progress(++done/names.length);}));
 // Deduplicate identical GLTF materials/textures before any GPU upload.
 const shared=new Map();for(const model of Object.values(result))model.traverse(o=>{if(o.isMesh){const material=shared.get(o.material.name);if(material)o.material=material;else shared.set(o.material.name,o.material);}});
 const leaf=shared.get('foliage');if(leaf){leaf.emissive.setHex(0x061006);leaf.emissiveIntensity=.35;}
 result.layout=await (await fetch('assets/layout.json')).json();return result;
}
function batch(parts,geometry,mat,parent){
 if(!parts.length)return;const mesh=new T.InstancedMesh(geometry,mat,parts.length);mesh.castShadow=true;mesh.receiveShadow=true;
 parts.forEach((p,i)=>{pos.set(...p.p);scale.set(...(p.s||[1,1,1]));q.setFromEuler(new T.Euler(...(p.r||[0,0,0])));matrix.compose(pos,q,scale);mesh.setMatrixAt(i,matrix);if(p.color)mesh.setColorAt(i,new T.Color(p.color));});mesh.instanceMatrix.needsUpdate=true;parent.add(mesh);return mesh;
}
function instanceModel(template,placements,parent){
 template.updateMatrixWorld(true);template.traverse(o=>{if(!o.isMesh)return;
  const mesh=new T.InstancedMesh(o.geometry,o.material,placements.length);mesh.castShadow=true;mesh.receiveShadow=true;
  placements.forEach((p,i)=>{pos.set(p.x,0,p.z);q.setFromAxisAngle(new T.Vector3(0,1,0),p.rotation||0);scale.setScalar(p.size||1);matrix.compose(pos,q,scale).multiply(o.matrixWorld);mesh.setMatrixAt(i,matrix);if(p.tint&&o.material.name==='brick')mesh.setColorAt(i,new T.Color(p.tint));if(o.material.name==='roof')mesh.setColorAt(i,new T.Color(['#a6afb2','#b2afa4','#bda38b'][p.variant%3||0]));});mesh.instanceMatrix.needsUpdate=true;parent.add(mesh);
 });
}
function plane(parent,x,z,w,h,mat,y=.012){const g=new T.PlaneGeometry(w,h);g.rotateX(-Math.PI/2);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++){const px=g.attributes.position.getX(i)+x,pz=g.attributes.position.getZ(i)+z;uv.setXY(i,px/4,pz/4);}const m=new T.Mesh(g,mat);m.position.set(x,y,z);m.receiveShadow=true;parent.add(m);return m;}
function signTexture(text,{round=false,road=false}={}){
 const c=document.createElement('canvas');c.width=512;c.height=round?512:192;const ctx=c.getContext('2d');
 if(round){ctx.fillStyle='#f1f1e9';ctx.beginPath();ctx.arc(256,256,246,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#a72d31';ctx.lineWidth=38;ctx.stroke();ctx.fillStyle='#202324';ctx.font='bold 240px Arial';ctx.textAlign='center';ctx.fillText(text,256,340);}
 else{ctx.fillStyle='#eae8dd';ctx.fillRect(0,0,512,192);ctx.strokeStyle='#373d3c';ctx.lineWidth=9;ctx.strokeRect(5,5,502,182);ctx.fillStyle='#303431';ctx.textAlign='center';ctx.font='bold 50px Arial';ctx.fillText(text,256,96);ctx.font='22px Arial';ctx.fillStyle='#735a4b';ctx.fillText('ORIGINAL PRACTICE LAYOUT',256,143);}
 const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.anisotropy=4;return t;
}
export function createEnvironment(scene,assets){
 const chunks=[];const colliders=[];const root=new T.Group();scene.add(root);const groundMat=material('#79816b');
 const ground=new T.Mesh(new T.PlaneGeometry(1800,1800),groundMat);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;ground.position.y=-.025;root.add(ground);
 function tex(file,color=true){const t=textureLoader.load('assets/'+file);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;if(color)t.encoding=T.sRGBEncoding;return t;}
 const asphalt=new T.MeshStandardMaterial({map:tex('asphalt.png'),normalMap:tex('asphalt-normal.png',false),normalScale:new T.Vector2(.18,.18),roughnessMap:tex('asphalt-rough.png',false),roughness:.95,metalness:0});
 const pavement=new T.MeshStandardMaterial({map:tex('pavement.png'),normalMap:tex('pavement-normal.png',false),normalScale:new T.Vector2(.3,.3),roughness:.94});
 plane(root,0,-200,6.4,430,asphalt);plane(root,26,-200,52,5.6,asphalt);
 const kerb=material('#b7b8b1'),white=material('#deded2'),pathMat=material('#a6a59b'),soil=material('#534e3f'),brickGarden=material('#876d58'),iron=material('#343c3d',.55),hedge=material('#455443');
 const kerbs=[],fences=[],hedges=[],paths=[],drains=[],drainSlats=[],lampPlacements=[],treePlacements=[],gardenWalls=[];
 for(let side of [-1,1])for(let start=0;start<400;start+=50){
  const centre=-start-25;const group=new T.Group();root.add(group);chunks.push({group,z:centre,type:'detail'});
  if(side<0)plane(group,-4.2,centre,2,50,pavement,.14);
  else{const lo=-start-50,hi=-start;for(const [a,b]of [[Math.max(lo,-194.6),hi],[lo,Math.min(hi,-205.4)]])if(b>a)plane(group,4.2,(a+b)/2,2,b-a,pavement,.14);}
  for(let zz=-start;zz>-start-50;zz-=1){if(side>0&&Math.abs(zz+200)<5.6)continue;kerbs.push({p:[side*3.27,.07,zz-.48],s:[.16,.14,.96]});}
 }
 // Rounded kerb corners on the T-junction, with a 3.8 m inside radius.
 for(const side of [-1,1]){
  const centre=new T.Vector2(7,-200+side*6.6);const points=[];
  for(let i=0;i<=16;i++){const a=Math.PI+(side<0?-1:1)*i/16*Math.PI/2;points.push(new T.Vector3(centre.x+3.8*Math.cos(a),.14,centre.y+3.8*Math.sin(a)));}
  const curve=new T.CatmullRomCurve3(points);const tube=new T.Mesh(new T.TubeGeometry(curve,18,.075,5,false),kerb);tube.receiveShadow=true;root.add(tube);
  plane(root,28,-200+side*3.8,42,2,pavement,.14);
  kerbs.push({p:[28,.07,-200+side*2.88],s:[42,.14,.16]});
 }
 // Markings remain horizontal metre-scale geometry, not full-screen decals.
 const marks=[];
 for(let z=-6;z>-399;z-=6){if(Math.abs(z+200)<9)continue;const warn=Math.abs(z+200)<35;marks.push({p:[0,.024,z],s:[.1,.006,warn?4:2]});}
 // Minor road give-way: two transverse rows; no US-style shark's teeth.
 for(let z=-197.45;z>-200;z-=.9)for(let x of [4.8,5.15])marks.push({p:[x,.026,z],s:[.2,.006,.6]});
 const tri=new T.BufferGeometry(),outer=[[10.9,-198.6],[7.4,-197.85],[7.4,-199.35]],inner=[[10.35,-198.6],[7.58,-198.08],[7.58,-199.12]],vertices=[];
 for(let i=0;i<3;i++){const j=(i+1)%3;for(const p of [outer[i],outer[j],inner[j],outer[i],inner[j],inner[i]])vertices.push(p[0],.027,p[1]);}
 tri.setAttribute('position',new T.Float32BufferAttribute(vertices,3));tri.computeVertexNormals();root.add(new T.Mesh(tri,new T.MeshStandardMaterial({color:0xe2e1d5,roughness:.8,side:T.DoubleSide})));

 batch(marks,unitBox,white,root);batch(kerbs,unitBox,kerb,root);
 // Quiet patches and thin repaired joints: deliberately restrained contrast.
 const patches=new T.Group();root.add(patches);let seed=31;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<14;i++){
  const x=(random()-.5)*3.2,z=-15-random()*375,w=.4+random()*1.5,h=1+random()*3;const shape=new T.Shape();shape.moveTo(-w*.5,-h*.48);shape.lineTo(w*.45,-h*.5);shape.lineTo(w*.5,h*.43);shape.lineTo(-w*.43,h*.5);shape.closePath();const g=new T.ShapeGeometry(shape);g.rotateX(-Math.PI/2);const m=new T.Mesh(g,new T.MeshStandardMaterial({color:i%2?'#4c5051':'#484c4e',map:asphalt.map,roughness:.96,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));m.position.set(x,.018,z);m.receiveShadow=true;patches.add(m);
 }
 const wheelTracks=new T.MeshStandardMaterial({color:0x343a3e,transparent:true,opacity:.035,roughness:1,depthWrite:false});for(let x of [-2.15,-1.02,1.02,2.15])plane(root,x,-200,.38,400,wheelTracks,.02);
 const lots=assets.layout.houses;
 // Chunked instancing: one draw per material/variant/chunk. Far LOD omits all trim geometry.
 for(let start=0;start<400;start+=50){
  const c={z:-start-25,type:'house',high:new T.Group(),low:new T.Group()};root.add(c.high,c.low);chunks.push(c);
  for(let v=0;v<6;v++){const p=lots.filter(h=>h.variant===v&&-h.z>=start&&-h.z<start+50);if(p.length){instanceModel(assets['house-'+v+'-high'],p,c.high);instanceModel(assets['house-'+v+'-low'],p,c.low);}}
 }
 for(const h of lots){
  const side=Math.sign(h.x),edge=side*5.65;const gardenDepth=Math.abs(h.x)-4.3-5.65;
  paths.push({p:[side*(5.2+gardenDepth/2),.155,h.z],s:[Math.max(.8,gardenDepth+1),.035,1.05]});
  if(h.garden>.45){hedges.push({p:[edge,.55,h.z+h.width*.35],s:[.65,.84,h.width*.45]});}
  else gardenWalls.push({p:[edge,.42,h.z+h.width*.32],s:[.18,.56,h.width*.46]});
  for(let dz=-h.width*.47;dz<h.width*.48;dz+=.37){if(Math.abs(dz)<.8)continue;fences.push({p:[edge,.52,h.z+dz],s:[.055,.74,.055]});}
  fences.push({p:[edge,.36,h.z+h.width*.27],s:[.06,.05,h.width*.45]},{p:[edge,.73,h.z+h.width*.27],s:[.06,.05,h.width*.45]});
  colliders.push({x:h.x,z:h.z,hx:4.5,hz:h.width/2+.1,kind:'building'});
  colliders.push({x:edge,z:h.z+h.width*.32,hx:.12,hz:h.width*.23,kind:'garden wall'});
  if(h.garden>.58)treePlacements.push({x:side*7.1,z:h.z+h.width*.37,rotation:random()*6.28,size:.6+random()*.25});
 }
 for(let i=0;i<14;i++){const side=i%2?1:-1;const z=-9-i*29;if(Math.abs(z+200)<10)continue;lampPlacements.push({x:side*4.2,z,rotation:side<0?0:Math.PI});}
 for(let i=0;i<19;i++){const side=i%2?1:-1;const z=-11-i*21;drains.push({p:[side*2.99,.014,z],s:[.38,.01,.57]});for(let j=0;j<8;j++)drainSlats.push({p:[side*2.99,.021,z-.24+j*.066],s:[.33,.004,.025]});}
 for(const p of lampPlacements)colliders.push({x:p.x,z:p.z,hx:.08,hz:.08,kind:'streetlight'});
 hedge.map=textureLoader.load('assets/foliage.png');hedge.map.encoding=T.sRGBEncoding;hedge.color.setHex(0xb0c495).convertSRGBToLinear();hedge.roughness=1;
 batch(paths,unitBox,pathMat,root);batch(fences,unitBox,iron,root);batch(hedges,new T.SphereGeometry(.5,12,8),hedge,root);batch(gardenWalls,unitBox,brickGarden,root);batch(drains,unitBox,iron,root);batch(drainSlats,unitBox,kerb,root);instanceModel(assets.streetlight,lampPlacements,root);
 // Additional trees break the skyline without increasing the playable map.
 for(let i=0;i<25;i++)treePlacements.push({x:(i%2?1:-1)*(19+random()*12),z:-random()*430,rotation:random()*6.28,size:.9+random()*.4});
 for(const t of treePlacements)colliders.push({x:t.x,z:t.z,hx:.18,hz:.18,kind:'tree'});
 for(let start=0;start<450;start+=50){const p=treePlacements.filter(t=>-t.z>=start&&-t.z<start+50);if(!p.length)continue;const c={z:-start-25,type:'tree',high:new T.Group(),low:new T.Group()};root.add(c.high,c.low);instanceModel(assets['tree-high'],p,c.high);instanceModel(assets['tree-low'],p,c.low);chunks.push(c);}
 function postSign(x,z,text,rotation=0,round=true){const group=new T.Group();group.position.set(x,0,z);group.rotation.y=rotation;root.add(group);const pole=new T.Mesh(new T.CylinderGeometry(.035,.045,2.8,8),iron);pole.position.y=1.4;group.add(pole);const face=new T.Mesh(round?new T.CircleGeometry(.3,40):new T.PlaneGeometry(1.55,.58),new T.MeshStandardMaterial({map:signTexture(text,{round}),roughness:.6,metalness:.1,side:T.DoubleSide}));face.position.set(0,2.45,0);group.add(face);colliders.push({x,z,hx:.1,hz:.1,kind:'post'});}
 postSign(-4.1,-18,'20');postSign(4.1,-375,'20',Math.PI);postSign(5.5,-190,'ELMFIELD ROAD',0,false);
 // Give-way sign on the approach facing westbound traffic from Garden Lane.
 const gw=new T.Group();gw.position.set(8.3,0,-197);gw.rotation.y=Math.PI/2;root.add(gw);const pole=new T.Mesh(new T.CylinderGeometry(.035,.045,2.4,8),iron);pole.position.y=1.2;gw.add(pole);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ct=canvas.getContext('2d');ct.fillStyle='#af3a37';ct.beginPath();ct.moveTo(12,20);ct.lineTo(244,20);ct.lineTo(128,236);ct.closePath();ct.fill();ct.fillStyle='#eee9da';ct.beginPath();ct.moveTo(40,36);ct.lineTo(216,36);ct.lineTo(128,198);ct.closePath();ct.fill();ct.fillStyle='#2a2d2b';ct.textAlign='center';ct.font='bold 25px Arial';ct.fillText('GIVE',128,83);ct.fillText('WAY',128,115);const t=new T.CanvasTexture(canvas);t.encoding=T.sRGBEncoding;const face=new T.Mesh(new T.PlaneGeometry(.72,.72),new T.MeshStandardMaterial({map:t,transparent:true,side:T.DoubleSide,roughness:.8}));face.position.y=2.15;gw.add(face);
 return {colliders,assets,layout:assets.layout,update(x,z,quality){for(const c of chunks){const distance=Math.hypot(x,z-c.z);if(c.group)c.group.visible=distance<quality.draw;else{c.high.visible=distance<quality.lod;c.low.visible=distance>=quality.lod&&distance<quality.draw;}}}};
}
export function createSky(scene,renderer){
 const material=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{sun:{value:new T.Vector3(-.35,.65,-.4).normalize()}},vertexShader:'varying vec3 world;void main(){world=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position.z=gl_Position.w;}',fragmentShader:`varying vec3 world;uniform vec3 sun;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
 void main(){vec3 d=normalize(world-cameraPosition);float h=max(0.,d.y);vec3 col=mix(vec3(.70,.76,.79),vec3(.22,.42,.62),pow(h,.55));float cloud=noise(d.xz/(h+.23)*2.1)*.57+noise(d.xz/(h+.23)*5.4)*.28+noise(d.xz/(h+.23)*13.)*.15;col=mix(col,vec3(.83,.85,.85),smoothstep(.56,.75,cloud)*smoothstep(.0,.15,h)*.62);float s=max(0.,dot(d,sun));col+=vec3(1.,.85,.62)*pow(s,420.)*.65;col+=vec3(.12,.1,.07)*pow(s,14.);gl_FragColor=vec4(col,1.);
#include <tonemapping_fragment>
#include <encodings_fragment>
}`});
 const dome=new T.Mesh(new T.SphereGeometry(900,24,12),material);scene.add(dome);const envScene=new T.Scene();envScene.add(new T.Mesh(dome.geometry,material));const pmrem=new T.PMREMGenerator(renderer);const target=pmrem.fromScene(envScene,.04,.1,1100);scene.environment=target.texture;pmrem.dispose();
 scene.fog=new T.FogExp2(0xbac5c8,.0038);
 scene.add(new T.HemisphereLight(0xd5e2ed,0x77745d,.75));const sun=new T.DirectionalLight(0xffeed2,2.25);sun.castShadow=true;sun.shadow.camera.near=1;sun.shadow.camera.far=180;sun.shadow.camera.left=sun.shadow.camera.bottom=-38;sun.shadow.camera.right=sun.shadow.camera.top=38;sun.shadow.bias=-.00016;sun.shadow.normalBias=.035;sun.shadow.radius=2;scene.add(sun,sun.target);
 return {sun,update(x,z,mapSize){const texel=76/mapSize;const sx=Math.round(x/texel)*texel,sz=Math.round(z/texel)*texel;sun.target.position.set(sx,0,sz);sun.position.set(sx-30,62,sz-37);dome.position.set(x,0,z);}};
}
