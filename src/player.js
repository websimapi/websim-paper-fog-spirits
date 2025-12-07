import * as THREE from 'three';

export class Player {
    constructor(scene, camera, world) {
        this.scene = scene;
        this.world = world;
        this.position = new THREE.Vector3(0, 0, 0);
        this.speed = 5;

        // Paper Sprite
        const map = new THREE.TextureLoader().load('adventurer.png');
        const material = new THREE.SpriteMaterial({ map: map });
        this.mesh = new THREE.Sprite(material);
        this.mesh.scale.set(1.5, 1.5, 1);
        this.mesh.position.y = 0.75;
        
        // Player Torch
        this.maxLight = 10;
        this.currentLight = 10;
        this.light = new THREE.PointLight(0xffaa55, 1, 10);
        this.light.decay = 2;
        this.mesh.add(this.light);

        this.scene.add(this.mesh);

        // Inventory System
        this.inventory = {}; // { 'itemName': count }
    }

    addItem(itemName) {
        if (!this.inventory[itemName]) this.inventory[itemName] = 0;
        this.inventory[itemName]++;
        console.log(`Picked up ${itemName}! Inventory:`, this.inventory);
    }

    hasItem(itemName) {
        return this.inventory[itemName] && this.inventory[itemName] > 0;
    }

    removeItem(itemName) {
        if (this.hasItem(itemName)) {
            this.inventory[itemName]--;
        }
    }

    update(dt, inputX, inputY) {
        // Move
        if (inputX !== 0 || inputY !== 0) {
            // Invert Z so "forward" input moves forward in world space
            const moveDir = new THREE.Vector3(inputX, 0, -inputY).normalize();
            this.position.add(moveDir.multiplyScalar(this.speed * dt));
            
            // Flip sprite based on direction
            if (inputX < 0) this.mesh.scale.x = -1.5;
            if (inputX > 0) this.mesh.scale.x = 1.5;
        }

        // Terrain Height & Smoothing
        const targetY = this.world.getTerrainHeight(this.position.x, this.position.z);
        this.position.y = THREE.MathUtils.lerp(this.position.y, targetY, dt * 10);

        // Calculate Slope for rotation (Visual only)
        // Sample terrain height slightly to the right to determine slope
        const rightY = this.world.getTerrainHeight(this.position.x + 0.5, this.position.z);
        const slope = (rightY - targetY) * 2; 
        
        // Tilt sprite to match slope (Inverse rotation to align with uphill/downhill)
        const targetRotation = -THREE.MathUtils.clamp(slope, -0.8, 0.8); 
        this.mesh.material.rotation = THREE.MathUtils.lerp(this.mesh.material.rotation, targetRotation, dt * 10);

        // Update mesh position
        this.mesh.position.x = this.position.x;
        this.mesh.position.z = this.position.z;
        
        // Bobbing animation relative to terrain
        this.mesh.position.y = this.position.y + 0.75 + Math.sin(Date.now() * 0.01) * 0.05;

        // Update Light Visuals
        const intensityRatio = this.currentLight / this.maxLight;
        this.light.intensity = intensityRatio * 1.5;
        this.light.distance = 2 + intensityRatio * 12;
    }

    drainLight(amount) {
        this.currentLight = Math.max(0, this.currentLight - amount);
    }

    recoverLight(amount) {
        this.currentLight = Math.min(this.maxLight, this.currentLight + amount);
    }
}