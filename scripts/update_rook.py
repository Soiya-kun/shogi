"""Replace the rook in an existing .blend, preserving the field and other units.

blender --background assets/blender/aether-assets.blend --python scripts/update_rook.py
"""
import bpy,json,sys,hashlib,struct
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from build_assets import soldiers,make_lods,export

army=bpy.data.scenes['Aether_Army'];field=bpy.data.scenes['Aether_Meadow']
def unchanged_meshes():
    result={}
    for scene in [field,army]:
        for obj in scene.objects:
            root=obj
            while root.parent:root=root.parent
            if root.name.startswith(('Unit_R','LOD_')) or obj.type!='MESH':continue
            digest=hashlib.sha256()
            for vertex in obj.data.vertices:digest.update(struct.pack('fff',*vertex.co))
            for face in obj.data.polygons:
                for index in face.vertices:digest.update(struct.pack('I',index))
            result[scene.name+'/'+obj.name]=digest.hexdigest()
    return result
preserved=unchanged_meshes()
def remove_tree(root):
    for child in list(root.children):remove_tree(child)
    bpy.data.objects.remove(root,do_unlink=True)
samples=[o for o in field.objects if not o.parent and o.name.startswith('Unit_R')]
sample_transforms=[o.matrix_world.copy() for o in samples]
for obj in samples:remove_tree(obj)
remove_tree(army.objects['Unit_R'])
temporary=soldiers(['R'],write_assets=False)
for obj in list(temporary.objects):
    army.collection.objects.link(obj);temporary.collection.objects.unlink(obj)
bpy.context.window.scene=army;bpy.data.scenes.remove(temporary)
make_lods(army);export(army,'army.glb')
def copy_tree(obj,parent=None):
    node=obj.copy();field.collection.objects.link(node);node.parent=parent
    for child in obj.children:copy_tree(child,node)
    return node
for transform in sample_transforms:
    sample=copy_tree(army.objects['Unit_R']);sample.matrix_world=transform
    for child in sample.children:
        if child.name.endswith('_Promotion') or '_Promotion.' in child.name:child.hide_render=True;child.hide_viewport=True
bpy.context.window.scene=field
assert unchanged_meshes()==preserved,'Rook update must preserve all unrelated geometry'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/aether-assets.blend'),compress=True)
out=ROOT/'dist/assets'
(out/'manifest.json').write_text(json.dumps({'generator':'Blender '+bpy.app.version_string,'cellSize':12,'assets':{p.name:{'bytes':p.stat().st_size} for p in out.glob('*.glb')}},indent=2))
print('DRAGON_KNIGHTS_COMPLETE')
