// Oriented vehicle rectangles against buildings, posts and other vehicles; dimensions in metres.
export function overlap(a,b){
 const dx=a.x-b.x,dz=a.z-b.z;let best=Infinity,normal;
 const axes=[[Math.cos(a.th||0),-Math.sin(a.th||0)],[Math.sin(a.th||0),Math.cos(a.th||0)],[Math.cos(b.th||0),-Math.sin(b.th||0)],[Math.sin(b.th||0),Math.cos(b.th||0)]];
 const radius=(o,x,z)=>Math.abs(x*Math.cos(o.th||0)-z*Math.sin(o.th||0))*(o.hx??.9)+Math.abs(x*Math.sin(o.th||0)+z*Math.cos(o.th||0))*(o.hz??2.15);
 for(const [x,z]of axes){const projection=dx*x+dz*z;const depth=radius(a,x,z)+radius(b,x,z)-Math.abs(projection);if(depth<=0)return null;if(depth<best){best=depth;const sign=projection>=0?1:-1;normal={x:x*sign,z:z*sign};}}
 return {...normal,depth:best};
}
