// particles.js - Particle effects system

class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
    }
    
    // Jump particles
    createJumpParticles(position) {
        const particleCount = 8;
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        const velocities = [];
        
        for (let i = 0; i < particleCount; i++) {
            positions.push(position.x, position.y + 0.2, position.z);
            
            // White-ish particles
            colors.push(1, 1, 1);
            
            // Random velocities
            velocities.push(
                (Math.random() - 0.5) * 0.1,
                Math.random() * 0.15,
                (Math.random() - 0.5) * 0.1
            );
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 1
        });
        
        const particleSystem = new THREE.Points(geometry, material);
        this.scene.add(particleSystem);
        
        this.particles.push({
            system: particleSystem,
            velocities: velocities,
            life: 30,
            maxLife: 30
        });
    }
    
    // Death particles (explosion)
    createDeathParticles(position) {
        const particleCount = 20;
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        const velocities = [];
        
        for (let i = 0; i < particleCount; i++) {
            positions.push(position.x, position.y + 0.5, position.z);
            
            // Red-ish particles
            colors.push(1, 0.2, 0.2);
            
            // Explosive velocities
            velocities.push(
                (Math.random() - 0.5) * 0.3,
                Math.random() * 0.3 + 0.1,
                (Math.random() - 0.5) * 0.3
            );
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.15,
            vertexColors: true,
            transparent: true,
            opacity: 1
        });
        
        const particleSystem = new THREE.Points(geometry, material);
        this.scene.add(particleSystem);
        
        this.particles.push({
            system: particleSystem,
            velocities: velocities,
            life: 40,
            maxLife: 40
        });
    }
    
    // Water splash particles (for drowning)
    createWaterSplash(position) {
        const particleCount = 20;
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        const velocities = [];
        
        for (let i = 0; i < particleCount; i++) {
            // Spread particles in a ring around impact point
            const angle = (i / particleCount) * Math.PI * 2;
            const radius = 0.1;
            positions.push(
                position.x + Math.cos(angle) * radius,
                position.y + 0.1,
                position.z + Math.sin(angle) * radius
            );
            
            // Blue-white water particles
            const brightness = 0.7 + Math.random() * 0.3;
            colors.push(brightness * 0.6, brightness * 0.8, brightness);
            
            // Splash outward and up in a ring
            const speed = 0.15 + Math.random() * 0.15;
            velocities.push(
                Math.cos(angle) * speed,
                Math.random() * 0.25 + 0.15,
                Math.sin(angle) * speed
            );
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.12,
            vertexColors: true,
            transparent: true,
            opacity: 1
        });
        
        const particleSystem = new THREE.Points(geometry, material);
        this.scene.add(particleSystem);
        
        this.particles.push({
            system: particleSystem,
            velocities: velocities,
            life: 50,
            maxLife: 50,
            gravity: 0.012  // Water drops fall
        });
    }
    
    // Bubbles rising from underwater
    createBubbles(position) {
        const particleCount = 10;
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        const velocities = [];
        
        for (let i = 0; i < particleCount; i++) {
            // Spread bubbles randomly around position
            positions.push(
                position.x + (Math.random() - 0.5) * 0.4,
                position.y + Math.random() * 0.2,
                position.z + (Math.random() - 0.5) * 0.4
            );
            
            // Light blue/white bubbles
            const brightness = 0.8 + Math.random() * 0.2;
            colors.push(brightness * 0.8, brightness * 0.9, brightness);
            
            // Bubbles float up with slight wobble
            velocities.push(
                (Math.random() - 0.5) * 0.02,
                Math.random() * 0.08 + 0.05,  // Rise up
                (Math.random() - 0.5) * 0.02
            );
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.08,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });
        
        const particleSystem = new THREE.Points(geometry, material);
        this.scene.add(particleSystem);
        
        this.particles.push({
            system: particleSystem,
            velocities: velocities,
            life: 60,
            maxLife: 60,
            wobble: true  // Add wobble effect
        });
    }
    
    // Coin collect particles
    createCoinParticles(position) {
        const particleCount = 12;
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        const velocities = [];
        
        for (let i = 0; i < particleCount; i++) {
            positions.push(position.x, position.y + 0.5, position.z);
            
            // Golden particles
            colors.push(1, 0.84, 0);
            
            // Upward burst
            velocities.push(
                (Math.random() - 0.5) * 0.2,
                Math.random() * 0.2 + 0.15,
                (Math.random() - 0.5) * 0.2
            );
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.12,
            vertexColors: true,
            transparent: true,
            opacity: 1
        });
        
        const particleSystem = new THREE.Points(geometry, material);
        this.scene.add(particleSystem);
        
        this.particles.push({
            system: particleSystem,
            velocities: velocities,
            life: 35,
            maxLife: 35
        });
    }
    
    update(normalizedDelta = 1) {
        // Update particles every other frame for performance
        if (!this.updateCounter) this.updateCounter = 0;
        this.updateCounter++;
        const skipPhysics = this.updateCounter % 2 === 0;
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Skip physics update every other frame
            if (!skipPhysics) {
                const positions = particle.system.geometry.attributes.position.array;
                
                // Update particle positions
                for (let j = 0; j < positions.length; j += 3) {
                    // Add wobble effect for bubbles
                    if (particle.wobble) {
                        positions[j] += particle.velocities[j] + Math.sin(this.updateCounter * 0.3 + j) * 0.005;
                    } else {
                        positions[j] += particle.velocities[j];         // x
                    }
                    positions[j + 1] += particle.velocities[j + 1]; // y
                    positions[j + 2] += particle.velocities[j + 2]; // z
                    
                    // Gravity (use custom gravity if set, otherwise default)
                    const gravity = particle.gravity || 0.01;
                    if (!particle.wobble) {  // Bubbles don't have gravity
                        particle.velocities[j + 1] -= gravity;
                    }
                }
                
                particle.system.geometry.attributes.position.needsUpdate = true;
            }
            
            // Fade out (always update)
            particle.life--;
            particle.system.material.opacity = particle.life / particle.maxLife;
            
            // Remove dead particles
            if (particle.life <= 0) {
                this.scene.remove(particle.system);
                particle.system.geometry.dispose();
                particle.system.material.dispose();
                this.particles.splice(i, 1);
            }
        }
    }
    
    clear() {
        this.particles.forEach(particle => {
            this.scene.remove(particle.system);
            particle.system.geometry.dispose();
            particle.system.material.dispose();
        });
        this.particles = [];
    }
}
