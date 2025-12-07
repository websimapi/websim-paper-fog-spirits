import * as THREE from 'three';

export class EntityManager {
    constructor(scene, player, world, audioCtx, masterGain) {
        this.scene = scene;
        this.player = player;
        this.world = world;
        this.audioCtx = audioCtx;
        this.masterGain = masterGain;

        this.animals = [];
        this.monsters = [];
        this.habitats = [];
        this.droppedItems = []; // Visual items on ground
        
        const loader = new THREE.TextureLoader();
        
        // Spirit Config
        this.spiritTypes = [
            { 
                name: "Fox Spirit", 
                tex: loader.load('fox_spirit.png'), 
                shrineTex: loader.load('shrine_light.png'),
                item: "Star Fruit",
                itemTex: loader.load('item_starfruit.png'),
                lightColor: 0xffffaa
            },
            { 
                name: "Deer Spirit", 
                tex: loader.load('deer-spirit-game-asset-cute.png'), 
                shrineTex: loader.load('shrine_deer.png'),
                item: "Moon Flower",
                itemTex: loader.load('item_flower.png'),
                lightColor: 0x55ff55
            },
            { 
                name: "Puppy Spirit", 
                tex: loader.load('a-cute-little-puppy.png'), 
                shrineTex: loader.load('shrine_puppy.png'),
                item: "Golden Bone",
                itemTex: loader.load('item_bone.png'),
                lightColor: 0xffaa55
            },
            { 
                name: "Bunny Spirit", 
                tex: loader.load('white-bunny-spirit-cute.png'), 
                shrineTex: loader.load('shrine_bunny.png'),
                item: "Crystal Carrot",
                itemTex: loader.load('item_carrot.png'),
                lightColor: 0xffaafe
            },
            { 
                name: "Kitty Spirit", 
                tex: loader.load('a-cute-little-kitty-game-asset.png'), 
                shrineTex: loader.load('shrine_kitty.png'),
                item: "Sky Fish",
                itemTex: loader.load('item_fish.png'),
                lightColor: 0x55aaff
            },
            { 
                name: "Cat Spirit", 
                tex: loader.load('a-cute-cat-spirit.png'), 
                shrineTex: loader.load('shrine_cat.png'),
                item: "Spirit Catnip",
                itemTex: loader.load('item_catnip.png'),
                lightColor: 0xaa55ff
            }
        ];

        this.monsterTex = loader.load('shadow_monster.png');
        this.initSpawns();
    }

    loadSound(url) {
        return fetch(url)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => this.audioCtx.decodeAudioData(arrayBuffer));
    }

    async initSpawns() {
        this.thankYouBuffer = await this.loadSound('thank_you.mp3');
        this.growlBuffer = await this.loadSound('monster_growl.mp3');

        // Spawn one of each Spirit and their Habitat
        this.spiritTypes.forEach((type, index) => {
            // Random angle for pair
            const angle = (index / this.spiritTypes.length) * Math.PI * 2 + (Math.random() * 0.5);
            
            // Spawn Habitat Far away
            const habDist = 60 + Math.random() * 40;
            const hx = Math.cos(angle) * habDist;
            const hz = Math.sin(angle) * habDist;
            const habitat = this.spawnHabitat(type, hx, hz);

            // Spawn Animal somewhere closer but in that general direction
            const animalDist = 20 + Math.random() * 30;
            const ax = Math.cos(angle + 0.2) * animalDist;
            const az = Math.sin(angle + 0.2) * animalDist;
            this.spawnAnimal(type, ax, az, habitat);
        });

        // Spawn Monsters
        for (let i = 0; i < 15; i++) {
            this.spawnMonster();
        }
    }

    spawnHabitat(type, x, z) {
        const mat = new THREE.SpriteMaterial({ map: type.shrineTex });
        const sprite = new THREE.Sprite(mat);
        sprite.position.set(x, 1.5, z);
        sprite.scale.set(4, 4, 1);
        
        // Light
        const light = new THREE.PointLight(type.lightColor, 2, 20);
        sprite.add(light);

        this.scene.add(sprite);
        const hab = { mesh: sprite, active: true, type: type };
        this.habitats.push(hab);
        return hab;
    }

    spawnAnimal(type, x, z, homeHabitat) {
        const mat = new THREE.SpriteMaterial({ map: type.tex });
        const sprite = new THREE.Sprite(mat);
        sprite.position.set(x, 0.5, z);
        sprite.scale.set(1.5, 1.5, 1);

        this.scene.add(sprite);
        this.animals.push({ 
            mesh: sprite, 
            state: 'IDLE', // IDLE, FOLLOWING, HOME, WAITING_FOR_ITEM, HAPPY
            id: Math.random(),
            type: type,
            home: homeHabitat
        });
    }

    spawnMonster() {
        const angle = Math.random() * Math.PI * 2;
        const dist = 40 + Math.random() * 20;
        const x = this.player.position.x + Math.cos(angle) * dist;
        const z = this.player.position.z + Math.sin(angle) * dist;

        const mat = new THREE.SpriteMaterial({ map: this.monsterTex, opacity: 0.8 });
        const sprite = new THREE.Sprite(mat);
        sprite.position.set(x, 1, z);
        sprite.scale.set(2, 2, 1);

        this.scene.add(sprite);
        this.monsters.push({ mesh: sprite });
    }

    playSound(buffer) {
        if (!buffer) return;
        const source = this.audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.masterGain);
        source.start(0);
    }

    update(dt, time, gameState) {
        // --- Resource Gathering ---
        // Check collisions with world interactables
        this.world.interactables.forEach(item => {
            if (!item.harvested && item.absolutePos.distanceTo(this.player.position) < 2) {
                // Harvest!
                item.harvested = true;
                item.mesh.scale.set(0,0,0); // Hide it
                
                // Drop Item Logic
                // 40% chance to drop a random item needed by spirits
                if (Math.random() < 0.6) {
                    const randomSpirit = this.spiritTypes[Math.floor(Math.random() * this.spiritTypes.length)];
                    const itemName = randomSpirit.item;
                    
                    this.player.addItem(itemName);
                    this.showNotification(`Found ${itemName}!`);
                    
                    // Visual pop effect (simple scale bounce or particle could go here)
                } else {
                    this.showNotification("Nothing here...");
                }
            }
        });

        // --- Animals ---
        this.animals.forEach(animal => {
            if (animal.state === 'HAPPY') return;

            const distToPlayer = animal.mesh.position.distanceTo(this.player.position);

            if (animal.state === 'IDLE') {
                // Float
                animal.mesh.position.y = 0.5 + Math.sin(time * 2) * 0.2;

                if (distToPlayer < 3 && !gameState.isEscorting) {
                    // Found!
                    animal.state = 'FOLLOWING';
                    gameState.isEscorting = true;
                    gameState.escortTarget = animal;
                    this.playSound(this.thankYouBuffer);
                    
                    this.showDialogue(`${animal.type.name}: Thank you! Please take me to my shrine... it looks like...`, 3000);
                    // Ideally show the shrine icon here too, but text is fine for now
                }
            } else if (animal.state === 'FOLLOWING') {
                // Follow logic with smooth dampening
                const target = this.player.position.clone();
                target.x += Math.sin(time) * 1.5; 
                target.z += Math.cos(time) * 1.5;
                
                animal.mesh.position.lerp(target, dt * 2);
                animal.mesh.position.y = 1 + Math.sin(time * 5) * 0.2;

                // Check Specific Home
                if (animal.mesh.position.distanceTo(animal.home.mesh.position) < 5) {
                    // Arrived!
                    animal.state = 'WAITING_FOR_ITEM';
                    gameState.isEscorting = false;
                    gameState.escortTarget = null;
                    this.playSound(this.thankYouBuffer);
                    
                    this.triggerQuest(animal);
                }
            } else if (animal.state === 'WAITING_FOR_ITEM') {
                // Stay at home
                animal.mesh.position.lerp(animal.home.mesh.position.clone().add(new THREE.Vector3(0,-1,2)), dt);
                
                // If player comes back close
                if (distToPlayer < 4) {
                     // Check if player has item automatically or re-trigger dialogue
                     if (this.player.hasItem(animal.type.item)) {
                         this.triggerQuest(animal); // Will handle completion
                     }
                }
            }
        });

        // --- Monsters ---
        let playerDrained = false;

        this.monsters.forEach(monster => {
            const distToPlayer = monster.mesh.position.distanceTo(this.player.position);
            
            // Basic Repawn if too far
            if (distToPlayer > 60) {
                monster.mesh.position.x = this.player.position.x + (Math.random()-0.5)*80;
                monster.mesh.position.z = this.player.position.z + (Math.random()-0.5)*80;
            }

            // Light Check - Only flee from Shrines now
            let inShrineLight = false;
            // Check habitats
            this.habitats.forEach(hab => {
                if (monster.mesh.position.distanceTo(hab.mesh.position) < 15) inShrineLight = true;
            });

            if (inShrineLight) {
                // Flee from Shrine area
                const fleeDir = monster.mesh.position.clone().sub(this.player.position).normalize();
                monster.mesh.position.add(fleeDir.multiplyScalar(dt * 6));
                monster.mesh.material.opacity = 0.3; // Fade in light
            } else {
                // Aggressive behavior
                monster.mesh.material.opacity = 0.9;
                
                if (distToPlayer < 25) {
                    // Chase
                    const chaseDir = this.player.position.clone().sub(monster.mesh.position).normalize();
                    monster.mesh.position.add(chaseDir.multiplyScalar(dt * 4));
                    
                    // Drain Logic
                    if (distToPlayer < 2.5) {
                        playerDrained = true;
                    }
                } else {
                    // Wander
                    monster.mesh.position.x += Math.sin(time + monster.mesh.id) * 0.05;
                    monster.mesh.position.z += Math.cos(time + monster.mesh.id) * 0.05;
                }
            }
            
            // Jitter effect
            monster.mesh.scale.set(2 + Math.random()*0.2, 2 + Math.random()*0.2, 1);
        });

        // Apply Light Effects
        if (playerDrained) {
            this.player.drainLight(dt * 3.3); 
            if (Math.random() < 0.02) this.playSound(this.growlBuffer);
        } else {
            this.player.recoverLight(dt * 1.5);
        }

        // Game Over Check
        if (this.player.currentLight <= 0 && !gameState.gameOver) {
            gameState.gameOver = true;
            this.showDialogue("The shadows have consumed your light... Game Over.", 0, true);
        }
    }

    showDialogue(text, duration = 3000, restartBtn = false) {
        const dialogue = document.getElementById('dialogue');
        const dText = document.getElementById('dialogue-text');
        const buttons = document.getElementById('dialogue-buttons');
        
        dialogue.style.display = 'flex';
        dText.innerText = text;
        buttons.innerHTML = '';

        if (restartBtn) {
            buttons.innerHTML = `<button onclick="location.reload()">Restart</button>`;
        } else if (duration > 0) {
            setTimeout(() => { dialogue.style.display = 'none'; }, duration);
        }
    }

    showNotification(text) {
        const notif = document.createElement('div');
        notif.innerText = text;
        notif.style.position = 'absolute';
        notif.style.top = '50%';
        notif.style.left = '50%';
        notif.style.transform = 'translate(-50%, -100%)';
        notif.style.color = '#fff';
        notif.style.background = 'rgba(0,0,0,0.7)';
        notif.style.padding = '10px 20px';
        notif.style.borderRadius = '20px';
        notif.style.pointerEvents = 'none';
        notif.style.animation = 'floatUp 2s forwards';
        
        // Inject style for animation if not exists
        if (!document.getElementById('anim-style')) {
            const style = document.createElement('style');
            style.id = 'anim-style';
            style.innerHTML = `@keyframes floatUp { 0% { opacity: 1; transform: translate(-50%, -100%); } 100% { opacity: 0; transform: translate(-50%, -300%); } }`;
            document.head.appendChild(style);
        }

        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 2000);
    }

    triggerQuest(animal) {
        const dialogue = document.getElementById('dialogue');
        const text = document.getElementById('dialogue-text');
        const buttons = document.getElementById('dialogue-buttons');

        dialogue.style.display = 'flex';
        
        if (this.player.hasItem(animal.type.item)) {
             // Complete Quest
             text.innerText = `${animal.type.name}: You found a ${animal.type.item}! This is exactly what I needed!`;
             buttons.innerHTML = `<button id="btn-give">Give ${animal.type.item}</button>`;
             
             document.getElementById('btn-give').onclick = () => {
                 this.player.removeItem(animal.type.item);
                 animal.state = 'HAPPY';
                 text.innerText = "Thank you so much! I am happy now.";
                 buttons.innerHTML = "";
                 
                 // Effect
                 const happyParticles = new THREE.PointLight(animal.type.lightColor, 2, 10);
                 animal.mesh.add(happyParticles);
                 
                 setTimeout(() => { dialogue.style.display = 'none'; }, 2000);
             };

        } else {
            // Quest Start
            text.innerText = `I am safe... but I am hungry. Can you find me a ${animal.type.item} in the woods?`;
            buttons.innerHTML = `
                <button id="btn-ok">I will find it!</button>
            `;
            document.getElementById('btn-ok').onclick = () => {
                dialogue.style.display = 'none';
            };
        }
    }
}