"""Original wingless Eastern ryuu: serpentine body, antlers, mane and whiskers."""
import math

def dragon(root,soft,hard,team,promote):
    from build_assets import Builder,empty
    from mathutils import Vector
    jade=(.07,.24,.18);light=(.15,.37,.26);belly=(.56,.45,.22)
    ivory=(.83,.78,.59);gold=(.64,.43,.14);dark=(.022,.042,.026)
    root['mount']='eastern_dragon';root['anatomy']='wingless_serpentine_antlers_whiskers'
    body=Builder();scales=Builder();ridge=Builder();head=Builder();horns=Builder();hair=Builder();tack=Builder();cloth=Builder()

    def tube(builder,points,radii,color,n=10):
        vertices=[]
        for i,p in enumerate(points):
            tangent=(Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])).normalized()
            u=tangent.cross(Vector((0,1,0))).normalized();v=tangent.cross(u)
            vertices.extend(tuple(Vector(p)+(u*math.cos(a*math.tau/n)+v*math.sin(a*math.tau/n))*radii[i]) for a in range(n))
        faces=[tuple(range(n-1,-1,-1)),tuple((len(points)-1)*n+i for i in range(n))]
        faces.extend((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(len(points)-1) for i in range(n))
        builder.add(vertices,faces,color)

    points=[(math.sin(t*math.tau)*.30,.89+math.cos(t*math.pi)*.17,-1.10+t*2.38) for t in [i/30 for i in range(31)]]
    radii=[.25+.07*math.sin(i/30*math.pi) for i in range(31)]
    tube(body,points,radii,jade,12)
    for i in range(1,30):
        x,y,z=points[i];r=radii[i]
        body.orb(x,y-r*.78,z,.16,.039,.065,belly,8,3)
        for side in [-1,1]:
            for a in [.25,.75]:
                xx=x+side*r*math.cos(a);yy=y+r*math.sin(a)
                scales.add([(xx,yy,z-.075),(xx+side*.035,yy+.015,z),(xx,yy,z+.083),(xx-side*.032,yy-.009,z)],[(0,1,2,3)],light if i%3 else belly)
        if i%2==0:ridge.rod((x,y+r*.88,z),(x+.045,y+r+.17,z+.10),.055,ivory,6,.005)
    tube(body,[(0,1.01,-1.05),(-.06,1.27,-1.24),(0,1.54,-1.42)],[.25,.23,.22],jade,12)
    head.orb(0,1.61,-1.53,.28,.23,.32,jade,14,7)
    head.orb(0,1.49,-1.83,.25,.135,.29,light,12,5)
    head.orb(0,1.36,-1.83,.205,.075,.265,belly,10,4)
    head.box(0,1.415,-2.005,.35,.027,.13,dark)
    head.orb(0,1.50,-2.07,.20,.078,.065,jade,10,4)
    for side in [-1,1]:
        head.orb(side*.263,1.68,-1.65,.044,.050,.065,(.93,.60,.08),10,5)
        head.orb(side*.294,1.68,-1.67,.012,.038,.024,dark,6,4)
        head.rod((side*.12,1.76,-1.76),(side*.30,1.74,-1.52),.063,light,8,.040)
        head.orb(side*.105,1.53,-2.119,.031,.019,.010,dark,8,4)
        antler=[(side*.17,1.78,-1.39),(side*.24,2.02,-1.20),(side*.36,2.20,-1.07),(side*.48,2.33,-1.13)]
        tube(horns,antler,[.067,.053,.035,.003],ivory,8)
        tube(horns,[antler[1],(side*.31,2.18,-1.39),(side*.37,2.29,-1.44)],[.043,.026,.002],ivory,7)
        tube(horns,[antler[2],(side*.27,2.31,-.93)],[.028,.002],ivory,7)
        for z in [-1.99,-1.84]:head.rod((side*.17,1.42,z),(side*.16,1.34,z-.02),.026,ivory,6,.001)
        whisker=[(side*.19,1.48,-2.04),(side*.43,1.45,-2.09),(side*.69,1.51,-1.98),(side*.83,1.69,-1.79),(side*.78,1.79,-1.64)]
        tube(hair,whisker,[.028,.024,.019,.012,.002],ivory,7)
        for i in range(5):
            y=1.77-i*.10;z=-1.33+i*.075
            tube(hair,[(side*.22,y,z),(side*(.41+i*.02),y+.04,z+.12),(side*.43,y+.13,z+.32)],[.065,.040,.001],ivory,7)
        tube(hair,[(side*.10,1.34,-1.98),(side*.10,1.15,-1.92),(side*.04,1.05,-1.72)],[.050,.038,.002],ivory,7)
    # Four short, clawed limbs tucked under the serpent; no wings or membranes.
    for side in [-1,1]:
        for front in [True,False]:
            pivot=(side*.21,.83,-.67 if front else .72)
            name=('Foreleg' if front else 'Hindleg')+('L' if side<0 else 'R');joint=empty('D_'+name,root,pivot);limb=Builder()
            elbow=(side*.46,.59,pivot[2]+.14);paw=(side*.56,.44,pivot[2]-.04)
            limb.rod(pivot,elbow,.090,jade,9,.069);limb.rod(elbow,paw,.065,light,8,.048)
            for j in range(3):
                end=(paw[0]+side*(j-1)*.075,.40,paw[2]-.17)
                limb.rod(paw,end,.028,light,7,.020)
                limb.rod(end,(end[0],.35,end[2]-.07),.022,ivory,6,.001)
            limb.obj('D_Dragon'+name,soft,joint,pivot)
    pivot=points[-1];tail=empty('D_Tail',root,pivot);tailbody=Builder();tailhair=Builder()
    tailpoints=[pivot,(-.20,.64,1.48),(-.49,.66,1.68),(-.56,.84,1.89),(-.39,1.02,2.10),(-.06,1.11,2.24)]
    tube(tailbody,tailpoints,[.25,.20,.15,.10,.059,.004],jade,10)
    for p in tailpoints[:-1]:tailhair.rod((p[0],p[1]+.10,p[2]),(p[0]-.13,p[1]+.22,p[2]+.10),.055,ivory,6,.001)
    tailbody.obj('D_DragonTail',soft,tail,pivot);tailhair.obj('D_TailMane',soft,tail,pivot)
    tack.orb(0,1.23,.03,.30,.065,.28,(.11,.055,.025),12,4)
    for z in [-.19,.28]:tack.ring(0,1.22,z,[(0,.29,.04),(.15,.26,.06)],gold,10)
    for side in [-1,1]:
        cloth.add([(side*.29,1.22,-.17),(side*.39,1.12,.30),(side*.41,.81,.31),(side*.37,.85,-.16)],[(0,1,2,3)],ivory)
        tack.rod((side*.35,1.19,.04),(side*.48,.87,-.16),.021,gold,7)
        tack.box(side*.48,.85,-.18,.15,.03,.20,gold)
        tack.rod((side*.20,1.49,-1.82),(side*.29,1.48,-.10),.012,(.14,.075,.028),6)
    body.obj('D_SerpentineBody',soft,root);scales.obj('D_Scales',hard,root);ridge.obj('D_DorsalMane',soft,root)
    head.obj('D_DragonHead',soft,root);horns.obj('D_Antlers',hard,root);hair.obj('D_WhiskersMane',soft,root)
    tack.obj('D_DragonSaddle',hard,root);cloth.obj('D_DragonCloth',team,root)
