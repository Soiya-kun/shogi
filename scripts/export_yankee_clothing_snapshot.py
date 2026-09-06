"""Export the eight saved clothing-v2 masters without modifying the source archives."""
import bpy,json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'dist/assets/stages/yankee'
roles={'P':'tanran','L':'longcoat','N':'biker','S':'brawler','G':'vice-leader','B':'strategist','R':'bike-captain','K':'leader'}
report={}
for key,slug in roles.items():
    source=ROOT/'assets/blender/yankee/clothing-v2'/slug/(slug+'-v2.blend')
    with bpy.data.libraries.load(str(source)) as (src,dst):dst.scenes=['Yankee_'+slug+'_Clothing_v2']
    scene=dst.scenes[0];bpy.context.window.scene=scene
    root=next(o for o in scene.objects if o.name.startswith('Unit_Y'+key))
    bpy.ops.object.select_all(action='DESELECT')
    for obj in [root,*root.children_recursive]:
        obj.select_set(True)
        for mod in obj.modifiers:
            if mod.type=='SUBSURF':mod.levels=min(mod.levels,1);mod.render_levels=min(mod.render_levels,1)
        if obj.type=='CURVE':obj.data.resolution_u=min(obj.data.resolution_u,4);obj.data.bevel_resolution=min(obj.data.bevel_resolution,1)
        elif obj.type=='FONT':obj.data.resolution_u=min(obj.data.resolution_u,4)
        if obj.type=='MESH':
            obj.data.calc_loop_triangles()
            if len(obj.data.loop_triangles)>4000 and '_V2_' in obj.name:
                mod=obj.modifiers.new('Web garment reduction','DECIMATE');mod.ratio=.25
                bpy.context.view_layer.objects.active=obj
                bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.context.view_layer.objects.active=root
    bpy.ops.export_scene.gltf(filepath=str(OUT/(key+'.glb')),export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True,export_animations=False,export_lights=False,export_cameras=False,export_extras=True)
    report[key]={'source':str(source.relative_to(ROOT)).replace('\\','/'),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest()}
(OUT/'clothing-sources.json').write_text(json.dumps(report,indent=2)+'\n')
