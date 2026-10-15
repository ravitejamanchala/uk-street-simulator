import * as T from 'three';
export function createCockpit(scene){
 const root=new T.Group();scene.add(root);const trim=new T.MeshStandardMaterial({color:0x262b2b,roughness:.9}),light=new T.MeshStandardMaterial({color:0x696b64,roughness:.85}),black=new T.MeshStandardMaterial({color:0x121819,roughness:.9});
 for(const m of [trim,light,black])m.color.convertSRGBToLinear();
 const box=(x,y,z,w,h,d,mat)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);root.add(m);return m;};
 const paint=new T.MeshStandardMaterial({color:0x52665d,roughness:.32,metalness:.4});paint.color.convertSRGBToLinear();box(0,.83,-1.54,1.65,.08,1.2,paint);
 for(const side of [-1,1]){const curve=new T.LineCurve3(new T.Vector3(side*.77,.89,-1.05),new T.Vector3(side*.65,1.44,-.39));root.add(new T.Mesh(new T.TubeGeometry(curve,1,.028,6,false),trim));}
 box(0,1.46,-.39,1.32,.045,.075,trim);
 box(0,.77,-.57,1.48,.2,.56,trim);box(0,.69,-.45,1.42,.14,.22,light);box(0,.58,.16,.25,.25,.64,trim);
 box(.36,.88,-.68,.4,.16,.11,black);box(-.16,.82,-.48,.22,.17,.018,black);
 for(let x of [-.54,-.27,.62]){box(x,.86,-.5,.16,.045,.02,black);for(let i=0;i<4;i++)box(x-.06+i*.04,.86,-.484,.012,.03,.006,light);}
 const wheel=new T.Group();wheel.position.set(.37,.86,-.27);wheel.rotation.x=-.22;root.add(wheel);
 const ring=new T.Mesh(new T.TorusGeometry(.176,.018,8,40),trim);wheel.add(ring);const centre=new T.Mesh(new T.CylinderGeometry(.055,.055,.035,16),trim);centre.rotation.x=Math.PI/2;wheel.add(centre);
 for(let a of [0,Math.PI*2/3,Math.PI*4/3]){const spoke=new T.Mesh(new T.BoxGeometry(.024,.16,.018),light);spoke.rotation.z=a;spoke.position.set(-Math.sin(a)*.08,Math.cos(a)*.08,0);wheel.add(spoke);}
 // Right-hand-drive driver's eye; vehicle width 1.8 m, wheel +0.37 m.
 box(.69,.86,.1,.06,.2,1.15,trim);box(-.69,.86,.1,.06,.2,1.15,trim);
 const gaugeCanvas=document.createElement('canvas');gaugeCanvas.width=512;gaugeCanvas.height=128;const ctx=gaugeCanvas.getContext('2d'),gauge=new T.CanvasTexture(gaugeCanvas);gauge.encoding=T.sRGBEncoding;
 const panel=new T.Mesh(new T.PlaneGeometry(.38,.095),new T.MeshBasicMaterial({map:gauge}));panel.position.set(.36,.895,-.62);panel.rotation.x=-.18;root.add(panel);
 const mirrorFrame=box(-.12,1.34,-.67,.35,.115,.035,trim);const mirror=new T.Mesh(new T.PlaneGeometry(.31,.083),new T.MeshBasicMaterial({color:0xffffff}));mirror.position.set(-.12,1.34,-.648);root.add(mirror);
 let last=-1;
 return {root,wheel,mirror,update(player,mph){root.position.set(player.x,player.mesh.position.y,player.z);root.rotation.y=player.th;root.rotation.z=player.lean*.6;wheel.rotation.z=-player.delta*2.4;if(mph!==last){last=mph;ctx.fillStyle='#101c20';ctx.fillRect(0,0,512,128);ctx.textAlign='center';ctx.fillStyle='#d9e8da';ctx.font='52px monospace';ctx.fillText(String(mph).padStart(2,'0'),256,66);ctx.font='22px monospace';ctx.fillStyle='#889f9a';ctx.fillText('MPH  ·  '+player.operation.gear,256,105);gauge.needsUpdate=true;}}};
}
export function vehicleModel(template,color){
 const root=template.clone(true),wheels=[],front=[];const indL=new T.MeshBasicMaterial({color:0x6b4a10}),indR=indL.clone();
 root.traverse(o=>{if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;if(o.material.name==='paint'){o.material=o.material.clone();o.material.color.set(color).convertSRGBToLinear();}});
 root.children.forEach(o=>{if(/Wheel/.test(o.name)){wheels.push(o);if(/Front/.test(o.name))front.push(o);}});
 root.userData={wheels,front,indL,indR,radius:.315,roll:true};return root;
}
