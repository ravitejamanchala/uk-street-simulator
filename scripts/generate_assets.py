"""Original, deterministic metre-scale meshes and textures. No downloaded art.
Run: python3 scripts/generate_assets.py (Pillow + NumPy); Blender is optional.
"""
from pathlib import Path
import math,json,struct,random
import numpy as np
from PIL import Image,ImageDraw,ImageFont,ImageFilter
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'public/assets';OUT.mkdir(parents=True,exist_ok=True)
rng=np.random.default_rng(71)
def save(a,name):Image.fromarray(np.uint8(np.clip(a,0,255))).save(OUT/name,optimize=True)
def normal(h,name,strength=1):
 dy,dx=np.gradient(h.astype(float)); n=np.stack([-dx*strength,-dy*strength,np.ones_like(h)],axis=2);n/=np.linalg.norm(n,axis=2,keepdims=True);save((n*.5+.5)*255,name)
n=512;y,x=np.mgrid[:n,:n];noise=rng.normal(0,1,(n,n))
# A tile covers 1.76 x 1.04 m: eight 220 mm brick courses, 16 x 65 mm courses.
row=y//32;col=(x+(row%2)*32)%64;mortar=(y%32<3)|(col<3)
brick=np.zeros((n,n,3));base=np.array([178,166,143]); grain=rng.normal(0,5,(n,n));variation=rng.normal(0,8,(16,9))
for c in range(3):brick[:,:,c]=base[c]+grain+variation[row,np.minimum((x+(row%2)*32)//64,8)]
brick[mortar]=[160,151,133];save(brick,'brick.png');normal(np.where(mortar,0,1)+noise*.035,'brick-normal.png',1.1)
save(np.repeat((np.where(mortar,237,218)+noise*3)[:,:,None],3,2),'brick-rough.png')
# Tarmac: fine aggregate, not oversized rocky terrain; 4 m texture repeat.
a=rng.normal(0,2.4,(1024,1024));large=np.array(Image.fromarray(np.uint8(rng.uniform(0,255,(32,32)))).resize((1024,1024),Image.Resampling.BICUBIC)).astype(float)/255-.5
chips=rng.random((1024,1024));a+=np.where(chips>.985,12,0)+large*8
save(np.stack([a+72,a+76,a+78],2),'asphalt.png');normal(a,'asphalt-normal.png',.075);save(np.repeat(np.clip(211+large*28+a*.3,0,255)[:,:,None],3,2),'asphalt-rough.png')
y,x=np.mgrid[:512,:512];joints=(x%128<2)|(y%128<2);v=rng.normal(0,2.1,(512,512));p=np.stack([v+158,v+156,v+147],2);p[joints]=[99,102,99];save(p,'pavement.png');normal(np.where(joints,0,1)+v*.01,'pavement-normal.png',.8)
roof=np.stack([noise*2+57,noise*2+62,noise*2+65],2);roof[(y%32)<2]=[37,39,40];roof[(x+(y//32%2)*32)%64<1]=[40,42,43];save(roof,'roof.png');normal((y%32)/32+noise*.015,'roof-normal.png',.6)
# One shared atlas for windows, door panels, number plates and drain covers.
atlas=Image.new('RGB',(1024,1024),(211,207,194));d=ImageDraw.Draw(atlas)
for i in range(16):
 ox=(i%4)*256;oy=(i//4)*256
 if i<8:
  d.rectangle((ox+5,oy+5,ox+251,oy+251),fill=(216,215,200));d.rectangle((ox+20,oy+16,ox+236,oy+239),fill=(48+i%3*5,65+i%4*4,72+i%2*8))
  d.rectangle((ox+23,oy+20,ox+64+(i%3)*8,oy+236),fill=(159,153,136));d.rectangle((ox+204-(i%2)*12,oy+20,ox+232,oy+236),fill=(142,141,127))
  d.polygon([(ox+70,oy+20),(ox+172,oy+20),(ox+109,oy+160),(ox+66,oy+180)],fill=(73,91,100))
  for xx in [ox+125,ox+129]:d.line((xx,oy+16,xx,oy+239),fill=(221,216,201),width=5)
  d.line((ox+20,oy+113,ox+236,oy+113),fill=(216,211,197),width=7)
 elif i<12:
  colours=[(40,65,77),(67,82,62),(90,51,43),(151,129,81)];c=colours[i-8];d.rectangle((ox+4,oy+3,ox+252,oy+252),fill=c)
  for yy in [20,92,164]:d.rectangle((ox+27,oy+yy,ox+226,oy+yy+60),outline=tuple(max(0,k-18) for k in c),width=5)
  d.ellipse((ox+210,oy+133,ox+222,oy+145),fill=(176,151,89))
 elif i==12:
  d.rectangle((ox,oy,ox+255,oy+255),fill=(231,185,51));d.text((ox+37,oy+97),'LD 26 UK',fill=(25,26,25),font=ImageFont.load_default(size=34))
 elif i==13:
  d.rectangle((ox,oy,ox+255,oy+255),fill=(221,225,222));d.text((ox+37,oy+97),'LD 26 UK',fill=(25,26,25),font=ImageFont.load_default(size=34))
 else:
  d.rectangle((ox,oy,ox+255,oy+255),fill=(57,59,56))
  for xx in range(ox+14,ox+245,25):d.line((xx,oy+15,xx,oy+240),fill=(18,20,19),width=10)
atlas.save(OUT/'details-atlas.png',optimize=True)
# Original alpha-cut foliage texture, 512 px; many leaves per cluster with sky holes.
leaf=Image.new('RGBA',(512,512));ld=ImageDraw.Draw(leaf);rr=random.Random(22)
for i in range(1900):
 xx=rr.randrange(15,497);yy=rr.randrange(15,497)
 if ((xx-256)/249)**2+((yy-255)/245)**2>rr.uniform(.75,1.14):continue
 r=rr.uniform(3,11);shade=rr.randrange(42,91);ld.ellipse((xx-r,yy-r*.5,xx+r,yy+r*.5),fill=(shade,shade+17,shade-9,255))
leaf.save(OUT/'foliage.png',optimize=True)
MATS=[
 {'name':'brick','pbrMetallicRoughness':{'baseColorTexture':{'index':0},'roughnessFactor':1,'metallicFactor':0,'metallicRoughnessTexture':{'index':2}},'normalTexture':{'index':1,'scale':.6}},
 {'name':'roof','pbrMetallicRoughness':{'baseColorTexture':{'index':3},'roughnessFactor':.87,'metallicFactor':.02},'normalTexture':{'index':4,'scale':.7}},
 {'name':'limestone-trim','pbrMetallicRoughness':{'baseColorFactor':[.72,.7,.62,1],'roughnessFactor':.86,'metallicFactor':0}},
 {'name':'details-atlas','pbrMetallicRoughness':{'baseColorTexture':{'index':5},'roughnessFactor':.65,'metallicFactor':0}},
 {'name':'iron','pbrMetallicRoughness':{'baseColorFactor':[.075,.085,.085,1],'roughnessFactor':.65,'metallicFactor':.5}},
 {'name':'bark','pbrMetallicRoughness':{'baseColorFactor':[.16,.13,.095,1],'roughnessFactor':1,'metallicFactor':0}},
 {'name':'foliage','pbrMetallicRoughness':{'baseColorTexture':{'index':6},'roughnessFactor':1,'metallicFactor':0},'doubleSided':True,'alphaMode':'MASK','alphaCutoff':.45},
 {'name':'paint','pbrMetallicRoughness':{'baseColorFactor':[.44,.52,.54,1],'roughnessFactor':.27,'metallicFactor':.48}},
 {'name':'glass','pbrMetallicRoughness':{'baseColorFactor':[.12,.19,.22,.42],'roughnessFactor':.12,'metallicFactor':.2},'alphaMode':'BLEND','doubleSided':True},
 {'name':'rubber','pbrMetallicRoughness':{'baseColorFactor':[.027,.03,.031,1],'roughnessFactor':.91,'metallicFactor':0}},
 {'name':'alloy','pbrMetallicRoughness':{'baseColorFactor':[.41,.43,.44,1],'roughnessFactor':.32,'metallicFactor':.8}},
 {'name':'lamp-lens','pbrMetallicRoughness':{'baseColorFactor':[.82,.83,.73,1],'roughnessFactor':.3,'metallicFactor':.1}}
]
IMAGES=['brick.png','brick-normal.png','brick-rough.png','roof.png','roof-normal.png','details-atlas.png','foliage.png']
class Mesh:
 def __init__(self):self.groups={}
 def face(self,pts,mat,uv=None):
  g=self.groups.setdefault(mat,[[],[],[]]);p=np.array(pts,float);n=np.cross(p[1]-p[0],p[2]-p[0]);n/=max(1e-9,np.linalg.norm(n));scale=[1.76,1.04] if mat==0 else [1,1]
  if uv is None:
   w=np.linalg.norm(p[1]-p[0])/scale[0];h=np.linalg.norm(p[-1]-p[0])/scale[1];uv=[(0,0),(w,0),(w,h),(0,h)] if len(p)==4 else [(0,0),(w,0),(w*.5,h)]
  if len(uv)<len(p):uv=[(0,0)]*len(p)
  for i in range(1,len(p)-1):
   for j in [0,i,i+1]:g[0].extend(p[j]);g[1].extend(n);g[2].extend(uv[j])
 def box(self,c,s,mat):
  x,y,z=c;a,b,d=[v/2 for v in s];P=[(x-a,y-b,z-d),(x+a,y-b,z-d),(x+a,y+b,z-d),(x-a,y+b,z-d),(x-a,y-b,z+d),(x+a,y-b,z+d),(x+a,y+b,z+d),(x-a,y+b,z+d)]
  for inds in [[4,5,6,7],[1,0,3,2],[0,4,7,3],[5,1,2,6],[3,7,6,2],[0,1,5,4]]:self.face([P[k] for k in inds],mat)
 def quad(self,x,y,z,w,h,tile):
  u=(tile%4)/4;v=(tile//4)/4;pad=.003;uv=[(u+pad,v+.25-pad),(u+.25-pad,v+.25-pad),(u+.25-pad,v+pad),(u+pad,v+pad)]
  self.face([(x-w/2,y-h/2,z),(x+w/2,y-h/2,z),(x+w/2,y+h/2,z),(x-w/2,y+h/2,z)],3,uv)
 def cylinder(self,a,b,r1,r2,mat,n=10):
  a=np.array(a);b=np.array(b);axis=(b-a)/np.linalg.norm(b-a);u=np.cross(axis,[0,0,1] if abs(axis[2])<.8 else [1,0,0]);u/=np.linalg.norm(u);v=np.cross(axis,u)
  A=[a+(u*math.cos(i*2*math.pi/n)+v*math.sin(i*2*math.pi/n))*r1 for i in range(n)];B=[b+(u*math.cos(i*2*math.pi/n)+v*math.sin(i*2*math.pi/n))*r2 for i in range(n)]
  for i in range(n):j=(i+1)%n;self.face([A[j],A[i],B[i],B[j]],mat);self.face([a,A[i],A[j]],mat);self.face([b,B[j],B[i]],mat)
def export(name,parts,extras={}):
 blob=bytearray();views=[];access=[];meshes=[];nodes=[]
 def attribute(vals,size):
  while len(blob)%4:blob.append(0)
  start=len(blob);arr=np.array(vals,dtype='<f4').reshape(-1,size);blob.extend(arr.tobytes());vi=len(views);views.append({'buffer':0,'byteOffset':start,'byteLength':len(arr.tobytes()),'target':34962});ai=len(access);access.append({'bufferView':vi,'componentType':5126,'count':len(arr),'type':{2:'VEC2',3:'VEC3'}[size],'min':arr.min(axis=0).tolist(),'max':arr.max(axis=0).tolist()});return ai
 for part,mesh,pos in parts:
  primitives=[]
  for mat,(p,n,uv) in mesh.groups.items():primitives.append({'attributes':{'POSITION':attribute(p,3),'NORMAL':attribute(n,3),'TEXCOORD_0':attribute(uv,2)},'material':mat})
  meshes.append({'name':part,'primitives':primitives});nodes.append({'name':part,'mesh':len(meshes)-1,'translation':pos})
 gltf={'asset':{'version':'2.0','generator':'UK Street original Python asset generator; metres'},'scene':0,'scenes':[{'nodes':list(range(len(nodes)))}],'nodes':nodes,'meshes':meshes,'materials':MATS,'images':[{'uri':s} for s in IMAGES],'textures':[{'source':i,'sampler':1 if i==5 else 0} for i in range(len(IMAGES))],'samplers':[{'wrapS':10497,'wrapT':10497},{'wrapS':33071,'wrapT':33071}],'buffers':[{'byteLength':len(blob)}],'bufferViews':views,'accessors':access,'extras':{'units':'metres',**extras}}
 text=json.dumps(gltf,separators=(',',':')).encode();text+=b' '*((-len(text))%4);blob+=b'\x00'*((-len(blob))%4);length=12+8+len(text)+8+len(blob)
 (OUT/(name+'.glb')).write_bytes(struct.pack('<III',0x46546c67,2,length)+struct.pack('<II',len(text),0x4E4F534A)+text+struct.pack('<II',len(blob),0x004E4942)+blob)
for variant in range(6):
 w=[6.4,7.2,8.2,6.8,7.6,8.6][variant];depth=[7.7,8.4,8,8.9,7.5,9.2][variant];eave=[5.8,6.2,5.9,6.5,6.1,6.4][variant];ridge=eave+2.05;front=depth/2
 for lod in ['high','low']:
  m=Mesh();m.box((0,eave/2,0),(w,eave,depth),0)
  # Proper pitched roof, gable ends, roof thickness and overhang.
  a=w/2+.24;z=front+.23
  if variant in [0,2,4]:
   m.face([(-a,eave,z),(a,eave,z),(a,ridge,0),(-a,ridge,0)],1);m.face([(a,eave,-z),(-a,eave,-z),(-a,ridge,0),(a,ridge,0)],1)
   m.face([(-w/2,eave,-front),(-w/2,eave,front),(-w/2,ridge,0)],0);m.face([(w/2,eave,front),(w/2,eave,-front),(w/2,ridge,0)],0)
  elif variant==5:
   m.face([(-a,eave,-z),(-a,eave,z),(0,ridge,1.4),(0,ridge,-1.4)],1);m.face([(0,ridge,-1.4),(0,ridge,1.4),(a,eave,z),(a,eave,-z)],1)
   m.face([(-a,eave,z),(a,eave,z),(0,ridge,1.4)],1);m.face([(a,eave,-z),(-a,eave,-z),(0,ridge,-1.4)],1)
  else:
   m.face([(-a,eave,-z),(-a,eave,z),(0,ridge,z),(0,ridge,-z)],1);m.face([(0,ridge,-z),(0,ridge,z),(a,eave,z),(a,eave,-z)],1)
   m.face([(-w/2,eave,front),(w/2,eave,front),(0,ridge,front)],0);m.face([(w/2,eave,-front),(-w/2,eave,-front),(0,ridge,-front)],0)
  for wx in [-w*.28,w*.28]:
   for wy in [1.6,4.15]:
    m.quad(wx,wy,front+.035,1.25,1.6,(variant*2+int(wy))%8)
    if lod=='high':
     m.box((wx,wy-.86,front+.12),(1.45,.14,.28),2);m.box((wx,wy+.86,front+.075),(1.48,.16,.15),2)
     for sx in [-.68,.68]:m.box((wx+sx,wy,front+.055),(.085,1.72,.095),2)
  m.quad(0,1.06,front+.045,.98,2.08,8+variant%4)
  if lod=='high':
   m.box((0,.09,front+.33),(1.25,.18,.65),2);m.box((0,2.25,front+.33),(1.5,.12,.9),1)
   for side in [-1,1]:
    m.box((side*(w/2+.03),eave-.03,0),(.13,.16,depth+.45),2)
    m.cylinder((side*(w/2-.2),.3,front+.12),(side*(w/2-.2),eave,front+.12),.045,.045,4)
   m.cylinder((-w/2,eave,front+.25),(w/2,eave,front+.25),.065,.065,4)
   m.box((w*.24,(eave+ridge+.7)/2,-depth*.23),(.68,ridge+.7-eave,.61),0);m.box((w*.24,ridge+.74,-depth*.23),(.8,.12,.74),2)
   for px in [-.19,.19]:m.cylinder((w*.24+px,ridge+.8,-depth*.23),(w*.24+px,ridge+1.12,-depth*.23),.11,.095,0)
   if variant%3!=1:
    bx=-w*.28;m.box((bx,1.55,front+.37),(1.65,2.8,.72),0);m.quad(bx,1.72,front+.75,1.45,1.65,variant%8);m.box((bx,3.02,front+.4),(1.86,.19,.94),1);m.box((bx,.18,front+.45),(1.86,.22,1.1),2)
   if variant==4:
    m.box((w*.24,eave+1.6,front*.45),(1.5,1.9,1.4),0);m.quad(w*.24,eave+1.6,front*.45+.71,1.12,.85,2);m.box((w*.24,eave+2.59,front*.45),(1.7,.12,1.65),1)
  export('house-'+str(variant)+'-'+lod,[('house',m,[0,0,0])],{'variant':variant,'lod':lod,'width':w,'depth':depth,'eaves':eave,'roof':ridge})
# Car: lofted sheet-metal body with tapered ends, cabin, lights and four separate wheels.
m=Mesh();rings=[(-2.15,.60,.55),(-1.95,.83,.76),(-1.2,.89,.88),(.8,.89,.89),(1.8,.82,.78),(2.15,.68,.62)]
P=[]
for z,width,top in rings:P.append([(-width,.38,z),(-width,.62,z),(-width*.92,top,z),(width*.92,top,z),(width,.62,z),(width,.38,z)])
for i in range(len(P)-1):
 for j in range(6):k=(j+1)%6;m.face([P[i][j],P[i+1][j],P[i+1][k],P[i][k]],7)
m.face(list(reversed(P[0])),7);m.face(P[-1],7)
# Transparent cabin glazing and separate roof; dashboard supplied by runtime.
m.face([(-.77,.88,-1.05),(.77,.88,-1.05),(.64,1.43,-.39),(-.64,1.43,-.39)],8)
m.face([(-.64,1.43,.98),(.64,1.43,.98),(.76,.89,1.5),(-.76,.89,1.5)],8)
for side in [-1,1]:
 m.face([(side*.77,.89,-1.05),(side*.77,.89,1.5),(side*.64,1.43,.98),(side*.64,1.43,-.39)],8)
 m.cylinder((side*.78,.88,-1.04),(side*.65,1.45,-.39),.04,.035,7)
 m.cylinder((side*.77,.88,1.49),(side*.65,1.45,.98),.04,.035,7)
 m.box((side*.9,1.02,-.5),(.26,.12,.19),7);m.box((side*.86,.88,.27),(.05,.045,.19),10)
m.box((0,1.46,.29),(1.36,.07,1.47),7);m.box((0,.47,-2.13),(1.23,.12,.06),4)
for x in [-.59,.59]:m.box((x,.69,-2.06),(.4,.14,.07),11);m.box((x,.71,2.03),(.4,.16,.07),4)
m.quad(0,.59,2.16,.53,.12,12)
parts=[('body',m,[0,0,0])]
for x in [-.82,.82]:
 for z in [-1.3,1.33]:
  wheel=Mesh();wheel.cylinder((-.12,0,0),(.12,0,0),.315,.315,9,20);wheel.cylinder((-.127,0,0),(.127,0,0),.218,.218,10,16)
  for a in range(6):
   yy=math.cos(a*math.pi/3)*.13;zz=math.sin(a*math.pi/3)*.13;wheel.box((.135 if x>0 else -.135,yy,zz),(.02,.06,.06),4)
  parts.append((('Front' if z<0 else 'Rear')+('LeftWheel' if x<0 else 'RightWheel'),wheel,[x,.315,z]))
export('car',parts,{'length':4.3,'width':1.8,'height':1.5})
for lod in ['high','low']:
 m=Mesh();m.cylinder((0,0,0),(0,5.1,0),.18,.08,5,9);rr=random.Random(52)
 for i in range(8):
  a=i*2.4;m.cylinder((0,3.2+i*.16,0),(math.cos(a)*1.5,5.1+i*.13,math.sin(a)*1.5),.07,.015,5,6)
 for i in range(44 if lod=='high' else 12):
  a=rr.random()*math.pi*2;rad=rr.uniform(.1,1.9);cx=math.cos(a)*rad;cz=math.sin(a)*rad;cy=rr.uniform(4.2,6.8);theta=rr.random()*math.pi;size=rr.uniform(1.1,2.0);dx=math.cos(theta)*size;dz=math.sin(theta)*size
  m.face([(cx-dx,cy-size*.6,cz-dz),(cx+dx,cy-size*.6,cz+dz),(cx+dx,cy+size*.6,cz+dz),(cx-dx,cy+size*.6,cz-dz)],6,[(0,1),(1,1),(1,0),(0,0)])
 export('tree-'+lod,[('tree',m,[0,0,0])],{'lod':lod,'height':8})
m=Mesh();m.cylinder((0,0,0),(0,6.8,0),.08,.045,4,10);m.cylinder((0,6.8,0),(.9,7.05,0),.045,.04,4,8);m.box((1.02,7.03,0),(.5,.13,.23),4);m.box((1.02,6.95,0),(.44,.025,.19),11);export('streetlight',[('streetlight',m,[0,0,0])],{'height':7.1})
layout={'seed':71,'length':400,'carriagewayWidth':6.4,'pavementWidth':2,'kerbHeight':.14,'speedLimitMph':20,'junction':{'x':0,'z':-200,'armLength':48,'width':5.6},'houses':[]}
rr=random.Random(71)
for side in [-1,1]:
 z=-10
 while z>-390:
  variant=rr.randrange(6);w=[6.4,7.2,8.2,6.8,7.6,8.6][variant]
  if not(side==1 and abs(z+200)<13):layout['houses'].append({'variant':variant,'x':side*(12.8+rr.uniform(-.6,.9)),'z':round(z,3),'rotation':math.pi/2 if side<0 else -math.pi/2,'tint':rr.choice(['#eee0c5','#e3b8a1','#ead0ad','#d0b9a4','#dbd7c4']),'door':rr.randrange(4),'garden':rr.random(),'width':w})
  z-=w+rr.uniform(1.8,3.6)
(OUT/'layout.json').write_text(json.dumps(layout,indent=2))
manifest={'author':'Original project-generated geometry and artwork','licence':'CC0-1.0 for generated assets','units':'metres','generator':'scripts/generate_assets.py','seed':71,'files':[{ 'path':p.name,'bytes':p.stat().st_size} for p in sorted(OUT.iterdir()) if p.is_file() and p.name!='manifest.json']}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2));print('Generated',len(manifest['files']),'original assets;',sum(p['bytes'] for p in manifest['files']),'bytes')
