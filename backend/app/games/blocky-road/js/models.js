// models.js - Voxel 3D model creation functions

// Helper: create mesh and set position (avoids Object.assign on read-only Three.js properties)
function _pm(geo, mat, ...p) { const m = new THREE.Mesh(geo, mat); m.position.set(...p); return m; }

const Models = {
    // Create player character - themed per map
    createPlayer: () => {
        const theme = themeManager.getTheme();
        const p = theme.models.player;
        const style = p.style || 'rabbit';

        switch (style) {
            case 'penguin': return Models._createPenguin(p);
            case 'lizard': return Models._createLizard(p);
            case 'robot': return Models._createRobot(p);
            case 'fox': return Models._createFox(p);
            case 'demon': return Models._createDemon(p);
            default: return Models._createRabbit(p);
        }
    },

    // ===== RABBIT (Classic) =====
    _createRabbit: (p) => {
        const group = new THREE.Group();
        const bodyGeometry = new THREE.BoxGeometry(0.6, 0.7, 0.6);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: p.bodyColor, flatShading: true });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.5; body.castShadow = true; body.receiveShadow = true;
        group.add(body);

        const headGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const headMaterial = new THREE.MeshLambertMaterial({ color: p.headColor, flatShading: true });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.1; head.castShadow = true; head.receiveShadow = true;
        group.add(head);

        // Ears
        const earGeo = new THREE.BoxGeometry(0.15, 0.6, 0.15);
        const earMat = new THREE.MeshLambertMaterial({ color: p.accentColor, flatShading: true });
        const lEar = new THREE.Mesh(earGeo, earMat); lEar.position.set(-0.22, 0.5, 0.08); lEar.rotation.z = -0.25; head.add(lEar);
        const rEar = new THREE.Mesh(earGeo, earMat); rEar.position.set(0.22, 0.5, 0.08); rEar.rotation.z = 0.25; head.add(rEar);

        // Eyes
        const eyeGeo = new THREE.BoxGeometry(0.16, 0.16, 0.12);
        const eyeMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
        head.add(_pm(eyeGeo, eyeMat, -0.18, 0.08, 0.38));
        head.add(_pm(eyeGeo, eyeMat, 0.18, 0.08, 0.38));
        const shGeo = new THREE.BoxGeometry(0.05, 0.05, 0.02);
        const shMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
        head.add(_pm(shGeo, shMat, -0.19, 0.13, 0.44));
        head.add(_pm(shGeo, shMat, 0.19, 0.13, 0.44));

        // Nose & mouth
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.09, 3), new THREE.MeshLambertMaterial({ color: p.noseColor }));
        nose.position.set(0, -0.02, 0.44); nose.rotation.x = Math.PI / 2; head.add(nose);
        const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.02), new THREE.MeshLambertMaterial({ color: 0x222222 }));
        mouth.position.set(0, -0.08, 0.44); head.add(mouth);

        // Tail
        const tail = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), new THREE.MeshLambertMaterial({ color: p.tailColor }));
        tail.position.set(0, 0.5, -0.32); group.add(tail);

        // Paws
        const pawGeo = new THREE.BoxGeometry(0.11, 0.15, 0.11);
        const pawMat = new THREE.MeshLambertMaterial({ color: p.pawColor });
        [[-0.15, 0.18, 0.18], [0.15, 0.18, 0.18], [-0.15, 0.18, -0.18], [0.15, 0.18, -0.18]].forEach(pos => {
            group.add(_pm(pawGeo, pawMat, ...pos));
        });

        group.userData.body = body; group.userData.head = head;
        return group;
    },

    // ===== PENGUIN (Christmas) =====
    _createPenguin: (p) => {
        const group = new THREE.Group();
        // Body (black, slightly wider)
        const bodyGeo = new THREE.BoxGeometry(0.7, 0.8, 0.6);
        const bodyMat = new THREE.MeshLambertMaterial({ color: p.bodyColor, flatShading: true });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.5; body.castShadow = true; body.receiveShadow = true;
        group.add(body);

        // White belly — child of body, pushed forward enough to avoid z-fighting
        const bellyGeo = new THREE.BoxGeometry(0.45, 0.55, 0.12);
        const bellyMat = new THREE.MeshLambertMaterial({ color: p.accentColor, flatShading: true,
            polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
        const belly = new THREE.Mesh(bellyGeo, bellyMat);
        belly.position.set(0, 0, 0.26); body.add(belly);

        // Head (black, round-ish)
        const headGeo = new THREE.BoxGeometry(0.72, 0.68, 0.68);
        const headMat = new THREE.MeshLambertMaterial({ color: p.headColor, flatShading: true });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.15; head.castShadow = true; head.receiveShadow = true;
        group.add(head);

        // White face cheeks — child of head, offset to avoid z-fighting
        const cheekMat = new THREE.MeshLambertMaterial({ color: p.accentColor, flatShading: true,
            polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
        const lCheek = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.12), cheekMat);
        lCheek.position.set(-0.18, -0.02, 0.3); head.add(lCheek);
        const rCheek = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.12), cheekMat);
        rCheek.position.set(0.18, -0.02, 0.3); head.add(rCheek);

        // Eyes (on white cheeks)
        const eyeGeo = new THREE.BoxGeometry(0.11, 0.11, 0.08);
        const eyeMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
        head.add(_pm(eyeGeo, eyeMat, -0.15, 0.06, 0.38));
        head.add(_pm(eyeGeo, eyeMat, 0.15, 0.06, 0.38));
        // Shine
        const shGeo = new THREE.BoxGeometry(0.04, 0.04, 0.02);
        const shMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
        head.add(_pm(shGeo, shMat, -0.16, 0.1, 0.43));
        head.add(_pm(shGeo, shMat, 0.16, 0.1, 0.43));

        // Orange beak (wider, more visible)
        const beakGeo = new THREE.BoxGeometry(0.16, 0.07, 0.18);
        const beakMat = new THREE.MeshLambertMaterial({ color: p.noseColor });
        const beak = new THREE.Mesh(beakGeo, beakMat);
        beak.position.set(0, -0.08, 0.42); head.add(beak);

        // Wings (flippers) — directly on body, angled down
        const wingGeo = new THREE.BoxGeometry(0.1, 0.45, 0.25);
        const wingMat = new THREE.MeshLambertMaterial({ color: p.bodyColor, flatShading: true });
        const lWing = new THREE.Mesh(wingGeo, wingMat);
        lWing.position.set(-0.38, 0, 0); lWing.rotation.z = 0.25; body.add(lWing);
        const rWing = new THREE.Mesh(wingGeo, wingMat);
        rWing.position.set(0.38, 0, 0); rWing.rotation.z = -0.25; body.add(rWing);

        // Orange feet (wider, flatter)
        const footGeo = new THREE.BoxGeometry(0.22, 0.06, 0.22);
        const footMat = new THREE.MeshLambertMaterial({ color: p.pawColor });
        group.add(_pm(footGeo, footMat, -0.15, 0.1, 0.12));
        group.add(_pm(footGeo, footMat, 0.15, 0.1, 0.12));

        // Santa hat
        const hatGeo = new THREE.ConeGeometry(0.28, 0.4, 4);
        const hatMat = new THREE.MeshLambertMaterial({ color: 0xCC0000 });
        const hat = new THREE.Mesh(hatGeo, hatMat);
        hat.position.set(0, 0.42, 0); hat.rotation.z = 0.15; head.add(hat);
        // Pom-pom
        const pompMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
        const pomp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), pompMat);
        pomp.position.set(0.07, 0.6, 0); head.add(pomp);
        // Hat brim (white fur strip)
        const brimGeo = new THREE.BoxGeometry(0.65, 0.07, 0.65);
        const brimMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
        const brim = new THREE.Mesh(brimGeo, brimMat);
        brim.position.set(0, 0.26, 0); head.add(brim);

        group.userData.body = body; group.userData.head = head;
        return group;
    },

    // ===== LIZARD (Desert) =====
    _createLizard: (p) => {
        const group = new THREE.Group();

        // Rounded body (gecko-shaped, plump and cute)
        const bodyGeo = new THREE.BoxGeometry(0.55, 0.5, 0.75);
        const bodyMat = new THREE.MeshLambertMaterial({ color: p.bodyColor, flatShading: true });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.42; body.castShadow = true; body.receiveShadow = true;
        group.add(body);

        // Lighter belly (child of body)
        const bellyGeo = new THREE.BoxGeometry(0.4, 0.12, 0.55);
        const bellyMat = new THREE.MeshLambertMaterial({ color: p.accentColor, flatShading: true,
            polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
        const belly = new THREE.Mesh(bellyGeo, bellyMat);
        belly.position.set(0, -0.2, 0.02); body.add(belly);

        // Spots on back (darker pattern — cute gecko dots)
        const spotMat = new THREE.MeshLambertMaterial({ color: 0x558B2F, flatShading: true,
            polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
        const spotGeo = new THREE.BoxGeometry(0.12, 0.06, 0.12);
        body.add(_pm(spotGeo, spotMat, -0.12, 0.22, 0.1));
        body.add(_pm(spotGeo, spotMat, 0.1, 0.22, -0.12));
        body.add(_pm(spotGeo, spotMat, 0.0, 0.22, 0.22));

        // Head (big, wider than body — gecko style)
        const headGeo = new THREE.BoxGeometry(0.7, 0.55, 0.6);
        const headMat = new THREE.MeshLambertMaterial({ color: p.headColor, flatShading: true });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 0.92; head.castShadow = true;
        group.add(head);

        // Big dome eyes (chameleon / gecko protruding eyes)
        const eyeDomeGeo = new THREE.SphereGeometry(0.14, 8, 8);
        const eyeDomeMat = new THREE.MeshLambertMaterial({ color: p.accentColor });
        const lEyeDome = new THREE.Mesh(eyeDomeGeo, eyeDomeMat);
        lEyeDome.position.set(-0.28, 0.18, 0.18); lEyeDome.scale.set(1, 0.85, 0.85); head.add(lEyeDome);
        const rEyeDome = new THREE.Mesh(eyeDomeGeo, eyeDomeMat);
        rEyeDome.position.set(0.28, 0.18, 0.18); rEyeDome.scale.set(1, 0.85, 0.85); head.add(rEyeDome);

        // Iris (big dark circle)
        const irisGeo = new THREE.SphereGeometry(0.08, 8, 8);
        const irisMat = new THREE.MeshLambertMaterial({ color: 0xFFEB3B });
        const lIris = new THREE.Mesh(irisGeo, irisMat);
        lIris.position.set(0.02, 0, 0.1); lEyeDome.add(lIris);
        const rIris = new THREE.Mesh(irisGeo, irisMat);
        rIris.position.set(-0.02, 0, 0.1); rEyeDome.add(rIris);

        // Slit pupils
        const pupilGeo = new THREE.BoxGeometry(0.025, 0.1, 0.03);
        const pupilMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
        lIris.add(_pm(pupilGeo, pupilMat, 0, 0, 0.06));
        rIris.add(_pm(pupilGeo, pupilMat, 0, 0, 0.06));

        // Wide smile / mouth line
        const mouthGeo = new THREE.BoxGeometry(0.35, 0.03, 0.08);
        const mouthMat = new THREE.MeshLambertMaterial({ color: 0x33691E });
        head.add(_pm(mouthGeo, mouthMat, 0, -0.12, 0.28));

        // Nostril dots
        const nGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
        const nMat = new THREE.MeshLambertMaterial({ color: 0x33691E });
        head.add(_pm(nGeo, nMat, -0.08, 0.0, 0.32));
        head.add(_pm(nGeo, nMat, 0.08, 0.0, 0.32));

        // Small crest / dorsal ridge (cute spiky ridge along head and back)
        const crestMat = new THREE.MeshLambertMaterial({ color: 0xAED581 });
        const cGeo1 = new THREE.BoxGeometry(0.06, 0.12, 0.06);
        const cGeo2 = new THREE.BoxGeometry(0.05, 0.09, 0.05);
        head.add(_pm(cGeo1, crestMat, 0, 0.32, -0.05));
        head.add(_pm(cGeo1, crestMat, 0, 0.3, -0.18));
        body.add(_pm(cGeo2, crestMat, 0, 0.28, 0.2));
        body.add(_pm(cGeo2, crestMat, 0, 0.28, 0.05));
        body.add(_pm(cGeo2, crestMat, 0, 0.28, -0.1));
        body.add(_pm(cGeo2, crestMat, 0, 0.28, -0.25));

        // Curled tail (multiple segments curving upward)
        const tMat = new THREE.MeshLambertMaterial({ color: p.tailColor });
        const t1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.35), tMat);
        t1.position.set(0, 0.38, -0.52); group.add(t1);
        const t2 = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.1, 0.25), tMat);
        t2.position.set(0, 0.42, -0.8); t2.rotation.x = -0.3; group.add(t2);
        const t3 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.18), tMat);
        t3.position.set(0, 0.52, -0.98); t3.rotation.x = -0.6; group.add(t3);
        const t4 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.12), tMat);
        t4.position.set(0, 0.66, -1.04); t4.rotation.x = -1.1; group.add(t4);

        // Legs with cute gecko toes (splayed with wider feet)
        const legMat = new THREE.MeshLambertMaterial({ color: p.pawColor });
        const legGeo = new THREE.BoxGeometry(0.1, 0.22, 0.12);
        const footGeo = new THREE.BoxGeometry(0.2, 0.05, 0.22);
        // Front-left
        const fl = _pm(legGeo, legMat, -0.3, 0.2, 0.22);
        group.add(fl); group.add(_pm(footGeo, legMat, -0.32, 0.08, 0.28));
        // Front-right
        group.add(_pm(legGeo, legMat, 0.3, 0.2, 0.22));
        group.add(_pm(footGeo, legMat, 0.32, 0.08, 0.28));
        // Back-left
        group.add(_pm(legGeo, legMat, -0.3, 0.2, -0.22));
        group.add(_pm(footGeo, legMat, -0.32, 0.08, -0.28));
        // Back-right
        group.add(_pm(legGeo, legMat, 0.3, 0.2, -0.22));
        group.add(_pm(footGeo, legMat, 0.32, 0.08, -0.28));

        // Tiny toe bumps on front feet
        const toeGeo = new THREE.BoxGeometry(0.04, 0.04, 0.05);
        const toeMat = new THREE.MeshLambertMaterial({ color: p.accentColor });
        [-0.32, 0.32].forEach(x => {
            const sign = x < 0 ? -1 : 1;
            group.add(_pm(toeGeo, toeMat, x - sign * 0.07, 0.07, 0.4));
            group.add(_pm(toeGeo, toeMat, x, 0.07, 0.42));
            group.add(_pm(toeGeo, toeMat, x + sign * 0.07, 0.07, 0.4));
        });

        group.userData.body = body; group.userData.head = head;
        return group;
    },

    // ===== ROBOT (Neon) =====
    _createRobot: (p) => {
        const group = new THREE.Group();
        // Angular body
        const bodyGeo = new THREE.BoxGeometry(0.7, 0.7, 0.55);
        const bodyMat = new THREE.MeshLambertMaterial({ color: p.bodyColor, flatShading: true });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.5; body.castShadow = true; body.receiveShadow = true;
        group.add(body);

        // Chest panel (glowing accent)
        const panelGeo = new THREE.BoxGeometry(0.4, 0.35, 0.05);
        const panelMat = new THREE.MeshLambertMaterial({ color: p.accentColor, emissive: p.accentColor, emissiveIntensity: 0.4 });
        const panel = new THREE.Mesh(panelGeo, panelMat);
        panel.position.set(0, 0.5, 0.3); group.add(panel);

        // Head (boxy)
        const headGeo = new THREE.BoxGeometry(0.65, 0.6, 0.6);
        const headMat = new THREE.MeshLambertMaterial({ color: p.headColor, flatShading: true });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.1; head.castShadow = true;
        group.add(head);

        // Visor (glowing stripe)
        const visorGeo = new THREE.BoxGeometry(0.55, 0.15, 0.1);
        const visorMat = new THREE.MeshLambertMaterial({ color: p.accentColor, emissive: p.accentColor, emissiveIntensity: 0.6 });
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, 0.05, 0.3); head.add(visor);

        // Antenna
        const antGeo = new THREE.BoxGeometry(0.06, 0.35, 0.06);
        const antMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
        const ant = new THREE.Mesh(antGeo, antMat);
        ant.position.set(0, 0.45, 0); head.add(ant);
        const tipGeo = new THREE.SphereGeometry(0.06, 6, 6);
        const tipMat = new THREE.MeshLambertMaterial({ color: p.accentColor, emissive: p.accentColor, emissiveIntensity: 0.8 });
        const tip = new THREE.Mesh(tipGeo, tipMat);
        tip.position.set(0, 0.65, 0); head.add(tip);

        // Arms (blocky)
        const armGeo = new THREE.BoxGeometry(0.15, 0.55, 0.2);
        const armMat = new THREE.MeshLambertMaterial({ color: p.pawColor });
        const lArm = new THREE.Mesh(armGeo, armMat); lArm.position.set(-0.45, 0.45, 0); group.add(lArm);
        const rArm = new THREE.Mesh(armGeo, armMat); rArm.position.set(0.45, 0.45, 0); group.add(rArm);

        // Legs (blocky)
        const legGeo = new THREE.BoxGeometry(0.2, 0.3, 0.22);
        const legMat = new THREE.MeshLambertMaterial({ color: p.pawColor });
        group.add(_pm(legGeo, legMat, -0.18, 0.12, 0));
        group.add(_pm(legGeo, legMat, 0.18, 0.12, 0));

        // Glowing lines on body
        const lineGeo = new THREE.BoxGeometry(0.72, 0.03, 0.03);
        const lineMat = new THREE.MeshLambertMaterial({ color: p.accentColor, emissive: p.accentColor, emissiveIntensity: 0.3 });
        group.add(_pm(lineGeo, lineMat, 0, 0.3, 0.28));
        group.add(_pm(lineGeo, lineMat, 0, 0.7, 0.28));

        group.userData.body = body; group.userData.head = head;
        return group;
    },

    // ===== FOX (Sakura) =====
    _createFox: (p) => {
        const group = new THREE.Group();
        // Body
        const bodyGeo = new THREE.BoxGeometry(0.6, 0.65, 0.7);
        const bodyMat = new THREE.MeshLambertMaterial({ color: p.bodyColor, flatShading: true });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.5; body.castShadow = true; body.receiveShadow = true;
        group.add(body);

        // White chest
        const chestGeo = new THREE.BoxGeometry(0.4, 0.45, 0.1);
        const chestMat = new THREE.MeshLambertMaterial({ color: p.accentColor, flatShading: true });
        const chest = new THREE.Mesh(chestGeo, chestMat);
        chest.position.set(0, 0.48, 0.35); group.add(chest);

        // Head (triangular feel)
        const headGeo = new THREE.BoxGeometry(0.75, 0.65, 0.7);
        const headMat = new THREE.MeshLambertMaterial({ color: p.headColor, flatShading: true });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.1; head.castShadow = true;
        group.add(head);

        // White snout
        const snoutGeo = new THREE.BoxGeometry(0.35, 0.25, 0.2);
        const snoutMat = new THREE.MeshLambertMaterial({ color: p.accentColor });
        const snout = new THREE.Mesh(snoutGeo, snoutMat);
        snout.position.set(0, -0.1, 0.35); head.add(snout);

        // Pointy ears (triangular)
        const earGeo = new THREE.ConeGeometry(0.15, 0.35, 4);
        const earMat = new THREE.MeshLambertMaterial({ color: p.headColor, flatShading: true });
        const lEar = new THREE.Mesh(earGeo, earMat); lEar.position.set(-0.25, 0.45, 0.05); head.add(lEar);
        const rEar = new THREE.Mesh(earGeo, earMat); rEar.position.set(0.25, 0.45, 0.05); head.add(rEar);
        // Inner ear
        const inEarGeo = new THREE.ConeGeometry(0.08, 0.2, 4);
        const inEarMat = new THREE.MeshLambertMaterial({ color: p.accentColor });
        const lIn = new THREE.Mesh(inEarGeo, inEarMat); lIn.position.set(-0.25, 0.42, 0.08); head.add(lIn);
        const rIn = new THREE.Mesh(inEarGeo, inEarMat); rIn.position.set(0.25, 0.42, 0.08); head.add(rIn);

        // Eyes
        const eyeGeo = new THREE.BoxGeometry(0.14, 0.12, 0.1);
        const eyeMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
        head.add(_pm(eyeGeo, eyeMat, -0.18, 0.05, 0.35));
        head.add(_pm(eyeGeo, eyeMat, 0.18, 0.05, 0.35));
        const shGeo = new THREE.BoxGeometry(0.04, 0.04, 0.02);
        const shMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
        head.add(_pm(shGeo, shMat, -0.19, 0.09, 0.41));
        head.add(_pm(shGeo, shMat, 0.19, 0.09, 0.41));

        // Black nose
        const noseGeo = new THREE.BoxGeometry(0.1, 0.08, 0.08);
        const noseMat = new THREE.MeshLambertMaterial({ color: p.noseColor });
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.position.set(0, -0.12, 0.42); head.add(nose);

        // Big fluffy tail
        const tailGeo = new THREE.BoxGeometry(0.35, 0.4, 0.7);
        const tailMat = new THREE.MeshLambertMaterial({ color: p.tailColor, flatShading: true });
        const tail = new THREE.Mesh(tailGeo, tailMat);
        tail.position.set(0, 0.6, -0.55); tail.rotation.x = -0.3; group.add(tail);
        // White tail tip
        const tipGeo = new THREE.BoxGeometry(0.3, 0.3, 0.2);
        const tipMat = new THREE.MeshLambertMaterial({ color: p.accentColor });
        const tailTip = new THREE.Mesh(tipGeo, tipMat);
        tailTip.position.set(0, 0.7, -0.8); group.add(tailTip);

        // Paws (dark)
        const pawGeo = new THREE.BoxGeometry(0.13, 0.15, 0.13);
        const pawMat = new THREE.MeshLambertMaterial({ color: p.pawColor });
        [[-0.18, 0.15, 0.2], [0.18, 0.15, 0.2], [-0.18, 0.15, -0.2], [0.18, 0.15, -0.2]].forEach(pos => {
            group.add(_pm(pawGeo, pawMat, ...pos));
        });

        group.userData.body = body; group.userData.head = head;
        return group;
    },

    // ===== DEMON (Lava) =====
    _createDemon: (p) => {
        const group = new THREE.Group();
        // Body
        const bodyGeo = new THREE.BoxGeometry(0.65, 0.75, 0.6);
        const bodyMat = new THREE.MeshLambertMaterial({ color: p.bodyColor, flatShading: true });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.5; body.castShadow = true; body.receiveShadow = true;
        group.add(body);

        // Chest markings (glowing)
        const markGeo = new THREE.BoxGeometry(0.3, 0.15, 0.05);
        const markMat = new THREE.MeshLambertMaterial({ color: p.accentColor, emissive: p.accentColor, emissiveIntensity: 0.5 });
        group.add(_pm(markGeo, markMat, 0, 0.55, 0.32));
        group.add(_pm(markGeo, markMat, 0, 0.4, 0.32));

        // Head
        const headGeo = new THREE.BoxGeometry(0.75, 0.7, 0.7);
        const headMat = new THREE.MeshLambertMaterial({ color: p.headColor, flatShading: true });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.1; head.castShadow = true;
        group.add(head);

        // Horns
        const hornGeo = new THREE.ConeGeometry(0.08, 0.4, 4);
        const hornMat = new THREE.MeshLambertMaterial({ color: 0x222222, flatShading: true });
        const lHorn = new THREE.Mesh(hornGeo, hornMat); lHorn.position.set(-0.25, 0.45, 0); lHorn.rotation.z = 0.3; head.add(lHorn);
        const rHorn = new THREE.Mesh(hornGeo, hornMat); rHorn.position.set(0.25, 0.45, 0); rHorn.rotation.z = -0.3; head.add(rHorn);

        // Glowing eyes
        const eyeGeo = new THREE.BoxGeometry(0.16, 0.1, 0.1);
        const eyeMat = new THREE.MeshLambertMaterial({ color: p.accentColor, emissive: p.accentColor, emissiveIntensity: 0.8 });
        head.add(_pm(eyeGeo, eyeMat, -0.18, 0.08, 0.36));
        head.add(_pm(eyeGeo, eyeMat, 0.18, 0.08, 0.36));

        // Fanged mouth
        const mouthGeo = new THREE.BoxGeometry(0.3, 0.06, 0.08);
        const mouthMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
        head.add(_pm(mouthGeo, mouthMat, 0, -0.15, 0.35));
        const fangGeo = new THREE.ConeGeometry(0.03, 0.1, 3);
        const fangMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
        const lFang = new THREE.Mesh(fangGeo, fangMat); lFang.position.set(-0.08, -0.22, 0.35); lFang.rotation.x = Math.PI; head.add(lFang);
        const rFang = new THREE.Mesh(fangGeo, fangMat); rFang.position.set(0.08, -0.22, 0.35); rFang.rotation.x = Math.PI; head.add(rFang);

        // Devil tail — curved upward in 4 segments with spade tip
        const tMat = new THREE.MeshLambertMaterial({ color: p.tailColor });
        // Segment 1: thick base, straight back
        const ts1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.35), tMat);
        ts1.position.set(0, 0.42, -0.48); group.add(ts1);
        // Segment 2: curving down
        const ts2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.28), tMat);
        ts2.position.set(0, 0.35, -0.72); ts2.rotation.x = 0.25; group.add(ts2);
        // Segment 3: curving up
        const ts3 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.25), tMat);
        ts3.position.set(0, 0.3, -0.92); ts3.rotation.x = -0.4; group.add(ts3);
        // Segment 4: whip end curving up sharply
        const ts4 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.2), tMat);
        ts4.position.set(0, 0.36, -1.08); ts4.rotation.x = -0.8; group.add(ts4);
        // Spade / arrowhead tip (classic devil tail shape)
        const tipMat = new THREE.MeshLambertMaterial({ color: p.accentColor, emissive: p.accentColor, emissiveIntensity: 0.3 });
        // Two rotated diamond shapes to form a spade
        const spadeGeo = new THREE.BoxGeometry(0.16, 0.16, 0.06);
        const spade1 = new THREE.Mesh(spadeGeo, tipMat);
        spade1.position.set(0, 0.45, -1.18); spade1.rotation.x = -0.8; spade1.rotation.z = Math.PI / 4; group.add(spade1);
        const spade2 = new THREE.Mesh(spadeGeo, tipMat);
        spade2.position.set(0, 0.45, -1.18); spade2.rotation.x = -0.8; group.add(spade2);

        // Clawed feet
        const pawGeo = new THREE.BoxGeometry(0.18, 0.15, 0.18);
        const pawMat = new THREE.MeshLambertMaterial({ color: p.pawColor });
        [[-0.18, 0.12, 0.15], [0.18, 0.12, 0.15], [-0.18, 0.12, -0.15], [0.18, 0.12, -0.15]].forEach(pos => {
            group.add(_pm(pawGeo, pawMat, ...pos));
        });

        group.userData.body = body; group.userData.head = head;
        return group;
    },
    
    // Create car - Cute Crossy Road style (themed colors)
    createCar: (color = 0xFF4444) => {
        const theme = themeManager.getTheme();
        const palette = theme.models.vehicleColors;
        color = palette[Math.floor(Math.random() * palette.length)];
        const group = new THREE.Group();
        
        // Main body using pooled geometry - POOLED (no fade-out anymore)
        const bodyGeometry = GeometryPool.getBoxGeometry(0.9, 0.5, 1.6);
        const bodyMaterial = MaterialPool.getMaterial(color, { poolable: true });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.3;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);
        
        // Windshield/parabrezza using pooled geometry
        const cabinGeometry = GeometryPool.getBoxGeometry(0.75, 0.4, 0.7);
        const cabinMaterial = MaterialPool.getMaterial(0xB0E0FF, {
            poolable: true,
            transparent: true,
            opacity: 0.85
        });
        const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
        cabin.position.set(0, 0.65, 0.1);
        cabin.castShadow = true;
        group.add(cabin);
        
        // Front grill/smile using pooled geometry
        const grillGeometry = GeometryPool.getBoxGeometry(0.5, 0.15, 0.1);
        const grillMaterial = MaterialPool.getMaterial(0x222222, { poolable: true });
        const grill = new THREE.Mesh(grillGeometry, grillMaterial);
        grill.position.set(0, 0.25, 0.85);
        group.add(grill);
        
        // Front bumper using pooled geometry
        const bumperGeometry = GeometryPool.getBoxGeometry(1.0, 0.15, 0.2);
        const bumperColor = new THREE.Color(color).multiplyScalar(0.8).getHex();
        const bumperMaterial = MaterialPool.getMaterial(bumperColor, { poolable: true });
        const bumper = new THREE.Mesh(bumperGeometry, bumperMaterial);
        bumper.position.set(0, 0.15, 0.9);
        group.add(bumper);
        
        // Wheels with rims using pooled geometry
        const wheelGeometry = GeometryPool.getBoxGeometry(0.25, 0.35, 0.35);
        const wheelMaterial = MaterialPool.getMaterial(0x1a1a1a, { poolable: true });
        
        const rimGeometry = GeometryPool.getBoxGeometry(0.28, 0.2, 0.2);
        const rimMaterial = MaterialPool.getMaterial(0x666666, { poolable: true });
        
        const wheels = [
            { x: -0.40, z: 0.6 },
            { x: 0.40, z: 0.6 },
            { x: -0.40, z: -0.6 },
            { x: 0.40, z: -0.6 }
        ];
        
        wheels.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.position.set(pos.x, 0.12, pos.z);
            wheel.castShadow = true;
            wheel.userData.isWheel = true;
            group.add(wheel);
            
            const rim = new THREE.Mesh(rimGeometry, rimMaterial);
            rim.position.set(pos.x, 0.12, pos.z);
            group.add(rim);
        });
        
        return group;
    },
    
    // Create truck - Detailed blocky style (themed colors)
    createTruck: (color = 0x3366FF) => {
        const theme = themeManager.getTheme();
        const palette = theme.models.vehicleColors;
        color = palette[Math.floor(Math.random() * palette.length)];
        const group = new THREE.Group();
        
        // Truck cab (front part) - POOLED (no fade-out anymore)
        const cabGeometry = GeometryPool.getBoxGeometry(0.95, 0.7, 0.9);
        const cabMaterial = MaterialPool.getMaterial(color, { poolable: true });
        const cab = new THREE.Mesh(cabGeometry, cabMaterial);
        cab.position.set(0, 0.45, 0.6);
        cab.castShadow = true;
        cab.receiveShadow = true;
        group.add(cab);
        
        // Cargo area (back part)
        const cargoGeometry = GeometryPool.getBoxGeometry(0.95, 0.8, 1.2);
        const cargoColor = new THREE.Color(color).multiplyScalar(0.85).getHex();
        const cargoMaterial = MaterialPool.getMaterial(cargoColor, { poolable: true });
        const cargo = new THREE.Mesh(cargoGeometry, cargoMaterial);
        cargo.position.set(0, 0.5, -0.5);
        cargo.castShadow = true;
        group.add(cargo);
        
        // Windshield (transparent)
        const windshieldGeometry = GeometryPool.getBoxGeometry(0.8, 0.45, 0.15);
        const windshieldMaterial = MaterialPool.getMaterial(0x87CEEB, { 
            poolable: true,
            transparent: true,
            opacity: 0.6
        });
        const windshield = new THREE.Mesh(windshieldGeometry, windshieldMaterial);
        windshield.position.set(0, 0.6, 1.0);
        group.add(windshield);
        
        // Headlights
        const lightGeometry = GeometryPool.getBoxGeometry(0.2, 0.15, 0.1);
        const lightMaterial = MaterialPool.getMaterial(0xFFFF99, { poolable: true });
        
        const leftLight = new THREE.Mesh(lightGeometry, lightMaterial);
        leftLight.position.set(-0.3, 0.3, 1.1);
        group.add(leftLight);
        
        const rightLight = new THREE.Mesh(lightGeometry, lightMaterial);
        rightLight.position.set(0.3, 0.3, 1.1);
        group.add(rightLight);
        
        // Door line detail on cab
        const doorGeometry = GeometryPool.getBoxGeometry(0.05, 0.5, 0.6);
        const doorColor = new THREE.Color(color).multiplyScalar(0.6).getHex();
        const doorMaterial = MaterialPool.getMaterial(doorColor, { poolable: true });
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0.5, 0.45, 0.6);
        group.add(door);
        
        // Wheels with rims
        const wheelGeometry = GeometryPool.getBoxGeometry(0.28, 0.4, 0.4);
        const wheelMaterial = MaterialPool.getMaterial(0x1a1a1a, { poolable: true });
        
        const rimGeometry = GeometryPool.getBoxGeometry(0.3, 0.25, 0.25);
        const rimMaterial = MaterialPool.getMaterial(0x666666, { poolable: true });
        
        // Front fenders
        const fenderGeometry = GeometryPool.getBoxGeometry(0.15, 0.25, 0.5);
        const fenderColor = new THREE.Color(color).multiplyScalar(0.7).getHex();
        const fenderMaterial = MaterialPool.getMaterial(fenderColor, { poolable: true });
        
        const wheels = [
            { x: -0.40, z: 0.7 },
            { x: 0.40, z: 0.7 },
            { x: -0.40, z: -0.8 },
            { x: 0.40, z: -0.8 }
        ];
        
        wheels.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.position.set(pos.x, 0.15, pos.z);
            wheel.castShadow = true;
            wheel.userData.isWheel = true;
            group.add(wheel);
            
            const rim = new THREE.Mesh(rimGeometry, rimMaterial);
            rim.position.set(pos.x, 0.15, pos.z);
            group.add(rim);
            
            // Fenders above front wheels
            if (pos.z > 0) {
                const fender = new THREE.Mesh(fenderGeometry, fenderMaterial);
                fender.position.set(pos.x, 0.35, pos.z);
                group.add(fender);
            }
        });
        
        return group;
    },
    
    // Create motorcycle - Simple small blocky bike (themed colors)
    createMotorcycle: (color = 0x1E88E5) => {
        const theme = themeManager.getTheme();
        const palette = theme.models.vehicleColors;
        color = palette[Math.floor(Math.random() * palette.length)];
        const group = new THREE.Group();

        // Corpo principale - POOLED (no fade-out anymore)
        const bodyGeometry = GeometryPool.getBoxGeometry(0.5, 0.3, 1.0);
        const bodyMaterial = MaterialPool.getMaterial(color, { poolable: true });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.32;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Sella nera
        const seatGeometry = GeometryPool.getBoxGeometry(0.45, 0.12, 0.35);
        const seatMaterial = MaterialPool.getMaterial(0x222222, { poolable: true });
        const seat = new THREE.Mesh(seatGeometry, seatMaterial);
        seat.position.set(0, 0.43, -0.15);
        group.add(seat);

        // Parabrezza piccolo trasparente
        const windshieldGeometry = GeometryPool.getBoxGeometry(0.32, 0.12, 0.05);
        const windshieldMaterial = MaterialPool.getMaterial(0xB0E0FF, { poolable: true, transparent: true, opacity: 0.7 });
        const windshield = new THREE.Mesh(windshieldGeometry, windshieldMaterial);
        windshield.position.set(0, 0.48, 0.38);
        group.add(windshield);

        // Manubrio
        const handleGeometry = GeometryPool.getBoxGeometry(0.6, 0.07, 0.07);
        const handleMaterial = MaterialPool.getMaterial(0x333333, { poolable: true });
        const handles = new THREE.Mesh(handleGeometry, handleMaterial);
        handles.position.set(0, 0.52, 0.45);
        group.add(handles);

        // Fari anteriori
        const headlightGeometry = GeometryPool.getBoxGeometry(0.12, 0.08, 0.08);
        const headlightMaterial = MaterialPool.getMaterial(0xFFFFAA, { poolable: true });
        const headlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        headlight.position.set(0, 0.38, 0.52);
        group.add(headlight);

        // Fari posteriori
        const taillightGeometry = GeometryPool.getBoxGeometry(0.10, 0.06, 0.06);
        const taillightMaterial = MaterialPool.getMaterial(0xFF2222, { poolable: true });
        const taillight = new THREE.Mesh(taillightGeometry, taillightMaterial);
        taillight.position.set(0, 0.38, -0.52);
        group.add(taillight);

        // Ruote grandi
        const wheelGeometry = GeometryPool.getCylinderGeometry(0.14, 0.14, 0.08, 16);
        const wheelMaterial = MaterialPool.getMaterial(0x1a1a1a, { poolable: true });
        const frontWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        frontWheel.position.set(0, 0.13, 0.48);
        frontWheel.rotation.z = Math.PI / 2;
        frontWheel.castShadow = true;
        frontWheel.userData.isWheel = true;
        group.add(frontWheel);

        const backWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        backWheel.position.set(0, 0.13, -0.48);
        backWheel.rotation.z = Math.PI / 2;
        backWheel.castShadow = true;
        backWheel.userData.isWheel = true;
        group.add(backWheel);

        return group;
    },
    
    // Create tree - themed per map
    createTree: () => {
        const theme = themeManager.getTheme();
        const style = theme.models.tree.style || 'leafy';
        switch (style) {
            case 'pine': return Models._createPineTree(theme);
            case 'cactus': return Models._createCactus(theme);
            case 'neon_pole': return Models._createNeonPole(theme);
            case 'cherry': return Models._createCherryTree(theme);
            case 'dead': return Models._createDeadTree(theme);
            default: return Models._createLeafyTree(theme);
        }
    },

    // Leafy tree (Classic) — 3-layer box foliage
    _createLeafyTree: (theme) => {
        const group = new THREE.Group();
        const trunkGeo = GeometryPool.getBoxGeometry(0.3, 0.8, 0.3);
        const trunkMat = MaterialPool.getMaterial(theme.decorations.trunkColor);
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 0.5; trunk.castShadow = true; trunk.receiveShadow = true;
        group.add(trunk);
        const fMat = MaterialPool.getMaterial(theme.decorations.foliageColor);
        [[1.0, 0.4, 1.0, 1.0], [0.8, 0.4, 0.8, 1.4], [0.5, 0.3, 0.5, 1.75]].forEach(([w, h, d, y]) => {
            const m = new THREE.Mesh(GeometryPool.getBoxGeometry(w, h, d), fMat);
            m.position.y = y; m.castShadow = true; group.add(m);
        });
        return group;
    },

    // Pine tree (Christmas) — cone layers with snow caps
    _createPineTree: (theme) => {
        const group = new THREE.Group();
        // Brown trunk
        const trunkGeo = GeometryPool.getBoxGeometry(0.25, 0.6, 0.25);
        const trunkMat = MaterialPool.getMaterial(theme.decorations.trunkColor);
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 0.4; trunk.castShadow = true; group.add(trunk);
        // 3 cone layers (bottom=wide, top=narrow)
        const fMat = MaterialPool.getMaterial(theme.decorations.foliageColor);
        const snowMat = MaterialPool.getMaterial(0xF0F8FF);
        const layers = [[0.55, 0.5, 0.75], [0.45, 0.45, 1.15], [0.3, 0.4, 1.5]];
        layers.forEach(([r, h, y]) => {
            const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 4), fMat);
            cone.position.y = y; cone.rotation.y = Math.PI / 4; cone.castShadow = true; group.add(cone);
            // Snow cap on top of each layer
            const snow = new THREE.Mesh(new THREE.ConeGeometry(r * 0.6, h * 0.25, 4), snowMat);
            snow.position.y = y + h * 0.3; snow.rotation.y = Math.PI / 4; group.add(snow);
        });
        // Star/top
        const starGeo = GeometryPool.getBoxGeometry(0.12, 0.12, 0.12);
        const starMat = MaterialPool.getMaterial(0xFFD700);
        const star = new THREE.Mesh(starGeo, starMat);
        star.position.y = 1.85; star.rotation.y = Math.PI / 4; group.add(star);
        return group;
    },

    // Cactus (Desert) — tall column with arms
    _createCactus: (theme) => {
        const group = new THREE.Group();
        const cMat = MaterialPool.getMaterial(theme.decorations.foliageColor);
        // Main trunk (tall, narrow)
        const trunkGeo = GeometryPool.getBoxGeometry(0.3, 1.4, 0.3);
        const trunk = new THREE.Mesh(trunkGeo, cMat);
        trunk.position.y = 0.8; trunk.castShadow = true; group.add(trunk);
        // Left arm
        const armHGeo = GeometryPool.getBoxGeometry(0.4, 0.2, 0.22);
        const armH = new THREE.Mesh(armHGeo, cMat);
        armH.position.set(-0.35, 0.9, 0); group.add(armH);
        const armVGeo = GeometryPool.getBoxGeometry(0.2, 0.5, 0.22);
        const armV = new THREE.Mesh(armVGeo, cMat);
        armV.position.set(-0.55, 1.15, 0); group.add(armV);
        // Right arm (higher)
        const armH2 = new THREE.Mesh(armHGeo, cMat);
        armH2.position.set(0.35, 1.15, 0); group.add(armH2);
        const armV2 = new THREE.Mesh(armVGeo, cMat);
        armV2.position.set(0.55, 1.4, 0); group.add(armV2);
        // Flower on top
        const flGeo = GeometryPool.getBoxGeometry(0.15, 0.12, 0.15);
        const flMat = MaterialPool.getMaterial(0xFF6B9D);
        const fl = new THREE.Mesh(flGeo, flMat);
        fl.position.y = 1.55; group.add(fl);
        return group;
    },

    // Neon pole (Neon City) — thin metallic pole with glowing cube
    _createNeonPole: (theme) => {
        const group = new THREE.Group();
        // Metal pole
        const poleGeo = GeometryPool.getBoxGeometry(0.12, 1.6, 0.12);
        const poleMat = MaterialPool.getMaterial(0x444444);
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 0.8; pole.castShadow = true; group.add(pole);
        // Glowing geometric top (random: cube, diamond, or ring)
        const glowColor = theme.decorations.foliageColor;
        const glowMat = new THREE.MeshLambertMaterial({ color: glowColor, emissive: glowColor, emissiveIntensity: 0.6 });
        const shapes = ['cube', 'diamond', 'ring'];
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        if (shape === 'cube') {
            const g = GeometryPool.getBoxGeometry(0.35, 0.35, 0.35);
            const m = new THREE.Mesh(g, glowMat);
            m.position.y = 1.75; m.rotation.y = Math.PI / 4; group.add(m);
        } else if (shape === 'diamond') {
            const g = GeometryPool.getBoxGeometry(0.3, 0.4, 0.3);
            const m = new THREE.Mesh(g, glowMat);
            m.position.y = 1.75; m.rotation.y = Math.PI / 4; m.rotation.z = Math.PI / 4; group.add(m);
        } else {
            const g = new THREE.TorusGeometry(0.2, 0.06, 4, 4);
            const m = new THREE.Mesh(g, glowMat);
            m.position.y = 1.75; group.add(m);
        }
        // Accent line on pole
        const lineGeo = GeometryPool.getBoxGeometry(0.14, 0.04, 0.14);
        const lineMat = new THREE.MeshLambertMaterial({ color: glowColor, emissive: glowColor, emissiveIntensity: 0.3 });
        for (let y = 0.4; y < 1.5; y += 0.4) {
            const l = new THREE.Mesh(lineGeo, lineMat);
            l.position.y = y; group.add(l);
        }
        return group;
    },

    // Cherry blossom tree (Sakura) — wide pink canopy
    _createCherryTree: (theme) => {
        const group = new THREE.Group();
        // Dark trunk
        const trunkGeo = GeometryPool.getBoxGeometry(0.25, 0.9, 0.25);
        const trunkMat = MaterialPool.getMaterial(theme.decorations.trunkColor);
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 0.5; trunk.castShadow = true; group.add(trunk);
        // Wide canopy (pink foliage) — rounded shape with multiple boxes
        const fMat = MaterialPool.getMaterial(theme.decorations.foliageColor);
        [[1.1, 0.35, 1.1, 1.05], [1.2, 0.3, 1.2, 1.35], [0.9, 0.25, 0.9, 1.6], [0.5, 0.2, 0.5, 1.78]].forEach(([w, h, d, y]) => {
            const m = new THREE.Mesh(GeometryPool.getBoxGeometry(w, h, d), fMat);
            m.position.y = y; m.castShadow = true; group.add(m);
        });
        // Falling petals (small pink cubes scattered below)
        const petalMat = MaterialPool.getMaterial(0xFFB7C5);
        for (let i = 0; i < 3; i++) {
            const pg = GeometryPool.getBoxGeometry(0.06, 0.06, 0.06);
            const petal = new THREE.Mesh(pg, petalMat);
            petal.position.set((Math.random() - 0.5) * 0.8, 0.3 + Math.random() * 0.5, (Math.random() - 0.5) * 0.8);
            petal.rotation.set(Math.random(), Math.random(), Math.random());
            group.add(petal);
        }
        return group;
    },

    // Dead tree (Lava) — bare dark trunk, ember glow
    _createDeadTree: (theme) => {
        const group = new THREE.Group();
        // Dark charred trunk
        const trunkGeo = GeometryPool.getBoxGeometry(0.3, 1.2, 0.3);
        const trunkMat = MaterialPool.getMaterial(theme.decorations.trunkColor);
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 0.7; trunk.castShadow = true; group.add(trunk);
        // Bare branches (angular)
        const branchMat = MaterialPool.getMaterial(theme.decorations.trunkColor);
        const branches = [
            [0.08, 0.5, 0.08, -0.2, 1.3, 0, 0, 0, 0.6],
            [0.08, 0.4, 0.08, 0.22, 1.2, 0.1, 0, 0, -0.5],
            [0.08, 0.35, 0.08, 0.05, 1.4, -0.15, 0, 0, 0.3],
        ];
        branches.forEach(([w, h, d, x, y, z, rx, ry, rz]) => {
            const bg = GeometryPool.getBoxGeometry(w, h, d);
            const b = new THREE.Mesh(bg, branchMat);
            b.position.set(x, y, z); b.rotation.set(rx, ry, rz); group.add(b);
        });
        // Ember glow at base
        const emberMat = new THREE.MeshLambertMaterial({ color: 0xFF4500, emissive: 0xFF4500, emissiveIntensity: 0.4 });
        for (let i = 0; i < 2; i++) {
            const eg = GeometryPool.getBoxGeometry(0.1, 0.08, 0.1);
            const ember = new THREE.Mesh(eg, emberMat);
            ember.position.set((Math.random() - 0.5) * 0.3, 0.12, (Math.random() - 0.5) * 0.3);
            group.add(ember);
        }
        return group;
    },
    
    // Create coin with type: 'steem' (common), 'ethereum' (rare), 'bitcoin' (super rare)
    createCoin: (type = 'steem') => {
        const group = new THREE.Group();
        const coinGeometry = GeometryPool.getCylinderGeometry(0.3, 0.3, 0.1, 32);
        let texturePath = null;
        let edgeColor = 0xFFFFFF;
        let textureRepeat = 0.7; // default zoom
        switch (type) {
            case 'steem':
                texturePath = 'assets/steem.png'; // Usa il nuovo logo allegato
                edgeColor = 0xFFFFFF; // Bordo bianco
                textureRepeat = 0.7; // Dimensione originale
                break;
            case 'bitcoin':
                texturePath = 'assets/bitcoin.png';
                edgeColor = 0xF7931A; // Arancione Bitcoin
                textureRepeat = 0.7;
                break;
            default:
                texturePath = null;
                edgeColor = 0xFFFFFF;
                textureRepeat = 0.7;
        }

        // Materiali: bordo adattato, facce con logo
        // IMPORTANTE: materiali con texture NON possono essere pooled (causano dissolvenza)
        const edgeMaterial = MaterialPool.getMaterial(edgeColor);
        let faceMaterial;
        if (texturePath) {
            const texture = TextureCache.get(texturePath);
            if (texture) {
                // Crea NUOVO materiale per ogni moneta (texture già configurata al preload)
                // IMPORTANTE: transparent + depthWrite evitano monete invisibili
                // quando la rotazione causa rendering order errato col depth buffer
                faceMaterial = new THREE.MeshLambertMaterial({ 
                    map: texture,
                    transparent: true,
                    alphaTest: 0.5,
                    depthWrite: true,
                    side: THREE.DoubleSide
                });
            } else {
                // Fallback if texture not loaded
                faceMaterial = MaterialPool.getMaterial(0xFFFFFF);
            }
        } else {
            faceMaterial = MaterialPool.getMaterial(0xFFFFFF);
        }
        // Ordine materiali: [lato, top, bottom]
        const materials = [edgeMaterial, faceMaterial, faceMaterial];
        const coin = new THREE.Mesh(coinGeometry, materials);
        coin.rotation.x = Math.PI / 2;
        coin.castShadow = true;
        coin.renderOrder = 10; // Render coins after opaque terrain to avoid depth conflicts
        group.add(coin);

        // Make it rotate
        group.userData.rotationSpeed = 0.05;
        group.userData.coinType = type;
        return group;
    },
    
    // Create log (floating platform on water) - themed per map
    createLog: (length = 3) => {
        const theme = themeManager.getTheme();
        const style = theme.models.log.style || 'wood';
        switch (style) {
            case 'ice': return Models._createIceLog(length, theme);
            case 'sandstone': return Models._createSandstoneLog(length, theme);
            case 'neon_platform': return Models._createNeonLog(length, theme);
            case 'bamboo': return Models._createBambooLog(length, theme);
            case 'obsidian': return Models._createObsidianLog(length, theme);
            default: return Models._createWoodLog(length, theme);
        }
    },

    // Wood log (Classic)
    _createWoodLog: (length, theme) => {
        const group = new THREE.Group();
        const logGeo = new THREE.BoxGeometry(length, 0.4, 0.9);
        const logMat = MaterialPool.getMaterial(theme.decorations.logColor);
        const log = new THREE.Mesh(logGeo, logMat);
        log.castShadow = true; log.receiveShadow = true; group.add(log);
        const stripeGeo = new THREE.BoxGeometry(length * 0.9, 0.41, 0.15);
        const stripeMat = MaterialPool.getMaterial(theme.decorations.logStripeColor);
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.y = 0.01; group.add(stripe);
        return group;
    },

    // Ice block (Christmas)
    _createIceLog: (length, theme) => {
        const group = new THREE.Group();
        const logGeo = new THREE.BoxGeometry(length, 0.35, 0.9);
        const logMat = new THREE.MeshLambertMaterial({ color: 0xB0E8FF, transparent: true, opacity: 0.8 });
        const log = new THREE.Mesh(logGeo, logMat);
        log.castShadow = true; group.add(log);
        // Ice shine on top
        const shineGeo = new THREE.BoxGeometry(length * 0.7, 0.02, 0.3);
        const shineMat = new THREE.MeshLambertMaterial({ color: 0xE8F8FF, transparent: true, opacity: 0.6 });
        const shine = new THREE.Mesh(shineGeo, shineMat);
        shine.position.y = 0.18; group.add(shine);
        // Snow patches
        const snowGeo = GeometryPool.getBoxGeometry(0.3, 0.08, 0.25);
        const snowMat = MaterialPool.getMaterial(0xFFFFFF);
        for (let x = -length/3; x <= length/3; x += length/3) {
            const s = new THREE.Mesh(snowGeo, snowMat);
            s.position.set(x, 0.2, (Math.random()-0.5)*0.3); group.add(s);
        }
        return group;
    },

    // Sandstone slab (Desert)
    _createSandstoneLog: (length, theme) => {
        const group = new THREE.Group();
        const logGeo = new THREE.BoxGeometry(length, 0.35, 0.9);
        const logMat = MaterialPool.getMaterial(0xD2B48C);
        const log = new THREE.Mesh(logGeo, logMat);
        log.castShadow = true; group.add(log);
        // Cracks/lines
        const crackGeo = new THREE.BoxGeometry(length * 0.8, 0.36, 0.04);
        const crackMat = MaterialPool.getMaterial(0xC4A67A);
        const crack = new THREE.Mesh(crackGeo, crackMat);
        crack.position.set(0, 0, 0.15); group.add(crack);
        const crack2 = new THREE.Mesh(crackGeo, crackMat);
        crack2.position.set(0, 0, -0.2); group.add(crack2);
        return group;
    },

    // Neon platform (Neon City)
    _createNeonLog: (length, theme) => {
        const group = new THREE.Group();
        const logGeo = new THREE.BoxGeometry(length, 0.3, 0.9);
        const logMat = MaterialPool.getMaterial(0x1A1A2E);
        const log = new THREE.Mesh(logGeo, logMat);
        log.castShadow = true; group.add(log);
        // Glowing edge lines
        const edgeColor = theme.decorations.foliageColor || 0x00FFFF;
        const edgeMat = new THREE.MeshLambertMaterial({ color: edgeColor, emissive: edgeColor, emissiveIntensity: 0.5 });
        const eGeo1 = new THREE.BoxGeometry(length, 0.04, 0.04);
        group.add(_pm(eGeo1, edgeMat, 0, 0.16, 0.44));
        group.add(_pm(eGeo1, edgeMat, 0, 0.16, -0.44));
        const eGeo2 = new THREE.BoxGeometry(0.04, 0.04, 0.9);
        group.add(_pm(eGeo2, edgeMat, length/2-0.02, 0.16, 0));
        group.add(_pm(eGeo2, edgeMat, -length/2+0.02, 0.16, 0));
        return group;
    },

    // Bamboo raft (Sakura)
    _createBambooLog: (length, theme) => {
        const group = new THREE.Group();
        const bambooMat = MaterialPool.getMaterial(0x8FBC5E);
        // Multiple bamboo poles side by side
        const poleGeo = new THREE.BoxGeometry(length, 0.18, 0.18);
        for (let z = -0.3; z <= 0.3; z += 0.15) {
            const pole = new THREE.Mesh(poleGeo, bambooMat);
            pole.position.set(0, 0, z); pole.castShadow = true; group.add(pole);
        }
        // Cross ties
        const tieGeo = GeometryPool.getBoxGeometry(0.08, 0.2, 0.8);
        const tieMat = MaterialPool.getMaterial(0x6B8E4A);
        group.add(_pm(tieGeo, tieMat, -length/4, 0, 0));
        group.add(_pm(tieGeo, tieMat, length/4, 0, 0));
        return group;
    },

    // Obsidian slab (Lava)
    _createObsidianLog: (length, theme) => {
        const group = new THREE.Group();
        const logGeo = new THREE.BoxGeometry(length, 0.35, 0.9);
        const logMat = MaterialPool.getMaterial(0x1A0A2E);
        const log = new THREE.Mesh(logGeo, logMat);
        log.castShadow = true; group.add(log);
        // Lava veins
        const veinMat = new THREE.MeshLambertMaterial({ color: 0xFF4500, emissive: 0xFF4500, emissiveIntensity: 0.4 });
        const vGeo = new THREE.BoxGeometry(length * 0.6, 0.36, 0.03);
        group.add(_pm(vGeo, veinMat, 0.1, 0, 0.2));
        const vGeo2 = new THREE.BoxGeometry(length * 0.4, 0.36, 0.03);
        group.add(_pm(vGeo2, veinMat, -0.15, 0, -0.25));
        return group;
    },
    
    // Create lily pad (small platform on water) - themed per map
    createLilyPad: () => {
        const theme = themeManager.getTheme();
        const style = theme.models.lilyPad.style || 'lily';
        switch (style) {
            case 'ice_platform': return Models._createIcePad(theme);
            case 'flat_stone': return Models._createStonePad(theme);
            case 'holo_pad': return Models._createHoloPad(theme);
            case 'lotus': return Models._createLotusPad(theme);
            case 'basalt': return Models._createBasaltPad(theme);
            default: return Models._createLilyPad(theme);
        }
    },

    // Classic lily pad with flower
    _createLilyPad: (theme) => {
        const group = new THREE.Group();
        const geo = GeometryPool.getCylinderGeometry(0.6, 0.6, 0.1, 8);
        const mat = MaterialPool.getMaterial(theme.decorations.lilyPadColor);
        const pad = new THREE.Mesh(geo, mat);
        pad.position.y = 0.15; pad.castShadow = true; group.add(pad);
        const fGeo = GeometryPool.getBoxGeometry(0.2, 0.2, 0.2);
        const fMat = MaterialPool.getMaterial(theme.decorations.lilyFlowerColor);
        const flower = new THREE.Mesh(fGeo, fMat);
        flower.position.y = 0.3; group.add(flower);
        return group;
    },

    // Ice platform (Christmas)
    _createIcePad: (theme) => {
        const group = new THREE.Group();
        const geo = GeometryPool.getCylinderGeometry(0.55, 0.55, 0.12, 6);
        const mat = new THREE.MeshLambertMaterial({ color: 0xC8E8FF, transparent: true, opacity: 0.75 });
        const pad = new THREE.Mesh(geo, mat);
        pad.position.y = 0.15; pad.castShadow = true; group.add(pad);
        // Snow on top
        const sGeo = GeometryPool.getCylinderGeometry(0.4, 0.4, 0.05, 6);
        const sMat = MaterialPool.getMaterial(0xFFFFFF);
        const snow = new THREE.Mesh(sGeo, sMat);
        snow.position.y = 0.23; group.add(snow);
        return group;
    },

    // Flat stone (Desert)
    _createStonePad: (theme) => {
        const group = new THREE.Group();
        const geo = GeometryPool.getBoxGeometry(0.9, 0.12, 0.9);
        const mat = MaterialPool.getMaterial(0xC4A882);
        const pad = new THREE.Mesh(geo, mat);
        pad.position.y = 0.15; pad.castShadow = true; group.add(pad);
        // Small crack details
        const crGeo = GeometryPool.getBoxGeometry(0.5, 0.13, 0.03);
        const crMat = MaterialPool.getMaterial(0xAA9060);
        const cr = new THREE.Mesh(crGeo, crMat);
        cr.position.set(0.05, 0.15, 0.1); cr.rotation.y = 0.3; group.add(cr);
        return group;
    },

    // Holographic pad (Neon City)
    _createHoloPad: (theme) => {
        const group = new THREE.Group();
        const geo = GeometryPool.getCylinderGeometry(0.55, 0.55, 0.08, 6);
        const glowColor = theme.decorations.foliageColor || 0x00FFFF;
        const mat = new THREE.MeshLambertMaterial({ color: 0x0A0A1A, emissive: glowColor, emissiveIntensity: 0.15 });
        const pad = new THREE.Mesh(geo, mat);
        pad.position.y = 0.15; pad.castShadow = true; group.add(pad);
        // Glowing ring edge
        const ringGeo = new THREE.TorusGeometry(0.5, 0.03, 4, 8);
        const ringMat = new THREE.MeshLambertMaterial({ color: glowColor, emissive: glowColor, emissiveIntensity: 0.6 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.y = 0.2; ring.rotation.x = Math.PI / 2; group.add(ring);
        return group;
    },

    // Lotus pad (Sakura)
    _createLotusPad: (theme) => {
        const group = new THREE.Group();
        const geo = GeometryPool.getCylinderGeometry(0.6, 0.6, 0.08, 8);
        const mat = MaterialPool.getMaterial(0x4A8C5C);
        const pad = new THREE.Mesh(geo, mat);
        pad.position.y = 0.15; pad.castShadow = true; group.add(pad);
        // Lotus flower (layered petals)
        const petalMat = MaterialPool.getMaterial(0xFFB7C5);
        const petalInnerMat = MaterialPool.getMaterial(0xFFC0CB);
        // Outer petals
        for (let i = 0; i < 5; i++) {
            const pGeo = GeometryPool.getBoxGeometry(0.12, 0.12, 0.08);
            const petal = new THREE.Mesh(pGeo, petalMat);
            const angle = (i / 5) * Math.PI * 2;
            petal.position.set(Math.cos(angle) * 0.15, 0.28, Math.sin(angle) * 0.15);
            petal.rotation.y = angle; group.add(petal);
        }
        // Center
        const cGeo = GeometryPool.getBoxGeometry(0.1, 0.15, 0.1);
        const center = new THREE.Mesh(cGeo, petalInnerMat);
        center.position.y = 0.3; group.add(center);
        return group;
    },

    // Basalt platform (Lava)
    _createBasaltPad: (theme) => {
        const group = new THREE.Group();
        const geo = GeometryPool.getBoxGeometry(0.85, 0.15, 0.85);
        const mat = MaterialPool.getMaterial(0x1A0A1A);
        const pad = new THREE.Mesh(geo, mat);
        pad.position.y = 0.15; pad.castShadow = true; group.add(pad);
        // Lava glow cracks
        const glowMat = new THREE.MeshLambertMaterial({ color: 0xFF4500, emissive: 0xFF4500, emissiveIntensity: 0.3 });
        const gGeo1 = GeometryPool.getBoxGeometry(0.5, 0.16, 0.03);
        group.add(_pm(gGeo1, glowMat, 0, 0.15, 0.1));
        const gGeo2 = GeometryPool.getBoxGeometry(0.03, 0.16, 0.4);
        group.add(_pm(gGeo2, glowMat, 0.1, 0.15, -0.05));
        return group;
    },
    
    // Create terrain block - OPTIMIZED with pooled geometry
    createTerrainBlock: (type = 'grass') => {
        const geometry = GeometryPool.getBoxGeometry(1, 0.5, 1);
        let material;
        
        switch(type) {
            case 'grass':
                material = MaterialPool.getMaterial(0x5FAD56, { poolable: true });
                break;
            case 'road':
                // Varied asphalt colors for visual interest
                const roadColors = [0x555555, 0x4A4A4A, 0x606060];
                const roadColor = roadColors[Math.floor(Math.random() * roadColors.length)];
                material = MaterialPool.getMaterial(roadColor, { poolable: true });
                break;
            case 'water':
                // Varied water blues
                const waterColors = [0x2196F3, 0x42A5F5, 0x1E88E5];
                const waterColor = waterColors[Math.floor(Math.random() * waterColors.length)];
                material = MaterialPool.getMaterial(waterColor, { transparent: true, opacity: 0.9, poolable: true });
                break;
            case 'rail':
                material = MaterialPool.getMaterial(0x6B5742, { poolable: true });
                break;
            default:
                // Varied grass greens
                const grassColors = [0x5FAD56, 0x6BB85D, 0x52A047, 0x5CB85C];
                const grassColor = grassColors[Math.floor(Math.random() * grassColors.length)];
                material = MaterialPool.getMaterial(grassColor, { poolable: true });
        }
        
        const block = new THREE.Mesh(geometry, material);
        block.receiveShadow = true;
        block.castShadow = false;
        block.position.y = -0.25; // Half of block height (0.5/2) to sit on ground
        
        return block;
    },
    
    // Add road stripe decoration (runs left-right along X axis) - OPTIMIZED
    createRoadStripe: (z, type = 'center') => {
        const width = type === 'center' ? 0.15 : 0.1;
        // PlaneGeometry con dimensioni variabili - creiamo nuova geometria
        const geometry = new THREE.PlaneGeometry(30, width);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xFFFFFF,
            side: THREE.DoubleSide
        });
        const stripe = new THREE.Mesh(geometry, material);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(0, 0.26, type === 'center' ? 0 : z);
        return stripe;
    },
    
    // Create rail track decoration (runs left-right along X axis)
    // Pre-calculated matrices for rail sleepers (calculated ONCE, reused forever)
    _sleeperMatrices: null,
    _getSleeperMatrices: function() {
        if (!this._sleeperMatrices) {
            this._sleeperMatrices = [];
            const matrix = new THREE.Matrix4();
            // 50 sleepers spaced 0.5 units apart (pre-calculated once)
            for (let x = -12; x <= 12; x += 0.5) {
                matrix.setPosition(x, 0.26, 0);
                this._sleeperMatrices.push(matrix.clone());
                if (this._sleeperMatrices.length >= 50) break;
            }
        }
        return this._sleeperMatrices;
    },

    createRailTrack: () => {
        const group = new THREE.Group();
        
        // Rails (shiny metal) - extend along X axis (left to right) - POOLED
        // Reduced width from 30 to 24 to match terrain tiles (-12 to +12)
        const railGeometry = GeometryPool.getBoxGeometry(24, 0.1, 0.1);
        const railMaterial = MaterialPool.getMaterial(0xA8A8A8, { poolable: true });
        
        const leftRail = new THREE.Mesh(railGeometry, railMaterial);
        leftRail.position.set(0, 0.28, -0.32);
        group.add(leftRail);
        
        const rightRail = new THREE.Mesh(railGeometry, railMaterial);
        rightRail.position.set(0, 0.28, 0.32);
        group.add(rightRail);
        
        // Wooden sleepers using InstancedMesh (1 draw call!) - POOLED
        const sleeperGeometry = GeometryPool.getBoxGeometry(0.15, 0.12, 0.85);
        const sleeperMaterial = MaterialPool.getMaterial(0x6B4423, { poolable: true });
        
        const sleeperCount = 50;
        const sleepers = new THREE.InstancedMesh(sleeperGeometry, sleeperMaterial, sleeperCount);
        
        // Use pre-calculated matrices (ZERO computation here!)
        const matrices = Models._getSleeperMatrices();
        for (let i = 0; i < matrices.length; i++) {
            sleepers.setMatrixAt(i, matrices[i]);
        }
        sleepers.instanceMatrix.needsUpdate = true;
        
        group.add(sleepers);
        
        return group;
    },
    
    // Create permanent train warning light
    createTrainWarningLight: () => {
        const group = new THREE.Group();
        
        // (base removed - pole will be placed directly on terrain)
        
        // Pole - metal pole (simplified) - POOLED (static, never changes)
        const poleGeometry = GeometryPool.getCylinderGeometry(0.06, 0.06, 1.4, 6);
        const poleMaterial = MaterialPool.getMaterial(0x222222, { poolable: true });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.y = 0.85;
        pole.castShadow = true;
        group.add(pole);
        
        // Light housing - replace box with a thin cylindrical bezel so no sharp cube shows
        const housingRadius = 0.12;
        const housingHeight = 0.06;
        const housingGeometry = GeometryPool.getCylinderGeometry(housingRadius, housingRadius, housingHeight, 12);
        const housingMaterial = MaterialPool.getMaterial(0x111111, { poolable: true, transparent: true, opacity: 0.22 });
        const housing = new THREE.Mesh(housingGeometry, housingMaterial);
        housing.position.set(0, 1.65, 0);
        housing.castShadow = false;
        housing.receiveShadow = false;
        group.add(housing);

        // Thin yellow band around the housing (slightly lower)
        const bandGeometry = GeometryPool.getCylinderGeometry(housingRadius * 0.9, housingRadius * 0.9, 0.02, 12);
        const bandMaterial = MaterialPool.getMaterial(0xffdd00, { poolable: true });
        const band = new THREE.Mesh(bandGeometry, bandMaterial);
        band.position.set(0, 1.58, 0);
        band.castShadow = false;
        group.add(band);
        
        // WARNING LIGHT: use a visible flat semaphore-style disc + additive glow plane
        // Disc faces forward (+Z) and is easy to spot even on mobile
        // Create a canvas radial texture for the light (cached on Models)
        if (!Models._warningLightCanvasTexture) {
            const size = 128;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            const cx = size / 2;
            const cy = size / 2;
            const radius = size / 2;

            // Outer transparent -> bright center radial gradient
            const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
            grd.addColorStop(0.0, 'rgba(255,255,255,1)');
            grd.addColorStop(0.12, 'rgba(255,200,200,1)');
            grd.addColorStop(0.25, 'rgba(255,120,120,1)');
            grd.addColorStop(0.45, 'rgba(255,50,50,0.95)');
            grd.addColorStop(0.75, 'rgba(255,10,10,0.85)');
            grd.addColorStop(1.0, 'rgba(255,0,0,0)');
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, size, size);

            Models._warningLightCanvasTexture = new THREE.CanvasTexture(canvas);
            Models._warningLightCanvasTexture.minFilter = THREE.LinearFilter;
            Models._warningLightCanvasTexture.magFilter = THREE.LinearFilter;
            Models._warningLightCanvasTexture.needsUpdate = true;
        }

        // Sprite materials: on/off use same texture but different blending/opacity
        // Use neutral color so canvas' bright center stays bright
        const onSpriteMat = new THREE.SpriteMaterial({
            map: Models._warningLightCanvasTexture,
            color: 0xffffff,
            transparent: true,
            opacity: 1.0,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        const offSpriteMat = new THREE.SpriteMaterial({
            map: Models._warningLightCanvasTexture,
            color: 0x220000,
            transparent: true,
            opacity: 0.35,
            depthWrite: true,
            blending: THREE.NormalBlending
        });

        // Core sprite (small) - recessed into the housing
        const core = new THREE.Sprite(offSpriteMat);
        // recessed into the top of the housing: place slightly below bezel
        core.position.set(0, 1.74, 0);
        // face upward (sprite faces camera by default; rotate so it's flat on top)
        core.rotation.x = -Math.PI / 2;
        core.scale.set(0.32, 0.32, 1);
        core.userData.isWarningLight = true;
        core.userData.onMaterial = onSpriteMat;
        core.userData.offMaterial = offSpriteMat;
        group.add(core);

        // Glow sprite (bigger, behind core). Start OFF (opacity 0).
        const glowMat = new THREE.SpriteMaterial({
            map: Models._warningLightCanvasTexture,
            color: 0xff4444,
            transparent: true,
            opacity: 0.0,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        const glow = new THREE.Sprite(glowMat);
        // place glow slightly lower than bezel so it appears under the ring
        glow.position.set(0, 1.70, 0);
        glow.rotation.x = -Math.PI / 2;
        glow.scale.set(0.9, 0.9, 1);
        glow.userData.isWarningGlow = true;
        glow.userData.onOpacity = 0.4;
        glow.userData.offOpacity = 0.0;
        group.add(glow);

        // Bezel/frame so the light looks embedded (small black ring)
        // Transparent dome on top (hemisphere) so the light looks inside a glass cap
        const domeRadius = 0.14;
        // SphereGeometry(radius, widthSeg, heightSeg, phiStart, phiLength, thetaStart, thetaLength)
        const domeGeometry = new THREE.SphereGeometry(domeRadius, 18, 12);
        // Off material: subtle transparent glass (non-additive)
        const domeOffMat = new THREE.MeshPhongMaterial({
            color: 0x222222,
            transparent: true,
            opacity: 0.28,
            shininess: 10,
            depthWrite: false
        });
        // On material: use additive MeshBasicMaterial with depthTest disabled so internal glow shows
        // make traffic-light red when ON
        const domeOnMat = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false
        });
        const dome = new THREE.Mesh(domeGeometry, domeOffMat);
        dome.userData.onMaterial = domeOnMat;
        dome.userData.offMaterial = domeOffMat;
        // render dome after sprites so additive dome overlays glow correctly
        dome.renderOrder = 2000;
        // Position dome on top of housing (slightly lowered for better fit)
        dome.position.set(0, 1.74, 0);
        dome.castShadow = false;
        dome.receiveShadow = false;
        // mark dome for cached lookup
        dome.userData.isWarningDome = true;
        group.add(dome);
        
        return group;
    },
    

    
    // Create grass tuft / ground decoration - themed per map
    createGrassTuft: () => {
        const theme = themeManager.getTheme();
        const style = theme.decorations.groundDecor || 'grass';
        switch (style) {
            case 'snow_tuft': return Models._createSnowTuft(theme);
            case 'dry_scrub': return Models._createDryScrub(theme);
            case 'neon_tuft': return Models._createNeonTuft(theme);
            case 'moss': return Models._createMoss(theme);
            case 'ash': return Models._createAsh(theme);
            default: return Models._createGrassTuft(theme);
        }
    },

    _createGrassTuft: (theme) => {
        const group = new THREE.Group();
        const bladeGeo = GeometryPool.getBoxGeometry(0.05, 0.3, 0.05);
        const mat = MaterialPool.getMaterial(theme.decorations.grassTuftColor);
        for (let i = 0; i < 3; i++) {
            const m = new THREE.Mesh(bladeGeo, mat);
            m.position.set((Math.random()-0.5)*0.2, 0.35, (Math.random()-0.5)*0.2);
            m.rotation.z = (Math.random()-0.5)*0.3; group.add(m);
        }
        return group;
    },

    _createSnowTuft: (theme) => {
        const group = new THREE.Group();
        // Small snow mounds
        const mat = MaterialPool.getMaterial(0xF5F5F5);
        const sizes = [[0.15, 0.08, 0.12], [0.1, 0.06, 0.1], [0.12, 0.07, 0.14]];
        sizes.forEach(([w,h,d]) => {
            const m = new THREE.Mesh(GeometryPool.getBoxGeometry(w, h, d), mat);
            m.position.set((Math.random()-0.5)*0.2, 0.22, (Math.random()-0.5)*0.2);
            group.add(m);
        });
        return group;
    },

    _createDryScrub: (theme) => {
        const group = new THREE.Group();
        // Tan/brown dry grass blades
        const mat = MaterialPool.getMaterial(0xC4A55A);
        const bladeGeo = GeometryPool.getBoxGeometry(0.04, 0.2, 0.04);
        for (let i = 0; i < 4; i++) {
            const m = new THREE.Mesh(bladeGeo, mat);
            m.position.set((Math.random()-0.5)*0.25, 0.3, (Math.random()-0.5)*0.25);
            m.rotation.z = (Math.random()-0.5)*0.5; group.add(m);
        }
        return group;
    },

    _createNeonTuft: (theme) => {
        const group = new THREE.Group();
        // Small glowing pixel blocks
        const colors = [0x00FFFF, 0xFF00FF, 0x00E676, 0x7C4DFF];
        const c = colors[Math.floor(Math.random()*colors.length)];
        const mat = new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.4 });
        for (let i = 0; i < 2; i++) {
            const s = 0.04 + Math.random()*0.04;
            const m = new THREE.Mesh(GeometryPool.getBoxGeometry(s, s*2, s), mat);
            m.position.set((Math.random()-0.5)*0.2, 0.22+Math.random()*0.1, (Math.random()-0.5)*0.2);
            group.add(m);
        }
        return group;
    },

    _createMoss: (theme) => {
        const group = new THREE.Group();
        // Flat green mossy patches
        const mat = MaterialPool.getMaterial(0x6B8E4A);
        const m1 = new THREE.Mesh(GeometryPool.getBoxGeometry(0.2, 0.04, 0.15), mat);
        m1.position.set((Math.random()-0.5)*0.15, 0.2, (Math.random()-0.5)*0.15); group.add(m1);
        const m2 = new THREE.Mesh(GeometryPool.getBoxGeometry(0.12, 0.04, 0.18), mat);
        m2.position.set((Math.random()-0.5)*0.15, 0.2, (Math.random()-0.5)*0.15); group.add(m2);
        return group;
    },

    _createAsh: (theme) => {
        const group = new THREE.Group();
        // Dark ash/cinder patches
        const mat = MaterialPool.getMaterial(0x333333);
        const sizes = [[0.12, 0.03, 0.1], [0.08, 0.03, 0.12]];
        sizes.forEach(([w,h,d]) => {
            const m = new THREE.Mesh(GeometryPool.getBoxGeometry(w, h, d), mat);
            m.position.set((Math.random()-0.5)*0.2, 0.2, (Math.random()-0.5)*0.2); group.add(m);
        });
        // Tiny ember spark
        if (Math.random() < 0.4) {
            const eMat = new THREE.MeshLambertMaterial({ color: 0xFF6600, emissive: 0xFF4400, emissiveIntensity: 0.5 });
            const e = new THREE.Mesh(GeometryPool.getBoxGeometry(0.04, 0.04, 0.04), eMat);
            e.position.set((Math.random()-0.5)*0.15, 0.23, (Math.random()-0.5)*0.15); group.add(e);
        }
        return group;
    },

    // Create small decoration (flower equivalent) - themed per map
    createFlower: () => {
        const theme = themeManager.getTheme();
        const style = theme.decorations.smallDecor || 'flowers';
        switch (style) {
            case 'snowdrift': return Models._createSnowdrift(theme);
            case 'tumbleweed': return Models._createTumbleweed(theme);
            case 'neon_shard': return Models._createNeonShard(theme);
            case 'petals': return Models._createFallenPetals(theme);
            case 'embers': return Models._createEmberPile(theme);
            default: return Models._createFlower(theme);
        }
    },

    _createFlower: (theme) => {
        const group = new THREE.Group();
        const stemGeo = GeometryPool.getBoxGeometry(0.05, 0.3, 0.05);
        const stemMat = MaterialPool.getMaterial(theme.decorations.flowerStemColor);
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = 0.35; group.add(stem);
        const colors = theme.decorations.flowerColors;
        const fc = colors[Math.floor(Math.random()*colors.length)];
        const flowerGeo = GeometryPool.getBoxGeometry(0.15, 0.15, 0.15);
        const flMat = MaterialPool.getMaterial(fc);
        const fl = new THREE.Mesh(flowerGeo, flMat);
        fl.position.y = 0.5; group.add(fl);
        return group;
    },

    _createSnowdrift: (theme) => {
        const group = new THREE.Group();
        // Small snow pile with optional present/candy cane
        const snowMat = MaterialPool.getMaterial(0xF0F8FF);
        const pile = new THREE.Mesh(GeometryPool.getBoxGeometry(0.25, 0.12, 0.2), snowMat);
        pile.position.y = 0.24; group.add(pile);
        const top = new THREE.Mesh(GeometryPool.getBoxGeometry(0.15, 0.08, 0.12), snowMat);
        top.position.y = 0.32; group.add(top);
        // Occasional small present box
        if (Math.random() < 0.35) {
            const pColors = [0xCC0000, 0x006400, 0xFFD700];
            const pc = pColors[Math.floor(Math.random()*pColors.length)];
            const pMat = MaterialPool.getMaterial(pc);
            const present = new THREE.Mesh(GeometryPool.getBoxGeometry(0.1, 0.1, 0.1), pMat);
            present.position.set(0.08, 0.28, 0.05); present.rotation.y = Math.random(); group.add(present);
            // Ribbon
            const ribMat = MaterialPool.getMaterial(0xFFD700);
            const rib = new THREE.Mesh(GeometryPool.getBoxGeometry(0.11, 0.02, 0.02), ribMat);
            rib.position.set(0.08, 0.34, 0.05); group.add(rib);
        }
        return group;
    },

    _createTumbleweed: (theme) => {
        const group = new THREE.Group();
        // Dry ball shape
        const mat = MaterialPool.getMaterial(0xBFA76A);
        const s = 0.12 + Math.random()*0.08;
        const ball = new THREE.Mesh(GeometryPool.getBoxGeometry(s, s, s), mat);
        ball.position.y = 0.2+s/2; ball.rotation.y = Math.random()*Math.PI; ball.rotation.x = Math.random()*0.3;
        group.add(ball);
        // Sticks poking out
        const stickMat = MaterialPool.getMaterial(0x8B7355);
        for (let i = 0; i < 3; i++) {
            const st = new THREE.Mesh(GeometryPool.getBoxGeometry(0.03, 0.1, 0.03), stickMat);
            st.position.set((Math.random()-0.5)*s, 0.2+s/2+(Math.random()-0.5)*s*0.3, (Math.random()-0.5)*s);
            st.rotation.set(Math.random()-0.5, 0, Math.random()-0.5); group.add(st);
        }
        return group;
    },

    _createNeonShard: (theme) => {
        const group = new THREE.Group();
        // Glowing crystal shard
        const colors = [0x00FFFF, 0xFF00FF, 0x7C4DFF, 0x00E5FF, 0xFF4081];
        const c = colors[Math.floor(Math.random()*colors.length)];
        const mat = new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.6 });
        const h = 0.15 + Math.random()*0.15;
        const shard = new THREE.Mesh(GeometryPool.getBoxGeometry(0.06, h, 0.06), mat);
        shard.position.y = 0.2+h/2; shard.rotation.z = (Math.random()-0.5)*0.4; shard.rotation.x = (Math.random()-0.5)*0.2;
        group.add(shard);
        // Second smaller shard
        if (Math.random() < 0.6) {
            const h2 = h*0.6;
            const s2 = new THREE.Mesh(GeometryPool.getBoxGeometry(0.04, h2, 0.04), mat);
            s2.position.set(0.06, 0.2+h2/2, 0.03); s2.rotation.z = (Math.random()-0.5)*0.5; group.add(s2);
        }
        return group;
    },

    _createFallenPetals: (theme) => {
        const group = new THREE.Group();
        // Scattered cherry blossom petals on ground
        const colors = [0xFFB7C5, 0xF8BBD0, 0xF48FB1, 0xFCE4EC, 0xFFFFFF];
        for (let i = 0; i < 3+Math.floor(Math.random()*3); i++) {
            const c = colors[Math.floor(Math.random()*colors.length)];
            const mat = MaterialPool.getMaterial(c);
            const petal = new THREE.Mesh(GeometryPool.getBoxGeometry(0.06, 0.02, 0.04), mat);
            petal.position.set((Math.random()-0.5)*0.3, 0.2+Math.random()*0.05, (Math.random()-0.5)*0.3);
            petal.rotation.set(Math.random()*0.3, Math.random()*Math.PI, Math.random()*0.3);
            group.add(petal);
        }
        return group;
    },

    _createEmberPile: (theme) => {
        const group = new THREE.Group();
        // Charred rocks with glowing embers
        const rockMat = MaterialPool.getMaterial(0x2A2A2A);
        const r1 = new THREE.Mesh(GeometryPool.getBoxGeometry(0.12, 0.1, 0.1), rockMat);
        r1.position.set(0, 0.23, 0); r1.rotation.y = Math.random(); group.add(r1);
        const r2 = new THREE.Mesh(GeometryPool.getBoxGeometry(0.08, 0.08, 0.1), rockMat);
        r2.position.set(0.06, 0.22, 0.05); group.add(r2);
        // Glowing ember cracks
        const emberColors = [0xFF4500, 0xFF6600, 0xFF8800];
        for (let i = 0; i < 2; i++) {
            const ec = emberColors[Math.floor(Math.random()*emberColors.length)];
            const eMat = new THREE.MeshLambertMaterial({ color: ec, emissive: ec, emissiveIntensity: 0.6 });
            const ember = new THREE.Mesh(GeometryPool.getBoxGeometry(0.04, 0.05, 0.04), eMat);
            ember.position.set((Math.random()-0.5)*0.1, 0.25+Math.random()*0.05, (Math.random()-0.5)*0.1);
            group.add(ember);
        }
        return group;
    },
    
    // Create rock decoration (bigger and more visible as obstacles) - OPTIMIZED
    // Create snowman (Christmas map decoration)
    createSnowman: () => {
        const group = new THREE.Group();
        const snowMat = MaterialPool.getMaterial(0xFFFFFF);

        // Bottom ball
        const bottom = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), snowMat);
        bottom.position.y = 0.35; group.add(bottom);

        // Middle ball
        const middle = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), snowMat);
        middle.position.y = 0.85; group.add(middle);

        // Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), snowMat);
        head.position.y = 1.22; group.add(head);

        // Eyes
        const eyeMat = MaterialPool.getMaterial(0x111111);
        const eyeGeo = new THREE.SphereGeometry(0.03, 6, 6);
        group.add(_pm(eyeGeo, eyeMat, -0.07, 1.26, 0.15));
        group.add(_pm(eyeGeo, eyeMat, 0.07, 1.26, 0.15));

        // Carrot nose
        const noseMat = MaterialPool.getMaterial(0xFF8C00);
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.15, 5), noseMat);
        nose.position.set(0, 1.2, 0.2); nose.rotation.x = -Math.PI / 2; group.add(nose);

        // Buttons (coal)
        const btnMat = MaterialPool.getMaterial(0x222222);
        const btnGeo = new THREE.SphereGeometry(0.03, 6, 6);
        group.add(_pm(btnGeo, btnMat, 0, 0.95, 0.24));
        group.add(_pm(btnGeo, btnMat, 0, 0.8, 0.25));
        group.add(_pm(btnGeo, btnMat, 0, 0.65, 0.23));

        // Top hat
        const hatMat = MaterialPool.getMaterial(0x111111);
        const brim = new THREE.Mesh(GeometryPool.getBoxGeometry(0.35, 0.04, 0.35), hatMat);
        brim.position.y = 1.38; group.add(brim);
        const top = new THREE.Mesh(GeometryPool.getBoxGeometry(0.22, 0.2, 0.22), hatMat);
        top.position.y = 1.5; group.add(top);

        // Scarf
        const scarfMat = MaterialPool.getMaterial(0xCC0000);
        const scarf = new THREE.Mesh(GeometryPool.getBoxGeometry(0.28, 0.06, 0.28), scarfMat);
        scarf.position.y = 1.06; group.add(scarf);
        // Scarf tail
        const scarfTail = new THREE.Mesh(GeometryPool.getBoxGeometry(0.06, 0.15, 0.06), scarfMat);
        scarfTail.position.set(0.12, 0.96, 0.12); group.add(scarfTail);

        // Random slight rotation
        group.rotation.y = Math.random() * Math.PI * 2;
        return group;
    },

    createRock: () => {
        const sizes = [0.35, 0.4, 0.45]; // Increased from 0.2-0.3
        const size = sizes[Math.floor(Math.random() * sizes.length)];
        
        const theme = themeManager.getTheme();
        const geometry = GeometryPool.getBoxGeometry(size, size * 1.0, size); // Altezza aumentata (era 0.7)
        const material = MaterialPool.getMaterial(theme.decorations.rockColor);
        const rock = new THREE.Mesh(geometry, material);
        rock.position.y = 0.35; // Alzato leggermente
        rock.rotation.y = Math.random() * Math.PI;
        rock.castShadow = false; // No shadows for small rocks
        rock.receiveShadow = true;
        
        return rock;
    },
    
    // Create train (themed — dispatches to style variants)
    createTrain: (color = 0x9C27B0) => {
        const theme = themeManager.getTheme();
        const trainStyle = theme.models.train?.style || 'classic';
        if (trainStyle === 'neon') return Models._createNeonTrain(theme);
        return Models._createClassicTrain(theme);
    },

    createTrainCar: (color = 0x9C27B0) => {
        const theme = themeManager.getTheme();
        const trainStyle = theme.models.train?.style || 'classic';
        if (trainStyle === 'neon') return Models._createNeonTrainCar(theme);
        return Models._createClassicTrainCar(theme);
    },

    // ===== CLASSIC TRAIN (steam locomotive) =====
    _createClassicTrain: (theme) => {
        const palette = theme.models.trainColors;
        const color = palette[Math.floor(Math.random() * palette.length)];
        let carColor = palette.filter(c => c !== color)[Math.floor(Math.random() * (palette.length - 1))];
        const group = new THREE.Group();
        group.userData.trainColor = color;
        group.userData.trainCarColor = carColor;
        const engineGeometry = GeometryPool.getBoxGeometry(1.2, 0.8, 1.8);
        const engineMaterial = MaterialPool.getMaterial(color, { poolable: true });
        const engine = new THREE.Mesh(engineGeometry, engineMaterial);
        engine.position.y = 0.5; engine.castShadow = true; group.add(engine);

        const chimneyGeometry = GeometryPool.getBoxGeometry(0.3, 0.5, 0.3);
        const chimneyMaterial = MaterialPool.getMaterial(0x2C3E50, { poolable: true });
        const chimney = new THREE.Mesh(chimneyGeometry, chimneyMaterial);
        chimney.position.set(0, 1.15, 0.4); chimney.castShadow = true; group.add(chimney);

        const cabinGeometry = GeometryPool.getBoxGeometry(1.0, 0.6, 1.0);
        const cabinMaterial = MaterialPool.getMaterial(color, { poolable: true });
        const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
        cabin.position.set(0, 1.1, -0.5); cabin.castShadow = true; group.add(cabin);

        const windowGeometry = GeometryPool.getBoxGeometry(1.01, 0.4, 0.3);
        const windowMaterial = MaterialPool.getMaterial(0x87CEEB, { poolable: true });
        const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
        window1.position.set(0, 1.1, -0.3); group.add(window1);

        const wheelGeometry = GeometryPool.getCylinderGeometry(0.25, 0.25, 0.2, 8);
        const wheelMaterial = MaterialPool.getMaterial(0x2C3E50, { poolable: true });
        [{x:-0.5,z:0.6},{x:0.5,z:0.6},{x:-0.5,z:-0.2},{x:0.5,z:-0.2},{x:-0.5,z:-1.0},{x:0.5,z:-1.0}].forEach(pos => {
            const w = new THREE.Mesh(wheelGeometry, wheelMaterial);
            w.rotation.z = Math.PI/2; w.position.set(pos.x, 0.2, pos.z); w.castShadow = true; w.userData.isWheel = true;
            group.add(w);
        });
        return group;
    },

    _createClassicTrainCar: (theme) => {
        const palette = theme.models.trainColors;
        const color = palette[Math.floor(Math.random() * palette.length)];
        const group = new THREE.Group();
        const bodyGeometry = GeometryPool.getBoxGeometry(1.2, 0.7, 2.0);
        const bodyMaterial = MaterialPool.getMaterial(color, { poolable: true });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.5; body.castShadow = true; group.add(body);

        const roofGeometry = GeometryPool.getBoxGeometry(1.3, 0.1, 2.1);
        const roofColor = new THREE.Color(color).lerp(new THREE.Color(0x000000), 0.3).getHex();
        const roofMaterial = MaterialPool.getMaterial(roofColor, { poolable: true });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = 0.9; roof.castShadow = true; group.add(roof);

        const wheelGeometry = GeometryPool.getCylinderGeometry(0.25, 0.25, 0.2, 8);
        const wheelMaterial = MaterialPool.getMaterial(0x2C3E50, { poolable: true });
        [{x:-0.5,z:0.7},{x:0.5,z:0.7},{x:-0.5,z:-0.7},{x:0.5,z:-0.7}].forEach(pos => {
            const w = new THREE.Mesh(wheelGeometry, wheelMaterial);
            w.rotation.z = Math.PI/2; w.position.set(pos.x, 0.2, pos.z); w.castShadow = true; w.userData.isWheel = true;
            group.add(w);
        });
        return group;
    },

    // ===== NEON TRAIN (futuristic hover-train with glow strips) =====
    _createNeonTrain: (theme) => {
        const palette = theme.models.trainColors;
        const bodyColor = palette[Math.floor(Math.random() * palette.length)];
        let carColor = palette.filter(c => c !== bodyColor)[Math.floor(Math.random() * (palette.length - 1))];
        const group = new THREE.Group();
        group.userData.trainColor = bodyColor;
        group.userData.trainCarColor = carColor;
        const glowColor = 0x00E5FF;

        // Sleek angular body (no chimney)
        const engineGeo = GeometryPool.getBoxGeometry(1.2, 0.6, 2.0);
        const engineMat = MaterialPool.getMaterial(bodyColor, { poolable: true });
        const engine = new THREE.Mesh(engineGeo, engineMat);
        engine.position.y = 0.6; engine.castShadow = true; group.add(engine);

        // Windshield (angled, cyan tinted)
        const windGeo = GeometryPool.getBoxGeometry(1.0, 0.35, 0.5);
        const windMat = MaterialPool.getMaterial(0x00BCD4, { poolable: true, transparent: true, opacity: 0.7 });
        const windshield = new THREE.Mesh(windGeo, windMat);
        windshield.position.set(0, 1.0, 0.5); group.add(windshield);

        // Neon glow strips on sides
        const stripGeo = GeometryPool.getBoxGeometry(0.05, 0.08, 2.1);
        const stripMat = new THREE.MeshLambertMaterial({ color: glowColor, emissive: glowColor, emissiveIntensity: 0.9 });
        group.add(_pm(stripGeo, stripMat, -0.62, 0.5, 0));
        group.add(_pm(stripGeo, stripMat, 0.62, 0.5, 0));

        // Front glow bar
        const frontGeo = GeometryPool.getBoxGeometry(1.0, 0.06, 0.06);
        group.add(_pm(frontGeo, stripMat, 0, 0.45, 1.0));

        // Hover pads (no wheels — floating)
        const padGeo = GeometryPool.getBoxGeometry(0.3, 0.08, 0.5);
        const padMat = new THREE.MeshLambertMaterial({ color: 0x7C4DFF, emissive: 0x7C4DFF, emissiveIntensity: 0.6 });
        [{x:-0.4,z:0.5},{x:0.4,z:0.5},{x:-0.4,z:-0.5},{x:0.4,z:-0.5}].forEach(pos => {
            group.add(_pm(padGeo, padMat, pos.x, 0.18, pos.z));
        });

        // Roof accent
        const roofGeo = GeometryPool.getBoxGeometry(0.8, 0.05, 1.6);
        const roofMat = MaterialPool.getMaterial(0x263238, { poolable: true });
        group.add(_pm(roofGeo, roofMat, 0, 0.93, -0.1));

        return group;
    },

    _createNeonTrainCar: (theme) => {
        const palette = theme.models.trainColors;
        const color = palette[Math.floor(Math.random() * palette.length)];
        const group = new THREE.Group();
        const glowColor = 0x00E5FF;

        // Sleek car body
        const bodyGeo = GeometryPool.getBoxGeometry(1.2, 0.55, 2.0);
        const bodyMat = MaterialPool.getMaterial(color, { poolable: true });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.58; body.castShadow = true; group.add(body);

        // Windows (cyan band)
        const winGeo = GeometryPool.getBoxGeometry(1.22, 0.15, 1.5);
        const winMat = MaterialPool.getMaterial(0x00BCD4, { poolable: true, transparent: true, opacity: 0.6 });
        group.add(_pm(winGeo, winMat, 0, 0.75, 0));

        // Neon glow strips
        const stripGeo = GeometryPool.getBoxGeometry(0.05, 0.06, 2.1);
        const stripMat = new THREE.MeshLambertMaterial({ color: glowColor, emissive: glowColor, emissiveIntensity: 0.9 });
        group.add(_pm(stripGeo, stripMat, -0.62, 0.48, 0));
        group.add(_pm(stripGeo, stripMat, 0.62, 0.48, 0));

        // Roof
        const roofGeo = GeometryPool.getBoxGeometry(1.25, 0.06, 2.05);
        const roofMat = MaterialPool.getMaterial(0x1A1A2E, { poolable: true });
        group.add(_pm(roofGeo, roofMat, 0, 0.88, 0));

        // Hover pads
        const padGeo = GeometryPool.getBoxGeometry(0.3, 0.08, 0.5);
        const padMat = new THREE.MeshLambertMaterial({ color: 0x7C4DFF, emissive: 0x7C4DFF, emissiveIntensity: 0.6 });
        [{x:-0.4,z:0.6},{x:0.4,z:0.6},{x:-0.4,z:-0.6},{x:0.4,z:-0.6}].forEach(pos => {
            group.add(_pm(padGeo, padMat, pos.x, 0.18, pos.z));
        });

        return group;
    }
};
