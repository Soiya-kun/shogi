"""Metre-scale meadow with erosion, distant hills and branched leafy trees."""
import math, random

def noise(x,z):
    return (math.sin(x*.93+math.sin(z*.62))*math.cos(z*.83-x*.27)+.5*math.sin(x*1.91+z*1.28)+.25*math.cos(x*3.71-z*2.6))/1.75

def height(x,z):
    core=1.1*math.sin(x*.045+z*.018)+.7*math.cos(z*.055)+1.7*math.exp(-((x-25)**2+(z+15)**2)/1500)
    edge=max(0,min(1,(max(abs(x),abs(z))-60)/65))
    hills=12+10*noise(x*.022,z*.022)+18*math.exp(-((x+95)**2+(z+95)**2)/5000)
    return core+edge*hills+.08*noise(x*.2,z*.2)

def path_center(z): return -11+8*math.sin(z*.032)+3*math.sin(z*.071)

def create_field():
    from build_assets import Builder, vertex_material, new_scene, export
    import bpy
    rng=random.Random(6372)
    scene=new_scene('Aether_Meadow'); palette=vertex_material('LandscapePalette')
    terrain=Builder(); n=241; half=240; step=2
    verts=[];colors=[]
    for j in range(n):
        z=-half+j*step
        for i in range(n):
            x=-half+i*step; y=height(x,z);verts.append((x,y,z))
            patch=noise(x*.055,z*.055)*.035
            dirt=max(0,1-abs(x-path_center(z))/3.5)
            grass=(.105+patch,.145+patch,.042+patch*.3);soil=(.21,.145,.085)
            colors.append(tuple(grass[k]*(1-dirt)+soil[k]*dirt for k in range(3)))
    faces=[]
    for j in range(n-1):
        for i in range(n-1):
            a=j*n+i; faces.extend([(a,a+n,a+1),(a+1,a+n,a+n+1)])
    terrain.add(verts,faces,(1,1,1));terrain.c=colors;ground=terrain.obj('Terrain',palette)
    for f in ground.data.polygons:f.use_smooth=True
    trunks=Builder();leaves=Builder();rocks=Builder();grass=Builder();ruins=Builder()
    # Individual leaf sprays around branching crowns replace faceted canopy balls.
    for t in range(200):
        x=rng.uniform(-190,190);z=rng.uniform(-200,140)
        if abs(x)<70 and abs(z)<72:continue
        if z>55 and abs(x)<82:continue
        y=height(x,z);scale=rng.uniform(.75,1.35);lean=rng.uniform(-.6,.6)
        treeh=rng.uniform(8,13)*scale
        trunks.rod((x,y,z),(x+lean,y+treeh*.77,z),.23*scale,(.095,.060,.034),9,.07*scale)
        for branch in range(7):
            a=branch*2.4+rng.uniform(-.5,.5);spread=rng.uniform(1.5,3.5)*scale
            bx=x+math.cos(a)*spread;bz=z+math.sin(a)*spread;by=y+treeh*(.52+branch*.061)
            trunks.rod((x+lean*.4,y+treeh*.42,z),(bx,by,bz),.075*scale,(.12,.08,.045),7,.018*scale)
            for twig in range(4):
                dx=rng.uniform(-1.1,1.1)*scale;dz=rng.uniform(-1.1,1.1)*scale
                trunks.rod((bx,by,bz),(bx+dx,by+.55*scale,bz+dz),.025*scale,(.12,.08,.045),5,.004)
            for l in range(40):
                a=rng.random()*math.tau;radius=math.sqrt(rng.random())*1.8*scale
                lx=bx+math.cos(a)*radius;lz=bz+math.sin(a)*radius;ly=by+rng.uniform(-.7,.8)*scale
                s=rng.uniform(.28,.55)*scale;angle=rng.random()*math.tau
                dx=math.cos(angle)*s;dz=math.sin(angle)*s
                c=rng.choice([(.065,.105,.028),(.11,.16,.043),(.16,.205,.068),(.09,.145,.034)])
                leaves.add([(lx-dx,ly,lz-dz),(lx-dz*.5,ly+.14,lz+dx*.5),(lx+dx,ly+.06,lz+dz),(lx+dz*.5,ly-.08,lz-dx*.5)],[(0,1,2),(0,2,3)],c)
    for k in range(200):
        x=rng.uniform(-185,185);z=rng.uniform(-185,130)
        if abs(x)<57 and abs(z)<57:continue
        size=rng.uniform(.4,2.7);base=height(x,z)
        start=len(rocks.v)
        rocks.orb(x,base+size*.27,z,size,size*.68,size*.86,(.24,.23,.205),9,6)
        for v in range(start,len(rocks.v)):
            xx,zz,yy=rocks.v[v];r=1+.14*noise(xx,zz)
            rocks.v[v]=(x+(xx-x)*r,-z+(zz+z)*r,base+(yy-base)*r)
    for k in range(19000):
        x=rng.uniform(-120,120);z=rng.uniform(-140,100)
        if abs(x-path_center(z))<2:continue
        if noise(x*.09,z*.09)<-.20:continue
        y=height(x,z);a=rng.random()*math.tau;s=rng.uniform(.025,.075);tall=rng.uniform(.20,.60)
        c=rng.choice([(.15,.19,.059),(.20,.22,.082),(.11,.155,.040)])
        dx=math.cos(a)*s;dz=math.sin(a)*s
        grass.add([(x-dx,y,z-dz),(x+dx,y,z+dz),(x+.13,y+tall,z+.03)],[(0,1,2)],c)
    # A broken boundary wall gives the distant terrain a human scale.
    for k in range(32):
        x=76+k*1.6;z=-90+math.sin(k*.4)*.5;base=height(x,z)
        for row in range(rng.randint(1,4)):
            ruins.box(x+row%2*.25,base+.35+row*.65,z,1.4,.58,.75,(.22,.21,.185))
    trunks.obj('TreeTrunks',palette);leaves.obj('TreeLeaves',palette);rocks.obj('Rocks',palette);grass.obj('GrassAndFlowers',palette);ruins.obj('RuinsAndBanners',palette)
    palette.use_backface_culling=False
    export(scene,'meadow.glb')
    return scene
