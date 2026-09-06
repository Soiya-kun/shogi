"""Export a copied city scene without modifying the concurrently edited source."""
import bpy
from pathlib import Path
root=Path(__file__).resolve().parents[1]
scene=bpy.data.scenes.get('Yankee_Crossroads_v1')
if scene is None: raise RuntimeError('Crossroads scene missing')
bpy.context.window.scene=scene
bpy.ops.object.select_all(action='DESELECT')
for obj in scene.objects:
    if obj.type not in {'MESH','CURVE','FONT'}: continue
    if any(c.name.startswith(('Review_', 'Street_Instance_')) for c in obj.users_collection): continue
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(root/'dist/assets/stages/yankee/city.glb'),export_format='GLB',use_selection=True,export_apply=True,export_lights=False,export_cameras=False)
