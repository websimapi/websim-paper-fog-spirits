import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.chunkSize = 20;
        this.chunks = new Map();
        this.noise2D = createNoise2D();

        // Textures
        const textureLoader = new THREE.TextureLoader();
        this.groundTex = textureLoader.load('ground_texture.png');
        this.groundTex.wrapS = THREE.RepeatWrapping;
        this.groundTex.wrapT = THREE.RepeatWrapping;

        this.treeTex = textureLoader.load('tree_paper.png');
    }

    getChunkKey(x, z) {
        return `${Math.floor(x / this.chunkSize)},${Math.floor(z / this.chunkSize)}`;
    }

    update(playerPosition) {
        const px = Math.floor(playerPosition.x / this.chunkSize);
        const pz = Math.floor(playerPosition.z / this.chunkSize);
        const renderDist = 2;

        // Create new chunks
        for (let x = px - renderDist; x <= px + renderDist; x++) {
            for (let z = pz - renderDist; z <= pz + renderDist; z++) {
                const key = `${x},${z}`;
                if (!this.chunks.has(key)) {
                    this.createChunk(x, z);
                }
            }
        }

        // Remove old chunks
        for (const [key, chunk] of this.chunks) {
            const [cx, cz] = key.split(',').map(Number);
            if (Math.abs(cx - px) > renderDist + 1 || Math.abs(cz - pz) > renderDist + 1) {
                this.scene.remove(chunk.mesh);
                if (chunk.decorations) this.scene.remove(chunk.decorations);
                this.chunks.delete(key);
            }
        }
    }

    createChunk(cx, cz) {
        const geometry = new THREE.PlaneGeometry(this.chunkSize, this.chunkSize, 10, 10);
        geometry.rotateX(-Math.PI / 2);

        // Displace vertices for uneven terrain
        const posAttribute = geometry.attributes.position;
        for (let i = 0; i < posAttribute.count; i++) {
            const x = posAttribute.getX(i) + cx * this.chunkSize;
            const z = posAttribute.getZ(i) + cz * this.chunkSize;
            // Gentle rolling hills
            const y = this.noise2D(x * 0.1, z * 0.1) * 1.5; 
            posAttribute.setY(i, y);
        }
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({ 
            map: this.groundTex,
            roughness: 1,
            color: 0x888888 
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(cx * this.chunkSize, 0, cz * this.chunkSize);
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        // Add Decorations (Trees)
        const decorGroup = new THREE.Group();
        decorGroup.position.set(cx * this.chunkSize, 0, cz * this.chunkSize);

        // Random trees based on noise
        for(let i=0; i<3; i++) {
            const lx = (Math.random() - 0.5) * this.chunkSize;
            const lz = (Math.random() - 0.5) * this.chunkSize;
            const worldX = lx + cx * this.chunkSize;
            const worldZ = lz + cz * this.chunkSize;

            // Only place trees on "higher" ground to form groves
            if (this.noise2D(worldX * 0.05, worldZ * 0.05) > 0.2) {
                const treeMat = new THREE.SpriteMaterial({ map: this.treeTex });
                const tree = new THREE.Sprite(treeMat);
                tree.position.set(lx, 1.5, lz); // 1.5 is half height approx
                tree.scale.set(3, 3, 1);
                decorGroup.add(tree);
            }
        }

        this.scene.add(decorGroup);

        this.chunks.set(`${cx},${cz}`, { mesh, decorations: decorGroup });
    }
}