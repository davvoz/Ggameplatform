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
    
    // Create tree - OPTIMIZED
    createTree: () => {
        const group = new THREE.Group();
        
        // Trunk using pooled geometry + poolable material (static decoration)
        const trunkGeometry = GeometryPool.getBoxGeometry(0.3, 0.8, 0.3);
        const trunkMaterial = MaterialPool.getMaterial(0x8B4513, { poolable: true });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 0.5;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        group.add(trunk);
        
        // Foliage (3 layers) using pooled geometry + poolable material (static decoration)
        const foliageMaterial = MaterialPool.getMaterial(0x228B22, { poolable: true });
        
        const foliageGeometry1 = GeometryPool.getBoxGeometry(1.0, 0.4, 1.0);
        const foliage1 = new THREE.Mesh(foliageGeometry1, foliageMaterial);
        foliage1.position.y = 1.0;
        foliage1.castShadow = true;
        group.add(foliage1);
        
        const foliageGeometry2 = GeometryPool.getBoxGeometry(0.8, 0.4, 0.8);
        const foliage2 = new THREE.Mesh(foliageGeometry2, foliageMaterial);
        foliage2.position.y = 1.4;
        foliage2.castShadow = true;
        group.add(foliage2);
        
        const foliageGeometry3 = GeometryPool.getBoxGeometry(0.5, 0.3, 0.5);
        const foliage3 = new THREE.Mesh(foliageGeometry3, foliageMaterial);
        foliage3.position.y = 1.75;
        foliage3.castShadow = true;
        group.add(foliage3);
        
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
                faceMaterial = new THREE.MeshLambertMaterial({ map: texture });
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
        group.add(coin);

        // Make it rotate
        group.userData.rotationSpeed = 0.05;
        group.userData.coinType = type;
        return group;
    },
    
    // Create log (floating platform on water) - grid-aligned - OPTIMIZED
    createLog: (length = 3) => {
        const group = new THREE.Group();
        
        // Main log body - NOTA: lunghezza variabile, dobbiamo creare geometria dinamica
        const logGeometry = new THREE.BoxGeometry(length, 0.4, 0.9);
        const logMaterial = MaterialPool.getMaterial(0x8B4513);
        const log = new THREE.Mesh(logGeometry, logMaterial);
        log.castShadow = true;
        log.receiveShadow = true;
        group.add(log);
        
        // Darker stripes for texture
        const stripeGeometry = new THREE.BoxGeometry(length * 0.9, 0.41, 0.15);
        const stripeMaterial = MaterialPool.getMaterial(0x654321);
        const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
        stripe.position.y = 0.01;
        group.add(stripe);
        
        return group;
    },
    
    // Create lily pad (small platform on water) - OPTIMIZED
    createLilyPad: () => {
        const group = new THREE.Group();
        
        const geometry = GeometryPool.getCylinderGeometry(0.6, 0.6, 0.1, 8);
        const material = MaterialPool.getMaterial(0x2E7D32);
        const pad = new THREE.Mesh(geometry, material);
        pad.position.y = 0.15;
        pad.castShadow = true;
        group.add(pad);
        
        // Small flower on top
        const flowerGeometry = GeometryPool.getBoxGeometry(0.2, 0.2, 0.2);
        const flowerMaterial = MaterialPool.getMaterial(0xFFB6C1);
        const flower = new THREE.Mesh(flowerGeometry, flowerMaterial);
        flower.position.y = 0.3;
        group.add(flower);
        
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
        
        // Base - concrete base (simplified) - POOLED (static, never changes)
        const baseGeometry = GeometryPool.getCylinderGeometry(0.15, 0.18, 0.15, 6);
        const baseMaterial = MaterialPool.getMaterial(0x555555, { poolable: true });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0.075;
        base.castShadow = true;
        group.add(base);
        
        // Pole - metal pole (simplified) - POOLED (static, never changes)
        const poleGeometry = GeometryPool.getCylinderGeometry(0.06, 0.06, 1.4, 6);
        const poleMaterial = MaterialPool.getMaterial(0x222222, { poolable: true });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.y = 0.85;
        pole.castShadow = true;
        group.add(pole);
        
        // Light housing - black box with stripe - POOLED (static, never changes)
        const housingGeometry = GeometryPool.getBoxGeometry(0.3, 0.4, 0.2);
        const housingMaterial = MaterialPool.getMaterial(0x1a1a1a, { poolable: true });
        const housing = new THREE.Mesh(housingGeometry, housingMaterial);
        housing.position.y = 1.65;
        housing.castShadow = true;
        group.add(housing);
        
        // Yellow stripe on housing - POOLED (static, never changes)
        const stripeGeometry = GeometryPool.getBoxGeometry(0.31, 0.08, 0.21);
        const stripeMaterial = MaterialPool.getMaterial(0xffdd00, { poolable: true });
        const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
        stripe.position.y = 1.5;
        group.add(stripe);
        
        // Light lens - glass sphere (transparent when off) - NOT POOLED (animated opacity!)
        const lensGeometry = GeometryPool.getSphereGeometry(0.12, 8, 8);
        // Phong material NOT pooled - opacity changes for animation
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
    

    
    // Create grass tuft decoration - OPTIMIZED
    createGrassTuft: () => {
        const group = new THREE.Group();
        const bladeGeometry = GeometryPool.getBoxGeometry(0.05, 0.3, 0.05);
        const material = MaterialPool.getMaterial(0x5FAD56, { poolable: true });
        
        for (let i = 0; i < 3; i++) {
            const mesh = new THREE.Mesh(bladeGeometry, material);
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
    
    // Create flower decoration - OPTIMIZED
    createFlower: () => {
        const group = new THREE.Group();
        
        // Stem using pooled geometry + poolable material (static decoration)
        const stemGeometry = GeometryPool.getBoxGeometry(0.05, 0.3, 0.05);
        const stemMaterial = MaterialPool.getMaterial(0x2F8B2D, { poolable: true });
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.y = 0.35;
        group.add(stem);
        
        // Flower head using pooled geometry + poolable material (static decoration)
        const colors = [0xFF69B4, 0xFFFF00, 0xFF6347, 0xFF00FF, 0xFFA500];
        const flowerColor = colors[Math.floor(Math.random() * colors.length)];
        const flowerGeometry = GeometryPool.getBoxGeometry(0.15, 0.15, 0.15);
        const flowerMaterial = MaterialPool.getMaterial(flowerColor, { poolable: true });
        const flower = new THREE.Mesh(flowerGeometry, flowerMaterial);
        flower.position.y = 0.5;
        group.add(flower);
        
        return group;
    },
    
    // Create rock decoration (bigger and more visible as obstacles) - OPTIMIZED
    createRock: () => {
        const sizes = [0.35, 0.4, 0.45]; // Increased from 0.2-0.3
        const size = sizes[Math.floor(Math.random() * sizes.length)];
        
        const geometry = GeometryPool.getBoxGeometry(size, size * 1.0, size); // Altezza aumentata (era 0.7)
        const material = MaterialPool.getMaterial(0x696969, { poolable: true });
        const rock = new THREE.Mesh(geometry, material);
        rock.position.y = 0.35; // Alzato leggermente
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
        // Engine front - POOLED (no fade-out anymore)
        const engineGeometry = GeometryPool.getBoxGeometry(1.2, 0.8, 1.8);
        const engineMaterial = MaterialPool.getMaterial(color, { poolable: true });
        const engine = new THREE.Mesh(engineGeometry, engineMaterial);
        engine.position.y = 0.5;
        engine.castShadow = true;
        group.add(engine);
        
        // Chimney
        const chimneyGeometry = GeometryPool.getBoxGeometry(0.3, 0.5, 0.3);
        const chimneyMaterial = MaterialPool.getMaterial(0x2C3E50, { poolable: true });
        const chimney = new THREE.Mesh(chimneyGeometry, chimneyMaterial);
        chimney.position.set(0, 1.15, 0.4);
        chimney.castShadow = true;
        group.add(chimney);
        
        // Cabin
        const cabinGeometry = GeometryPool.getBoxGeometry(1.0, 0.6, 1.0);
        const cabinMaterial = MaterialPool.getMaterial(color, { poolable: true });
        const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
        cabin.position.set(0, 1.1, -0.5);
        cabin.castShadow = true;
        group.add(cabin);
        
        // Windows
        const windowGeometry = GeometryPool.getBoxGeometry(1.01, 0.4, 0.3);
        const windowMaterial = MaterialPool.getMaterial(0x87CEEB, { poolable: true });
        const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
        window1.position.set(0, 1.1, -0.3);
        group.add(window1);
        
        // Wheels
        const wheelGeometry = GeometryPool.getCylinderGeometry(0.25, 0.25, 0.2, 8);
        const wheelMaterial = MaterialPool.getMaterial(0x2C3E50, { poolable: true });
        
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
        // Main car body - POOLED (no fade-out anymore)
        const bodyGeometry = GeometryPool.getBoxGeometry(1.2, 0.7, 2.0);
        const bodyMaterial = MaterialPool.getMaterial(color, { poolable: true });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.5;
        body.castShadow = true;
        group.add(body);
        
        // Roof
        const roofGeometry = GeometryPool.getBoxGeometry(1.3, 0.1, 2.1);
        const roofColor = new THREE.Color(color).lerp(new THREE.Color(0x000000), 0.3).getHex();
        const roofMaterial = MaterialPool.getMaterial(roofColor, { poolable: true });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = 0.9;
        roof.castShadow = true;
        group.add(roof);
        
        // Wheels (4 wheels)
        const wheelGeometry = GeometryPool.getCylinderGeometry(0.25, 0.25, 0.2, 8);
        const wheelMaterial = MaterialPool.getMaterial(0x2C3E50, { poolable: true });
        
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
