"""Original flying war dragon, authored in metres (x, height, z)."""
import math

def dragon(root,soft,hard,team,promote):
    from build_assets import Builder,empty,TRIM,LEATHER,WHITE,SILVER
    scale=(.07,.205,.17);light=(.105,.28,.235);belly=(.29,.255,.14)
    horn=(.58,.49,.30);dark=(.018,.033,.03)
    skin=Builder();gear=Builder();cloth=Builder()
    root['mount']='dragon'
    skin.orb(0,.84,.05,.43,.39,.69,scale,14,8)
    skin.orb(0,.80,-.29,.37,.37,.37,light,12,7)
    # Upright S-shaped neck, angular brow and a long, toothed muzzle.
    skin.rod((0,.87,-.44),(0,1.30,-.66),.26,scale,12,.18)
    skin.rod((0,1.30,-.66),(0,1.51,-.92),.18,light,10,.17)
    skin.orb(0,1.51,-1.02,.245,.22,.32,scale,12,7)
    skin.orb(0,1.43,-1.30,.18,.12,.25,light,10,5)
    skin.orb(0,1.31,-1.25,.16,.06,.25,belly,10,4)
    skin.box(0,1.37,-1.40,.28,.024,.17,dark)
    for side in [-1,1]:
        skin.orb(side*.222,1.57,-1.12,.038,.047,.061,(.85,.46,.045),8,5)
        skin.orb(side*.25,1.57,-1.13,.011,.034,.021,dark,6,4)
        skin.rod((side*.12,1.68,-1.10),(side*.26,1.65,-.92),.065,light,8,.045)
        skin.orb(side*.105,1.49,-1.49,.035,.024,.03,dark,7,4)
        skin.rod((side*.17,1.67,-.86),(side*.29,1.96,-.59),.075,horn,8,.006)
        skin.rod((side*.23,1.49,-.83),(side*.40,1.59,-.61),.059,horn,7,.003)
        for z in [-1.47,-1.36,-1.23]:
            skin.rod((side*.14,1.38,z),(side*.13,1.30,z-.025),.028,horn,6,.001)
    # Individual belly scutes and a ridge of dorsal plates.
    for i in range(6):
        h=.91+i*.085;z=-.57-i*.055
        skin.orb(0,h,z-.10,.17-i*.01,.054,.073,belly,8,4)
    for i in range(7):
        z=-.63+i*.19;h=1.05+.16*math.cos(z*2)
        skin.rod((0,h,z),(0,h+.18,z+.075),.07,light,6,.002)
    # Saddle, stirrups and team-colored caparison behind the rider.
    gear.orb(0,1.20,.04,.30,.075,.30,LEATHER,10,5)
    gear.box(0,1.30,-.16,.44,.16,.065,LEATHER)
    gear.box(0,1.31,.25,.42,.18,.07,LEATHER)
    for side in [-1,1]:
        cloth.add([(side*.32,1.15,-.20),(side*.43,1.04,.33),(side*.42,.65,.36),(side*.38,.71,-.15)],[(0,1,2,3)],WHITE)
        gear.rod((side*.35,1.14,.02),(side*.47,.89,-.17),.018,LEATHER,6)
        gear.box(side*.48,.86,-.20,.12,.028,.20,TRIM)
        gear.rod((side*.16,1.41,-1.25),(side*.19,1.53,-.83),.018,LEATHER,6)
        gear.rod((side*.17,1.48,-.90),(side*.30,1.47,-.08),.012,LEATHER,5)
    skin.obj('R_DragonBody',soft,root);gear.obj('R_DragonTack',hard,root);cloth.obj('R_DragonCloth',team,root)
    # Open bat-like wings with distinct finger spars and scalloped membranes.
    for side in [-1,1]:
        pivot=(side*.35,1.10,-.12);wing=empty('R_'+('WingL' if side<0 else 'WingR'),root,pivot)
        membrane=Builder();bones=Builder()
        points=[(.35,1.10,-.12),(.90,1.35,-.44),(1.48,1.25,-.13),(1.25,1.03,.35),(1.30,1.02,.93),(.80,.97,.50),(.43,.91,.71)]
        points=[(side*x,h,z) for x,h,z in points]
        membrane.add(points,[(0,1,2),(0,2,3),(0,3,4),(0,4,5),(0,5,6)],(.29,.135,.07))
        for a,b in [(0,1),(1,2),(0,3),(0,4),(0,5),(5,6)]:bones.rod(points[a],points[b],.031,light,7,.013)
        bones.rod(points[2],(side*1.50,1.31,-.16),.023,horn,6,.001)
        membrane.obj('R_WingMembrane'+str(side),soft,wing,pivot)
        bones.obj('R_WingSpars'+str(side),soft,wing,pivot)
    # Four articulated legs, broad feet and three distinct claws per foot.
    for front in [True,False]:
        for side in [-1,1]:
            z=-.40 if front else .46;pivot=(side*.31,.76,z)
            name=('Foreleg' if front else 'Hindleg')+('L' if side<0 else 'R')
            leg=empty('R_'+name,root,pivot);a=Builder()
            knee=(side*.47,.43,z+(.12 if front else -.13));ankle=(side*.43,.14,z-.05)
            a.orb(*pivot,.15,.20,.16,scale,9,5)
            a.rod(pivot,knee,.105,scale,8,.085);a.rod(knee,ankle,.080,light,8,.055)
            a.orb(side*.43,.095,z-.13,.14,.075,.20,scale,9,5)
            for dx in [-.09,0,.09]:a.rod((side*.43+dx,.075,z-.23),(side*.43+dx,.035,z-.38),.037,horn,6,.001)
            a.obj('R_Dragon'+name,soft,leg,pivot)
    pivot=(0,.78,.61);tail=empty('R_Tail',root,pivot);a=Builder()
    pts=[pivot,(0,.69,.99),(.12,.49,1.37),(.28,.48,1.70),(.31,.65,1.96)]
    for i in range(len(pts)-1):a.rod(pts[i],pts[i+1],.15-i*.032,scale,9,.118-i*.032)
    for x,h,z in pts[1:-1]:a.rod((x,h+.035,z),(x,h+.19,z+.07),.048,light,6,.001)
    a.add([(.31,.65,1.80),(.14,.67,1.97),(.31,.70,2.08),(.48,.67,1.97),(.31,.77,1.95)],[(0,1,4),(1,2,4),(2,3,4),(3,0,4),(0,3,2,1)],light)
    a.obj('R_DragonTail',soft,tail,pivot)
    # Promotion reinforces the dragon's head armor as well as the rider's crest.
    gold=Builder()
    gold.orb(0,1.70,-1.01,.18,.045,.21,TRIM,10,5)
    for side in [-1,1]:gold.rod((side*.17,1.69,-.86),(side*.30,2.08,-.54),.09,TRIM,8,.002)
    gold.obj('R_DragonAscendedArmor',hard,promote)
