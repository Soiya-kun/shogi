"""Update the silver squad heavy knights, preserving all existing unit artwork.

blender --background assets/blender/aether-assets.blend --python scripts/update_silver.py
"""
import bpy,json,sys,hashlib,struct
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from build_assets import soldiers,make_lods,export

army=bpy.data.scenes['Aether_Army'];field=bpy.data.scenes['Aether_Meadow']


def preserved_meshes():
    result={}
    for scene in [field,army]:
        for obj in scene.objects:
            root=obj
            while root.parent:root=root.parent
            if root.name.split('.')[0] in ['Unit_H','LOD_H'] or obj.type!='MESH':continue
            digest=hashlib.sha256()
            for vertex in obj.data.vertices:digest.update(struct.pack('fff',*vertex.co))
            for face in obj.data.polygons:
                for index in face.vertices:digest.update(struct.pack('I',index))
            result[scene.name+'/'+obj.name]=digest.hexdigest()
    return result


def remove_tree(root):
    for child in list(root.children):remove_tree(child)
    bpy.data.objects.remove(root,do_unlink=True)


preserved=preserved_meshes()
sample_transforms={}
for role in ['H']:
    samples=[o for o in field.objects if not o.parent and o.name.split('.')[0]=='Unit_'+role]
    sample_transforms[role]=[o.matrix_world.copy() for o in samples]
    for obj in samples:remove_tree(obj)
    if army.objects.get('Unit_'+role):remove_tree(army.objects['Unit_'+role])

temporary=soldiers(['H'],write_assets=False)
for obj in list(temporary.objects):
    army.collection.objects.link(obj);temporary.collection.objects.unlink(obj)
bpy.context.window.scene=army;bpy.data.scenes.remove(temporary)
make_lods(army,['H']);export(army,'army.glb')


def copy_tree(obj,parent=None):
    node=obj.copy();field.collection.objects.link(node);node.parent=parent
    for child in obj.children:copy_tree(child,node)
    return node


if not sample_transforms['H']:
    reference=next(o for o in field.objects if not o.parent and o.name.split('.')[0]=='Unit_S')
    transform=reference.matrix_world.copy();transform.translation.x+=3
    sample_transforms['H'].append(transform)
for role,transforms in sample_transforms.items():
    for transform in transforms:
        sample=copy_tree(army.objects['Unit_'+role]);sample.matrix_world=transform
        for child in sample.children:
            if child.name.split('.')[0].endswith('_Promotion'):child.hide_render=True;child.hide_viewport=True

bpy.context.window.scene=field
assert preserved_meshes()==preserved,'Heavy-knight update must preserve all unrelated geometry, including LODs'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/aether-assets.blend'),compress=True)
out=ROOT/'dist/assets'
(out/'manifest.json').write_text(json.dumps({'generator':'Blender '+bpy.app.version_string,'cellSize':12,'assets':{p.name:{'bytes':p.stat().st_size} for p in out.glob('*.glb')}},indent=2))
print('SILVER_HEAVY_KNIGHTS_COMPLETE')
