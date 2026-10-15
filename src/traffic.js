import {vehicleModel} from './cockpit.js';
import {nearest} from '../core/net.js';
export function createTraffic(scene,assets,net){
 const cars=[],parked=[],moving=[];const colours=['#63747b','#9a9c8d','#5a6661','#8c6e65','#c4c4b8','#496476'];
 for(let i=0;i<4;i++){
  const car={x:i===3?-1.65:1.65,z:[-90,-230,-350,-80][i],th:i===3?0:Math.PI,v:0,alive:true,index:i,mesh:vehicleModel(assets.car,colours[i])};scene.add(car.mesh);cars.push(car);moving.push(car);
 }
 for(const [i,[x,z]]of [[2.3,-116],[2.3,-301],[-7.7,-58],[7.8,-246]].entries()){
  const car={x,z,th:Math.PI,v:0,alive:true,static:true,index:10+i,mesh:vehicleModel(assets.car,colours[i+1])};car.mesh.rotation.y=car.th;car.mesh.position.set(x,0,z);scene.add(car.mesh);cars.push(car);parked.push(car);
 }
 const traffic={clock:0,cars,bikes:[],peds:[],ringBikes:[],puffins:[],lightState:()=> 'green',parked,
 update(dt,player,quality){
  traffic.clock+=dt;for(const car of cars)car.ghost=Math.max(0,(car.ghost||0)-dt);
  for(const car of moving){
   const dir=car.th===0?-1:1;let target=car.th===0?-1.65:1.65;let speed=car.th===0?5.3:5.9;
   if(dir>0){for(const p of parked.filter(p=>p.x>0&&p.x<3.2)){
    const ahead=p.z-car.z;
    if(ahead>-9&&ahead<25){const playerNear=Math.abs(player.z-p.z)<42&&player.x<.5;if(playerNear&&ahead>8)speed=0;else target=.2;}
   }}
   const ahead=(player.z-car.z)*dir;
   if(ahead>0&&ahead<15&&Math.abs(player.x-car.x)<1.8)speed=Math.max(0,(ahead-7)*.7);
   for(const other of moving){if(other===car)continue;const gap=(other.z-car.z)*dir;if(gap>0&&gap<12&&Math.abs(other.x-car.x)<1.8)speed=0;}
   if(car.ghost>0)speed=0;
   car.v+=(speed-car.v)*Math.min(1,dt*2);car.x+=(target-car.x)*Math.min(1,dt*1.4);car.z+=dir*car.v*dt;
   if(car.z>20||car.z<-425){const spawn=dir>0?-425:20;if(Math.abs(player.z-spawn)>100)car.z=spawn;else car.v=0;}
   car.mesh.position.set(car.x,0,car.z);car.mesh.rotation.y=car.th;for(const w of car.mesh.userData.wheels)w.rotation.x-=car.v*dt/.315;
  }
  for(const car of cars){car.e=nearest(net,car.x,car.z)?.e;car.mesh.visible=Math.hypot(player.x-car.x,player.z-car.z)<quality.draw;}
 },reset(){traffic.clock=0;moving.forEach((c,i)=>{c.x=i===3?-1.65:1.65;c.z=[-90,-230,-350,-80][i];c.v=0;});}};
 traffic.update(0,{x:-1.65,z:-6},{draw:250});return traffic;
}
