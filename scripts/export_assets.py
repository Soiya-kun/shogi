"""Export artist edits without regenerating models.

blender --background assets/blender/aether-assets.blend --python scripts/export_assets.py
"""
import bpy, json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist/assets'

def export(scene_name,filename,exclude_samples=False):
    scene=bpy.data.scenes[scene_name]
    bpy.context.window.scene=scene
    for obj in scene.objects:
        root=obj
        while root.parent: root=root.parent
        sample=root.name.startswith('Unit_')
        obj.select_set(obj.type not in {'CAMERA','LIGHT'} and not (exclude_samples and sample))
    bpy.ops.export_scene.gltf(filepath=str(OUT/filename),export_format='GLB',use_selection=True,use_active_scene=True,export_animations=False,export_extras=True)

export('Aether_Meadow','meadow.glb',True)
export('Aether_Army','army.glb')
(OUT/'manifest.json').write_text(json.dumps({'generator':'Blender '+bpy.app.version_string,'cellSize':1.6,'assets':{p.name:{'bytes':p.stat().st_size} for p in OUT.glob('*.glb')}},indent=2))
print('Edited Blender assets exported')
