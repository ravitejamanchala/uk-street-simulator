import {buildNet,buildRoute} from '../core/net.js';
export function streetNetwork(){
 const d={origin:[0,0],kx:1,kz:1,names:['Elmfield Road','Garden Lane'],classes:['residential'],nodes:[0,0,0,-2000,0,-4000,480,-2000],ways:[[0,0,20,0,0,6.4,0,1],[1,0,20,0,0,5.6,0,1]],edges:[[0,1,0,[0,0,0,-2000]],[1,2,0,[0,-2000,0,-4000]],[1,3,1,[0,-2000,480,-2000]]],stops:[],zebras:[],giveways:[[2,55,-1,0]],minis:[],rbs:[],arrows:[]};
 const net=buildNet(d);const route=buildRoute(net,[0,1,2]);return {net,route};
}
