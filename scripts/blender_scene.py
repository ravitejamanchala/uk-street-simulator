"""Blender 4.x+ optional authoring scene. Uses exactly the generated runtime assets.
Run outside Blender first: python scripts/generate_assets.py
Then: blender --background --python scripts/blender_scene.py -- --output build/blender
Blender isn't a runtime requirement. This script has not been executed on the delivery host.
"""
import bpy,sys,json,math,argparse
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
p=argparse.ArgumentParser();p.add_argument('--output',default=str(ROOT/'build/blender'));a=p.parse_args(args);out=Path(a.output).resolve();out.mkdir(parents=True,exist_ok=True)
assets=ROOT/'public/assets';layout=json.loads((assets/'layout.json').read_text())
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
# glTF uses Y-up, Blender Z-up; imports convert automatically.
def import_template(name):
 before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(assets/(name+'.glb')))
 objects=list(set(bpy.data.objects)-before)
 collection=bpy.data.collections.new(name);scene.collection.children.link(collection)
 for obj in objects:
  for col in list(obj.users_collection):col.objects.unlink(obj)
  collection.objects.link(obj)
 # A source collection can be instanced with linked geometry, then hidden from the authoring scene.
 scene.collection.children.unlink(collection)
 return collection
def instance(collection,name,x,z,yaw=0,size=1):
 obj=bpy.data.objects.new(name,None);obj.instance_type='COLLECTION';obj.instance_collection=collection;scene.collection.objects.link(obj);obj.location=(x,-z,0);obj.rotation_euler.z=yaw;obj.scale=(size,size,size);return obj
houses=[import_template('house-'+str(i)+'-high') for i in range(6)]
for i,h in enumerate(layout['houses']):instance(houses[h['variant']],'House_%02d'%i,h['x'],h['z'],h['rotation'])
tree=import_template('tree-high');lamp=import_template('streetlight');car=import_template('car')
for i in range(14):
 side=1 if i%2 else -1;z=-9-i*29
 if abs(z+200)>10:instance(lamp,'Streetlight_%02d'%i,side*4.2,z,0 if side<0 else math.pi)
for i,h in enumerate(layout['houses']):
 if h['garden']>.58:instance(tree,'Garden_tree_%02d'%i,(1 if h['x']>0 else -1)*7.1,h['z']+h['width']*.37,size=.7)
instance(car,'Learner_car',-1.65,-7)
def mat(name,rgb,image=None):
 m=bpy.data.materials.new(name);m.use_nodes=True;node=m.node_tree.nodes.get('Principled BSDF');node.inputs['Base Color'].default_value=(*rgb,1);node.inputs['Roughness'].default_value=.85
 if image:
  tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(assets/image));m.node_tree.links.new(tex.outputs['Color'],node.inputs['Base Color'])
 return m
def box(name,location,dimensions,material):
 bpy.ops.mesh.primitive_cube_add(size=1,location=location);o=bpy.context.object;o.name=name;o.dimensions=dimensions;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material);return o
road=mat('Asphalt',(.2,.21,.22),'asphalt.png');pave=mat('Pavement',(.55,.54,.5),'pavement.png');grass=mat('Ground',(.25,.3,.2));line=mat('Markings',(.83,.83,.77))
box('400_m_main_road',(0,200,-.02),(6.4,430,.04),road);box('48_m_side_arm',(26,200,-.02),(52,5.6,.04),road);box('Context_ground',(0,200,-.1),(600,700,.1),grass)
for side in [-1,1]:
 for lo,hi in ([(0,400)] if side<0 else [(0,194.6),(205.4,400)]):box('Footway',(side*4.2,(lo+hi)/2,.07),(2,hi-lo,.14),pave)
for s in range(6,399,6):
 if abs(s-200)>9:box('Centre_mark',(0,s,.013),(.1,4 if abs(s-200)<35 else 2,.005),line)
bpy.ops.object.light_add(type='SUN',location=(-30,62,37));sun=bpy.context.object;sun.name='Natural_daylight';sun.rotation_euler=(Vector((0,200,0))-sun.location).to_track_quat('-Z','Y').to_euler();sun.data.energy=2.2;sun.data.angle=math.radians(3)
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.55,.68,.8,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.5
bpy.ops.object.camera_add(location=(-1.28,6.77,1.22));camera=bpy.context.object;camera.name='RHD_driver_1_22_m';camera.rotation_euler=(Vector((-1.28,35,1.17))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=24;camera.data.clip_start=.035;camera.data.clip_end=600;scene.camera=camera
scene.render.engine='CYCLES';scene.cycles.samples=64;scene.render.resolution_x=1440;scene.render.resolution_y=900;scene.render.resolution_percentage=100
# Pack original texture files so the saved .blend is portable.
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(out/'elmfield-street.blend'))
# An editable scene export, separate from the optimised instanced runtime distribution.
bpy.ops.export_scene.gltf(filepath=str(out/'elmfield-authoring.glb'),export_format='GLB',export_apply=True)
print('Saved metre-scale authoring .blend and GLB in',out)
