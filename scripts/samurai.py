"""Original Sengoku-inspired fantasy soldiers, in (x, height, z) metres.

Shared armor construction keeps all eleven visual roles in one art style.
This is stylized game artwork, not a reconstruction of a particular clan.
"""
import math

INK=(.038,.047,.053);LACQUER=(.09,.075,.065);IRON=(.20,.23,.24)
EDGE=(.36,.37,.32);GOLD=(.60,.39,.12);CORD=(.59,.44,.23)
SKIN=(.61,.37,.23);WOOD=(.24,.115,.042);IVORY=(.78,.75,.61)


def panel(plate,lace,x,y,z,w,h,rows,angle=0,color=LACQUER):
    """Overlapping lacquered lames with visible vertical lacing, facing -Z."""
    from build_assets import Builder
    p=Builder();c=Builder()
    for j in range(rows):
        yy=y+h/2-(j+.5)*h/rows;zz=z-j*.013
        # Exposed front and bevels; buried backs do not need faces on every lame.
        dy=h/rows*.455
        p.add([(x-w/2,yy-dy,zz-.018),(x+w/2,yy-dy,zz-.018),(x+w/2,yy+dy,zz-.018),(x-w/2,yy+dy,zz-.018),(x-w/2,yy-dy,zz+.018),(x+w/2,yy-dy,zz+.018),(x+w/2,yy+dy,zz+.018),(x-w/2,yy+dy,zz+.018)],[(0,1,2,3),(3,2,6,7),(4,5,1,0)],color)
        ey=yy-h/rows*.35
        p.add([(x-w/2,ey-.006,zz-.026),(x+w/2,ey-.006,zz-.026),(x+w/2,ey+.006,zz-.026),(x-w/2,ey+.006,zz-.026)],[(0,1,2,3)],EDGE)
        for xx in [-.30,-.10,.10,.30]:
            c.add([(x+xx*w-.009,yy-h/rows*.38,zz-.028),(x+xx*w+.009,yy-h/rows*.38,zz-.028),(x+xx*w+.009,yy+h/rows*.39,zz-.028),(x+xx*w-.009,yy+h/rows*.39,zz-.028)],[(0,1,2,3)],IVORY)
    def append(dst,src):
        base=len(dst.v)
        for xx,zz,yy in src.v:
            dx=xx-x;dz=-zz-z
            dst.v.append((x+dx*math.cos(angle)+dz*math.sin(angle),-(z-dx*math.sin(angle)+dz*math.cos(angle)),yy))
        dst.f.extend(tuple(base+i for i in face) for face in src.f);dst.c.extend(src.c)
    append(plate,p);append(lace,c)


def crest(builder,x,y,z,r=.08,color=IVORY):
    """An original three-disc mon, repeated on banners and command equipment."""
    for a in [-math.pi/2,math.pi/6,math.pi*5/6]:
        cx=x+math.cos(a)*r*.52;cy=y+math.sin(a)*r*.52
        builder.add([(cx,cy,z)]+[(cx+math.cos(i*math.tau/10)*r*.29,cy+math.sin(i*math.tau/10)*r*.29,z) for i in range(10)],[(0,i+1,(i+1)%10+1) for i in range(10)],color)


def katana(builder,x,y,z,length=.78,large=False,sheathed=False):
    from build_assets import Builder
    a=Builder();width=.057 if large else .037
    a.rod((x,y-.21,z),(x,y,z),.026,INK,8)
    for j in range(5):a.ring(x,y-.18+j*.034,z,[(0,.028,.028),(.012,.028,.028)],CORD,6)
    a.orb(x,y+.008,z,.082,.019,.072,GOLD,10,3)
    if sheathed:
        a.rod((x,y+.025,z),(x+.065,y+length,z),width,INK,8,width*.7)
    else:
        # Curved blade with a bright edge and a raised spine.
        points=[(x+t*t*.095,y+.03+t*length,z) for t in [0,.25,.50,.75,1]]
        for i,(p,q) in enumerate(zip(points,points[1:])):
            w=width*(1-i*.13)
            a.add([(p[0]-w,p[1],z),(p[0]+w,p[1],z),(q[0]+w*.85,q[1],z),(q[0]-w*.85,q[1],z),(p[0],p[1],z-.019),(q[0],q[1],z-.015)],[(0,1,4),(0,4,5,3),(1,2,5,4),(3,5,2),(0,3,2,1)],(.61,.66,.65))
        end=points[-1];a.add([(end[0]-width*.55,end[1],z),(end[0]+width*.6,end[1],z),(end[0]+.06,end[1]+.11,z)],[(0,1,2)],IVORY)
    # Tilt the blade outwards so the shoulder armor does not hide it.
    tilt=.24 if not sheathed else -1.25
    base=len(builder.v)
    builder.v.extend((x+(xx-x)*math.cos(tilt)+(hh-y)*math.sin(tilt),zz,y-(xx-x)*math.sin(tilt)+(hh-y)*math.cos(tilt)) for xx,zz,hh in a.v)
    builder.f.extend(tuple(base+i for i in face) for face in a.f);builder.c.extend(a.c)


def horse(root,soft,hard,team):
    from build_assets import Builder
    b=Builder();tack=Builder();cloth=Builder();brown=(.22,.105,.046)
    b.orb(0,.55,0,.27,.30,.53,brown,12,6)
    b.rod((0,.62,-.30),(0,1.02,-.42),.17,brown,10,.115)
    b.orb(0,1.06,-.47,.13,.18,.23,brown,10,5)
    b.box(0,1.13,-.31,.07,.28,.19,INK)
    for side in [-1,1]:
        b.ring(side*.09,1.20,-.44,[(0,.045,.055),(.15,0,0)],brown,5)
        b.orb(side*.126,1.10,-.56,.022,.023,.017,INK,6,3)
        for zz in [-.32,.33]:
            b.rod((side*.18,.055,zz),(side*.18,.51,zz),.058,brown,7)
            b.box(side*.18,.065,zz-.025,.13,.13,.17,INK)
        tack.rod((side*.13,1.02,-.64),(side*.13,1.16,-.41),.016,WOOD,6)
        tack.rod((side*.13,1.12,-.46),(side*.29,.97,-.09),.012,WOOD,6)
        tack.rod((side*.28,.77,.05),(side*.38,.38,-.12),.018,WOOD,6)
        tack.orb(side*.38,.355,-.11,.09,.025,.13,IRON,8,3)
        cloth.add([(side*.25,.73,-.17),(side*.31,.68,.32),(side*.30,.43,.32),(side*.29,.48,-.17)],[(0,1,2,3)],IVORY)
    tack.orb(0,.79,.04,.25,.065,.27,WOOD,10,4)
    for zz in [-.19,.24]:tack.ring(0,.77,zz,[(0,.23,.045),(.15,.21,.04)],WOOD,10)
    b.rod((0,.71,.43),(0,.34,.67),.065,INK,8,.025)
    b.obj('N_Horse',soft,root);tack.obj('N_Saddle',hard,root);cloth.obj('N_SaddleCloth',team,root)
    root['mount']='horse'


def samurai(role,hard,soft,team):
    from build_assets import Builder,empty
    light=role in ['P','L','A'];heavy=role=='H';mage=role=='B'
    noble=role in ['N','G','R','D','K','H'];ride=.83 if role=='D' else .55 if role=='R' else .34 if role=='N' else 0
    scale=1.18 if heavy else 1;belt=.69*scale+ride;shoulder=1.04*scale+ride;head=1.22*scale+ride
    root=empty('Unit_'+role);root['style']='sengoku_fantasy';root['unitRole']={'P':'ashigaru','L':'yari_ashigaru','A':'yumi_ashigaru','N':'mounted_samurai','H':'armored_samurai','S':'samurai','G':'hatamoto','B':'onmyoji','K':'daimyo','R':'cavalry_samurai','D':'ryuu_samurai'}[role]
    if role=='H':root['armor']='o_yoroi'
    body=empty(role+'_Body',root)
    armor=Builder();details=Builder();cloth=Builder();laces=Builder()
    broad=.34 if heavy else .265 if noble else .22
    # Kosode, crossed collar, obi and a lacquered do with overlapping lower lames.
    cloth.ring(0,belt-.06,0,[(0,broad*.87,.15),(.36*scale,broad,.175),(.42*scale,.14,.11)],IVORY,8)
    for side in [-1,1]:
        cloth.add([(side*.12,shoulder+.015,-.125),(side*.20,shoulder-.12,-.19),(-side*.08,shoulder-.20,-.20)],[(0,1,2)],(.88,.87,.73))
    if not mage:
        armor.ring(0,belt,0,[(0,broad*.85,.18),(.11*scale,broad*1.03,.205),(.29*scale,broad*1.04,.22),(.35*scale,broad*.70,.15)],LACQUER,10)
        panel(armor,laces,0,belt+.17*scale,-.207,broad*1.80,.25*scale,3 if light else 4)
        if noble:crest(armor,0,belt+.27*scale,-.25,.065,GOLD)
        for i in range(6 if not heavy else 7):
            a=math.tau*i/(6 if not heavy else 7)
            panel(armor,laces,math.sin(a)*broad*.89,belt-.16*scale,-math.cos(a)*.20,broad*.84,.25*scale,3 if light else 4,-a)
    details.ring(0,belt-.008,0,[(0,broad*.93,.19),(.058,broad*.95,.195)],INK,10)
    details.box(-.08,belt+.02,-.209,.11,.075,.052,CORD)
    details.ring(0,head-.14*scale,0,[(0,.075,.075),(.08,.075,.075)],SKIN,8)
    details.orb(0,head,-.02,.12*scale,.145*scale,.115*scale,SKIN,10,5)
    details.box(0,head+.065*scale,-.114*scale,.18*scale,.025,.026,INK)
    details.orb(0,head-.008,-.145*scale,.025,.029,.025,SKIN,6,3)
    for side in [-1,1]:details.orb(side*.047*scale,head+.025,-.129*scale,.012,.009,.009,INK,6,3)
    armor.obj(role+'_Do',hard,body);details.obj(role+'_Details',soft,body)
    cloth.obj(role+'_Kosode',team if not mage else soft,body);laces.obj(role+'_Lacing',team,body)

    headgear=Builder();cord=Builder()
    if light:
        # Broad, low conical jingasa with a rolled rim, gold mon and chin cords.
        headgear.ring(0,head+.09,0,[(0,.33,.32),(.025,.325,.315),(.19,.035,.035),(.20,0,0)],LACQUER,16)
        headgear.ring(0,head+.086,0,[(0,.332,.322),(.014,.332,.322)],EDGE,16)
        crest(headgear,0,head+.145,-.23,.041,GOLD)
        for side in [-1,1]:cord.rod((side*.13,head+.10,0),(side*.04,head-.13,-.08),.01,CORD,5)
        headgear.obj(role+'_Jingasa',hard,body)
    elif mage:
        headgear.ring(0,head+.08,.025,[(0,.135,.13),(.19,.12,.105),(.43,.068,.07),(.46,.06,.035)],INK,8)
        headgear.box(0,head+.30,.08,.035,.34,.11,INK)
        headgear.obj(role+'_Eboshi',soft,body)
    else:
        # Kabuto dome, fanned shikoro, turned-back fukigaeshi and a bold maedate.
        hh=head+.065*scale
        headgear.ring(0,hh,0,[(0,.19*scale,.19*scale),(.10*scale,.195*scale,.18*scale),(.22*scale,.125*scale,.13*scale),(.26*scale,.045,.05)],INK,12)
        for j in range(3):
            vs=[]
            for y,r in [(hh-.055*j,.22*scale+j*.018),(hh-.055*j-.055,.24*scale+j*.023)]:
                vs.extend((r*math.cos(a),y,r*.89*math.sin(a)) for a in [-.20+i*(math.pi+.40)/12 for i in range(13)])
            headgear.add(vs,[(i,i+1,i+14,i+13) for i in range(12)],LACQUER)
        headgear.box(0,hh+.025,-.204*scale,.38*scale,.035,.12,IRON)
        for side in [-1,1]:
            headgear.box(side*.23*scale,hh+.026,-.02,.085,.15*scale,.035,LACQUER)
            crest(headgear,side*.23*scale,hh+.038,-.045,.037,GOLD)
            cord.rod((side*.145,hh,0),(side*.04,head-.13,-.10),.011,CORD,5)
        headgear.obj(role+'_Kabuto',hard,body)
        maedate=Builder()
        if role in ['K','H','N','R','D']:
            for side in [-1,1]:
                maedate.add([(side*.02,hh+.12,-.224),(side*.11,hh+.14,-.224),(side*.29*scale,hh+.39*scale,-.21),(side*.19*scale,hh+.28*scale,-.217)],[(0,1,2,3)],GOLD)
        else:
            maedate.add([(-.08,hh+.12,-.222),(.08,hh+.12,-.222),(.12,hh+.24,-.218),(0,hh+.36,-.21),(-.12,hh+.24,-.218)],[(0,1,2,3,4)],GOLD)
        maedate.obj(role+'_Maedate',hard,body)
        if heavy or role in ['R','D']:
            mask=Builder();mask.orb(0,head-.085,-.084,.13*scale,.078*scale,.09,IRON,10,4)
            mask.box(0,head-.07,-.177,.13,.02,.01,INK)
            mask.obj(role+'_Menpo',hard,body)
    cord.obj(role+'_HelmetCords',soft,body)

    for side in [-1,1]:
        pivot=(side*(.42 if heavy else .28),shoulder,0);arm=empty(role+('_ArmL' if side<0 else '_ArmR'),body,pivot)
        sleeve=Builder();plate=Builder();ties=Builder();hand=Builder()
        wrist=(side*(.48 if heavy else .32),belt-.015,-.07)
        sleeve.rod(pivot,(wrist[0],wrist[1]+.06,wrist[2]),.095 if not mage else .145,IVORY,8)
        if not mage:
            plate.rod((wrist[0],wrist[1]+.06,wrist[2]),(wrist[0],wrist[1]+.20,wrist[2]),.078,INK,8)
            for x in [-.04,0,.04]:plate.box(wrist[0]+x,wrist[1]+.15,wrist[2]-.075,.022,.18,.02,IRON)
            if not light:
                panel(plate,ties,side*(.47 if heavy else .32),shoulder-.08,-.08,.43 if heavy else .28,.39 if heavy else .25,5 if heavy else 4,side*-.35)
        hand.orb(*wrist,.073,.075,.070,SKIN,8,4)
        sleeve.obj(role+'_Sleeve'+str(side),soft if mage else team,arm,pivot)
        plate.obj(role+('_SodeL' if side<0 else '_SodeR'),hard,arm,pivot)
        ties.obj(role+'_ArmLacing'+str(side),team,arm,pivot);hand.obj(role+'_Hand'+str(side),soft,arm,pivot)
        if side==1 and role in ['P','L','G','R','D']:
            spear=Builder();top=2.48 if role=='L' else 1.92 if role in ['G','R','D'] else 1.72
            x=wrist[0]+.01;z=-.10
            spear.rod((x,.15+ride,z),(x,top+ride,z),.019,WOOD,7)
            spear.rod((x,top-.12+ride,z),(x,top+ride,z),.024,INK,7)
            spear.add([(x,top+.25+ride,z),(x-.037,top+ride,z),(x+.037,top+ride,z),(x,top+.05+ride,z-.033),(x,top+.05+ride,z+.033)],[(0,1,3),(0,3,2),(0,2,4),(0,4,1),(1,4,2,3)],(.58,.63,.62))
            spear.obj(role+'_Yari',hard,arm,pivot)
        elif side==1 and role in ['S','H','N']:
            sword=Builder();katana(sword,wrist[0]+.025,belt+.14,-.14,.98 if heavy else .70,heavy)
            sword.obj(role+'_Tachi',hard,arm,pivot)
        elif side==1 and role=='K':
            fan=Builder();fan.rod((.34,.72,-.14),(.34,1.18,-.14),.023,WOOD,7)
            fan.orb(.34,1.28,-.15,.20,.25,.026,INK,12,5)
            for a in range(10):
                t=math.tau*a/10;fan.orb(.34+.188*math.cos(t),1.28+.237*math.sin(t),-.177,.018,.018,.009,GOLD,6,3)
            crest(fan,.34,1.30,-.183,.12,GOLD);fan.obj('K_Gunbai',hard,arm,pivot)
        elif side==1 and mage:
            staff=Builder();paper=Builder();staff.rod((.34,.15,-.10),(.34,1.77,-.10),.022,WOOD,7)
            for side2 in [-1,1]:
                points=[(.34+side2*x,y,-.11) for x,y in [(0,1.76),(.15,1.69),(.085,1.58),(.21,1.49),(.14,1.39)]]
                for a,b in zip(points,points[1:]):paper.add([(a[0]-.03,a[1],a[2]),(a[0]+.03,a[1],a[2]),(b[0]+.03,b[1],b[2]),(b[0]-.03,b[1],b[2])],[(0,1,2,3)],IVORY)
            staff.obj('B_RitualStaff',soft,arm,pivot);paper.obj('B_ShikigamiPaper',soft,arm,pivot)
        elif side<0 and role=='A':
            bow=Builder();string=Builder()
            curve=[(.09,.22),(.02,.33),(-.10,.57),(-.15,.83),(-.16,1.16),(-.10,1.52),(.02,1.88),(.10,2.06)]
            pts=[(-.22+x,y,-.12+x*.5) for x,y in curve]
            for a,b in zip(pts,pts[1:]):bow.rod(a,b,.024,WOOD,7,.020)
            for y in [.76,.79,.82,.85,.88]:bow.ring(-.37,y,-.195,[(0,.029,.029),(.017,.029,.029)],INK,6)
            string.rod(pts[0],pts[-1],.009,IVORY,5)
            bow.obj('A_Bow',soft,arm,pivot);string.obj('A_Bowstring',soft,arm,pivot);root['weapon']='bow'

    for side in [-1,1]:
        pivot=(side*(.18 if heavy else .12),belt-.055,0);leg=empty(role+('_LegL' if side<0 else '_LegR'),root,pivot)
        trousers=Builder();armor=Builder();feet=Builder()
        if role in ['N','R','D']:
            knee=(side*(.43 if role=='D' else .40 if role=='R' else .34),1.17 if role=='D' else .85 if role=='R' else .64,-.19)
            boot=(side*(.48 if role=='D' else .44 if role=='R' else .38),.91 if role=='D' else .56 if role=='R' else .42,-.13)
            trousers.rod(pivot,knee,.12,IVORY,8);armor.rod(knee,boot,.08,INK,8)
            feet.box(boot[0],boot[1],boot[2]-.05,.16,.11,.25,WOOD)
        else:
            trousers.ring(pivot[0],.26,0,[(0,.092,.09),(.32*scale,.145 if not light else .115,.13)],IVORY,8)
            armor.ring(pivot[0],.12,0,[(0,.084,.08),(.25,.092,.085)],INK,8)
            for x in [-.045,0,.045]:armor.box(pivot[0]+x,.24,-.08,.025,.23,.026,IRON)
            feet.box(pivot[0],.035,-.055,.17,.05,.28,WOOD)
            feet.box(pivot[0],.075,-.065,.14,.06,.24,IVORY)
            for x in [-.035,.035]:feet.rod((pivot[0]+x,.103,-.16),(pivot[0],.12,-.025),.009,CORD,5)
        trousers.obj(role+'_Hakama'+str(side),soft if mage else team,leg,pivot)
        armor.obj(role+'_Suneate'+str(side),hard,leg,pivot);feet.obj(role+'_Waraji'+str(side),soft,leg,pivot)

    if mage:
        robe=Builder();robe.ring(0,.18,0,[(0,.30,.24),(.42,.24,.19),(.72,.23,.16)],IVORY,10)
        robe.obj('B_Kariginu',soft,body)
    if role in ['K','N','R','D']:
        cape=empty(role+'_Cape',body,(0,shoulder,.17));coat=Builder()
        coat.add([(-.25,shoulder,.19),(.25,shoulder,.19),(.35,belt-.27,.26),(-.35,belt-.27,.26)],[(0,1,2,3)],IVORY)
        for side in [-1,1]:coat.add([(side*.17,shoulder,-.12),(side*.27,shoulder-.12,-.17),(side*.30,belt-.24,-.19),(side*.17,belt-.24,-.20)],[(0,1,2,3)],IVORY)
        coat.obj(role+'_Jinbaori',team,cape,(0,shoulder,.17))
    if role in ['P','L','G','S']:
        pole=Builder();flag=Builder();x=-.065;z=.24
        pole.rod((x,belt,z),(x,1.83,z),.009,WOOD,5)
        pole.rod((x,1.82,z),(x+.22,1.82,z),.008,WOOD,5)
        flag.add([(x+.02,1.80,z),(x+.21,1.80,z),(x+.21,1.37,z),(x+.02,1.37,z)],[(0,1,2,3)],IVORY)
        crest(pole,x+.115,1.64,z-.015,.055,IVORY)
        pole.obj(role+'_SashimonoPole',soft,body);flag.obj(role+'_Sashimono',team,body)
    if role=='A':
        quiver=Builder();arrows=Builder()
        quiver.rod((-.13,.65,.22),(.13,1.10,.22),.075,WOOD,8,.085)
        for i in range(5):
            x=.10+i*.026;y=1.40+(i%2)*.05
            arrows.rod((x-.13,.96,.22),(x,y,.22),.008,WOOD,5)
            arrows.add([(x-.026,y-.02,.22),(x,y+.02,.22),(x+.026,y-.06,.22),(x,y-.10,.22)],[(0,1,2,3)],IVORY)
        quiver.obj('A_Quiver',soft,body);arrows.obj('A_Arrows',soft,body)
    if noble or role=='S':
        sidearm=Builder();katana(sidearm,-.26,belt-.06,.015,.51,sheathed=True);sidearm.obj(role+'_Wakizashi',hard,body)
    promotion=empty(role+'_Promotion',root);gold=Builder()
    gold.box(0,belt+.22*scale,-.276,.15,.037,.02,GOLD)
    crest(gold,0,belt+.125*scale,-.278,.066,GOLD)
    for side in [-1,1]:gold.box(side*(.41 if heavy else .26),shoulder+.015,-.11,.13,.025,.07,GOLD)
    gold.obj(role+'_AscendedMon',hard,promotion)
    if role=='N':horse(root,soft,hard,team)
    if role=='R':
        from warhorse import warhorse
        warhorse(root,soft,hard,team)
    if role=='D':
        from eastern_dragon import dragon
        dragon(root,soft,hard,team,promotion)
    return root
