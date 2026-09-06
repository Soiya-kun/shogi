"""Export saved v3 city as a static, batched Web snapshot; never save source."""
import bpy
from pathlib import Path
root=Path(__file__).resolve().parents[1]
scene=bpy.data.scenes['Yankee_Neon_District_v3'];bpy.context.window.scene=scene
bpy.ops.object.select_all(action='DESELECT')
selected=[];scales={}
for obj in scene.objects:
    if obj.type not in {'MESH','CURVE','FONT'} or obj.hide_render:continue
    if 'Cell guide' in obj.name or any(c.name.startswith(('Review_','Street_Instance_','V2_Review')) for c in obj.users_collection):continue
    # Actor collection instances are EMPTY objects and excluded above.
    obj.select_set(True);selected.append(obj)
for obj in selected:
    for mat in obj.data.materials:
        if not mat or mat in scales or not mat.use_nodes:continue
        nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=nodes.get('Principled BSDF')
        photos=[n for n in nodes if n.type=='TEX_IMAGE' and n.image]
        if not bs or not photos:continue
        mapping=next((n for n in nodes if n.type=='VECT_MATH' and n.operation=='SCALE'),None)
        scales[mat]=mapping.inputs[3].default_value if mapping else .5
        for tex in photos:
            tex.projection='FLAT'
            for link in list(tex.inputs['Vector'].links):links.remove(link)
            name=tex.image.name.lower()
            if 'diffuse' in name or '_diff_' in name:links.new(tex.outputs['Color'],bs.inputs['Base Color'])
            elif 'rough' in name:links.new(tex.outputs['Color'],bs.inputs['Roughness'])
        # Use the actual exported surface normals; Blender procedural bump is not portable.
        for link in list(bs.inputs['Normal'].links):links.remove(link)
bpy.context.view_layer.objects.active=selected[0]
# Preserve editable lettering outlines; simplify dense bevels and repeated hardware.
for obj in selected:
    if obj.type=='FONT':obj.data.resolution_u=3
    elif obj.type=='CURVE':obj.data.resolution_u=3;obj.data.bevel_resolution=min(obj.data.bevel_resolution,1)
bpy.ops.object.convert(target='MESH')
for obj in bpy.context.selected_objects:
    if obj.type!='MESH':continue
    mesh=obj.data
    mesh.calc_loop_triangles()
    if len(mesh.loop_triangles)>500 and 'Text' not in obj.name and 'Letter' not in obj.name:
        mod=obj.modifiers.new('Web detail reduction','DECIMATE');mod.ratio=.4
        bpy.context.view_layer.objects.active=obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    for attr in list(mesh.color_attributes):mesh.color_attributes.remove(attr)
    if not mesh.uv_layers:mesh.uv_layers.new(name='UVMap')
    uv=mesh.uv_layers.active.data
    for poly in mesh.polygons:
        mat=mesh.materials[poly.material_index] if mesh.materials else None
        if mat not in scales:continue
        normal=obj.matrix_world.to_3x3()@poly.normal
        axis=max(range(3),key=lambda i:abs(normal[i]));axes=[i for i in range(3) if i!=axis]
        for idx in poly.loop_indices:
            pos=obj.matrix_world@mesh.vertices[mesh.loops[idx].vertex_index].co
            uv[idx].uv=(pos[axes[0]]*scales[mat],pos[axes[1]]*scales[mat])
bpy.ops.object.join()
bpy.context.object.name='Yankee_City_v3_Static'
for img in bpy.data.images:
    if img.type=='IMAGE' and max(img.size)>1024:
        scale=1024/max(img.size);img.scale(max(1,int(img.size[0]*scale)),max(1,int(img.size[1]*scale)))
bpy.ops.export_scene.gltf(filepath=str(root/'dist/assets/stages/yankee/city.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True,export_lights=False,export_cameras=False,export_animations=False,export_image_format='JPEG',export_jpeg_quality=85)
