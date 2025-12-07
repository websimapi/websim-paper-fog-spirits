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
        
        const loader = new THREE.TextureLoader();
        this.foxTex = loader.load('fox_spirit.png');
        this.monsterTex = loader.load('shadow_monster.png');
        this.shrineTex = loader.load('shrine_light.png');

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

        // Spawn Habitats far away
        for (let i = 0; i < 3; i++) {
            this.spawnHabitat();
        }

        // Spawn Animals around
        for (let i = 0; i < 5; i++) {
            this.spawnAnimal();
        }

        // Spawn Monsters
        for (let i = 0; i < 10; i++) {
            this.spawnMonster();
        }
    }

    spawnHabitat() {
        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * 50;
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;

        const mat = new THREE.SpriteMaterial({ map: this.shrineTex });
        const sprite = new THREE.Sprite(mat);
        sprite.position.set(x, 1.5, z);
        sprite.scale.set(3, 3, 1);
        
        // Light
        const light = new THREE.PointLight(0xffffaa, 2, 15);
        sprite.add(light);

        this.scene.add(sprite);
        this.habitats.push({ mesh: sprite, active: true });
    }

    spawnAnimal() {
        const angle = Math.random() * Math.PI * 2;
        const dist = 15 + Math.random() * 30;
        const x = this.player.position.x + Math.cos(angle) * dist;
        const z = this.player.position.z + Math.sin(angle) * dist;

        const mat = new THREE.SpriteMaterial({ map: this.foxTex });
        const sprite = new THREE.Sprite(mat);
        sprite.position.set(x, 0.5, z);
        sprite.scale.set(1, 1, 1);

        this.scene.add(sprite);
        this.animals.push({ 
            mesh: sprite, 
            state: 'IDLE', // IDLE, FOLLOWING, HOME
            id: Math.random()
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
        // --- Animals ---
        this.animals.forEach(animal => {
            if (animal.state === 'HOME') return;

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
                    
                    // Show UI Message via event or direct DOM (kept simple here)
                    const dialogue = document.getElementById('dialogue');
                    const text = document.getElementById('dialogue-text');
                    const buttons = document.getElementById('dialogue-buttons');
                    
                    dialogue.style.display = 'flex';
                    dialogue.style.flexDirection = 'column';
                    text.innerText = "Spirt: Thank you for finding me! Please take me to the light...";
                    buttons.innerHTML = '';
                    setTimeout(() => { dialogue.style.display = 'none'; }, 3000);
                }
            } else if (animal.state === 'FOLLOWING') {
                // Follow logic with smooth dampening
                const target = this.player.position.clone();
                target.x += Math.sin(time) * 1.5; // Orbit slightly
                target.z += Math.cos(time) * 1.5;
                
                animal.mesh.position.lerp(target, dt * 2);
                animal.mesh.position.y = 1 + Math.sin(time * 5) * 0.2; // Excited hopping

                // Check Habitats
                let nearHabitat = false;
                this.habitats.forEach(hab => {
                    if (animal.mesh.position.distanceTo(hab.mesh.position) < 4) {
                        nearHabitat = true;
                        // Arrived!
                        animal.state = 'HOME';
                        gameState.isEscorting = false;
                        gameState.escortTarget = null;
                        this.playSound(this.thankYouBuffer); // Play happy sound again
                        
                        // Trigger Quest Dialogue
                        this.triggerQuest(animal);
                    }
                });
            }
        });

        // --- Monsters ---
        this.monsters.forEach(monster => {
            const distToPlayer = monster.mesh.position.distanceTo(this.player.position);
            
            // Basic Repawn if too far
            if (distToPlayer > 60) {
                monster.mesh.position.x = this.player.position.x + (Math.random()-0.5)*80;
                monster.mesh.position.z = this.player.position.z + (Math.random()-0.5)*80;
            }

            // Light Check
            let inLight = false;
            // Check player light
            if (distToPlayer < 8) inLight = true;
            // Check habitats
            this.habitats.forEach(hab => {
                if (monster.mesh.position.distanceTo(hab.mesh.position) < 15) inLight = true;
            });

            if (inLight) {
                // Flee
                const fleeDir = monster.mesh.position.clone().sub(this.player.position).normalize();
                monster.mesh.position.add(fleeDir.multiplyScalar(dt * 6));
                monster.mesh.material.opacity = 0.3; // Fade in light
            } else {
                // Chase if close enough
                monster.mesh.material.opacity = 0.9;
                if (distToPlayer < 25) {
                    const chaseDir = this.player.position.clone().sub(monster.mesh.position).normalize();
                    monster.mesh.position.add(chaseDir.multiplyScalar(dt * 3.5));
                } else {
                    // Wander
                    monster.mesh.position.x += Math.sin(time + monster.mesh.id) * 0.05;
                    monster.mesh.position.z += Math.cos(time + monster.mesh.id) * 0.05;
                }
            }
            
            // Jitter effect
            monster.mesh.scale.set(2 + Math.random()*0.2, 2 + Math.random()*0.2, 1);
        });
    }

    triggerQuest(animal) {
        const dialogue = document.getElementById('dialogue');
        const text = document.getElementById('dialogue-text');
        const buttons = document.getElementById('dialogue-buttons');

        dialogue.style.display = 'flex';
        text.innerText = "I am safe now! But I am hungry... Will you fetch me a Star Fruit from the forest?";
        
        buttons.innerHTML = `
            <button id="btn-yes">Yes, I will help!</button>
            <button id="btn-no">No, stay safe here.</button>
        `;

        document.getElementById('btn-yes').onclick = () => {
            text.innerText = "Thank you! I will wait here.";
            buttons.innerHTML = "";
            setTimeout(() => { dialogue.style.display = 'none'; }, 2000);
            // In a full game, this would add a quest state
        };
        
        document.getElementById('btn-no').onclick = () => {
            text.innerText = "Okay... thank you for saving me anyway.";
            buttons.innerHTML = "";
            setTimeout(() => { dialogue.style.display = 'none'; }, 2000);
        };
    }
}