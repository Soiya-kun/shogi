"""Export saved ashigaru master/LOD without editing or saving the artist source."""
import bpy
from pathlib import Path
out = Path(__file__).resolve().parents[1] / 'dist/assets/ashigaru'
out.mkdir(parents=True, exist_ok=True)
for scene_name, root_name, filename in [('Ashigaru_Quality_Master','Unit_P','detail.glb'),('Ashigaru_LOD','LOD_P','lod.glb')]:
    scene = bpy.data.scenes[scene_name]
    bpy.context.window.scene = scene
    bpy.ops.object.select_all(action='DESELECT')
    root = scene.objects[root_name]
    for obj in [root, *root.children_recursive]:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(out/filename), export_format='GLB', use_selection=True, use_active_scene=True, export_apply=True, export_animations=False, export_extras=True)
