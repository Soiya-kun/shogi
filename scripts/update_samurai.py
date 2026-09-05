"""Replace the army with samurai artwork while preserving the authored landscape.

blender --background assets/blender/aether-assets.blend --python scripts/update_samurai.py
"""
import bpy,json,sys,hashlib,struct
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from build_assets import soldiers,make_lods,export,ROLES

army=bpy.data.scenes['Aether_Army'];field=bpy.data.scenes['Aether_Meadow']

def landscape_meshes():
    result={}
    for obj in field.objects:
        root=obj
        while root.parent:root=root.parent
        if root.name.startswith(('Unit_','LOD_')) or obj.type!='MESH':continue
        digest=hashlib.sha256()
        for vertex in obj.data.vertices:digest.update(struct.pack('fff',*vertex.co))
        for face in obj.data.polygons:
            for index in face.vertices:digest.update(struct.pack('I',index))
        result[obj.name]=digest.hexdigest()
    return result

def remove_tree(obj):
    for child in list(obj.children):remove_tree(child)
    bpy.data.objects.remove(obj,do_unlink=True)

preserved=landscape_meshes()
meadow=ROOT/'dist/assets/meadow.glb';meadow_hash=hashlib.sha256(meadow.read_bytes()).hexdigest()
transforms={}
for role in ROLES:
    samples=[o for o in field.objects if not o.parent and o.name.split('.')[0]=='Unit_'+role]
    transforms[role]=[o.matrix_world.copy() for o in samples]
    for obj in samples:remove_tree(obj)
    for prefix in ['Unit_','LOD_']:
        obj=army.objects.get(prefix+role)
        if obj:remove_tree(obj)

temporary=soldiers(write_assets=False)
for obj in list(temporary.objects):
    army.collection.objects.link(obj);temporary.collection.objects.unlink(obj)
bpy.context.window.scene=army;bpy.data.scenes.remove(temporary)
make_lods(army);export(army,'army.glb')

def copy_tree(obj,parent=None):
    node=obj.copy();field.collection.objects.link(node);node.parent=parent
    for child in obj.children:copy_tree(child,node)
    return node

for role,matrices in transforms.items():
    for matrix in matrices:
        sample=copy_tree(army.objects['Unit_'+role]);sample.matrix_world=matrix
        for child in sample.children:
            if child.name.split('.')[0].endswith('_Promotion'):child.hide_render=True;child.hide_viewport=True

assert landscape_meshes()==preserved,'Samurai update must preserve the landscape geometry'
assert hashlib.sha256(meadow.read_bytes()).hexdigest()==meadow_hash,'Do not re-export terrain'
bpy.context.window.scene=field
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/aether-assets.blend'),compress=True)
out=ROOT/'dist/assets'
(out/'manifest.json').write_text(json.dumps({'generator':'Blender '+bpy.app.version_string,'cellSize':12,'assets':{p.name:{'bytes':p.stat().st_size} for p in out.glob('*.glb')}},indent=2))
print('SAMURAI_ARMIES_COMPLETE: original landscape preserved')
