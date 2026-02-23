import * as THREE from 'three';
import { IPlanet } from './types';

export class Planet implements IPlanet {
  public mesh: THREE.Mesh;
  public position: THREE.Vector3 = new THREE.Vector3();
  public radius: number = 0.25; // Doubled radius as requested (0.25 fit enough)
  public color: THREE.Color;
  public rotation: number = 0;
  
  // TODO: Add tail/trail implementation if needed
  
  constructor(color: number | string | THREE.Color, initialPosition?: THREE.Vector3) {
    this.color = new THREE.Color(color);
    
    const geometry = new THREE.SphereGeometry(this.radius, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: this.color });
    this.mesh = new THREE.Mesh(geometry, material);
    
    if (initialPosition) {
      this.position.copy(initialPosition);
      this.mesh.position.copy(initialPosition);
    }
  }

  update(deltaTime: number): void {
    // In ADOFAI, planet rotation is handled by the Player/Controller logic usually,
    // but individual planet spin (if any) could be handled here.
    // For now, just sync mesh position with logical position.
    this.mesh.position.copy(this.position);
    
    // Optional: add subtle pulsing or effects here
  }

  render(scene: THREE.Scene): void {
    if (!scene.children.includes(this.mesh)) {
      scene.add(this.mesh);
    }
  }

  moveTo(target: THREE.Vector3): void {
    this.position.copy(target);
    this.mesh.position.copy(target);
  }

  dispose(): void {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      if (Array.isArray(this.mesh.material)) {
        this.mesh.material.forEach(m => m.dispose());
      } else {
        (this.mesh.material as THREE.Material).dispose();
      }
    }
  }
}
