var FollowCamera = pc.createScript("followCamera");
FollowCamera.attributes.add("target",
    { type: "entity", title: "Target", description: "The Entity to follow" }),
    FollowCamera.attributes.add("distance",
        {
            type: "number", default: 4, title: "Distance",
            description: "How far from the Entity should the follower be"
        }),
    FollowCamera.prototype.initialize = function () {
        this.pos = new pc.Vec3,
            this.offset = new pc.Vec3,
            this.isCelebrating = false,
            this.celebrateTime = 0,
            this.isSuperCelebrating = false,
            this.superCelebrateTime = 0,
            this.baseDistance = this.distance,
            this.app.on("ball:celebrate", this.startCelebrate, this),
            this.app.on("ball:supercelebrate", this.startSuperCelebrate, this)
    },
    FollowCamera.prototype.startCelebrate =
    function () {
        this.isCelebrating = true; this.celebrateTime = 0
    },
    FollowCamera.prototype.startSuperCelebrate = function () {
        this.isSuperCelebrating = true;
        this.superCelebrateTime = 0;
        this.isCelebrating = false;
    },
    FollowCamera.prototype.postUpdate = function (t) {
        if (!this.target) return;

        // Super celebration for final level
        if (this.isSuperCelebrating) {
            this.superCelebrateTime += t;
            var totalDuration = 8.0;
            var progress = Math.min(this.superCelebrateTime / totalDuration, 1);

            // Dramatic zoom in on the ball over 8 seconds
            var zoomProgress = Math.pow(progress, 0.8);
            this.distance = this.baseDistance * (1 - zoomProgress * 0.85);

            if (progress >= 1) {
                this.isSuperCelebrating = false;
                this.distance = this.baseDistance;
            }
        }
        // Regular celebration
        else if (this.isCelebrating) {
            this.celebrateTime += t;
            var progress = Math.min(this.celebrateTime / 2.0, 1);
            var zoomIn = progress < 0.5 ? progress * 2 : 1;
            var zoomOut = progress > 0.8 ? (progress - 0.8) / 0.2 : 0;
            this.distance = this.baseDistance * (1 - zoomIn * 0.5 + zoomOut * 0.5);
            if (progress >= 1) {
                this.isCelebrating = false; this.distance = this.baseDistance
            }
        }
        this.offset.set(.75, 1, .75).scale(this.distance),
            this.pos.copy(this.target.getPosition()).add(this.offset),
            this.pos.lerp(this.entity.getPosition(), this.pos, .1),
            this.entity.setPosition(this.pos)
    };
var Movement = pc.createScript("movement");
Movement.attributes.add("speed", {
    type: "number", default: .1, min: .05, max: .5, precision: 2,
    description: "Controls the movement speed"
}),
    Movement.prototype.initialize = function () {
        this.force = new pc.Vec3,
            this.spawnPos = this.entity.getPosition().clone(),
            this.isGameOver = false,
            this.isCelebrating = false,
            this.celebrateTime = 0,
            this.celebrateBasePos = null,
            this.isSuperCelebrating = false,
            this.superCelebrateTime = 0,
            this.touchStartX = 0,
            this.touchStartY = 0,
            this.touchCurrentX = 0,
            this.touchCurrentY = 0,
            this.isTouching = false,
            // Intro: palla cade dall'alto
            this.isIntroPlaying = false,
            this.introStarted = false,
            this.introTime = 0,
            this.introDuration = 2.0,
            this.introPhase = 0, // 0=caduta, 1=rimbalzi
            this.introBounceCount = 0,
            this.introBounceVelocity = 0,
            this.introStartY = this.spawnPos.y + 3,
            this.introCurrentY = this.spawnPos.y ,
            this.app.on("game:over",
                function () { this.isGameOver = true },
                this),
            this.app.on("ball:celebrate",
                this.startCelebrate, this),
            this.app.on("ball:supercelebrate",
                this.startSuperCelebrate, this),
            document.addEventListener("touchstart",
                this.onTouchStart.bind(this), false),
            document.addEventListener("touchmove",
                this.onTouchMove.bind(this), false),
            document.addEventListener("touchend",
                this.onTouchEnd.bind(this), false)
    },
    Movement.prototype.startFallIntro = function () {
        // Posiziona la palla in alto
        this.introCurrentY = this.introStartY;
        var startPos = this.spawnPos.clone();
        startPos.y = this.introCurrentY;
        this.entity.rigidbody.teleport(startPos);
        this.entity.rigidbody.linearVelocity = pc.Vec3.ZERO;
        this.entity.rigidbody.angularVelocity = pc.Vec3.ZERO;
        this.introBounceVelocity = -2; // Velocità iniziale verso il basso
        this.introPhase = 0;
        this.introTime = 0;
        this.introBounceCount = 0;
        this.isIntroPlaying = true;
    },
    Movement.prototype.updateIntro = function (dt) {
        if (!this.isIntroPlaying) return false;
        
        this.introTime += dt;
        var groundY = this.spawnPos.y;
        
        // Fase 0: Caduta con gravità
        if (this.introPhase === 0) {
            this.introBounceVelocity -= 25 * dt; // Gravità
            this.introCurrentY += this.introBounceVelocity * dt;
            
            // Rotazione durante la caduta
            this.entity.rotate(dt * 100, dt * 50, 0);
            
            // Tocca il suolo
            if (this.introCurrentY <= groundY) {
                this.introCurrentY = groundY;
                this.introPhase = 1;
                this.introBounceVelocity = Math.abs(this.introBounceVelocity) * 0.6; // Rimbalzo con perdita energia
                this.introBounceCount = 0;
            }
        }
        // Fase 1: Rimbalzi
        else if (this.introPhase === 1) {
            this.introBounceVelocity -= 20 * dt; // Gravità
            this.introCurrentY += this.introBounceVelocity * dt;
            
            // Rotazione rallenta gradualmente
            var rotSpeed = Math.max(0, 150 - this.introBounceCount * 40);
            this.entity.rotate(dt * rotSpeed, 0, 0);
            
            // Rimbalzo quando tocca il suolo
            if (this.introCurrentY <= groundY) {
                this.introCurrentY = groundY;
                this.introBounceCount++;
                this.introBounceVelocity = Math.abs(this.introBounceVelocity) * 0.5; // Perde energia
                
                // Dopo abbastanza rimbalzi o velocità bassa, vai alla fase di settling
                if (this.introBounceCount >= 5 || this.introBounceVelocity < 0.3) {
                    this.introPhase = 2;
                    this.introSettleTime = 0;
                }
            }
        }
        // Fase 2: Settling - transizione graduale
        else if (this.introPhase === 2) {
            this.introSettleTime += dt;
            this.introCurrentY = groundY;
            
            // Interpola gradualmente la rotazione verso zero
            var currentRot = this.entity.getEulerAngles();
            var settleProgress = Math.min(this.introSettleTime / 0.3, 1);
            var easeOut = 1 - Math.pow(1 - settleProgress, 2);
            this.entity.setEulerAngles(
                currentRot.x * (1 - easeOut),
                currentRot.y * (1 - easeOut),
                currentRot.z * (1 - easeOut)
            );
            
            // Dopo settling completo, termina intro
            if (this.introSettleTime >= 0.3) {
                this.isIntroPlaying = false;
                var finalPos = this.spawnPos.clone();
                this.entity.rigidbody.teleport(finalPos);
                this.entity.rigidbody.linearVelocity = pc.Vec3.ZERO;
                this.entity.rigidbody.angularVelocity = pc.Vec3.ZERO;
                this.app.fire("intro:complete");
                return false;
            }
        }
        
        var pos = this.spawnPos.clone();
        pos.y = this.introCurrentY;
        this.entity.rigidbody.teleport(pos);
        this.entity.rigidbody.linearVelocity = pc.Vec3.ZERO;
        
        return true;
    },
    Movement.prototype.onTouchStart = function (e) {
        this.isTouching = true;
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        this.touchCurrentX = this.touchStartX;
        this.touchCurrentY = this.touchStartY
    },
    Movement.prototype.onTouchMove = function (e) {
        if (!this.isTouching) return;
        this.touchCurrentX = e.touches[0].clientX;
        this.touchCurrentY = e.touches[0].clientY
    },
    Movement.prototype.onTouchEnd = function (e) {
        this.isTouching = false;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchCurrentX = 0;
        this.touchCurrentY = 0
    },
    Movement.prototype.startCelebrate = function () {
        this.isCelebrating = true;
        this.celebrateTime = 0;
        this.celebrateBasePos = this.entity.getPosition().clone();
        this.entity.rigidbody.linearVelocity = pc.Vec3.ZERO;
        this.entity.rigidbody.angularVelocity = pc.Vec3.ZERO
    },
    Movement.prototype.startSuperCelebrate = function () {
        this.isSuperCelebrating = true;
        this.superCelebrateTime = 0;
        this.isCelebrating = false;
        this.celebrateBasePos = this.entity.getPosition().clone();
        this.entity.rigidbody.linearVelocity = pc.Vec3.ZERO;
        this.entity.rigidbody.angularVelocity = pc.Vec3.ZERO;

        // Start fading all other entities
        this.app.fire("scene:fadeout");
        this.originalBallScale = this.entity.getLocalScale().x;
    },
    Movement.prototype.updateSuperCelebrate = function (dt) {
        if (!this.isSuperCelebrating) return;
        this.superCelebrateTime += dt;
        var t = this.superCelebrateTime;
        var pos = this.celebrateBasePos.clone();
        
        // Movimento fluido continuo
        var bounce = Math.abs(Math.sin(t * 8)) * 0.35;
        pos.y += bounce;
        
        // Dopo 5 secondi inizia ad allontanarsi gradualmente
        if (t >= 5.0) {
            var escapeProgress = (t - 5.0) / 3.0;
            var distance = escapeProgress * escapeProgress * 12;
            pos.z -= distance;
            
            // Si rimpicciolisce gradualmente mentre si allontana
            var scale = this.originalBallScale * (1 - escapeProgress * 0.7);
            this.entity.setLocalScale(scale, scale, scale);
        }
        
        this.entity.rigidbody.teleport(pos);
        this.entity.rigidbody.linearVelocity = pc.Vec3.ZERO;
        this.entity.rotate(dt * 200, 0, 0);

        if (this.superCelebrateTime >= 8.0) {
            this.isSuperCelebrating = false;
            this.entity.enabled = false;
        }
    },
    Movement.prototype.updateCelebrate = function (dt) {
        // Super celebration takes priority
        if (this.isSuperCelebrating) {
            this.updateSuperCelebrate(dt);
            return;
        }

        if (!this.isCelebrating) return;
        this.celebrateTime += dt;
        var bounce = Math.abs(Math.sin(this.celebrateTime * 15)) * 0.25;
        var pos = this.celebrateBasePos.clone(); pos.y += bounce;
        this.entity.rigidbody.teleport(pos);
        this.entity.rigidbody.linearVelocity = pc.Vec3.ZERO;
        if (this.celebrateTime >= 2.0) { this.isCelebrating = false }
    },
    Movement.prototype.update = function (e) {
        // Avvia l'intro al primo frame
        if (!this.introStarted) {
            this.introStarted = true;
            this.startFallIntro();
        }
        
        // Animazione intro caduta
        if (this.updateIntro(e)) return;
        
        this.updateCelebrate(e);
        if (this.isCelebrating || this.isSuperCelebrating || this.isGameOver)
            return;
        if (this.entity.getPosition().y < -1) {
            this.app.fire("player:fall");
            return void this.teleport(this.spawnPos);
        }
        const t = this.app.keyboard;
        let s = 0, i = 0;
        if ((t.isPressed(pc.KEY_LEFT) ||
            t.isPressed(pc.KEY_A))
            && (s = -this.speed), (t.isPressed(pc.KEY_RIGHT) ||
                t.isPressed(pc.KEY_D)) &&
            (s += this.speed),
            (t.isPressed(pc.KEY_UP) ||
                t.isPressed(pc.KEY_W)) &&
            (i = -this.speed),
            (t.isPressed(pc.KEY_DOWN)
                || t.isPressed(pc.KEY_S)) &&
            (i += this.speed),
            this.isTouching) {
            var deltaX = this.touchCurrentX - this.touchStartX;
            var deltaY = this.touchCurrentY - this.touchStartY;
            var magnitude = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            var threshold = 20;
            if (magnitude > threshold) {
                deltaX = (deltaX / magnitude) * this.speed * 0.5;
                deltaY = (deltaY / magnitude) * this.speed * 0.5;
                s += deltaX * 0.3; i += deltaY * 0.3
            }
        }
        this.force.set(s, 0, i), this.force.lengthSq() > 0 &&
            (this.force.normalize().scale(this.speed), (e) => {
                const e2 = .25 * -Math.PI, t = Math.cos(e2),
                    s = Math.sin(e2),
                    i = this.force.x * t - this.force.z * s,
                    o = this.force.z * t + this.force.x * s;
                this.force.set(i, 0, o)
            })(),
            this.entity.rigidbody.applyImpulse(this.force)
    },
    Movement.prototype.teleport = function (e) {
        this.entity.rigidbody.teleport(e),
            this.spawnPos.copy(e),
            this.entity.rigidbody.linearVelocity = pc.Vec3.ZERO,
            this.entity.rigidbody.angularVelocity = pc.Vec3.ZERO
    };


var Teleporter = pc.createScript("teleporter");
Teleporter.attributes.add("target", {
    type: "entity",
    title: "Target Entity",
    description: "The target entity where we are going to teleport"
}),
    Teleporter.prototype.initialize = function () {
        this.isTeleporting = false;
        const onTriggerEnter = t => {
            if (t.script.movement && !this.isTeleporting) {
                this.isTeleporting = true;
                const targetPos = this.target.getPosition().clone();
                targetPos.y += .5; t.rigidbody.linearVelocity = pc.Vec3.ZERO;
                t.rigidbody.angularVelocity = pc.Vec3.ZERO;
                this.app.fire("level:celebration", () => {
                    t.script.movement.teleport(targetPos);
                    this.app.fire("level:change"); this.isTeleporting = false
                })
            }
        };
        this.entity.collision.on("triggerenter", onTriggerEnter),
            this.on("destroy", (() => {
                this.entity.collision.off("triggerenter", onTriggerEnter)
            }))
    };
var GameManager = pc.createScript("gameManager");
GameManager.prototype.initialize = function () {
    this.score = 0, this.coins = 0,
        this.totalCoins = 21, this.currentLevel = 1,
        this.maxLevel = 7, this.lives = 3, this.isGameOver = false,
        this.celebrationCallback = null,
        this.celebrationTimer = 0, this.isCelebrating = false,
        this.isSuperCelebrating = false,
        this.superCelebrationTimer = 0,
        this.app.fire("score:update", this.score),
        this.app.fire("coins:update",
            this.coins, this.totalCoins),
        this.app.fire("level:update", this.currentLevel),
        this.app.fire("lives:update", this.lives),
        this.app.on("score:add", this.addScore, this),
        this.app.on("coin:collected",
            this.onCoinCollected, this),
        this.app.on("level:change",
            this.onLevelChange, this),
        this.app.on("player:fall",
            this.onPlayerFall, this),
        this.app.on("level:celebration",
            this.onLevelCelebration, this)
}, GameManager.prototype.onLevelCelebration = function (callback) {
    if (this.isCelebrating) return; this.isCelebrating = true;
    this.celebrationCallback = callback;

    // Check if this is the final level
    if (this.currentLevel >= this.maxLevel) {
        this.celebrationTimer = 8.0; // Longer celebration for final level
        this.isSuperCelebrating = true;
        this.superCelebrationTimer = 0;
        this.app.fire("ball:supercelebrate");
        this.app.fire("ui:supercelebration", this.currentLevel);
    } else {
        this.celebrationTimer = 3.0;
        this.app.fire("ball:celebrate");
        this.app.fire("ui:celebration",
            this.currentLevel, this.currentLevel + 1);
    }
},
    GameManager.prototype.update = function (dt) {
        if (this.isCelebrating) {
            this.celebrationTimer -= dt;
            if (this.celebrationTimer <= 0) {
                this.isCelebrating = false;

                // Reset game if it was super celebration
                if (this.isSuperCelebrating) {
                    this.isSuperCelebrating = false;
                    this.resetGame();
                } else if (this.celebrationCallback) {
                    this.celebrationCallback();
                    this.celebrationCallback = null;
                }
            }
        }
    },
    GameManager.prototype.resetGame = function () {
        this.score = 0;
        this.coins = 0;
        this.currentLevel = 1;
        this.lives = 3;
        this.isGameOver = false;
        this.app.fire("score:update", this.score);
        this.app.fire("coins:update", this.coins, this.totalCoins);
        this.app.fire("level:update", this.currentLevel);
        this.app.fire("lives:update", this.lives);
        this.app.fire("game:reset");

        // Reload scene after a short delay
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }
    , GameManager.prototype.onPlayerFall = function () {
        if (this.isGameOver) return;
        this.lives--, this.app.fire("lives:update", this.lives), this.lives <= 0 && (this.isGameOver = true, this.app.fire("game:over", this.score))
    },
    GameManager.prototype.addScore = function (e) {
        this.score += e || 10, this.app.fire("score:update", this.score)
    },
    GameManager.prototype.onCoinCollected = function (e) {
        this.coins++,
            this.score += e || 10, this.app.fire("score:update", this.score),
            this.app.fire("coins:update", this.coins, this.totalCoins),
            this.coins >= this.totalCoins && this.app.fire("game:complete")
    },
    GameManager.prototype.onLevelChange = function () {
        if (this.currentLevel < this.maxLevel) {
            this.currentLevel++, this.app.fire("level:update", this.currentLevel)
        }
    };
var Collectible = pc.createScript("collectible");
Collectible.attributes.add("points",
    {
        type: "number",
        default: 10,
        title: "Points",
        description: "Points awarded when collected"
    }),
    Collectible.attributes.add("rotateSpeed",
        { type: "number", default: 90, title: "Rotate Speed" }),
    Collectible.prototype.initialize = function () {
        this.collected = false, this.collecting = false,
            this.collectTime = 0,
            this.collectDuration = 0.5,
            this.floatTime = Math.random() * Math.PI * 2,
            this.startY = this.entity.getPosition().y,
            this.startScale = this.entity.getLocalScale().clone(),
            this.startPos = this.entity.getPosition().clone();
        const onTriggerEnter = e => {
            if (!this.collected && !this.collecting && e.script && e.script.movement) {
                this.collecting = true,
                    this.collectTime = 0,
                    this.app.fire("coin:collected", this.points)
            }
        }; this.entity.collision.on("triggerenter", onTriggerEnter)
    },
    Collectible.prototype.update = function (e) {
        if (this.collecting) {
            this.collectTime += e;
            const t = Math.min(this.collectTime / this.collectDuration, 1),
                s = 1 - t,
                i = 1 + t * 2,
                a = this.startScale.x * s,
                n = this.startScale.y * s, o = this.startScale.z * s;
            this.entity.setLocalScale(a, n, o);
            const c = this.entity.getPosition();
            c.y = this.startPos.y + t * 1.5,
                this.entity.setPosition(c),
                this.entity.rotate(0, this.rotateSpeed * 4 * e, 0);
            const r = this.entity.render;
            if (r) {
                const e = r.opacity !== undefined ? r.opacity : 1;
                r.opacity = Math.max(0, e - 2 * t)
            }
            if (t >= 1) {
                this.collected = true,
                    this.collecting = false,
                    this.entity.enabled = false
            }
        } else if (!this.collected) {
            this.entity.rotate(0, this.rotateSpeed * e, 0),
                this.floatTime += e * 3;
            const t = this.entity.getPosition();
            t.y = this.startY + Math.sin(this.floatTime) * 0.08,
                this.entity.setPosition(t)
        }
    };
var ScoreUI = pc.createScript("scoreUI");
ScoreUI.prototype.initialize = function () {
    this.scoreValue = 0,
        this.displayScore = 0,
        this.coins = 0,
        this.totalCoins = 21,
        this.level = 1,
        this.lives = 3,
        this.pulseTime = 0,
        this.coinsPulse = 0,
        this.levelPulse = 0,
        this.livesPulse = 0,
        this.levelValueEl = null,
        this.coinsValueEl = null,
        this.scoreValueEl = null,
        this.coinsPanel = null,
        this.scorePanel = null,
        this.levelPanel = null,
        this.livesContainer = null,
        this.lifeBalls = [],
        this.gameOverPanel = null,
        this.celebrationPanel = null,
        this.celebrationTime = 0,
        this.celebrationStars = [],
        this.fadingEntities = [],
        this.fadeStartTime = 0,
        this.fadeDuration = 6000,
        this.isSuperCelebrationUI = false;
    var e = this.app.root.findByName("Level Value");
    e && (this.levelValueEl = e.element);
    var t = this.app.root.findByName("Coins Value");
    t && (this.coinsValueEl = t.element);
    var s = this.app.root.findByName("Score Value");
    s && (this.scoreValueEl = s.element),
        this.coinsPanel = this.app.root.findByName("Coins Panel"),
        this.scorePanel = this.app.root.findByName("Score Panel"),
        this.levelPanel = this.app.root.findByName("Level Panel"),
        this.createLivesUI(), this.app.on("score:update", this.onScoreUpdate, this),
        this.app.on("coins:update", this.onCoinsUpdate, this),
        this.app.on("level:update", this.onLevelUpdate, this),
        this.app.on("lives:update", this.onLivesUpdate, this),
        this.app.on("game:complete", this.onGameComplete, this),
        this.app.on("game:over", this.onGameOver, this),
        this.app.on("ui:celebration", this.showCelebration, this),
        this.app.on("ui:supercelebration", this.showSuperCelebration, this),
        this.app.on("scene:fadeout", this.fadeOutScene, this)
},
    ScoreUI.prototype.showCelebration = function (fromLevel, toLevel) {
        var screen = this.app.root.findByName("2D Screen");
        if (!screen) screen = this.app.root.findByName("Screen");
        if (!screen) return;
        var fontAsset = this.app.assets.get(270893075);
        this.celebrationPanel = new pc.Entity("Celebration");
        this.celebrationPanel.addComponent("element",
            { type: "group", anchor: [0, 0, 1, 1], pivot: [0.5, 0.5] });
        screen.addChild(this.celebrationPanel);
        this.celebrationLetters = [];
        var text = "LEVEL " + fromLevel + " COMPLETE!";
        var colors = [new pc.Color(1, 0.2, 0.2), new pc.Color(1, 0.5, 0),
        new pc.Color(1, 0.85, 0), new pc.Color(0.2, 1, 0.2),
        new pc.Color(0.2, 0.8, 1), new pc.Color(0.6, 0.2, 1)];
        var letterSpacing = 0.055;
        var startX = 0.5 - (text.length * letterSpacing) / 2;
        for (var i = 0; i < text.length; i++) {
            var letter = new pc.Entity("Letter" + i);
            var anchorX = startX + i * letterSpacing;
            letter.addComponent("element",
                {
                    type: "text",
                    anchor: [anchorX, 0.58, anchorX, 0.58],
                    pivot: [0.5, 0.5], text: text[i],
                    fontSize: 58,
                    fontAsset: fontAsset,
                    color: colors[i % colors.length],
                    outlineColor: new pc.Color(0, 0, 0), outlineThickness: 0.3, opacity: 0
                });
            this.celebrationPanel.addChild(letter);
            this.celebrationLetters.push({
                entity: letter, char: text[i], index: i,
                total: text.length, baseX: anchorX
            })
        }
        var subtitle = new pc.Entity("Next Level");
        subtitle.addComponent("element",
            {
                type: "text", anchor: [0.5, 0.42, 0.5, 0.42],
                pivot: [0.5, 0.5],
                text: "Get Ready for Level " + toLevel, fontSize: 70,
                fontAsset: fontAsset,
                color: new pc.Color(1, 1, 1),
                outlineColor: new pc.Color(0, 0, 0),
                outlineThickness: 0.25, opacity: 0
            });
        this.celebrationPanel.addChild(subtitle);
        this.celebrationStars = [];
        var starSymbols = ["★", "✦", "✧", "●", "◆"];
        for (var j = 0; j < 16; j++) {
            var star = new pc.Entity("Star" + j);
            var startAngle = (j / 16) * Math.PI * 2;
            star.addComponent("element", {
                type: "text",
                anchor: [0.5, 0.52, 0.5, 0.52], pivot: [0.5, 0.5],
                text: starSymbols[
                    Math.floor(Math.random() * starSymbols.length)
                ],
                fontSize: 14 + Math.random() * 14,
                fontAsset: fontAsset,
                color: new pc.Color(1, 0.7 + Math.random() * 0.3, 0.2 + Math.random() * 0.5),
                opacity: 0
            });
            this.celebrationPanel.addChild(star);
            this.celebrationStars.push({
                entity: star,
                angle: startAngle,
                radius: 0.2 + Math.random() * 0.1,
                speed: 0.6 + Math.random() * 0.5,
                phase: Math.random() * Math.PI * 2
            })
        }
        this.celebrationTime = 0;
        this.celebrationDuration = 3.0;
        this.isCelebratingUI = true
    },
    ScoreUI.prototype.updateCelebration = function (dt) {
        if (!this.celebrationPanel) return;
        this.celebrationTime += dt;
        var progress = this.celebrationTime / this.celebrationDuration;
        var fadeIn = Math.min(progress * 5, 1);
        var fadeOut = progress > 0.75 ? 1 - (progress - 0.75) / 0.25 : 1;
        var opacity = fadeIn * fadeOut;

        // Update scene fade if in super celebration
        if (this.isSuperCelebrationUI) {
            this.updateSceneFade();
        }

        if (this.celebrationLetters) {
            for (var i = 0; i < this.celebrationLetters.length; i++) {
                var data = this.celebrationLetters[i];
                var letter = data.entity;
                if (letter && letter.element) {
                    letter.element.opacity = opacity;
                    var wave = Math.sin(this.celebrationTime * 8 + data.index * 0.5) * 0.02;
                    var ay = (data.baseY || 0.58) + wave;
                    letter.element.anchor = new pc.Vec4(data.baseX, ay, data.baseX, ay);
                    var bounce = Math.sin(this.celebrationTime * 10 + data.index * 0.5) * 0.1;
                    var letterScale = 1.0 + bounce * (this.isSuperCelebrationUI ? 0.18 : 0.12);
                    letter.setLocalScale(letterScale, letterScale, 1)
                }
            }
        }
        var subtitle = this.celebrationPanel.findByName("Next Level");
        if (subtitle && subtitle.element) {
            subtitle.element.opacity = opacity;
            var subPulse = 1 + Math.sin(this.celebrationTime * 4) * 0.08;
            subtitle.setLocalScale(subPulse, subPulse, 1)
        }
        for (var j = 0; j < this.celebrationStars.length; j++) {
            var starData = this.celebrationStars[j];
            var star = starData.entity;
            if (star && star.element) {
                star.element.opacity = opacity * 0.9;
                var angle = starData.angle + this.celebrationTime * starData.speed;
                var pulse = 1 + Math.sin(this.celebrationTime * 5 + starData.phase) * 0.15;

                // Expand radius for super celebration
                var r = starData.radius;
                if (this.isSuperCelebrationUI && starData.maxRadius) {
                    r += (starData.maxRadius - starData.radius) * Math.min(progress * 1.5, 1);
                } else {
                    r += Math.sin(this.celebrationTime * 3 + starData.phase) * 0.02;
                }

                var sx = 0.5 + Math.cos(angle) * r * 1.5;
                var sy = (this.isSuperCelebrationUI ? 0.5 : 0.52) + Math.sin(angle) * r;
                star.element.anchor = new pc.Vec4(sx, sy, sx, sy);
                star.setLocalScale(pulse, pulse, 1)
            }
        }
        if (progress >= 1) {
            this.celebrationPanel.destroy();
            this.celebrationPanel = null;
            this.celebrationStars = [];
            this.celebrationLetters = null;
            this.isCelebratingUI = false;
            this.isSuperCelebrationUI = false;
        }
    },
    ScoreUI.prototype.createLivesUI = function () {
        var ballMaterial = this.app.assets.get(270893090);
        this.livesContainer = new pc.Entity("Lives Container");
        this.livesContainer.enabled = false; // Nascondi durante intro
        this.app.root.addChild(this.livesContainer);
        for (var i = 0; i < 3; i++) {
            var ball = new pc.Entity("Life " + i);
            ball.addComponent("render", {
                type: "sphere",
                material: ballMaterial ? ballMaterial.resource : null
            });
            ball.setLocalScale(0.06, 0.06, 0.06);
            this.livesContainer.addChild(ball);
            this.lifeBalls.push(ball)
        }
        // Ascolta fine intro
        this.app.on("intro:complete", function() {
            if (this.livesContainer) this.livesContainer.enabled = true;
        }, this);
    },
    ScoreUI.prototype.updateLivesPosition = function () {
        if (this.isCelebratingUI) {
            for (var j = 0; j < this.lifeBalls.length; j++) {
                if (this.lifeBalls[j]) this.lifeBalls[j].enabled = false
            } return
        }
        for (var k = 0; k < this.lives; k++) {
            if (this.lifeBalls[k]) this.lifeBalls[k].enabled = true
        }
        var camera = this.app.root.findByName("Camera");
        if (!camera || !this.livesContainer) return;
        var camPos = camera.getPosition();
        var camForward = camera.forward.clone();
        var camRight = camera.right.clone();
        var camUp = camera.up.clone();
        var basePos = camPos.clone().add(camForward.scale(1.5)).sub(camUp.clone().scale(0.35));
        for (var i = 0; i < 3; i++) {
            if (this.lifeBalls[i]) {
                var offset = (i - 1) * 0.08;
                var pos = basePos.clone().add(camRight.clone().scale(offset));
                this.lifeBalls[i].setPosition(pos)
            }
        }
    },
    ScoreUI.prototype.onLivesUpdate = function (lives) {
        this.lives = lives; this.livesPulse = 0.3;
        for (var i = 0; i < 3; i++) {
            if (this.lifeBalls[i]) {
                if (i < lives) {
                    this.lifeBalls[i].enabled = true
                } else {
                    this.lifeBalls[i].enabled = false
                }
            }
        }
    },
    ScoreUI.prototype.onGameOver = function (score) {
        var screen = this.app.root.findByName("2D Screen");
        if (!screen) screen = this.app.root.findByName("Screen");
        if (!screen) return;
        var fontAsset = this.app.assets.get(270893075);
        this.gameOverPanel = new pc.Entity("Game Over");
        this.gameOverPanel.addComponent("element",
            {
                type: "image", anchor: [0, 0, 1, 1],
                pivot: [0.5, 0.5],
                color: new pc.Color(0, 0, 0)
                , opacity: 0.85
            });
        screen.addChild(this.gameOverPanel);
        var text = new pc.Entity("Game Over Text");
        text.addComponent("element",
            {
                type: "text",
                anchor: [0.5, 0.55, 0.5, 0.55],
                pivot: [0.5, 0.5],
                text: "GAME OVER",
                fontSize: 72,
                fontAsset: fontAsset,
                color: new pc.Color(1, 0.2, 0.2)
            });
        this.gameOverPanel.addChild(text);
        var scoreText = new pc.Entity("Score Text");
        scoreText.addComponent("element", {
            type: "text",
            anchor: [0.5, 0.45, 0.5, 0.45],
            pivot: [0.5, 0.5], text: "Score: " + score,
            fontSize: 36,
            fontAsset: fontAsset,
            color: new pc.Color(1, 0.85, 0)
        });
        this.gameOverPanel.addChild(scoreText);
        var restartText = new pc.Entity("Restart Text");
        restartText.addComponent("element",
            {
                type: "text",
                anchor: [0.5, 0.3, 0.5, 0.3],
                pivot: [0.5, 0.5],
                text: "Press SPACE or TAP to restart",
                fontSize: 28,
                fontAsset: fontAsset,
                color: new pc.Color(1, 1, 1)
            });
        this.gameOverPanel.addChild(restartText);
        this.app.keyboard.on(pc.EVENT_KEYDOWN, function (e) {
            if (e.key === pc.KEY_SPACE) {
                window.location.reload()
            }
        },
            this);
        var self = this;
        this.gameOverPanel.element.on("click", function () {
            window.location.reload()
        });
        document.addEventListener("touchend",
            function onGameOverTouch() {
                window.location.reload()
            }, { once: true })
    },
    ScoreUI.prototype.fadeOutScene = function () {
        var root = this.app.root;
        var allEntities = root.find(function (entity) {
            // Escludi la palla principale, le vite, e gli elementi UI
            if (!entity.render) return false;
            if (entity.name.indexOf("Ball") !== -1) return false;
            if (entity.name.indexOf("Life") !== -1) return false;
            if (entity.name.indexOf("Lives") !== -1) return false;
            if (entity.parent && entity.parent.name === "Lives Container") return false;
            return true;
        });
        this.fadeStartTime = Date.now();
        this.fadingEntities = allEntities;
    },
    ScoreUI.prototype.updateSceneFade = function () {
        if (!this.fadingEntities || this.fadingEntities.length === 0) return;
        var elapsed = Date.now() - this.fadeStartTime;
        var progress = Math.min(elapsed / this.fadeDuration, 1);
        var opacity = 1 - progress;
        for (var i = 0; i < this.fadingEntities.length; i++) {
            var entity = this.fadingEntities[i];
            if (entity && entity.render && entity.render.meshInstances) {
                for (var j = 0; j < entity.render.meshInstances.length; j++) {
                    var meshInstance = entity.render.meshInstances[j];
                    if (meshInstance.material) {
                        meshInstance.material.opacity = opacity;
                        meshInstance.material.blendType = pc.BLEND_NORMAL;
                        meshInstance.material.update();
                    }
                }
            }
        }
        if (progress >= 1) { this.fadingEntities = []; }
    },
    ScoreUI.prototype.showSuperCelebration = function (level) {
        var screen = this.app.root.findByName("2D Screen");
        if (!screen) screen = this.app.root.findByName("Screen");
        if (!screen) return;
        var fontAsset = this.app.assets.get(270893075);
        this.celebrationPanel = new pc.Entity("Super Celebration");
        this.celebrationPanel.addComponent("element",
            { type: "group", anchor: [0, 0, 1, 1], pivot: [0.5, 0.5] });
        screen.addChild(this.celebrationPanel);
        this.celebrationLetters = [];
        var lines = [
            "🎉 Well Done! 🎉",
            "You have completed ",
            "all 7 levels.",
            "💎 Master Player 💎",
            "You are a champion."
        ];
        var colors = [
            new pc.Color(1, 0.843, 0),
            new pc.Color(1, 0.2, 0.2),
            new pc.Color(0.2, 1, 0.2),
            new pc.Color(1, 0.843, 0),
            new pc.Color(0.6, 0.2, 1),
            new pc.Color(0.2, 0.8, 1)
        ];
        for (var lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            var text = lines[lineIdx];
            var yPos = 0.75 - lineIdx * 0.11;
            var letterSpacing = 0.04;
            var startX = 0.5 - (text.length * letterSpacing) / 2;
            for (var i = 0; i < text.length; i++) {
                var letter = new pc.Entity("Letter" + lineIdx + "_" + i);
                var anchorX = startX + i * letterSpacing;
                var fontSize = 52;
                if (lineIdx === 0) fontSize = 56;
                if (lineIdx === 3) fontSize = 48;
                if (lineIdx === 4) fontSize = 60;
                letter.addComponent("element", {
                    type: "text",
                    anchor: [anchorX, yPos, anchorX, yPos],
                    pivot: [0.5, 0.5],
                    text: text[i],
                    fontSize: fontSize,
                    fontAsset: fontAsset,
                    color: colors[(lineIdx + i) % colors.length],
                    outlineColor: new pc.Color(0, 0, 0),
                    outlineThickness: 0.4,
                    opacity: 0
                });
                this.celebrationPanel.addChild(letter);
                this.celebrationLetters.push({
                    entity: letter,
                    char: text[i],
                    index: i,
                    lineIndex: lineIdx,
                    total: text.length,
                    baseX: anchorX,
                    baseY: yPos
                });
            }
        }
        this.celebrationStars = [];
        var starSymbols = ["★", "✦", "✧", "◆", "❖", "✨", "💫", "🌟"];
        for (var j = 0; j < 40; j++) {
            var star = new pc.Entity("Star" + j);
            var startAngle = (j / 40) * Math.PI * 2;
            star.addComponent("element", {
                type: "text",
                anchor: [0.5, 0.5, 0.5, 0.5],
                pivot: [0.5, 0.5],
                text: starSymbols[Math.floor(Math.random() * starSymbols.length)],
                fontSize: 18 + Math.random() * 35,
                fontAsset: fontAsset,
                color: new pc.Color(
                    0.9 + Math.random() * 0.1,
                    0.7 + Math.random() * 0.3,
                    0.3 + Math.random() * 0.4
                ),
                opacity: 0
            });
            this.celebrationPanel.addChild(star);
            this.celebrationStars.push({
                entity: star,
                angle: startAngle,
                radius: 0.05,
                speed: 0.4 + Math.random() * 0.8,
                phase: Math.random() * Math.PI * 2,
                maxRadius: 0.7 + Math.random() * 0.4
            });
        }
        this.celebrationTime = 0;
        this.celebrationDuration = 8.0;
        this.isCelebratingUI = true;
        this.isSuperCelebrationUI = true;
    },
    ScoreUI.prototype.onScoreUpdate = function (e) {
        this.scoreValue = e, this.pulseTime = 0.3
    },
    ScoreUI.prototype.onCoinsUpdate = function (e, t) {
        this.coins = e, this.totalCoins = t, this.coinsPulse = 0.3
    },
    ScoreUI.prototype.onLevelUpdate = function (e) {
        this.level = e, this.levelPulse = 0.4
    },
    ScoreUI.prototype.onGameComplete = function () {
        this.scoreValueEl && (this.scoreValueEl.text = "WIN!"),
            this.coinsValueEl && (this.coinsValueEl.text = "21 / 21")
    },
    ScoreUI.prototype.update = function (e) {
        this.updateLivesPosition();
        this.updateCelebration(e);
        this.displayScore < this.scoreValue && (
            this.displayScore = Math.min(this.displayScore + Math.ceil((
                this.scoreValue - this.displayScore) * 0.15) + 1,
                this.scoreValue)),
            this.pulseTime > 0 && (this.pulseTime -= e),
            this.coinsPulse > 0 && (this.coinsPulse -= e),
            this.levelPulse > 0 && (this.levelPulse -= e),
            this.levelValueEl && (this.levelValueEl.text = String(this.level)),
            this.coinsValueEl && (this.coinsValueEl.text = this.coins + " / " + this.totalCoins),
            this.scoreValueEl && (this.scoreValueEl.text = String(this.displayScore)),
            this.scorePanel && (this.scorePanel.setLocalScale(1 + 0.1 * Math.max(0, this.pulseTime),
                1 + 0.1 * Math.max(0, this.pulseTime), 1)),
            this.coinsPanel && (this.coinsPanel.setLocalScale(1 + 0.15 * Math.max(0, this.coinsPulse),
                1 + 0.15 * Math.max(0, this.coinsPulse), 1)),
            this.levelPanel && (this.levelPanel.setLocalScale(1 + 0.2 * Math.max(0, this.levelPulse),
                1 + 0.2 * Math.max(0, this.levelPulse), 1))
    };