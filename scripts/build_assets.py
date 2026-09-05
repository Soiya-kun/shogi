"""Reproducible Blender source. Run: blender --background --python scripts/build_assets.py

Authored coordinates: x/right, z/toward viewer, h/up. Blender maps these to
(x, -z, h); glTF's Y-up export restores (x, h, z). One square is 12 metres.
Models are original. Web terrain materials use bundled CC0 textures.
"""
import bpy, math, random, json, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist/assets'
SOURCE = ROOT / 'assets/blender'
OUT.mkdir(parents=True, exist_ok=True)
SOURCE.mkdir(parents=True, exist_ok=True)
rng = random.Random(921)
sys.path.insert(0, str(ROOT / 'scripts'))

def material(name, color, metal=0, rough=.8):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Metallic'].default_value = metal
    bs.inputs['Roughness'].default_value = rough
    return m

def vertex_material(name, metal=0, rough=.8):
    m=material(name,(1,1,1),metal,rough)
    attr=m.node_tree.nodes.new('ShaderNodeVertexColor'); attr.layer_name='Color'
    m.node_tree.links.new(attr.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    return m

def new_scene(name):
    s=bpy.data.scenes.new(name); bpy.context.window.scene=s
    return s

class Builder:
    def __init__(self): self.v=[]; self.f=[]; self.c=[]
    def add(self, vs, fs, color):
        n=len(self.v); self.v.extend((x,-z,h) for x,h,z in vs)
        self.f.extend(tuple(n+i for i in f) for f in fs)
        self.c.extend([color]*len(vs))
    def box(self, x,h,z, w,d,depth, color):
        vs=[(x+a*w/2,h+b*d/2,z+c*depth/2) for a,b,c in [(-1,-1,-1),(1,-1,-1),(1,-1,1),(-1,-1,1),(-1,1,-1),(1,1,-1),(1,1,1),(-1,1,1)]]
        self.add(vs,[(1,2,3,0),(7,6,5,4),(4,5,1,0),(5,6,2,1),(6,7,3,2),(7,4,0,3)],color)
    def ring(self,x,h,z,profile,color,n=10):
        # Profiles are (height, x radius, z radius).
        vs=[(x+rx*math.cos(i*math.tau/n),h+hh,z+rz*math.sin(i*math.tau/n)) for hh,rx,rz in profile for i in range(n)]
        fs=[tuple(range(n-1,-1,-1)),tuple((len(profile)-1)*n+i for i in range(n))]
        fs += [(k*n+i,k*n+(i+1)%n,(k+1)*n+(i+1)%n,(k+1)*n+i) for k in range(len(profile)-1) for i in range(n)]
        self.add(vs,[tuple(reversed(f)) for f in fs],color)
    def orb(self,x,h,z,rx,ry,rz,color,n=10,rings=6):
        vs=[(x+rx*math.sin(j*math.pi/rings)*math.cos(i*math.tau/n),h+ry*math.cos(j*math.pi/rings),z+rz*math.sin(j*math.pi/rings)*math.sin(i*math.tau/n)) for j in range(rings+1) for i in range(n)]
        fs=[(j*n+i,(j+1)*n+i,(j+1)*n+(i+1)%n,j*n+(i+1)%n) for j in range(rings) for i in range(n)]
        self.add(vs,[tuple(reversed(f)) for f in fs],color)
    def rod(self,a,b,r,color,n=8,r2=None):
        av,bv=Vector(a),Vector(b); axis=(bv-av).normalized()
        u=axis.cross(Vector((0,0,1)))
        if u.length<.01: u=axis.cross(Vector((0,1,0)))
        u.normalize(); v=axis.cross(u)
        vs=[tuple(p+(u*math.cos(i*math.tau/n)+v*math.sin(i*math.tau/n))*radius) for p,radius in [(av,r),(bv,r if r2 is None else r2)] for i in range(n)]
        self.add(vs,[(i,(i+1)%n,n+(i+1)%n,n+i) for i in range(n)]+[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))],color)
    def obj(self,name,mat,parent=None,origin=(0,0,0)):
        ox,oh,oz=origin
        me=bpy.data.meshes.new(name); me.from_pydata([(x-ox,y+oz,z-oh) for x,y,z in self.v],[],self.f); me.update()
        att=me.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
        for i,c in enumerate(self.c): att.data[i].color=(*c,1)
        o=bpy.data.objects.new(name,me); bpy.context.scene.collection.objects.link(o); o.data.materials.append(mat)
        if parent: o.parent=parent
        return o

def empty(name,parent=None,loc=(0,0,0)):
    o=bpy.data.objects.new(name,None); bpy.context.scene.collection.objects.link(o); o.parent=parent
    x,h,z=loc; o.location=(x,-z,h); return o

def height(x,z):
    from landscape import height as surface
    return surface(x,z)

def export(scene,filename):
    bpy.context.window.scene=scene
    bpy.ops.export_scene.gltf(filepath=str(OUT/filename),export_format='GLB',use_active_scene=True,export_animations=False,export_extras=True)

def field():
    from landscape import create_field
    return create_field()

SILVER=(.43,.53,.57); TRIM=(.61,.39,.10); DARK=(.055,.069,.08); LEATHER=(.13,.07,.032); SKIN=(.60,.34,.19); WHITE=(.71,.76,.71)
ROLES=['P','L','N','S','G','B','R','K','A','H','D']

def soldiers(roles=None,write_assets=True):
    s=new_scene('Aether_Army')
    hard=bpy.data.materials.get('Armor') or vertex_material('Armor',.62,.38)
    soft=bpy.data.materials.get('Details') or vertex_material('Details',.05,.8)
    team=bpy.data.materials.get('TeamCloth') or material('TeamCloth',(.04,.22,.46),0,.8)
    from samurai import samurai
    for role in roles or ROLES:
        samurai(role,hard,soft,team)
    if write_assets:
        make_lods(s)
        export(s,'army.glb')
    return s

def make_lods(scene,roles=None):
    """Independent low detail trees; the editable originals keep all detail."""
    bpy.context.window.scene=scene
    roles=roles or [role for role in ROLES if scene.objects.get('Unit_'+role)]
    def remove_tree(obj):
        for child in list(obj.children):remove_tree(child)
        bpy.data.objects.remove(obj,do_unlink=True)
    for role in roles:
        old=scene.objects.get('LOD_'+role)
        if old:remove_tree(old)
    for role in roles:
        def copy_low(obj,parent=None):
            node=obj.copy(); node.name='LOD_'+obj.name
            scene.collection.objects.link(node); node.parent=parent
            if node.type=='MESH':
                node.data=obj.data.copy()
                mod=node.modifiers.new('Distant simplification','DECIMATE')
                mod.ratio=1 if obj.name.endswith(('_Bowstring','_Arrows','_Antlers','_WhiskersMane')) else .70 if obj.name.endswith(('_Bow','_Tachi','_Maedate','_Sashimono')) else .45 if obj.name.startswith(('H_','D_')) else .23
                bpy.context.view_layer.objects.active=node
                bpy.ops.object.modifier_apply(modifier=mod.name)
            for child in obj.children: copy_low(child,node)
            return node
        root=copy_low(scene.objects['Unit_'+role]); root.name='LOD_'+role

def stage(scene):
    bpy.context.window.scene=scene
    scene.world=bpy.data.worlds.new('MeadowSky'); scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.38,.52,.64,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
    data=bpy.data.lights.new('Sun','SUN'); data.energy=2.5; obj=bpy.data.objects.new('Sun',data); scene.collection.objects.link(obj); obj.rotation_euler=(.45,-.6,-.45)
    data=bpy.data.cameras.new('Overview'); obj=bpy.data.objects.new('Overview',data); scene.collection.objects.link(obj); obj.location=(115,-170,160)
    obj.rotation_euler=(Vector((0,0,.3))-obj.location).to_track_quat('-Z','Y').to_euler(); data.lens=40; scene.camera=obj
    scene.render.engine='CYCLES'; scene.cycles.samples=24; scene.render.resolution_x=1440; scene.render.resolution_y=1000; scene.render.resolution_percentage=100

if __name__=='__main__':
    mode=sys.argv[-1] if sys.argv[-1] in ['field','army'] else 'all'
    fs=field() if mode in ['all','field'] else None
    ars=soldiers() if mode in ['all','army'] else None
    if fs:
        stage(fs)
        if ars:
            # Put a single example on the field for a useful editable opening scene.
            for role,x in zip(ROLES,range(-4,-4+len(ROLES))):
                original=ars.objects['Unit_'+role]
                def copy_tree(o,parent=None):
                    n=o.copy(); fs.collection.objects.link(n); n.parent=parent
                    for c in o.children: copy_tree(c,n)
                    return n
                sample=copy_tree(original); sample.location=(x*12,-36.0,height(x*12,36))
                for o in sample.children:
                    if 'Promotion' in o.name: o.hide_render=True; o.hide_viewport=True
        bpy.context.window.scene=fs
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'aether-assets.blend'),compress=True)
    manifest={p.name:{'bytes':p.stat().st_size} for p in OUT.glob('*.glb')}
    (OUT/'manifest.json').write_text(json.dumps({'generator':'Blender '+bpy.app.version_string,'cellSize':12,'assets':manifest},indent=2))
    print('ASSETS_COMPLETE',manifest)
