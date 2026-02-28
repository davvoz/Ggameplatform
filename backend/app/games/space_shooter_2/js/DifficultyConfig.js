const DIFFICULTY_CONFIG = {
    boring: {
        id: 'boring',
        label: 'BORING',
        icon: '◌',
        desc: 'Relaxing ride. Enemies are weak and slow.',
        color: '#66bb6a',
        scoreMultiplier: 0.25,
        enemyHpMult: 1,
        enemySpeedMult: 1,
        enemyFireRateMult: 1,
        enemyBulletSpeedMult: 1,
        bossHpMult: 0.55,
        bossSpeedMult: 0.9
    },
    normal: {
        id: 'normal',
        label: 'NORMAL',
        icon: '⚔',
        desc: 'Balanced challenge for most pilots.',
        color: '#42a5f5',
        scoreMultiplier: 1,
        enemyHpMult: 1.25,
        enemySpeedMult: 1.1,
        enemyFireRateMult: 0.85,
        enemyBulletSpeedMult: 1.1,
        bossHpMult: 1.25,
        bossSpeedMult: 1.05
    },
    hard: {
        id: 'hard',
        label: 'HARD',
        icon: '☠',
        desc: 'Punishing. Enemies hit harder and faster.',
        color: '#ef5350',
        scoreMultiplier: 2,
        enemyHpMult: 2,
        enemySpeedMult: 1.5,
        enemyFireRateMult: 0.6,
        enemyBulletSpeedMult: 1.4,
        bossHpMult: 1.8,
        bossSpeedMult: 1.3
    },
    panic: {
        id: 'panic',
        label: 'PANIC',
        icon: '♨',
        desc: 'Pure chaos. Only for the brave.',
        color: '#ff6f00',
        scoreMultiplier: 4,
        enemyHpMult: 3,
        enemySpeedMult: 1.8,
        enemyFireRateMult: 0.4,
        enemyBulletSpeedMult: 1.6,
        bossHpMult: 2.5,
        bossSpeedMult: 1.5
    }
};

export { DIFFICULTY_CONFIG };
export default DIFFICULTY_CONFIG;
