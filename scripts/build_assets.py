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
ROLES=['P','L','N','S','G','B','R','K','A','H']

def soldiers(roles=None,write_assets=True):
    s=new_scene('Aether_Army')
    hard=bpy.data.materials.get('Armor') or vertex_material('Armor',.62,.38)
    soft=bpy.data.materials.get('Details') or vertex_material('Details',.05,.8)
    team=bpy.data.materials.get('TeamCloth') or material('TeamCloth',(.04,.22,.46),0,.8)
    for role in roles or ROLES:
        if role=='H':
            from heavy_knight import heavy_knight
            heavy_knight(hard,soft,team)
            continue
        if role=='A':
            from archer import archer
            archer(hard,soft,team)
            continue
        root=empty('Unit_'+role)
        root['piece']=role
        body=empty(role+'_Body',root)
        armor=Builder(); detail=Builder(); cloth=Builder()
        ride=.83 if role=='R' else .34 if role=='N' else 0
        broad=1.10 if role=='R' else 1.06 if role in ['K','G'] else 1
        # Layered cuirass, skirt, belt, articulated neck and a shaped closed helmet.
        armor.ring(0,.69+ride,0,[(0,.20*broad,.135),(.08,.25*broad,.16),(.29,.29*broad,.18),(.38,.18,.12)],SILVER,12)
        cloth.ring(0,.47+ride,0,[(0,.27,.20),(.21,.20,.15)],WHITE,10)
        detail.ring(0,.71+ride,0,[(0,.22,.16),(.045,.22,.16)],LEATHER,12)
        armor.box(0,.745+ride,-.172,.085,.058,.028,TRIM)
        for x in [-.15,0,.15]: armor.box(x,.59+ride,-.17,.105,.20,.035,SILVER)
        detail.ring(0,1.06+ride,0,[(0,.09,.09),(.08,.09,.09)],DARK)
        detail.orb(0,1.2+ride,-.015,.135,.16,.125,SKIN)
        armor.ring(0,1.17+ride,0,[(0,.15,.14),(.14,.155,.145),(.22,.06,.07),(.23,.0,.0)],SILVER,12)
        detail.box(0,1.245+ride,-.139,.215,.038,.023,DARK)
        armor.box(0,1.20+ride,-.159,.027,.15,.027,TRIM)
        for x in [-.14,.14]: armor.box(x,1.15+ride,-.018,.025,.17,.19,SILVER)
        armor.box(0,.91+ride,-.188,.038,.19,.018,TRIM)
        armor.box(0,.92+ride,-.195,.14,.031,.018,TRIM)
        for x in [-.20,.20]:
            for hh in [.82,1.0]: armor.orb(x,hh+ride,-.13,.018,.018,.018,TRIM,6,3)
        if role=='K':
            armor.ring(0,1.38,0,[(0,.15,.14),(.065,.15,.14)],TRIM,12)
            for i in range(7):
                a=i*math.tau/7; armor.ring(.14*math.cos(a),1.44,.14*math.sin(a),[(0,.031,.031),(.12,.0,.0)],TRIM,5)
        if role in ['G','S','L','N']:
            cloth.orb(0,1.44+ride,.035,.045,.19,.11,WHITE,8,5)
        if role=='R':
            cloth.orb(0,1.46+ride,.045,.045,.20,.12,WHITE,8,5)
        if role=='B':
            cloth.ring(0,.35,0,[(0,.31,.24),(.46,.20,.15)],WHITE,12)
            cloth.ring(0,1.36,0,[(0,.24,.22),(.04,.18,.16),(.38,.005,.005)],WHITE,10)
            armor.ring(0,1.39,0,[(0,.18,.17),(.045,.17,.16)],TRIM,10)
        if role=='N':
            root['mount']='horse';root['unitRole']='commander'
            detail.orb(0,.55,0,.27,.30,.53,(.24,.11,.045),12,8)
            detail.rod((0,.62,-.30),(0,1.02,-.42),.17,(.24,.11,.045),10,.115)
            detail.orb(0,1.06,-.47,.13,.18,.23,(.30,.15,.06),10,6)
            detail.box(0,1.13,-.31,.08,.28,.20,DARK)
            for xx in [-.09,.09]:
                detail.ring(xx,1.20,-.44,[(0,.045,.055),(.15,.0,.0)],(.24,.11,.045),5)
                armor.orb(xx*1.4,1.10,-.56,.022,.023,.017,DARK,6,3)
            for xx in [-.18,.18]:
                for zz in [-.32,.33]:
                    detail.rod((xx,.05,zz),(xx,.51,zz),.058,(.24,.11,.045),7)
                    detail.box(xx,.065,zz-.025,.13,.13,.17,DARK)
            cloth.box(0,.70,.09,.57,.12,.5,WHITE)
            # A raised leather saddle, reins, stirrups and a long horse tail.
            detail.orb(0,.79,.04,.25,.065,.27,LEATHER,10,5)
            detail.box(0,.86,.25,.39,.13,.07,LEATHER)
            for side in [-1,1]:
                detail.rod((side*.13,1.02,-.64),(side*.13,1.16,-.41),.016,LEATHER,6)
                detail.rod((side*.13,1.12,-.46),(side*.30,.99,-.05),.012,LEATHER,6)
                detail.rod((side*.28,.77,.05),(side*.38,.38,-.12),.018,LEATHER,6)
                armor.box(side*.38,.36,-.12,.15,.025,.19,TRIM)
                cloth.add([(side*.25,.73,-.17),(side*.31,.68,.32),(side*.30,.43,.32),(side*.29,.48,-.17)],[(0,1,2,3)],WHITE)
            detail.rod((0,.71,.43),(0,.34,.67),.065,DARK,8,.025)
        armor.obj(role+'_Cuirass',hard,body); detail.obj(role+'_Details',soft,body); cloth.obj(role+'_Uniform',team,body)
        # Export named pivots; the Web scene animates these without a heavy skeleton.
        for side in [-1,1]:
            pivot=(side*.30,1.00+ride,0); arm=empty(role+('_ArmL' if side<0 else '_ArmR'),body,pivot)
            a=Builder(); a.orb(side*.30,1.02+ride,0,.15,.12,.18,SILVER)
            a.rod((side*.32,.65+ride,-.025),(side*.32,.98+ride,0),.075,SILVER)
            a.ring(side*.32,.72+ride,-.02,[(0,.084,.088),(.05,.084,.088)],TRIM,8)
            a.orb(side*.32,.63+ride,-.025,.085,.085,.075,LEATHER,8,5)
            if side==1:
                if role in ['P','L','G','R']:
                    top=1.85 if role=='L' else 1.74 if role=='R' else 1.58
                    a.rod((.36,.10+ride,-.09),(.36,top+ride,-.09),.022,LEATHER)
                    a.add([(.36,top+.23+ride,-.09),(.29,top-.04+ride,-.09),(.43,top-.04+ride,-.09),(.36,top-.04+ride,-.14),(.36,top-.04+ride,-.04)],[(0,1,3),(0,3,2),(0,2,4),(0,4,1)],SILVER)
                    a.box(.36,top-.03+ride,-.09,.17,.035,.06,TRIM)
                elif role=='B':
                    a.rod((.36,.12,-.09),(.36,1.63,-.09),.027,TRIM)
                    a.orb(.36,1.73,-.09,.11,.16,.10,(.05,.65,.56),8,4)
                    a.ring(.36,1.57,-.09,[(0,.12,.11),(.065,.13,.12)],TRIM)
                else:
                    a.rod((.34,.5+ride,-.12),(.34,.77+ride,-.12),.035,LEATHER)
                    a.box(.34,.76+ride,-.12,.24,.043,.063,TRIM)
                    a.add([(.295,.79+ride,-.12),(.385,.79+ride,-.12),(.37,1.27+ride,-.12),(.34,1.42+ride,-.12),(.31,1.27+ride,-.12),(.34,.86+ride,-.165)],[(0,1,5),(1,2,5),(2,3,5),(3,4,5),(4,0,5),(4,3,2,1,0)],SILVER)
            elif role not in ['B','N','R']:
                # Kite shield with metal border, colored inset and raised crest.
                for scale,zz,col in [(1,-.18,TRIM),(.85,-.195,(.035,.12,.20))]:
                    points=[(-.33+xx*scale,.70+ride+hh*scale,zz) for xx,hh in [(-.18,.22),(.18,.22),(.20,-.04),(0,-.32),(-.20,-.04)]]
                    a.add(points,[(0,1,2,3,4)],col)
                a.box(-.33,.71+ride,-.21,.025,.29,.024,TRIM)
                a.box(-.33,.79+ride,-.22,.17,.025,.024,TRIM)
            a.obj(role+'_ArmMesh'+str(side),hard,arm,pivot)
        for side in [-1,1]:
            if role=='N':
                pivot=(side*.19,.62+ride,.04);leg=empty(role+('_LegL' if side<0 else '_LegR'),root,pivot);a=Builder()
                knee=(side*.34,.64,-.19);boot=(side*.38,.42,-.13)
                a.rod(pivot,knee,.078,DARK);a.rod(knee,boot,.065,SILVER)
                a.orb(*knee,.09,.08,.075,SILVER,8,4)
                a.box(side*.38,.42,-.19,.14,.13,.25,LEATHER)
                a.box(side*.38,.46,-.25,.14,.06,.15,SILVER)
                a.obj(role+'_LegMesh'+str(side),hard,leg,pivot)
                continue
            if role=='R':
                pivot=(side*.20,.62+ride,.04);leg=empty(role+('_LegL' if side<0 else '_LegR'),root,pivot);a=Builder()
                knee=(side*.43,1.17,-.21);boot=(side*.48,.91,-.16)
                a.rod(pivot,knee,.078,DARK);a.rod(knee,boot,.07,SILVER)
                a.orb(*knee,.095,.09,.075,SILVER,8,4)
                a.box(side*.49,.90,-.24,.14,.13,.25,LEATHER)
                a.box(side*.49,.94,-.29,.14,.06,.15,SILVER)
                a.obj(role+'_LegMesh'+str(side),hard,leg,pivot)
                continue
            pivot=(side*.12,.62+ride,0); leg=empty(role+('_LegL' if side<0 else '_LegR'),root,pivot); a=Builder()
            a.rod((side*.12,.18+ride,0),(side*.12,.61+ride,0),.075,DARK)
            a.box(side*.12,.29+ride,-.065,.135,.25,.09,SILVER)
            a.orb(side*.12,.46+ride,-.065,.09,.085,.06,SILVER,8,4)
            a.box(side*.12,.10+ride,-.065,.16,.16,.29,LEATHER)
            a.box(side*.12,.15+ride,-.14,.16,.06,.18,SILVER)
            a.obj(role+'_LegMesh'+str(side),hard,leg,pivot)
        cape=empty(role+'_Cape',body,(0,1.05+ride,.15)); a=Builder()
        if role in ['K','G','S','B','R','N']:
            vs=[((i/5-.5)*(.40+j*.09),1.05+ride-j*.15,.17+j*.045+.025*math.sin(i*1.5)) for j in range(5) for i in range(6)]
            a.add(vs,[(j*6+i,j*6+i+1,(j+1)*6+i+1,(j+1)*6+i) for j in range(4) for i in range(5)],WHITE)
            a.obj(role+'_Mantle',team,cape,(0,1.05+ride,.15))
        # Separate ornament lets promotion visibly upgrade every eligible piece.
        promote=empty(role+'_Promotion',root); a=Builder()
        a.ring(0,1.37+ride,0,[(0,.17,.16),(.07,.17,.16)],TRIM,12)
        for side in [-1,1]:
            a.ring(side*.29,1.11+ride,0,[(0,.13,.15),(.10,.11,.12),(.18,0,0)],TRIM,8)
        a.obj(role+'_AscendedCrest',hard,promote)
        if role=='R':
            from dragon import dragon
            dragon(root,soft,hard,team,promote)
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
                mod.ratio=1 if obj.name.endswith(('_Bowstring','_Arrows')) else .70 if 'WingMembrane' in obj.name or obj.name.endswith(('_Bow','_Broadsword')) else .45 if obj.name.startswith('H_') else .23
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
