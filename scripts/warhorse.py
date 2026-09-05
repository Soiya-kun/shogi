"""A saddled war horse for the unpromoted rook, in (x, height, z) metres."""

def warhorse(root,soft,hard,team):
    from build_assets import Builder,empty
    brown=(.25,.12,.05);light=(.34,.19,.08);dark=(.045,.030,.025)
    leather=(.12,.064,.03);gold=(.60,.39,.12);ivory=(.78,.73,.59)
    body=Builder();mane=Builder();tack=Builder();cloth=Builder()
    root['mount']='horse'
    body.orb(0,.75,.03,.34,.34,.65,brown,14,7)
    body.orb(0,.83,-.43,.29,.36,.31,light,12,6)
    body.rod((0,.91,-.40),(0,1.42,-.65),.23,brown,12,.145)
    body.orb(0,1.45,-.75,.16,.22,.26,brown,12,6)
    body.orb(0,1.31,-.97,.145,.12,.22,light,10,5)
    body.box(0,1.23,-1.06,.23,.024,.12,dark)
    for side in [-1,1]:
        body.rod((side*.10,1.58,-.67),(side*.135,1.84,-.65),.060,brown,8,.025)
        body.rod((side*.103,1.63,-.699),(side*.13,1.80,-.68),.029,leather,6,.008)
        body.orb(side*.157,1.47,-.83,.026,.027,.032,dark,8,4)
        body.orb(side*.12,1.34,-1.12,.025,.023,.021,dark,7,4)
        tack.rod((side*.15,1.32,-1.03),(side*.165,1.60,-.71),.020,leather,7)
        tack.rod((side*.16,1.50,-.73),(side*.32,1.16,-.10),.013,leather,6)
        tack.rod((side*.27,1.06,-.30),(side*.32,.66,-.38),.022,leather,7)
        tack.rod((side*.33,.90,.10),(side*.31,.49,.12),.020,leather,6)
        tack.rod((side*.34,1.00,.03),(side*.44,.53,-.14),.021,leather,7)
        tack.orb(side*.44,.515,-.16,.10,.028,.14,gold,10,3)
        for z in [-.29,-.08,.13]:tack.orb(side*.31,.94,z,.025,.025,.021,gold,7,3)
        cloth.add([(side*.32,.99,-.23),(side*.40,.92,.43),(side*.40,.52,.45),(side*.37,.63,-.20)],[(0,1,2,3)],ivory)
        tack.rod((side*.40,.52,.45),(side*.37,.63,-.20),.022,gold,7)
    tack.orb(0,1.025,.055,.30,.065,.32,leather,12,4)
    for z in [-.23,.32]:tack.ring(0,1.02,z,[(0,.29,.045),(.17,.25,.055)],leather,12)
    for i in range(10):
        t=i/9;y=1.57-t*.67;z=-.55+t*.32
        mane.rod((0,y,z),(0,y-.07,z+.14),.055,dark,7,.008)
    # Four independent limbs keep the gait separate from the seated rider.
    for side in [-1,1]:
        for front in [True,False]:
            z=-.44 if front else .43;pivot=(side*.245,.73,z)
            name=('Foreleg' if front else 'Hindleg')+('L' if side<0 else 'R')
            joint=empty('R_'+name,root,pivot);leg=Builder()
            knee=(side*.25,.37,z+(.025 if front else -.08));ankle=(side*.255,.105,z-.025)
            leg.rod(pivot,knee,.095,brown,8,.063);leg.orb(*knee,.073,.075,.074,light,8,4)
            leg.rod(knee,ankle,.054,brown,8,.038)
            leg.box(ankle[0],.052,ankle[2]-.04,.17,.10,.23,dark)
            leg.obj('R_Horse'+name,soft,joint,pivot)
    pivot=(0,.93,.60);tail=empty('R_Tail',root,pivot);hair=Builder()
    points=[pivot,(.03,.71,.80),(.04,.42,.87),(-.02,.18,.84)]
    for i,(a,b) in enumerate(zip(points,points[1:])):hair.rod(a,b,.085-i*.018,dark,9,.068-i*.021)
    hair.obj('R_HorseTail',soft,tail,pivot)
    body.obj('R_Horse',soft,root);mane.obj('R_Mane',soft,root)
    tack.obj('R_Saddle',hard,root);cloth.obj('R_SaddleCloth',team,root)
