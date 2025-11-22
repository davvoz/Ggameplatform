// models.js - Voxel 3D model creation functions

const Models = {
    // Create player character (chicken/character voxel style)
    createPlayer: () => {
        const group = new THREE.Group();
        
        // Body (bright orange)
        const bodyGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xFF6B35,
            flatShading: true
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.6;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);
        
        // Head (lighter orange)
        const headGeometry = new THREE.BoxGeometry(0.7, 0.7, 0.7);
        const headMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xFFB84D,
            flatShading: true
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.3;
        head.castShadow = true;
        head.receiveShadow = true;
        group.add(head);
        
        // Eyes (black)
        const eyeGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
        const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.2, 1.4, 0.36);
        group.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.2, 1.4, 0.36);
        group.add(rightEye);
        
        // Beak (dark orange)
        const beakGeometry = new THREE.BoxGeometry(0.25, 0.2, 0.2);
        const beakMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xE55812,
            flatShading: true
        });
        const beak = new THREE.Mesh(beakGeometry, beakMaterial);
        beak.position.set(0, 1.25, 0.5);
        beak.castShadow = true;
        group.add(beak);
        
        // Store references for animations
        group.userData.body = body;
        group.userData.head = head;
        
        return group;
    },
    
    // Create car/vehicle
    createCar: (color = 0xFF4444) => {
        const group = new THREE.Group();
        
        // Car body
        const bodyGeometry = new THREE.BoxGeometry(0.8, 0.4, 1.6);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: color });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.3;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);
        
        // Car roof/cabin
        const roofGeometry = new THREE.BoxGeometry(0.7, 0.35, 0.9);
        const roofMaterial = new THREE.MeshLambertMaterial({ color: color });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = 0.65;
        roof.position.z = -0.2;
        roof.castShadow = true;
        group.add(roof);
        
        // Windows
        const windowGeometry = new THREE.BoxGeometry(0.71, 0.25, 0.4);
        const windowMaterial = new THREE.MeshLambertMaterial({ color: 0x4DD0E1 });
        const frontWindow = new THREE.Mesh(windowGeometry, windowMaterial);
        frontWindow.position.set(0, 0.65, 0.25);
        group.add(frontWindow);
        
        // Wheels
        const wheelGeometry = new THREE.BoxGeometry(0.2, 0.25, 0.25);
        const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x2C3E50 });
        
        const wheels = [
            { x: -0.35, z: 0.6 },
            { x: 0.35, z: 0.6 },
            { x: -0.35, z: -0.6 },
            { x: 0.35, z: -0.6 }
        ];
        
        wheels.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.position.set(pos.x, 0.1, pos.z);
            wheel.castShadow = true;
            group.add(wheel);
        });
        
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
    
    // Create coin
    createCoin: () => {
        const group = new THREE.Group();
        
        const coinGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
        const coinMaterial = new THREE.MeshLambertMaterial({ color: 0xFFD700, emissive: 0xFFAA00 });
        const coin = new THREE.Mesh(coinGeometry, coinMaterial);
        coin.rotation.x = Math.PI / 2;
        coin.castShadow = true;
        group.add(coin);
        
        // Make it rotate
        group.userData.rotationSpeed = 0.05;
        
        return group;
    },
    
    // Create log (floating platform on water)
    createLog: (length = 3) => {
        const group = new THREE.Group();
        
        // Main log body
        const logGeometry = new THREE.BoxGeometry(length, 0.4, 0.8);
        const logMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x8B4513,
            flatShading: true
        });
        const log = new THREE.Mesh(logGeometry, logMaterial);
        log.castShadow = true;
        log.receiveShadow = true;
        group.add(log);
        
        // End caps (darker)
        const capMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
        
        const leftCap = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.4, 0.8, 8),
            capMaterial
        );
        leftCap.rotation.z = Math.PI / 2;
        leftCap.position.x = -length / 2;
        group.add(leftCap);
        
        const rightCap = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.4, 0.8, 8),
            capMaterial
        );
        rightCap.rotation.z = Math.PI / 2;
        rightCap.position.x = length / 2;
        group.add(rightCap);
        
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
        block.position.y = 0;
        
        return block;
    },
    
    // Create rail track decoration
    createRailTrack: () => {
        const group = new THREE.Group();
        
        // Rails
        const railGeometry = new THREE.BoxGeometry(0.1, 0.05, 1);
        const railMaterial = new THREE.MeshLambertMaterial({ color: 0x708090 });
        
        const leftRail = new THREE.Mesh(railGeometry, railMaterial);
        leftRail.position.set(-0.3, 0.21, 0);
        group.add(leftRail);
        
        const rightRail = new THREE.Mesh(railGeometry, railMaterial);
        rightRail.position.set(0.3, 0.21, 0);
        group.add(rightRail);
        
        // Sleepers
        const sleeperGeometry = new THREE.BoxGeometry(0.8, 0.05, 0.15);
        const sleeperMaterial = new THREE.MeshLambertMaterial({ color: 0x5D4E37 });
        
        for (let i = -0.4; i <= 0.4; i += 0.3) {
            const sleeper = new THREE.Mesh(sleeperGeometry, sleeperMaterial);
            sleeper.position.set(0, 0.205, i);
            group.add(sleeper);
        }
        
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
        rock.castShadow = true;
        rock.receiveShadow = true;
        
        return rock;
    },
    
    // Create train (long vehicle for rail tracks)
    createTrain: (color = 0x9C27B0) => {
        const group = new THREE.Group();
        
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
    }
};
