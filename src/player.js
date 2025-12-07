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
    }
}