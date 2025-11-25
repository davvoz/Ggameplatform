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
        const particleCount = 15;
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        const velocities = [];
        
        for (let i = 0; i < particleCount; i++) {
            positions.push(position.x, position.y + 0.2, position.z);
            
            // Blue water particles
            colors.push(0.3, 0.5, 1);
            
            // Splash outward and up
            velocities.push(
                (Math.random() - 0.5) * 0.25,
                Math.random() * 0.2 + 0.1,
                (Math.random() - 0.5) * 0.25
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
            life: 45,
            maxLife: 45
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
    
    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            const positions = particle.system.geometry.attributes.position.array;
            
            // Update particle positions
            for (let j = 0; j < positions.length; j += 3) {
                positions[j] += particle.velocities[j];         // x
                positions[j + 1] += particle.velocities[j + 1]; // y
                positions[j + 2] += particle.velocities[j + 2]; // z
                
                // Gravity
                particle.velocities[j + 1] -= 0.01;
            }
            
            particle.system.geometry.attributes.position.needsUpdate = true;
            
            // Fade out
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
