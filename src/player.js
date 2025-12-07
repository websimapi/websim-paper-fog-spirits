import * as THREE from 'three';

export class Player {
    constructor(scene, camera) {
        this.scene = scene;
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
    }

    update(dt, inputX, inputY) {
        // Move
        if (inputX !== 0 || inputY !== 0) {
            const moveDir = new THREE.Vector3(inputX, 0, inputY).normalize();
            this.position.add(moveDir.multiplyScalar(this.speed * dt));
            
            // Flip sprite based on direction
            if (inputX < 0) this.mesh.material.rotation = 0; // standard
            // Sprites always face camera, to flip "horizontally" we can invert scale X
            if (inputX < 0) this.mesh.scale.x = -1.5;
            if (inputX > 0) this.mesh.scale.x = 1.5;
        }

        // Update mesh position (Basic terrain following via raycast or assumption)
        // For simplicity, we assume terrain is roughly y=0 to y=1.5. 
        // In a real physics setup we'd raycast down.
        this.mesh.position.x = this.position.x;
        this.mesh.position.z = this.position.z;
        
        // Bobbing animation
        this.mesh.position.y = 0.75 + Math.sin(Date.now() * 0.01) * 0.05;

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