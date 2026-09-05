"""Original heavy infantry: broad layered plate, a tower shield and a broadsword."""
import math


def heavy_knight(hard,soft,team):
    from build_assets import Builder,empty,TRIM,DARK,LEATHER,WHITE
    steel=(.25,.32,.38);edge=(.54,.61,.65);brass=(.40,.28,.13)
    root=empty('Unit_H');root['unitRole']='heavy_knight';root['armor']='full_plate'
    body=empty('H_Body',root)
    armor=Builder();detail=Builder();cloth=Builder()
    # Deep barrel-shaped cuirass with an angular raised breastplate and gorget.
    detail.ring(0,.74,0,[(0,.28,.21),(.48,.32,.22)],DARK,10)
    armor.ring(0,.79,0,[(0,.28,.23),(.12,.37,.28),(.37,.40,.29),(.49,.24,.21)],steel,12)
    armor.add([(-.31,.94,-.253),(.31,.94,-.253),(.30,1.18,-.25),(.17,1.27,-.19),(-.17,1.27,-.19),(-.30,1.18,-.25),(0,1.12,-.36)],[(0,1,6),(1,2,6),(2,3,6),(3,4,6),(4,5,6),(5,0,6)],edge)
    armor.ring(0,1.24,0,[(0,.24,.21),(.075,.235,.21),(.10,.17,.16)],edge,12)
    armor.box(0,1.11,-.367,.048,.22,.023,brass)
    for side in [-1,1]:
        for y in [.99,1.16]:armor.orb(side*.25,y,-.28,.023,.023,.02,brass,6,4)
    # Three overlapping fauld plates and broad hanging thigh plates.
    for j in range(3):
        armor.ring(0,.63+j*.075,0,[(0,.33-j*.018,.25),(.074,.31-j*.018,.235)],steel,12)
        armor.ring(0,.625+j*.075,0,[(0,.335-j*.018,.253),(.017,.332-j*.018,.25)],edge,12)
    detail.ring(0,.84,0,[(0,.30,.24),(.055,.32,.25)],LEATHER,12)
    armor.box(0,.868,-.255,.11,.065,.025,brass)
    for side in [-1,1]:
        for j in range(3):
            armor.box(side*.21,.49+j*.067,-.235,.255,.079,.083,steel)
            armor.box(side*.21,.462+j*.067,-.282,.26,.018,.019,edge)
        armor.box(side*.34,.58,.005,.11,.28,.34,steel)
    cloth.add([(-.12,.82,-.26),(.12,.82,-.26),(.14,.38,-.275),(0,.32,-.28),(-.14,.38,-.275)],[(0,1,2,3,4)],WHITE)
    armor.obj('H_Cuirass',hard,body);detail.obj('H_UnderArmor',soft,body);cloth.obj('H_Tabard',team,body)

    # A fully enclosed, flat-topped great helm; narrow vision slit and vent holes.
    helmet=Builder();lining=Builder()
    helmet.ring(0,1.32,0,[(0,.18,.17),(.10,.205,.20),(.31,.20,.195),(.38,.14,.15)],steel,10)
    helmet.box(0,1.44,-.192,.32,.16,.06,edge)
    lining.box(0,1.556,-.202,.31,.030,.018,DARK)
    helmet.box(0,1.62,-.209,.35,.032,.035,edge)
    helmet.box(0,1.49,-.237,.045,.23,.028,brass)
    for side in [-1,1]:
        for x in [.073,.118]:
            for y in [1.42,1.46]:lining.box(side*x,y,-.226,.016,.017,.009,DARK)
    helmet.box(0,1.704,0,.045,.027,.25,edge)
    helmet.obj('H_GreatHelm',hard,body);lining.obj('H_Visor',soft,body)

    for side in [-1,1]:
        pivot=(side*.43,1.16,0);arm=empty('H_'+('ArmL' if side<0 else 'ArmR'),body,pivot)
        plate=Builder();joint=Builder()
        # Large rounded pauldrons, bright rolled rims and two overlapping lames.
        plate.orb(side*.45,1.21,0,.28,.185,.30,steel,12,6)
        plate.ring(side*.45,1.12,0,[(0,.275,.30),(.031,.28,.30)],edge,12)
        for j in range(2):
            plate.ring(side*(.48+j*.025),1.00-j*.087,0,[(0,.17,.22),(.078,.205,.25)],steel,10)
            plate.ring(side*(.48+j*.025),.994-j*.087,0,[(0,.172,.223),(.018,.183,.227)],edge,10)
        joint.rod((side*.50,.78,-.04),pivot,.10,DARK,8)
        plate.orb(side*.53,.86,-.02,.16,.115,.15,edge,10,5)
        plate.rod((side*.56,.62,-.14),(side*.53,.84,-.05),.115,steel,10,.14)
        plate.ring(side*.56,.63,-.14,[(0,.123,.13),(.04,.125,.13)],edge,10)
        plate.box(side*.56,.60,-.15,.21,.17,.19,steel)
        for j in range(3):plate.box(side*.56,.57+j*.046,-.256,.20,.035,.045,edge)
        plate.obj('H_Pauldron'+str(side),hard,arm,pivot);joint.obj('H_ArmJoint'+str(side),soft,arm,pivot)
        if side<0:
            # A thick tower shield, not a single flat card. Separate team-color face.
            shield=Builder();face=Builder()
            outline=[(-.26,.58),(.26,.58),(.30,.43),(.27,-.39),(0,-.58),(-.27,-.39),(-.30,.43)]
            points=[(-.57+x,.79+y,z) for z in [-.31,-.43] for x,y in outline]
            n=len(outline)
            shield.add(points,[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],edge)
            face.add([(-.57+x*.83,.79+y*.89,-.445) for x,y in outline],[tuple(range(n))],WHITE)
            for i in range(n):
                x,y=outline[i];shield.orb(-.57+x*.92,.79+y*.94,-.456,.016,.016,.013,brass,6,3)
            shield.box(-.57,.78,-.472,.047,.77,.022,brass)
            shield.box(-.57,.90,-.474,.34,.044,.022,brass)
            shield.orb(-.57,.88,-.48,.09,.105,.045,steel,10,5)
            shield.obj('H_TowerShield',hard,arm,pivot);face.obj('H_ShieldColors',team,arm,pivot)
        else:
            sword=Builder()
            sword.rod((.60,.48,-.16),(.60,.81,-.16),.040,LEATHER,8)
            for j in range(5):sword.ring(.60,.52+j*.045,-.16,[(0,.043,.043),(.015,.043,.043)],brass,8)
            sword.orb(.60,.465,-.16,.065,.065,.065,edge,8,4)
            sword.box(.60,.80,-.16,.36,.07,.105,edge)
            # Diamond-section blade with a raised central ridge and tapered point.
            sword.add([(.53,.84,-.16),(.67,.84,-.16),(.67,1.54,-.16),(.60,1.76,-.16),(.53,1.54,-.16),(.60,1.02,-.205),(.60,1.02,-.115)],[(0,1,5),(1,2,5),(2,3,5),(3,4,5),(4,0,5),(1,0,6),(2,1,6),(3,2,6),(4,3,6),(0,4,6)],edge)
            sword.obj('H_Broadsword',hard,arm,pivot)

    for side in [-1,1]:
        pivot=(side*.18,.69,0);leg=empty('H_'+('LegL' if side<0 else 'LegR'),root,pivot)
        plate=Builder();joint=Builder()
        joint.rod((side*.18,.14,0),pivot,.10,DARK,8)
        plate.ring(side*.18,.47,0,[(0,.13,.13),(.19,.14,.14)],steel,10)
        plate.orb(side*.18,.43,-.105,.16,.13,.12,edge,10,5)
        plate.ring(side*.18,.13,0,[(0,.115,.13),(.25,.145,.14)],steel,10)
        plate.box(side*.18,.27,-.137,.055,.23,.031,edge)
        plate.box(side*.18,.09,-.075,.235,.18,.36,steel)
        for j in range(3):plate.box(side*.18,.14-j*.021,-.06-j*.072,.24,.055,.084,edge)
        plate.obj('H_Greave'+str(side),hard,leg,pivot);joint.obj('H_LegJoint'+str(side),soft,leg,pivot)

    cape=empty('H_Cape',body,(0,1.27,.23));cloth=Builder()
    vs=[((i/5-.5)*(.62+j*.075),1.27-j*.19,.25+j*.06+.028*math.sin(i*1.5)) for j in range(5) for i in range(6)]
    cloth.add(vs,[(j*6+i,j*6+i+1,(j+1)*6+i+1,(j+1)*6+i) for j in range(4) for i in range(5)],WHITE)
    cloth.obj('H_Mantle',team,cape,(0,1.27,.23))
    promotion=empty('H_Promotion',root);crest=Builder()
    crest.ring(0,1.66,0,[(0,.20,.19),(.06,.16,.16)],TRIM,10)
    for side in [-1,1]:
        crest.ring(side*.45,1.31,0,[(0,.23,.25),(.046,.22,.24)],TRIM,10)
        crest.box(side*.18,1.16,-.287,.12,.04,.024,TRIM)
    crest.obj('H_AscendedCrest',hard,promotion)
    return root
