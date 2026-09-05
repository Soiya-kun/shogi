"""Original foot archer with a recurved bow, string and a stocked quiver."""
import math


def archer(hard,soft,team):
    from build_assets import Builder,empty,SILVER,TRIM,DARK,LEATHER,SKIN,WHITE
    root=empty('Unit_A');root['unitRole']='archer';root['weapon']='bow'
    body=empty('A_Body',root)
    armor=Builder();detail=Builder();cloth=Builder()
    # Light leather armor over the team tunic, with an open hood and bracers.
    cloth.ring(0,.44,0,[(0,.26,.19),(.28,.20,.15)],WHITE,10)
    cloth.ring(0,.73,0,[(0,.21,.15),(.30,.25,.16),(.36,.15,.11)],WHITE,10)
    detail.ring(0,.76,-.015,[(0,.22,.15),(.23,.25,.165),(.29,.17,.12)],(.22,.105,.044),10)
    detail.ring(0,.72,0,[(0,.23,.165),(.055,.23,.165)],LEATHER,10)
    armor.box(0,.75,-.175,.08,.05,.024,TRIM)
    for x in [-.15,0,.15]:
        for y in [.83,.96]:armor.orb(x,y,-.172,.014,.014,.012,TRIM,6,3)
    detail.rod((-.18,.80,-.16),(.18,1.04,-.16),.026,LEATHER,6)
    detail.ring(0,1.06,0,[(0,.075,.07),(.07,.075,.07)],SKIN,8)
    detail.orb(0,1.22,-.02,.123,.155,.115,SKIN,10,6)
    # Open-front hood leaves the eyes, brow and nose visible.
    vs=[]
    for y,rx,rz in [(1.10,.16,.145),(1.31,.16,.15),(1.43,.055,.055)]:
        for i in range(11):
            a=-.35+(math.pi+.7)*i/10
            vs.append((rx*math.cos(a),y,rz*math.sin(a)))
    cloth.add(vs,[(j*11+i,j*11+i+1,(j+1)*11+i+1,(j+1)*11+i) for j in range(2) for i in range(10)],WHITE)
    detail.box(0,1.29,-.119,.19,.025,.018,LEATHER)
    for side in [-1,1]:detail.orb(side*.047,1.245,-.122,.012,.009,.009,DARK,6,3)
    detail.orb(0,1.215,-.136,.025,.03,.026,SKIN,7,4)
    detail.box(.22,.70,.04,.12,.19,.12,LEATHER)
    armor.obj('A_Armor',hard,body);detail.obj('A_Details',soft,body);cloth.obj('A_Uniform',team,body)

    # The quiver and individual shafts sit diagonally across the back.
    q=Builder();arrows=Builder();dark=(.045,.025,.016)
    a=(-.12,.63,.23);b=(.20,1.20,.23)
    q.rod(a,b,.082,LEATHER,10,.10)
    q.rod((.18,1.165,.23),b,.103,TRIM,10)
    q.rod(b,(.203,1.205,.23),.079,dark,10)
    for i in range(5):
        x=.16+(i%3)*.039;z=.19+(i//3)*.06;y=1.43+(i%2)*.04
        arrows.rod((x-.09,1.06,z),(x,y,z),.009,(.64,.43,.20),5)
        arrows.add([(x-.037,y-.04,z),(x,y+.005,z),(x+.032,y-.09,z),(x,y-.13,z)],[(0,1,2,3)],(.83,.80,.61))
        arrows.add([(x,y-.04,z-.031),(x,y+.005,z),(x,y-.09,z+.03),(x,y-.13,z)],[(0,1,2,3)],(.83,.80,.61))
    q.obj('A_Quiver',soft,body);arrows.obj('A_Arrows',soft,body)

    for side in [-1,1]:
        pivot=(side*.25,1.01,0);arm=empty('A_'+('ArmL' if side<0 else 'ArmR'),body,pivot)
        sleeve=Builder();hand=Builder();bracer=Builder()
        elbow=(side*.34,.83,-.05)
        wrist=(-.48,.82,-.20) if side<0 else (.32,.68,-.10)
        sleeve.orb(side*.25,1.01,0,.105,.11,.125,WHITE,10,6)
        sleeve.rod(pivot,elbow,.075,WHITE,8)
        hand.rod(elbow,wrist,.056,SKIN,8)
        bracer.rod(tuple((elbow[i]+wrist[i])/2 for i in range(3)),wrist,.065,LEATHER,8)
        hand.orb(*wrist,.067,.07,.063,SKIN,8,5)
        sleeve.obj('A_Sleeve'+str(side),team,arm,pivot)
        hand.obj('A_Hand'+str(side),soft,arm,pivot);bracer.obj('A_Bracer'+str(side),soft,arm,pivot)
        if side<0:
            bow=Builder();string=Builder()
            # A slight diagonal in plan keeps the bow's curve readable from the front.
            curve=[(.09,.10),(.04,.20),(-.07,.37),(-.13,.59),(-.15,.82),(-.13,1.05),(-.07,1.27),(.04,1.44),(.09,1.54)]
            points=[(-.36+offset,y,-.09+offset*.8) for offset,y in curve]
            for start,end in zip(points,points[1:]):bow.rod(start,end,.026,(.52,.28,.085),8,.023)
            for y in [.76,.79,.82,.85,.88]:bow.ring(-.51,y,-.21,[(0,.031,.031),(.018,.031,.031)],LEATHER,8)
            string.rod(points[0],points[-1],.010,(.82,.76,.58),6)
            bow.obj('A_Bow',soft,arm,pivot);string.obj('A_Bowstring',soft,arm,pivot)
        else:
            # A spare arrow carried ready in the right hand.
            arrow=Builder();arrow.rod((.33,.37,-.11),(.33,1.05,-.11),.009,(.62,.42,.21),5)
            arrow.rod((.33,1.05,-.11),(.33,1.12,-.11),.025,SILVER,5,.001)
            arrow.add([(.30,.37,-.11),(.33,.48,-.11),(.36,.39,-.11),(.33,.34,-.11)],[(0,1,2,3)],(.83,.80,.61))
            arrow.obj('A_ReadiedArrow',soft,arm,pivot)

    for side in [-1,1]:
        pivot=(side*.12,.62,0);leg=empty('A_'+('LegL' if side<0 else 'LegR'),root,pivot)
        a=Builder();a.rod((side*.12,.15,0),pivot,.075,DARK,8)
        a.ring(side*.12,.13,0,[(0,.085,.09),(.21,.085,.08)],LEATHER,8)
        a.box(side*.12,.09,-.055,.16,.16,.27,LEATHER)
        a.box(side*.12,.25,-.083,.11,.028,.014,TRIM)
        a.obj('A_LegMesh'+str(side),soft,leg,pivot)

    promotion=empty('A_Promotion',root);a=Builder()
    a.ring(0,1.34,0,[(0,.16,.145),(.048,.145,.135)],TRIM,10)
    for side in [-1,1]:a.orb(side*.25,1.07,0,.115,.035,.12,TRIM,8,4)
    a.obj('A_AscendedCrest',hard,promotion)
    return root
