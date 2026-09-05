"""Reproducible Blender source. Run: blender --background --python scripts/build_assets.py

Authored coordinates: x/right, z/toward viewer, h/up. Blender maps these to
(x, -z, h); glTF's Y-up export restores (x, h, z). One square is 1.6 metres.
No external models, textures or paid services are required.
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
    core=.22*math.sin(x*.32+z*.14)+.18*math.cos(z*.46)+.45*math.exp(-((x-3)**2+(z+2)**2)/24)
    outside=max(0,min(1,(max(abs(x),abs(z))-7.6)/7))
    hills=1.5+1.1*math.sin(x*.22+z*.16)+.8*math.cos(z*.32-x*.17)
    return core+outside*hills

def export(scene,filename):
    bpy.context.window.scene=scene
    bpy.ops.export_scene.gltf(filepath=str(OUT/filename),export_format='GLB',use_active_scene=True,export_animations=False,export_extras=True)

def field():
    s=new_scene('Aether_Meadow'); mat=vertex_material('MeadowPalette')
    terrain=Builder(); size=161; step=.4; half=32
    colors=[]
    vs=[]
    for j in range(size):
        z=-half+j*step
        for i in range(size):
            x=-half+i*step; vs.append((x,height(x,z),z))
            wave=(math.sin(x*.55+z*.2)+math.cos(z*.71-x*.23))*.5
            c=(.22+.026*wave,.35+.04*wave,.09+.013*wave)
            # A worn winding trail crosses the meadow without adding obstacles.
            pathx=2.5*math.sin(z*.24)-1.5
            d=abs(x-pathx)
            if d<.48+.08*math.sin(z*2): c=(.38,.33,.18)
            elif d<.8: c=tuple(c[k]*.65+(.38,.33,.18)[k]*.35 for k in range(3))
            colors.append(c)
    fs=[]
    for j in range(size-1):
        for i in range(size-1):
            a=j*size+i; fs += [(a,a+size,a+1),(a+1,a+size,a+size+1)]
    terrain.add(vs,fs,(1,1,1)); terrain.c=colors
    ground=terrain.obj('Terrain',mat)
    for p in ground.data.polygons: p.use_smooth=True
    # Meadow details, combined into a few meshes to keep draw calls bounded.
    foliage=Builder(); trunks=Builder(); stones=Builder(); flowers=Builder(); props=Builder()
    for i in range(120):
        x=rng.uniform(-28,28); z=rng.uniform(-28,22)
        if abs(x)<9 and abs(z)<9: continue
        if z>7 and abs(x)<12: continue # preserve the player's sight line
        h=height(x,z); scale=rng.uniform(.65,1.5)
        trunks.rod((x,h,z),(x+.12*scale,h+2.4*scale,z),.15*scale,(.16,.105,.055),8,.085*scale)
        for k in range(4):
            a=k*2.4; dx=math.sin(a)*.55*scale; dz=math.cos(a)*.55*scale
            trunks.rod((x,h+1.4*scale,z),(x+dx,h+(2.2+k*.16)*scale,z+dz),.065*scale,(.19,.13,.07),6,.025*scale)
            foliage.orb(x+dx,h+(2.35+k*.28)*scale,z+dz,1.02*scale,.9*scale,.88*scale,[(.11,.23,.065),(.18,.31,.08),(.27,.39,.10),(.34,.44,.12)][k],8,5)
    for i in range(170):
        x=rng.uniform(-25,25); z=rng.uniform(-25,20)
        if abs(x)<7.9 and abs(z)<7.9: continue
        scale=rng.uniform(.15,.75); h=height(x,z)
        stones.orb(x,h+scale*.28,z,scale,.65*scale,.8*scale,(.27,.30,.26),7,4)
    for i in range(3400):
        x=rng.uniform(-19,19); z=rng.uniform(-19,16); h=height(x,z)
        if abs(x-(2.5*math.sin(z*.24)-1.5))<.65: continue
        central=abs(x)<7.2 and abs(z)<7.2
        tall=rng.uniform(.045,.10) if central else rng.uniform(.12,.28)
        c=rng.choice([(.32,.43,.10),(.39,.48,.14),(.20,.35,.08)])
        for a in (0,1.7):
            dx=math.cos(a)*.035; dz=math.sin(a)*.035
            flowers.add([(x-dx,h,z-dz),(x+dx,h,z+dz),(x+.025,h+tall,z+.025)],[(0,1,2)],c)
        if not central and i%8==0:
            flowers.orb(x,h+tall,z,.055,.03,.055,rng.choice([(.8,.68,.30),(.76,.76,.60),(.40,.25,.50)]),5,3)
    # Half-buried old stone arch at the far side; it never covers playable cells.
    for x in (9.7,12.1):
        for k in range(5): props.box(x,height(x,-11)+k*.43+.2,-11,.7,.41,.8,(.39,.40,.31))
    for i in range(9):
        a=math.pi*i/8; x=10.9+1.2*math.cos(a); h=height(10.9,-11)+2+1.05*math.sin(a)
        props.box(x,h,-11,.43,.40,.8,(.43,.43,.34))
    for x,z,team in [(-8.4,6.5,(.05,.28,.55)),(8.4,-6.5,(.53,.075,.07))]:
        h=height(x,z); props.rod((x,h,z),(x,h+2.9,z),.045,(.37,.26,.12))
        for i in range(8):
            a=i/8; b=(i+1)/8
            props.add([(x+a*.85,h+2.7,z+.10*math.sin(a*5)),(x+b*.85,h+2.7,z+.10*math.sin(b*5)),(x+b*.85,h+1.7+b*.2,z+.10*math.sin(b*5)),(x+a*.85,h+1.7+a*.2,z+.10*math.sin(a*5))],[(0,1,2,3)],team)
    foliage.obj('TreeCanopies',mat); trunks.obj('TreeTrunks',mat); stones.obj('Rocks',mat); flowers.obj('GrassAndFlowers',mat); props.obj('RuinsAndBanners',mat)
    mat.surface_render_method='DITHERED' # opaque colors, double-sided foliage in glTF
    mat.use_backface_culling=False
    export(s,'meadow.glb')
    return s

SILVER=(.43,.53,.57); TRIM=(.61,.39,.10); DARK=(.055,.069,.08); LEATHER=(.13,.07,.032); SKIN=(.60,.34,.19); WHITE=(.71,.76,.71)

def soldiers():
    s=new_scene('Aether_Army')
    hard=vertex_material('Armor',.62,.38)
    soft=vertex_material('Details',.05,.8)
    team=material('TeamCloth',(.04,.22,.46),0,.8)
    for role in ['P','L','N','S','G','B','R','K']:
        root=empty('Unit_'+role)
        root['piece']=role
        body=empty(role+'_Body',root)
        armor=Builder(); detail=Builder(); cloth=Builder()
        ride=.34 if role=='N' else 0
        broad=1.20 if role=='R' else 1.06 if role in ['K','G'] else 1
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
        if role in ['G','S','L']:
            cloth.orb(0,1.44+ride,.035,.045,.19,.11,WHITE,8,5)
        if role=='R':
            armor.box(0,.93,0,.57,.30,.37,SILVER)
            for xx in [-.18,0,.18]: armor.box(xx,.92,-.202,.06,.24,.025,TRIM)
        if role=='B':
            cloth.ring(0,.35,0,[(0,.31,.24),(.46,.20,.15)],WHITE,12)
            cloth.ring(0,1.36,0,[(0,.24,.22),(.04,.18,.16),(.38,.005,.005)],WHITE,10)
            armor.ring(0,1.39,0,[(0,.18,.17),(.045,.17,.16)],TRIM,10)
        if role=='N':
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
        armor.obj(role+'_Cuirass',hard,body); detail.obj(role+'_Details',soft,body); cloth.obj(role+'_Uniform',team,body)
        # Export named pivots; the Web scene animates these without a heavy skeleton.
        for side in [-1,1]:
            pivot=(side*.30,1.00+ride,0); arm=empty(role+('_ArmL' if side<0 else '_ArmR'),body,pivot)
            a=Builder(); a.orb(side*.30,1.02+ride,0,.15,.12,.18,SILVER)
            a.rod((side*.32,.65+ride,-.025),(side*.32,.98+ride,0),.075,SILVER)
            a.ring(side*.32,.72+ride,-.02,[(0,.084,.088),(.05,.084,.088)],TRIM,8)
            a.orb(side*.32,.63+ride,-.025,.085,.085,.075,LEATHER,8,5)
            if side==1:
                if role in ['P','L','G']:
                    top=1.85 if role=='L' else 1.58
                    a.rod((.36,.10+ride,-.09),(.36,top+ride,-.09),.022,LEATHER)
                    a.add([(.36,top+.23+ride,-.09),(.29,top-.04+ride,-.09),(.43,top-.04+ride,-.09),(.36,top-.04+ride,-.14),(.36,top-.04+ride,-.04)],[(0,1,3),(0,3,2),(0,2,4),(0,4,1)],SILVER)
                    a.box(.36,top-.03+ride,-.09,.17,.035,.06,TRIM)
                elif role=='B':
                    a.rod((.36,.12,-.09),(.36,1.63,-.09),.027,TRIM)
                    a.orb(.36,1.73,-.09,.11,.16,.10,(.05,.65,.56),8,4)
                    a.ring(.36,1.57,-.09,[(0,.12,.11),(.065,.13,.12)],TRIM)
                elif role=='R':
                    a.rod((.39,.30,-.09),(.39,1.36,-.09),.04,LEATHER)
                    a.box(.39,1.34,-.09,.43,.24,.24,SILVER)
                    a.box(.39,1.34,-.09,.13,.26,.26,TRIM)
                else:
                    a.rod((.34,.5+ride,-.12),(.34,.77+ride,-.12),.035,LEATHER)
                    a.box(.34,.76+ride,-.12,.24,.043,.063,TRIM)
                    a.add([(.295,.79+ride,-.12),(.385,.79+ride,-.12),(.37,1.27+ride,-.12),(.34,1.42+ride,-.12),(.31,1.27+ride,-.12),(.34,.86+ride,-.165)],[(0,1,5),(1,2,5),(2,3,5),(3,4,5),(4,0,5),(4,3,2,1,0)],SILVER)
            elif role not in ['B','N']:
                # Kite shield with metal border, colored inset and raised crest.
                for scale,zz,col in [(1,-.18,TRIM),(.85,-.195,(.035,.12,.20))]:
                    points=[(-.33+xx*scale,.70+ride+hh*scale,zz) for xx,hh in [(-.18,.22),(.18,.22),(.20,-.04),(0,-.32),(-.20,-.04)]]
                    a.add(points,[(0,1,2,3,4)],col)
                a.box(-.33,.71+ride,-.21,.025,.29,.024,TRIM)
                a.box(-.33,.79+ride,-.22,.17,.025,.024,TRIM)
            a.obj(role+'_ArmMesh'+str(side),hard,arm,pivot)
        for side in [-1,1]:
            pivot=(side*.12,.62+ride,0); leg=empty(role+('_LegL' if side<0 else '_LegR'),root,pivot); a=Builder()
            a.rod((side*.12,.18+ride,0),(side*.12,.61+ride,0),.075,DARK)
            a.box(side*.12,.29+ride,-.065,.135,.25,.09,SILVER)
            a.orb(side*.12,.46+ride,-.065,.09,.085,.06,SILVER,8,4)
            a.box(side*.12,.10+ride,-.065,.16,.16,.29,LEATHER)
            a.box(side*.12,.15+ride,-.14,.16,.06,.18,SILVER)
            a.obj(role+'_LegMesh'+str(side),hard,leg,pivot)
        cape=empty(role+'_Cape',body,(0,1.05+ride,.15)); a=Builder()
        if role in ['K','G','S','B','R']:
            vs=[((i/5-.5)*(.40+j*.09),1.05+ride-j*.15,.17+j*.045+.025*math.sin(i*1.5)) for j in range(5) for i in range(6)]
            a.add(vs,[(j*6+i,j*6+i+1,(j+1)*6+i+1,(j+1)*6+i) for j in range(4) for i in range(5)],WHITE)
            a.obj(role+'_Mantle',team,cape,(0,1.05+ride,.15))
        # Separate ornament lets promotion visibly upgrade every eligible piece.
        promote=empty(role+'_Promotion',root); a=Builder()
        a.ring(0,1.37+ride,0,[(0,.17,.16),(.07,.17,.16)],TRIM,12)
        for side in [-1,1]:
            a.ring(side*.29,1.11+ride,0,[(0,.13,.15),(.10,.11,.12),(.18,0,0)],TRIM,8)
        a.obj(role+'_AscendedCrest',hard,promote)
    export(s,'army.glb')
    return s

def stage(scene):
    bpy.context.window.scene=scene
    scene.world=bpy.data.worlds.new('MeadowSky'); scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.38,.52,.64,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
    data=bpy.data.lights.new('Sun','SUN'); data.energy=2.5; obj=bpy.data.objects.new('Sun',data); scene.collection.objects.link(obj); obj.rotation_euler=(.45,-.6,-.45)
    data=bpy.data.cameras.new('Overview'); obj=bpy.data.objects.new('Overview',data); scene.collection.objects.link(obj); obj.location=(16,-23,23)
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
            for role,x in zip(['P','L','N','S','G','B','R','K'],range(-4,4)):
                original=ars.objects['Unit_'+role]
                def copy_tree(o,parent=None):
                    n=o.copy(); fs.collection.objects.link(n); n.parent=parent
                    for c in o.children: copy_tree(c,n)
                    return n
                sample=copy_tree(original); sample.location=(x*1.6,-5.0,height(x*1.6,5))
                for o in sample.children:
                    if 'Promotion' in o.name: o.hide_render=True; o.hide_viewport=True
        bpy.context.window.scene=fs
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'aether-assets.blend'),compress=True)
    manifest={p.name:{'bytes':p.stat().st_size} for p in OUT.glob('*.glb')}
    (OUT/'manifest.json').write_text(json.dumps({'generator':'Blender '+bpy.app.version_string,'cellSize':1.6,'assets':manifest},indent=2))
    print('ASSETS_COMPLETE',manifest)
