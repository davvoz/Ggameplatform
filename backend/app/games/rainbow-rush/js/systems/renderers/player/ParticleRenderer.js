/**
 * ParticleRenderer - Gestisce il rendering delle particelle del player
 * Responsabilità: Trail, Boost, Turbo, Flight particles
 */
export class ParticleRenderer {
    constructor(renderer) {
        this.renderer = renderer;
    }

    /**
     * Raccoglie tutte le particelle in un batch per rendering ottimizzato
     */
    collectBatch(player, cameraShake) {
        const batch = [];

        // Trail particles
        this.addTrailParticles(batch, player, cameraShake);

        // Boost particles
        if (player.boostActive && player.getBoostParticles) {
            this.addBoostParticles(batch, player, cameraShake);
        }

        // Turbo particles
        if (player.isTurboActive && player.getTurboTrailParticles) {
            this.addTurboParticles(batch, player, cameraShake);
        }

        // Flight particles
        if (player.isFlightActive && player.getFlightTrailParticles) {
            this.addFlightParticles(batch, player, cameraShake);
        }

        return batch;
    }

    addTrailParticles(batch, player, cameraShake) {
        const trailParticles = player.getTrailParticles ? player.getTrailParticles() : [];
        for (const particle of trailParticles) {
            const alpha = particle.life / particle.maxLife;
            const particleColor = [...particle.color];
            particleColor[3] = alpha * 0.3;
            
            batch.push({
                x: particle.x + cameraShake.x,
                y: particle.y + cameraShake.y,
                radius: 6,
                color: particleColor,
                type: 'trail'
            });
        }
    }

    addBoostParticles(batch, player, cameraShake) {
        const boostParticles = player.getBoostParticles();
        for (const particle of boostParticles) {
            const alpha = particle.life / particle.maxLife;
            const particleColor = [...particle.color];
            particleColor[3] = alpha * 0.5;

            batch.push({
                x: particle.x + cameraShake.x,
                y: particle.y + cameraShake.y,
                radius: particle.size,
                color: particleColor,
                type: 'boost'
            });
        }
    }

    addTurboParticles(batch, player, cameraShake) {
        const turboParticles = player.getTurboTrailParticles();
        for (const particle of turboParticles) {
            const alpha = particle.life;
            const particleColor = [...particle.color];
            particleColor[3] = alpha * 0.5;

            batch.push({
                x: particle.x + cameraShake.x,
                y: particle.y + cameraShake.y,
                radius: 6,
                color: particleColor,
                type: 'turbo'
            });
        }
    }

    addFlightParticles(batch, player, cameraShake) {
        const flightParticles = player.getFlightTrailParticles();
        for (const particle of flightParticles) {
            const alpha = particle.life;
            const particleColor = [...particle.color];
            particleColor[3] = alpha * 0.5;

            batch.push({
                x: particle.x + cameraShake.x,
                y: particle.y + cameraShake.y,
                radius: 5,
                color: particleColor,
                type: 'flight'
            });
        }
    }

    /**
     * Renderizza tutte le particelle del batch
     */
    renderBatch(batch) {
        // Rendering diretto per performance
        for (const p of batch) {
            this.renderer.drawCircle(p.x, p.y, p.radius, p.color);
        }
    }
}
