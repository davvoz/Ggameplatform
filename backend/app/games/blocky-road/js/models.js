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
    
    // Create car - Cute Crossy Road style
    createCar: (color = 0xFF4444) => {
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
        
        // Windshield/cabin
        const cabinGeometry = new THREE.BoxGeometry(0.75, 0.4, 0.7);
        const cabinMaterial = new THREE.MeshLambertMaterial({ 
            color: new THREE.Color(color).multiplyScalar(0.7),
            flatShading: true
        });
        const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
        cabin.position.set(0, 0.65, 0.1);
        cabin.castShadow = true;
        group.add(cabin);
        
        // Cute eyes on windshield
        const eyeGeometry = new THREE.BoxGeometry(0.15, 0.12, 0.1);
        const eyeMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xffffff,
            flatShading: true
        });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.2, 0.7, 0.45);
        group.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.2, 0.7, 0.45);
        group.add(rightEye);
        
        // Pupils
        const pupilGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.08);
        const pupilMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
        
        const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        leftPupil.position.set(-0.2, 0.7, 0.5);
        group.add(leftPupil);
        
        const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rightPupil.position.set(0.2, 0.7, 0.5);
        group.add(rightPupil);
        
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
        const group = new THREE.Group();
        
        // Simple small body
        const bodyGeometry = new THREE.BoxGeometry(0.5, 0.4, 1.0);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: color,
            flatShading: true
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.3;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);
        
        // Simple handlebars
        const handleGeometry = new THREE.BoxGeometry(0.6, 0.1, 0.1);
        const handleMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x333333,
            flatShading: true
        });
        const handles = new THREE.Mesh(handleGeometry, handleMaterial);
        handles.position.set(0, 0.5, 0.4);
        group.add(handles);
        
        // Simple small wheels
        const wheelGeometry = new THREE.BoxGeometry(0.15, 0.25, 0.25);
        const wheelMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x1a1a1a,
            flatShading: true
        });
        
        const frontWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        frontWheel.position.set(0, 0.12, 0.5);
        frontWheel.castShadow = true;
        frontWheel.userData.isWheel = true;
        group.add(frontWheel);
        
        const backWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        backWheel.position.set(0, 0.12, -0.5);
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
        const railGeometry = new THREE.BoxGeometry(60, 0.1, 0.1);
        const railMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xA8A8A8,
            shininess: 80,
            flatShading: true
        });
        
        const leftRail = new THREE.Mesh(railGeometry, railMaterial);
        leftRail.position.set(0, 0.28, -0.32);
        leftRail.castShadow = true;
        group.add(leftRail);
        
        const rightRail = new THREE.Mesh(railGeometry, railMaterial);
        rightRail.position.set(0, 0.28, 0.32);
        rightRail.castShadow = true;
        group.add(rightRail);
        
        // Wooden sleepers (perpendicular to rails - run along Z)
        const sleeperGeometry = new THREE.BoxGeometry(0.15, 0.12, 0.85);
        const sleeperMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x6B4423,
            flatShading: true
        });
        
        for (let x = -30; x <= 30; x += 0.5) {
            const sleeper = new THREE.Mesh(sleeperGeometry, sleeperMaterial);
            sleeper.position.set(x, 0.26, 0);
            sleeper.castShadow = true;
            sleeper.receiveShadow = true;
            group.add(sleeper);
        }
        
        return group;
    },
    
    // Create permanent train warning light
    createTrainWarningLight: () => {
        const group = new THREE.Group();
        
        // Base - concrete base
        const baseGeometry = new THREE.CylinderGeometry(0.15, 0.18, 0.15, 8);
        const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x555555 });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0.075;
        base.castShadow = true;
        group.add(base);
        
        // Pole - metal pole
        const poleGeometry = new THREE.CylinderGeometry(0.06, 0.06, 1.4, 8);
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
        
        // Light lens - glass sphere (transparent when off)
        const lensGeometry = new THREE.SphereGeometry(0.12, 16, 16);
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
    },
    
    createTrainCar: (color = 0x9C27B0) => {
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
