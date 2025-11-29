// models.js - Voxel 3D model creation functions

const Models = {
    // Create player character (chicken/character voxel style)
    createPlayer: () => {
        const group = new THREE.Group();
        // Corpo (più piccolo, bianco)
        const bodyGeometry = new THREE.BoxGeometry(0.6, 0.7, 0.6);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xF8F8FF, flatShading: true });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.5;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Testa (più grande, bianco)
        const headGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0xF8F8FF, flatShading: true });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.1;
        head.castShadow = true;
        head.receiveShadow = true;
        group.add(head);

        // Orecchie lunghe e inclinate (figlie della testa)
        const earGeometry = new THREE.BoxGeometry(0.15, 0.6, 0.15);
        const earMaterial = new THREE.MeshLambertMaterial({ color: 0xFFE4E1, flatShading: true });
        const leftEar = new THREE.Mesh(earGeometry, earMaterial);
        leftEar.position.set(-0.22, 0.5, 0.08); // relative to head
        leftEar.rotation.z = -0.25;
        leftEar.castShadow = true;
        head.add(leftEar);
        const rightEar = new THREE.Mesh(earGeometry, earMaterial);
        rightEar.position.set(0.22, 0.5, 0.08);
        rightEar.rotation.z = 0.25;
        rightEar.castShadow = true;
        head.add(rightEar);

        // Occhi grandi e lucidi (figli della testa)
        const eyeGeometry = new THREE.BoxGeometry(0.16, 0.16, 0.12);
        const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.18, 0.08, 0.38);
        head.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.18, 0.08, 0.38);
        head.add(rightEye);
        // Lucentezza occhi
        const shineGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.02);
        const shineMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
        const leftShine = new THREE.Mesh(shineGeometry, shineMaterial);
        leftShine.position.set(-0.19, 0.13, 0.44);
        head.add(leftShine);
        const rightShine = new THREE.Mesh(shineGeometry, shineMaterial);
        rightShine.position.set(0.19, 0.13, 0.44);
        head.add(rightShine);

        // Naso a triangolo rosa (figlio della testa)
        const noseGeometry = new THREE.ConeGeometry(0.07, 0.09, 3);
        const noseMaterial = new THREE.MeshLambertMaterial({ color: 0xFFC0CB });
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.position.set(0, -0.02, 0.44);
        nose.rotation.x = Math.PI / 2;
        head.add(nose);

        // Bocca (piccola linea nera sotto il naso, figlia della testa)
        const mouthGeometry = new THREE.BoxGeometry(0.09, 0.02, 0.02);
        const mouthMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
        const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
        mouth.position.set(0, -0.08, 0.44);
        head.add(mouth);

        // Coda soffice (sfera bianca)
        const tailGeometry = new THREE.SphereGeometry(0.13, 8, 8);
        const tailMaterial = new THREE.MeshLambertMaterial({ color: 0xF8F8FF });
        const tail = new THREE.Mesh(tailGeometry, tailMaterial);
        tail.position.set(0, 0.5, -0.32);
        group.add(tail);

        // Zampe anteriori (piccole parallelepipedi bianchi)
        const pawGeometry = new THREE.BoxGeometry(0.11, 0.15, 0.11);
        const pawMaterial = new THREE.MeshLambertMaterial({ color: 0xF8F8FF });
        const leftPaw = new THREE.Mesh(pawGeometry, pawMaterial);
        leftPaw.position.set(-0.15, 0.18, 0.18);
        group.add(leftPaw);
        const rightPaw = new THREE.Mesh(pawGeometry, pawMaterial);
        rightPaw.position.set(0.15, 0.18, 0.18);
        group.add(rightPaw);

        // Zampe posteriori (piccole parallelepipedi bianchi)
        const leftBackPaw = new THREE.Mesh(pawGeometry, pawMaterial);
        leftBackPaw.position.set(-0.15, 0.18, -0.18);
        group.add(leftBackPaw);
        const rightBackPaw = new THREE.Mesh(pawGeometry, pawMaterial);
        rightBackPaw.position.set(0.15, 0.18, -0.18);
        group.add(rightBackPaw);

        // Store references per animazioni
        group.userData.body = body;
        group.userData.head = head;
        group.userData.ears = [leftEar, rightEar];
        group.userData.nose = nose;
        group.userData.mouth = mouth;
        group.userData.tail = tail;
        group.userData.paws = [leftPaw, rightPaw, leftBackPaw, rightBackPaw];

        return group;
    },
    
    // Create car - Cute Crossy Road style
    createCar: (color = 0xFF4444) => {
        // Palette colori realistici
        const realisticColors = [
            0xFFFFFF, // bianco
            0xC0C0C0, // argento
            0x1E88E5, // blu
            0xB71C1C, // rosso scuro
            0x388E3C, // verde scuro
            0xFFD600, // giallo
            0x757575, // grigio
            0xF5F5DC, // beige
            0x003366, // blu navy
            0x808000, // verde oliva
            0xFF0000, // rosso vivo
            0xFF9900, // arancione
            0xA0522D, // marrone chiaro
            0x444444, // grigio scuro
            0x87CEEB, // azzurro
            0x20B2AA  // verde acqua
        ];
        color = realisticColors[Math.floor(Math.random() * realisticColors.length)];
        const group = new THREE.Group();
        
        // Main body
        const bodyGeometry = new THREE.BoxGeometry(0.9, 0.5, 1.6);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: color,
            flatShading: true
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.3;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);
        
        // Windshield/parabrezza
        const cabinGeometry = new THREE.BoxGeometry(0.75, 0.4, 0.7);
        const cabinMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xB0E0FF, // azzurro chiaro per effetto vetro
            flatShading: true,
            transparent: true,
            opacity: 0.85
        });
        const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
        cabin.position.set(0, 0.65, 0.1);
        cabin.castShadow = true;
        group.add(cabin);
        
        // Front grill/smile
        const grillGeometry = new THREE.BoxGeometry(0.5, 0.15, 0.1);
        const grillMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x222222,
            flatShading: true
        });
        const grill = new THREE.Mesh(grillGeometry, grillMaterial);
        grill.position.set(0, 0.25, 0.85);
        group.add(grill);
        
        // Front bumper
        const bumperGeometry = new THREE.BoxGeometry(1.0, 0.15, 0.2);
        const bumperMaterial = new THREE.MeshLambertMaterial({ 
            color: new THREE.Color(color).multiplyScalar(0.8),
            flatShading: true
        });
        const bumper = new THREE.Mesh(bumperGeometry, bumperMaterial);
        bumper.position.set(0, 0.15, 0.9);
        group.add(bumper);
        
        // Wheels with rims
        const wheelGeometry = new THREE.BoxGeometry(0.25, 0.35, 0.35);
        const wheelMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x1a1a1a,
            flatShading: true
        });
        
        const rimGeometry = new THREE.BoxGeometry(0.28, 0.2, 0.2);
        const rimMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x666666,
            flatShading: true
        });
        
        const wheels = [
            { x: -0.5, z: 0.6 },
            { x: 0.5, z: 0.6 },
            { x: -0.5, z: -0.6 },
            { x: 0.5, z: -0.6 }
        ];
        
        wheels.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.position.set(pos.x, 0.12, pos.z);
            wheel.castShadow = true;
            wheel.userData.isWheel = true;
            group.add(wheel);
        });
        
        return group;
    },
    
    // Create truck - Detailed blocky style
    createTruck: (color = 0x3366FF) => {
        // Palette colori realistici
        const realisticColors = [
            0xFFFFFF, // bianco
            0xC0C0C0, // argento
            0x1E88E5, // blu
            0xB71C1C, // rosso scuro
            0xFFD600, // giallo
            0x757575, // grigio
            0xF5F5DC, // beige
            0x003366, // blu navy
            0xFF0000, // rosso vivo
            0xFF9900, // arancione
            0xA0522D, // marrone chiaro
            0x444444, // grigio scuro
        ];
        color = realisticColors[Math.floor(Math.random() * realisticColors.length)];
        const group = new THREE.Group();
        
        // Truck cab (front part)
        const cabGeometry = new THREE.BoxGeometry(0.95, 0.7, 0.9);
        const cabMaterial = new THREE.MeshLambertMaterial({ 
            color: color,
            flatShading: true
        });
        const cab = new THREE.Mesh(cabGeometry, cabMaterial);
        cab.position.set(0, 0.45, 0.6);
        cab.castShadow = true;
        cab.receiveShadow = true;
        group.add(cab);
        
        // Cargo area (back part)
        const cargoGeometry = new THREE.BoxGeometry(0.95, 0.8, 1.2);
        const cargoMaterial = new THREE.MeshLambertMaterial({ 
            color: new THREE.Color(color).multiplyScalar(0.85),
            flatShading: true
        });
        const cargo = new THREE.Mesh(cargoGeometry, cargoMaterial);
        cargo.position.set(0, 0.5, -0.5);
        cargo.castShadow = true;
        group.add(cargo);
        
        // Windshield
        const windshieldGeometry = new THREE.BoxGeometry(0.8, 0.45, 0.15);
        const windshieldMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x87CEEB,
            flatShading: true,
            transparent: true,
            opacity: 0.6
        });
        const windshield = new THREE.Mesh(windshieldGeometry, windshieldMaterial);
        windshield.position.set(0, 0.6, 1.0);
        group.add(windshield);
        
        // Headlights
        const lightGeometry = new THREE.BoxGeometry(0.2, 0.15, 0.1);
        const lightMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xFFFF99,
            flatShading: true
        });
        
        const leftLight = new THREE.Mesh(lightGeometry, lightMaterial);
        leftLight.position.set(-0.3, 0.3, 1.1);
        group.add(leftLight);
        
        const rightLight = new THREE.Mesh(lightGeometry, lightMaterial);
        rightLight.position.set(0.3, 0.3, 1.1);
        group.add(rightLight);
        
        // Door line detail on cab
        const doorGeometry = new THREE.BoxGeometry(0.05, 0.5, 0.6);
        const doorMaterial = new THREE.MeshLambertMaterial({ 
            color: new THREE.Color(color).multiplyScalar(0.6),
            flatShading: true
        });
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0.5, 0.45, 0.6);
        group.add(door);
        
        // Wheels with rims
        const wheelGeometry = new THREE.BoxGeometry(0.28, 0.4, 0.4);
        const wheelMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x1a1a1a,
            flatShading: true
        });
        
        const rimGeometry = new THREE.BoxGeometry(0.3, 0.25, 0.25);
        const rimMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x666666,
            flatShading: true
        });
        
        // Front fenders
        const fenderGeometry = new THREE.BoxGeometry(0.15, 0.25, 0.5);
        const fenderMaterial = new THREE.MeshLambertMaterial({ 
            color: new THREE.Color(color).multiplyScalar(0.7),
            flatShading: true
        });
        
        const wheels = [
            { x: -0.55, z: 0.7 },
            { x: 0.55, z: 0.7 },
            { x: -0.55, z: -0.8 },
            { x: 0.55, z: -0.8 }
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
    
    // Create motorcycle - Simple small blocky bike
    createMotorcycle: (color = 0x1E88E5) => {
        // Palette colori realistici
        const realisticColors = [
            0xFFFFFF, // bianco
            0xC0C0C0, // argento
            0x1E88E5, // blu
            0xB71C1C, // rosso scuro
            0x388E3C, // verde scuro
            0xFFD600, // giallo
            0x757575, // grigio
            0xF5F5DC, // beige
            0x003366, // blu navy
            0x808000, // verde oliva
            0xFF0000, // rosso vivo
            0xFF9900, // arancione
            0xA0522D, // marrone chiaro
            0x444444, // grigio scuro
            0x87CEEB, // azzurro
            0x20B2AA  // verde acqua
        ];
        color = realisticColors[Math.floor(Math.random() * realisticColors.length)];
        const group = new THREE.Group();

        // Corpo principale
        const bodyGeometry = new THREE.BoxGeometry(0.5, 0.3, 1.0);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: color, flatShading: true });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.32;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Sella nera
        const seatGeometry = new THREE.BoxGeometry(0.45, 0.12, 0.35);
        const seatMaterial = new THREE.MeshLambertMaterial({ color: 0x222222, flatShading: true });
        const seat = new THREE.Mesh(seatGeometry, seatMaterial);
        seat.position.set(0, 0.43, -0.15);
        group.add(seat);

        // Parabrezza piccolo trasparente
        const windshieldGeometry = new THREE.BoxGeometry(0.32, 0.12, 0.05);
        const windshieldMaterial = new THREE.MeshLambertMaterial({ color: 0xB0E0FF, transparent: true, opacity: 0.7 });
        const windshield = new THREE.Mesh(windshieldGeometry, windshieldMaterial);
        windshield.position.set(0, 0.48, 0.38);
        group.add(windshield);

        // Manubrio
        const handleGeometry = new THREE.BoxGeometry(0.6, 0.07, 0.07);
        const handleMaterial = new THREE.MeshLambertMaterial({ color: 0x333333, flatShading: true });
        const handles = new THREE.Mesh(handleGeometry, handleMaterial);
        handles.position.set(0, 0.52, 0.45);
        group.add(handles);

        // Fari anteriori
        const headlightGeometry = new THREE.BoxGeometry(0.12, 0.08, 0.08);
        const headlightMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFAA });
        const headlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        headlight.position.set(0, 0.38, 0.52);
        group.add(headlight);

        // Fari posteriori
        const taillightGeometry = new THREE.BoxGeometry(0.10, 0.06, 0.06);
        const taillightMaterial = new THREE.MeshLambertMaterial({ color: 0xFF2222 });
        const taillight = new THREE.Mesh(taillightGeometry, taillightMaterial);
        taillight.position.set(0, 0.38, -0.52);
        group.add(taillight);

        // Ruote grandi
        const wheelGeometry = new THREE.CylinderGeometry(0.14, 0.14, 0.08, 16);
        const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
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
    
    // Create tree
    createTree: () => {
        const group = new THREE.Group();
        
        // Trunk
        const trunkGeometry = new THREE.BoxGeometry(0.3, 0.8, 0.3);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 0.5;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        group.add(trunk);
        
        // Foliage (3 layers)
        const foliageMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        
        const foliageGeometry1 = new THREE.BoxGeometry(1.0, 0.4, 1.0);
        const foliage1 = new THREE.Mesh(foliageGeometry1, foliageMaterial);
        foliage1.position.y = 1.0;
        foliage1.castShadow = true;
        group.add(foliage1);
        
        const foliageGeometry2 = new THREE.BoxGeometry(0.8, 0.4, 0.8);
        const foliage2 = new THREE.Mesh(foliageGeometry2, foliageMaterial);
        foliage2.position.y = 1.4;
        foliage2.castShadow = true;
        group.add(foliage2);
        
        const foliageGeometry3 = new THREE.BoxGeometry(0.5, 0.3, 0.5);
        const foliage3 = new THREE.Mesh(foliageGeometry3, foliageMaterial);
        foliage3.position.y = 1.75;
        foliage3.castShadow = true;
        group.add(foliage3);
        
        return group;
    },
    
    // Create coin with type: 'steem' (common), 'ethereum' (rare), 'bitcoin' (super rare)
    createCoin: (type = 'steem') => {
        const group = new THREE.Group();
        const coinGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 32);
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
        const edgeMaterial = new THREE.MeshLambertMaterial({ color: edgeColor });
        let faceMaterial;
        if (texturePath) {
            const loader = new THREE.TextureLoader();
            const texture = loader.load(texturePath);
            texture.center.set(0.5, 0.5);
            // Ruota solo STEEM e Bitcoin, non Ethereum
            if (type === 'steem' || type === 'bitcoin') {
                texture.rotation = Math.PI / 2;
            }
            texture.repeat.set(textureRepeat, textureRepeat); // Zoom variabile
            faceMaterial = new THREE.MeshLambertMaterial({ map: texture });
        } else {
            faceMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
        }
        // Ordine materiali: [lato, top, bottom]
        const materials = [edgeMaterial, faceMaterial, faceMaterial];
        const coin = new THREE.Mesh(coinGeometry, materials);
        coin.rotation.x = Math.PI / 2;
        coin.castShadow = true;
        group.add(coin);

        // Make it rotate
        group.userData.rotationSpeed = 0.05;
        group.userData.coinType = type;
        return group;
    },
    
    // Create log (floating platform on water) - grid-aligned
    createLog: (length = 3) => {
        const group = new THREE.Group();
        
        // Main log body - simple box, no caps
        const logGeometry = new THREE.BoxGeometry(length, 0.4, 0.9);
        const logMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x8B4513,
            flatShading: true
        });
        const log = new THREE.Mesh(logGeometry, logMaterial);
        log.castShadow = true;
        log.receiveShadow = true;
        group.add(log);
        
        // Darker stripes for texture
        const stripeGeometry = new THREE.BoxGeometry(length * 0.9, 0.41, 0.15);
        const stripeMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x654321,
            flatShading: true
        });
        const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
        stripe.position.y = 0.01;
        group.add(stripe);
        
        return group;
    },
    
    // Create lily pad (small platform on water)
    createLilyPad: () => {
        const group = new THREE.Group();
        
        const geometry = new THREE.CylinderGeometry(0.6, 0.6, 0.1, 8);
        const material = new THREE.MeshLambertMaterial({ 
            color: 0x2E7D32,
            flatShading: true
        });
        const pad = new THREE.Mesh(geometry, material);
        pad.position.y = 0.15;
        pad.castShadow = true;
        group.add(pad);
        
        // Small flower on top
        const flowerGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const flowerMaterial = new THREE.MeshLambertMaterial({ color: 0xFFB6C1 });
        const flower = new THREE.Mesh(flowerGeometry, flowerMaterial);
        flower.position.y = 0.3;
        group.add(flower);
        
        return group;
    },
    
    // Create terrain block
    createTerrainBlock: (type = 'grass') => {
        const geometry = new THREE.BoxGeometry(1, 0.5, 1);
        let material;
        
        switch(type) {
            case 'grass':
                material = new THREE.MeshLambertMaterial({ 
                    color: 0x5FAD56,
                    flatShading: true
                });
                break;
            case 'road':
                // Varied asphalt colors for visual interest
                const roadColors = [0x555555, 0x4A4A4A, 0x606060];
                material = new THREE.MeshLambertMaterial({ 
                    color: roadColors[Math.floor(Math.random() * roadColors.length)],
                    flatShading: true
                });
                break;
            case 'water':
                // Varied water blues
                const waterColors = [0x2196F3, 0x42A5F5, 0x1E88E5];
                material = new THREE.MeshLambertMaterial({ 
                    color: waterColors[Math.floor(Math.random() * waterColors.length)],
                    flatShading: true,
                    transparent: true,
                    opacity: 0.9
                });
                break;
            case 'rail':
                material = new THREE.MeshLambertMaterial({ 
                    color: 0x6B5742,
                    flatShading: true
                });
                break;
            default:
                // Varied grass greens
                const grassColors = [0x5FAD56, 0x6BB85D, 0x52A047, 0x5CB85C];
                material = new THREE.MeshLambertMaterial({ 
                    color: grassColors[Math.floor(Math.random() * grassColors.length)],
                    flatShading: true
                });
        }
        
        const block = new THREE.Mesh(geometry, material);
        block.receiveShadow = true;
        block.castShadow = false;
        block.position.y = -0.25; // Half of block height (0.5/2) to sit on ground
        
        return block;
    },
    
    // Add road stripe decoration (runs left-right along X axis)
    createRoadStripe: (z, type = 'center') => {
        const geometry = new THREE.PlaneGeometry(30, type === 'center' ? 0.15 : 0.1);
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
    createRailTrack: () => {
        const group = new THREE.Group();
        
        // Rails (shiny metal) - extend along X axis (left to right)
        const railGeometry = new THREE.BoxGeometry(30, 0.1, 0.1);
        const railMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xA8A8A8,
            flatShading: true
        });
        
        const leftRail = new THREE.Mesh(railGeometry, railMaterial);
        leftRail.position.set(0, 0.28, -0.32);
        group.add(leftRail);
        
        const rightRail = new THREE.Mesh(railGeometry, railMaterial);
        rightRail.position.set(0, 0.28, 0.32);
        group.add(rightRail);
        
        // Wooden sleepers using InstancedMesh (1 draw call instead of 50!)
        const sleeperGeometry = new THREE.BoxGeometry(0.15, 0.12, 0.85);
        const sleeperMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x6B4423,
            flatShading: true
        });
        
        const sleeperCount = 50;
        const sleepers = new THREE.InstancedMesh(sleeperGeometry, sleeperMaterial, sleeperCount);
        
        const matrix = new THREE.Matrix4();
        let index = 0;
        for (let x = -12; x <= 12; x += 0.5) {
            if (index >= sleeperCount) break;
            matrix.setPosition(x, 0.26, 0);
            sleepers.setMatrixAt(index, matrix);
            index++;
        }
        sleepers.instanceMatrix.needsUpdate = true;
        
        group.add(sleepers);
        
        return group;
    },
    
    // Create permanent train warning light
    createTrainWarningLight: () => {
        const group = new THREE.Group();
        
        // Base - concrete base (simplified)
        const baseGeometry = new THREE.CylinderGeometry(0.15, 0.18, 0.15, 6); // 8 -> 6 segments
        const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x555555 });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0.075;
        base.castShadow = true;
        group.add(base);
        
        // Pole - metal pole (simplified)
        const poleGeometry = new THREE.CylinderGeometry(0.06, 0.06, 1.4, 6); // 8 -> 6 segments
        const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.y = 0.85;
        pole.castShadow = true;
        group.add(pole);
        
        // Light housing - black box with stripe
        const housingGeometry = new THREE.BoxGeometry(0.3, 0.4, 0.2);
        const housingMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
        const housing = new THREE.Mesh(housingGeometry, housingMaterial);
        housing.position.y = 1.65;
        housing.castShadow = true;
        group.add(housing);
        
        // Yellow stripe on housing
        const stripeGeometry = new THREE.BoxGeometry(0.31, 0.08, 0.21);
        const stripeMaterial = new THREE.MeshLambertMaterial({ color: 0xffdd00 });
        const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
        stripe.position.y = 1.5;
        group.add(stripe);
        
        // Light lens - glass sphere (transparent when off) - simplified
        const lensGeometry = new THREE.SphereGeometry(0.12, 8, 8); // 16x16 -> 8x8
        const lensMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xffffff,
            transparent: true,
            opacity: 0.1,
            emissive: 0x000000,
            emissiveIntensity: 0,
            shininess: 100
        });
        const lens = new THREE.Mesh(lensGeometry, lensMaterial);
        lens.position.set(0, 1.65, 0.12);
        lens.userData.isWarningLight = true;
        group.add(lens);
        
        // Add red point light for glow effect - MUCH BRIGHTER
        const pointLight = new THREE.PointLight(0xff0000, 0, 8);
        pointLight.position.set(0, 1.65, 0.2);
        pointLight.userData.isWarningPointLight = true;
        group.add(pointLight);
        
        return group;
    },
    

    
    // Create grass tuft decoration
    createGrassTuft: () => {
        const group = new THREE.Group();
        const material = new THREE.MeshLambertMaterial({ color: 0x5FAD56 });
        
        for (let i = 0; i < 3; i++) {
            const blade = new THREE.BoxGeometry(0.05, 0.3, 0.05);
            const mesh = new THREE.Mesh(blade, material);
            mesh.position.set(
                (Math.random() - 0.5) * 0.2,
                0.35,
                (Math.random() - 0.5) * 0.2
            );
            mesh.rotation.z = (Math.random() - 0.5) * 0.3;
            group.add(mesh);
        }
        
        return group;
    },
    
    // Create flower decoration
    createFlower: () => {
        const group = new THREE.Group();
        
        // Stem
        const stemGeometry = new THREE.BoxGeometry(0.05, 0.3, 0.05);
        const stemMaterial = new THREE.MeshLambertMaterial({ color: 0x2F8B2D });
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.y = 0.35;
        group.add(stem);
        
        // Flower head
        const colors = [0xFF69B4, 0xFFFF00, 0xFF6347, 0xFF00FF, 0xFFA500];
        const flowerColor = colors[Math.floor(Math.random() * colors.length)];
        const flowerGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
        const flowerMaterial = new THREE.MeshLambertMaterial({ color: flowerColor });
        const flower = new THREE.Mesh(flowerGeometry, flowerMaterial);
        flower.position.y = 0.5;
        group.add(flower);
        
        return group;
    },
    
    // Create rock decoration (bigger and more visible as obstacles)
    createRock: () => {
        const sizes = [0.35, 0.4, 0.45]; // Increased from 0.2-0.3
        const size = sizes[Math.floor(Math.random() * sizes.length)];
        
        const geometry = new THREE.BoxGeometry(size, size * 0.7, size);
        const material = new THREE.MeshLambertMaterial({ 
            color: 0x696969, // Darker gray for better visibility
            flatShading: true 
        });
        const rock = new THREE.Mesh(geometry, material);
        rock.position.y = 0.3;
        rock.rotation.y = Math.random() * Math.PI;
        rock.castShadow = false; // No shadows for small rocks
        rock.receiveShadow = true;
        
        return rock;
    },
    
    // Create train (long vehicle for rail tracks)
    createTrain: (color = 0x9C27B0) => {
        // Palette colori realistici treno
        const realisticTrainColors = [
            0xB71C1C, // rosso scuro
            0x1E88E5, // blu
            0x757575, // grigio
            0xFFD600, // giallo
            0xC0C0C0, // argento
            0x8D6E63, // marrone
            0xF5F5DC, // beige
            0x003366, // blu navy
            0xFF0000, // rosso vivo
            0xFF9900, // arancione
            0xA0522D, // marrone chiaro
            0x444444, // grigio scuro
            0x87CEEB // azzurro

        ];
        // Scegli colore locomotiva
        color = realisticTrainColors[Math.floor(Math.random() * realisticTrainColors.length)];
        // Scegli colore carrozze diverso dalla locomotiva
        let carColor = realisticTrainColors.filter(c => c !== color)[Math.floor(Math.random() * (realisticTrainColors.length - 1))];
        const group = new THREE.Group();
        group.userData.trainColor = color;
        group.userData.trainCarColor = carColor;
        // Engine front
        const engineGeometry = new THREE.BoxGeometry(1.2, 0.8, 1.8);
        const engineMaterial = new THREE.MeshLambertMaterial({ 
            color: color,
            flatShading: true
        });
        const engine = new THREE.Mesh(engineGeometry, engineMaterial);
        engine.position.y = 0.5;
        engine.castShadow = true;
        group.add(engine);
        
        // Chimney
        const chimneyGeometry = new THREE.BoxGeometry(0.3, 0.5, 0.3);
        const chimneyMaterial = new THREE.MeshLambertMaterial({ color: 0x2C3E50 });
        const chimney = new THREE.Mesh(chimneyGeometry, chimneyMaterial);
        chimney.position.set(0, 1.15, 0.4);
        chimney.castShadow = true;
        group.add(chimney);
        
        // Cabin
        const cabinGeometry = new THREE.BoxGeometry(1.0, 0.6, 1.0);
        const cabinMaterial = new THREE.MeshLambertMaterial({ 
            color: color,
            flatShading: true
        });
        const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
        cabin.position.set(0, 1.1, -0.5);
        cabin.castShadow = true;
        group.add(cabin);
        
        // Windows
        const windowGeometry = new THREE.BoxGeometry(1.01, 0.4, 0.3);
        const windowMaterial = new THREE.MeshLambertMaterial({ color: 0x87CEEB });
        const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
        window1.position.set(0, 1.1, -0.3);
        group.add(window1);
        
        // Wheels
        const wheelGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.2, 8);
        const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x2C3E50 });
        
        const wheelPositions = [
            { x: -0.5, z: 0.6 },
            { x: 0.5, z: 0.6 },
            { x: -0.5, z: -0.2 },
            { x: 0.5, z: -0.2 },
            { x: -0.5, z: -1.0 },
            { x: 0.5, z: -1.0 }
        ];
        
        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(pos.x, 0.2, pos.z);
            wheel.castShadow = true;
            wheel.userData.isWheel = true;
            group.add(wheel);
        });
        
        return group;
    },
    
    createTrainCar: (color = 0x9C27B0) => {
        // Palette colori realistici treno
        const realisticTrainColors = [
            0xB71C1C, // rosso scuro
            0x1E88E5, // blu
            0x757575, // grigio
            0xFFD600, // giallo
            0xC0C0C0, // argento
            0x8D6E63, // marrone
            0xF5F5DC, // beige
            0xFF0000, // rosso vivo
            0xFF9900, // arancione
            0xA0522D, // marrone chiaro
            0x444444, // grigio scuro
            0x87CEEB, // azzurro
        ];
        // Se il colore carrozza è passato dalla locomotiva, usa quello
        if (typeof this !== 'undefined' && this.userData && this.userData.trainCarColor) {
            color = this.userData.trainCarColor;
        }
        const group = new THREE.Group();
        // Main car body - cargo container style
        const bodyGeometry = new THREE.BoxGeometry(1.2, 0.7, 2.0);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: color,
            flatShading: true
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.5;
        body.castShadow = true;
        group.add(body);
        
        // Roof
        const roofGeometry = new THREE.BoxGeometry(1.3, 0.1, 2.1);
        const roofMaterial = new THREE.MeshLambertMaterial({ 
            color: THREE.MathUtils.lerp(color, 0x000000, 0.3), // Darker roof
            flatShading: true
        });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = 0.9;
        roof.castShadow = true;
        group.add(roof);
        
        // Wheels (4 wheels)
        const wheelGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.2, 8);
        const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x2C3E50 });
        
        const wheelPositions = [
            { x: -0.5, z: 0.7 },
            { x: 0.5, z: 0.7 },
            { x: -0.5, z: -0.7 },
            { x: 0.5, z: -0.7 }
        ];
        
        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(pos.x, 0.2, pos.z);
            wheel.castShadow = true;
            wheel.userData.isWheel = true;
            group.add(wheel);
        });
        
        return group;
    }
};
