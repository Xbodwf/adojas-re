import * as THREE from 'three';
import {WebGPURenderer} from 'three/webgpu';
import { IPlayer, ILevelData, IMusic } from './types';
import { Planet } from './Planet';
import createTrackMesh from '../Geo/mesh_reserve';

// Easing Functions
const EasingFunctions: { [key: string]: (t: number) => number } = {
    Linear: (t) => t,
    InSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
    OutSine: (t) => Math.sin((t * Math.PI) / 2),
    InOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    InQuad: (t) => t * t,
    OutQuad: (t) => 1 - (1 - t) * (1 - t),
    InOutQuad: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    InCubic: (t) => t * t * t,
    OutCubic: (t) => 1 - Math.pow(1 - t, 3),
    InOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    InQuart: (t) => t * t * t * t,
    OutQuart: (t) => 1 - Math.pow(1 - t, 4),
    InOutQuart: (t) => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
    InQuint: (t) => t * t * t * t * t,
    OutQuint: (t) => 1 - Math.pow(1 - t, 5),
    InOutQuint: (t) => t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2,
    InExpo: (t) => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
    OutExpo: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    InOutExpo: (t) => t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
    InCirc: (t) => 1 - Math.sqrt(1 - Math.pow(t, 2)),
    OutCirc: (t) => Math.sqrt(1 - Math.pow(t - 1, 2)),
    InOutCirc: (t) => t < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,
    InBack: (t) => { const c1 = 1.70158; const c3 = c1 + 1; return c3 * t * t * t - c1 * t * t; },
    OutBack: (t) => { const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    InOutBack: (t) => { const c1 = 1.70158; const c2 = c1 * 1.525; return t < 0.5 ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2 : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2; },
    InElastic: (t) => { const c4 = (2 * Math.PI) / 3; return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4); },
    OutElastic: (t) => { const c4 = (2 * Math.PI) / 3; return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1; },
    InOutElastic: (t) => { const c5 = (2 * Math.PI) / 4.5; return t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2 : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1; },
    InBounce: (t) => 1 - EasingFunctions.OutBounce(1 - t),
    OutBounce: (t) => { const n1 = 7.5625; const d1 = 2.75; if (t < 1 / d1) { return n1 * t * t; } else if (t < 2 / d1) { return n1 * (t -= 1.5 / d1) * t + 0.75; } else if (t < 2.5 / d1) { return n1 * (t -= 2.25 / d1) * t + 0.9375; } else { return n1 * (t -= 2.625 / d1) * t + 0.984375; } },
    InOutBounce: (t) => t < 0.5 ? (1 - EasingFunctions.OutBounce(1 - 2 * t)) / 2 : (1 + EasingFunctions.OutBounce(2 * t - 1)) / 2,
    Unset: (t) => t
};

class HTMLAudioMusic implements IMusic {
  private audio: HTMLAudioElement;
  private _isPlaying: boolean = false;
  private _isPaused: boolean = false;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
  }

  load(src: string): void {
    this.audio.src = src;
    this.audio.load();
  }

  play(): void {
    this.audio.play().catch(e => console.error("Audio play failed", e));
    this._isPlaying = true;
    this._isPaused = false;
  }

  pause(): void {
    this.audio.pause();
    this._isPlaying = false;
    this._isPaused = true;
  }

  stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
    this._isPlaying = false;
    this._isPaused = false;
  }

  resume(): void {
    if (this._isPaused || (this.audio.paused && this.audio.currentTime > 0)) {
      this.play();
    }
  }

  seek(position: number): void {
    this.audio.currentTime = position;
  }

  get position(): number {
    return this.audio.currentTime;
  }

  get duration(): number {
    return this.audio.duration;
  }

  get volume(): number {
    return this.audio.volume;
  }

  set volume(v: number) {
    this.audio.volume = v;
  }

  get pitch(): number {
    return this.audio.playbackRate;
  }

  set pitch(v: number) {
    this.audio.playbackRate = v;
  }

  get isPlaying(): boolean {
      return !this.audio.paused && !this.audio.ended;
  }

  get isPaused(): boolean {
      return this.audio.paused && !this.audio.ended && this.audio.currentTime > 0;
  }

  get hasAudio(): boolean {
      // Check if src is set and valid
      return !!this.audio.src && this.audio.src !== window.location.href;
  }

  dispose(): void {
    this.stop();
    this.audio.src = '';
    this.audio.remove();
  }
}

export class Player implements IPlayer {
  private container: HTMLElement | null = null;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer!: THREE.WebGLRenderer | WebGPURenderer;
  private rendererType: 'webgl' | 'webgpu' = 'webgpu';
  private animationId: number | null = null;
  
  private levelData: ILevelData;
  private planetRed: Planet | null = null;
  private planetBlue: Planet | null = null;

  // Tile Management
  private tiles: Map<string, THREE.Mesh> = new Map();
  private visibleTiles: Set<string> = new Set();
  private tileMaterials: THREE.MeshBasicMaterial[] = [];
  private tileLimit: number = 0; // 0 means no limit? Or use a sensible default
  
  // Playback state
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private startTime: number = 0;
  private pauseTime: number = 0;
  private elapsedTime: number = 0;
  
  private currentTileIndex: number = 0;
  
  // Camera settings
  private zoom: number = 1;
  private cameraPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  
  // Interaction state
  private isDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private initialPinchDistance: number = 0;
  private initialZoom: number = 0;
  
  private boundHandlers: { [key: string]: EventListenerOrEventListenerObject } = {};

  // Stats callback
  private onStatsUpdate: ((stats: { fps: number; time: number; tileIndex: number }) => void) | null = null;
  private frameCount: number = 0;
  private lastTime: number = 0;

  // Precalculated rotations and timing
  private cumulativeRotations: number[] = [];
  private totalLevelRotation: number = 0;
  
  private tileStartTimes: number[] = [];
  private tileDurations: number[] = [];
  private tileIsCW: boolean[] = [];
  private tileBPM: number[] = [];
  private tileEvents: Map<number, any[]> = new Map();
  private tileCameraEvents: Map<number, any[]> = new Map();
  private lastCameraEventTileIndex: number = -1;

  // Camera State
  private cameraMode = {
      relativeTo: 'Player',
      position: { x: 0, y: 0 }, // Offset or Global Pos
      zoom: 100,
      rotation: 0,
      angleOffset: 0
  };
  
  private cameraTransition = {
      active: false,
      startTime: 0,
      duration: 0,
      startSnapshot: {
          position: { x: 0, y: 0 },
          zoom: 100,
          rotation: 0
      },
      ease: 'Linear'
  };

  private music: IMusic = new HTMLAudioMusic();

  constructor(levelData: ILevelData, rendererType: 'webgl' | 'webgpu' = 'webgpu') {
    this.rendererType = rendererType;
    this.levelData = levelData;
    
    // Parse actions if available
    if (this.levelData.actions) {
      this.levelData.actions.forEach(action => {
        const floor = action.floor;
        /*if (action.eventType === 'MoveCamera') {
            if (!this.tileCameraEvents.has(floor)) {
                this.tileCameraEvents.set(floor, []);
            }
            this.tileCameraEvents.get(floor)!.push(action);
        } else {*/
            if (!this.tileEvents.has(floor)) {
                this.tileEvents.set(floor, []);
            }
            this.tileEvents.get(floor)!.push(action);
        /*}*/
      });
    }

    // Initialize Three.js components
    this.scene = new THREE.Scene();
    
    // Append extra tile at the end
    this.appendExtraTile();

    // Calculate cumulative rotations
    this.calculateCumulativeRotations();
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040, 1.0);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(10, 10, 15);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
    
    // Default camera setup - will be updated on resize/init
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
    this.camera.position.z = 10;
    
    this.initRenderer();
    
    this.tileMaterials = this.createTileMaterials();
  }
  
  private appendExtraTile(): void {
    const tiles = this.levelData.tiles;
    if (!tiles || tiles.length === 0) return;

    const lastTile = tiles[tiles.length - 1];
    
    // Determine length from last segment if possible
    let length = 1.0; 
    if (tiles.length > 1) {
       // Search backwards for a non-zero length segment
       for (let i = tiles.length - 1; i > 0; i--) {
           const cur = tiles[i];
           const prev = tiles[i-1];
           const dx = cur.position[0] - prev.position[0];
           const dy = cur.position[1] - prev.position[1];
           const dist = Math.sqrt(dx*dx + dy*dy);
           if (dist > 0.01) {
               length = dist;
               break;
           }
       }
    }
    
    // Direction (absolute angle in degrees)
    // If direction is missing, default to 0
    const direction = lastTile.direction !== undefined ? lastTile.direction : 0;
    
    const rad = (direction * Math.PI) / 180;
    const newX = lastTile.position[0] + Math.cos(rad) * length;
    const newY = lastTile.position[1] + Math.sin(rad) * length;
    
    const newTile = {
        ...lastTile, // Copy properties to keep consistent structure
        position: [newX, newY],
        angle: 180, // Relative angle 180 = straight
        direction: direction, // Same absolute direction
        // Reset index if it exists, though Player usually ignores it for logic
        index: tiles.length
    };
    
    tiles.push(newTile);
  }

  private calculateCumulativeRotations(): void {
    const tiles = this.levelData.tiles;
    if (!tiles || tiles.length === 0) return;

    this.cumulativeRotations = [0];
    this.tileStartTimes = [0];
    this.tileDurations = [];
    this.tileIsCW = [];
    this.tileBPM = [];
    
    let totalRotation = 0;
    let totalTime = 0;
    
    // Initial settings
    let currentBPM = this.levelData.settings.bpm || 100;
    let isCW = true;

    // We iterate through tiles to calculate the rotation/time to reach the NEXT tile.
    // i is the pivot tile index.
    // The movement is from tile i to i+1.
    for (let i = 0; i < tiles.length - 1; i++) {
        // Process events for current tile
        let extraRotation = 0;
        if (this.tileEvents.has(i)) {
            const events = this.tileEvents.get(i)!;
            events.forEach(event => {
                if (event.eventType === 'Twirl') {
                    isCW = !isCW;
                } else if (event.eventType === 'SetSpeed') {
                    if (event.speedType === 'Multiplier') {
                        currentBPM *= event.bpmMultiplier;
                    } else {
                        currentBPM = event.beatsPerMinute;
                    }
                } else if (event.eventType === 'Pause') {
                    // SharpFAI logic: extraHold = duration / 2.0 (in rotations)
                    const duration = event.duration || 0;
                    extraRotation += duration / 2.0;
                }
            });
        }
        
        // Store CW state and BPM for this tile
        this.tileIsCW.push(isCW);
        this.tileBPM.push(currentBPM);
        
        const pivot = tiles[i];
        const next = tiles[i + 1];

        const pivotPos = pivot.position;
        const nextPos = next.position;

        // Target angle (Pivot -> Next)
        const dx = nextPos[0] - pivotPos[0];
        const dy = nextPos[1] - pivotPos[1];
        const targetAngle = Math.atan2(dy, dx);

        // Start angle (Pivot -> Prev)
        let startAngle = targetAngle + Math.PI;
        if (i > 0) {
            const prev = tiles[i - 1];
            const pdx = prev.position[0] - pivotPos[0];
            const pdy = prev.position[1] - pivotPos[1];
            startAngle = Math.atan2(pdy, pdx);
        }

        // Calculate rotation angle
        // We calculate the shortest path first, then adjust for direction
        let diff = targetAngle - startAngle;
        while (diff > 0) diff -= 2 * Math.PI;
        while (diff <= -2 * Math.PI) diff += 2 * Math.PI;
        
        // diff is now in range (-2PI, 0] representing CW rotation
        
        let angle = targetAngle - startAngle;
        // Normalize to (-PI, PI]
        // User request: If angle is 360 (2PI), do not normalize (don't reduce to 0).
        // We only normalize if it's strictly within the range where it SHOULD be reduced.
        if (Math.abs(angle) < 2 * Math.PI - 0.001) {
            while (angle <= -Math.PI) angle += 2 * Math.PI;
            while (angle > Math.PI) angle -= 2 * Math.PI;
        }
        
        // Now angle is the shortest path.
        let finalAngle = angle;
        if (isCW) {
            if (finalAngle > 0.0001) finalAngle -= 2 * Math.PI; // Force CW
        } else {
            if (finalAngle < -0.0001) finalAngle += 2 * Math.PI; // Force CCW
        }
        
        // Handle special Midspin case (angle = 360)
        // This overrides the geometric angle to be a full 360 degree rotation
        if (pivot.angle === 360) {
             if (isCW) finalAngle = -2 * Math.PI;
             else finalAngle = 2 * Math.PI;
        }
        
        // Magnitude in rotations (1.0 = 360 deg)
        const rotationAmount = Math.abs(finalAngle) / (2 * Math.PI) + extraRotation;
        
        // Duration in seconds
        // 180 degrees (0.5 rotation) = 1 beat
        // beats = rotationAmount * 2
        // seconds = beats * (60 / BPM)
        const duration = (rotationAmount * 2) * (60 / currentBPM);
        
        totalRotation += rotationAmount;
        totalTime += duration;
        
        this.cumulativeRotations.push(totalRotation);
        this.tileDurations.push(duration);
        this.tileStartTimes.push(totalTime);
    }
    
    // Shift all tileStartTimes so that tileStartTimes[1] is 0
    // This ensures that at t=0 (offset), we have completed the movement T0->T1 and are at T1.
    // The movement T0->T1 (index 0) will have negative start time.
    if (this.tileStartTimes.length > 1) {
        const shift = this.tileStartTimes[1];
        for (let i = 0; i < this.tileStartTimes.length; i++) {
             this.tileStartTimes[i] -= shift;
        }
    } else if (this.tileDurations.length > 0) {
        // If only 1 movement, shift by duration of first movement
        const shift = this.tileDurations[0];
        this.tileStartTimes[0] -= shift;
        if (this.tileStartTimes.length > 1) {
             this.tileStartTimes[1] -= shift;
        }
    }
    
    // Handle the last tile (for infinite rotation)
    // We can assume the last tile has the same settings as the previous one
    if (tiles.length > 0) {
        const lastIndex = tiles.length - 1;
        if (this.tileEvents.has(lastIndex)) {
            const events = this.tileEvents.get(lastIndex)!;
            events.forEach(event => {
                if (event.eventType === 'Twirl') {
                    isCW = !isCW;
                } else if (event.eventType === 'SetSpeed') {
                    if (event.speedType === 'Multiplier') {
                        currentBPM *= event.bpmMultiplier;
                    } else {
                        currentBPM = event.beatsPerMinute;
                    }
                }
            });
        }

        this.tileIsCW.push(isCW);
        this.tileBPM.push(currentBPM);
    }
    
    this.totalLevelRotation = totalRotation;
  }

  private initRenderer(): void {
    if (this.renderer) {
      // Clean up old renderer
      this.renderer.dispose();
      if (this.container && this.renderer.domElement.parentNode === this.container) {
        this.container.removeChild(this.renderer.domElement);
      }
    }

    if (this.rendererType === 'webgpu') {
      this.renderer = new WebGPURenderer({ alpha: true, antialias: true });
    } else {
      this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    }
    this.renderer.setPixelRatio(window.devicePixelRatio);
    
    // If container exists (runtime switch), re-attach
    if (this.container) {
      this.container.appendChild(this.renderer.domElement);
      this.onWindowResize();
    }
  }

  public async setRenderer(type: 'webgl' | 'webgpu'): Promise<void> {
    if (this.rendererType === type) return;
    this.rendererType = type;
    this.initRenderer();
  }

  public createPlayer(container: HTMLElement): void {
    this.container = container;
    // Append current renderer element
    this.container.appendChild(this.renderer.domElement);
    
    this.onWindowResize();
    
    this.updateVisibleTiles(); // Initial render of tiles
    
    this.setupEventListeners();
    
    this.startRenderLoop();
  }
  
  private setupEventListeners(): void {
    if (!this.container) return;
    
    // Store bound handlers so we can remove them later
    this.boundHandlers = {
      resize: this.onWindowResize.bind(this) as EventListener,
      mousedown: this.onMouseDown.bind(this) as unknown as EventListener,
      mousemove: this.onMouseMove.bind(this) as unknown as EventListener,
      mouseup: this.onMouseUp.bind(this) as unknown as EventListener,
      mouseleave: this.onMouseUp.bind(this) as unknown as EventListener,
      wheel: this.onWheel.bind(this) as unknown as EventListener,
      touchstart: this.onTouchStart.bind(this) as unknown as EventListener,
      touchmove: this.onTouchMove.bind(this) as unknown as EventListener,
      touchend: this.onTouchEnd.bind(this) as unknown as EventListener,
      contextmenu: ((e: Event) => e.preventDefault()) as EventListener,
    };
    
    // Window resize
    window.addEventListener('resize', this.boundHandlers.resize as EventListener);

    // Mouse events
    this.container.addEventListener('mousedown', this.boundHandlers.mousedown as EventListener);
    this.container.addEventListener('mousemove', this.boundHandlers.mousemove as EventListener);
    this.container.addEventListener('mouseup', this.boundHandlers.mouseup as EventListener);
    this.container.addEventListener('mouseleave', this.boundHandlers.mouseleave as EventListener);
    this.container.addEventListener('wheel', this.boundHandlers.wheel as EventListener);
    
    // Touch events
    this.container.addEventListener('touchstart', this.boundHandlers.touchstart as EventListener, { passive: false });
    this.container.addEventListener('touchmove', this.boundHandlers.touchmove as EventListener, { passive: false });
    this.container.addEventListener('touchend', this.boundHandlers.touchend as EventListener);
    
    this.container.addEventListener('contextmenu', this.boundHandlers.contextmenu as EventListener);
  }
  
  private removeEventListeners(): void {
    if (!this.container) return;
    
    if (this.boundHandlers.resize) {
      window.removeEventListener('resize', this.boundHandlers.resize as EventListener);
    }
    
    if (this.boundHandlers.mousedown) {
      this.container.removeEventListener('mousedown', this.boundHandlers.mousedown as EventListener);
      this.container.removeEventListener('mousemove', this.boundHandlers.mousemove as EventListener);
      this.container.removeEventListener('mouseup', this.boundHandlers.mouseup as EventListener);
      this.container.removeEventListener('mouseleave', this.boundHandlers.mouseleave as EventListener);
      this.container.removeEventListener('wheel', this.boundHandlers.wheel as EventListener);
      
      this.container.removeEventListener('touchstart', this.boundHandlers.touchstart as EventListener); // options not needed for removal
      this.container.removeEventListener('touchmove', this.boundHandlers.touchmove as EventListener);
      this.container.removeEventListener('touchend', this.boundHandlers.touchend as EventListener);
      
      this.container.removeEventListener('contextmenu', this.boundHandlers.contextmenu as EventListener);
    }
    
    this.boundHandlers = {};
  }

  // --- Interaction Handlers ---

  private onMouseDown(event: MouseEvent): void {
    if (event.button === 0) { // Left click
      this.isDragging = true;
      this.previousMousePosition = { x: event.clientX, y: event.clientY };
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = event.clientX - this.previousMousePosition.x;
    const deltaY = event.clientY - this.previousMousePosition.y;

    // Adjust camera position
    // Scale by zoom level? No, orthographic camera position is world units.
    // But pixel movement needs to be converted to world units.
    
    // Calculate world units per pixel
    const aspect = this.container!.clientWidth / this.container!.clientHeight;
    const frustumHeight = this.camera.top - this.camera.bottom;
    const unitsPerPixel = frustumHeight / this.container!.clientHeight;

    this.cameraPosition.x -= deltaX * unitsPerPixel;
    this.cameraPosition.y += deltaY * unitsPerPixel; // Y is inverted in screen space vs world space usually
    
    this.camera.position.x = this.cameraPosition.x;
    this.camera.position.y = this.cameraPosition.y;

    this.updateVisibleTiles();

    this.previousMousePosition = { x: event.clientX, y: event.clientY };
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    
    const zoomSpeed = 0.1;
    if (event.deltaY < 0) {
      this.zoom *= (1 + zoomSpeed);
    } else {
      this.zoom /= (1 + zoomSpeed);
    }
    
    // Clamp zoom
    this.zoom = Math.max(0.1, Math.min(this.zoom, 10));
    
    this.onWindowResize();
  }

  // Touch support (simplified)
  private onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      this.isDragging = true;
      this.previousMousePosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    } else if (event.touches.length === 2) {
      this.isDragging = false;
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      this.initialPinchDistance = Math.sqrt(dx*dx + dy*dy);
      this.initialZoom = this.zoom;
    }
  }

  private onTouchMove(event: TouchEvent): void {
    event.preventDefault();
    if (this.isDragging && event.touches.length === 1) {
      const touch = event.touches[0];
      const deltaX = touch.clientX - this.previousMousePosition.x;
      const deltaY = touch.clientY - this.previousMousePosition.y;
      
      const frustumHeight = this.camera.top - this.camera.bottom;
      const unitsPerPixel = frustumHeight / this.container!.clientHeight;
      
      this.cameraPosition.x -= deltaX * unitsPerPixel;
      this.cameraPosition.y += deltaY * unitsPerPixel;
      
      this.camera.position.x = this.cameraPosition.x;
      this.camera.position.y = this.cameraPosition.y;
      
      this.updateVisibleTiles();
      
      this.previousMousePosition = { x: touch.clientX, y: touch.clientY };
    } else if (event.touches.length === 2) {
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      const distance = Math.sqrt(dx*dx + dy*dy);
      
      if (this.initialPinchDistance > 0) {
        const scale = distance / this.initialPinchDistance;
        this.zoom = this.initialZoom * scale;
        this.zoom = Math.max(0.1, Math.min(this.zoom, 10));
        this.onWindowResize();
      }
    }
  }

  private onTouchEnd(): void {
    this.isDragging = false;
    this.initialPinchDistance = 0;
  }

  public setStatsCallback(callback: (stats: { fps: number; time: number; tileIndex: number }) => void): void {
    this.onStatsUpdate = callback;
  }

  private startRenderLoop(): void {
    let lastTime = performance.now();
    let frameCount = 0;
    let fps = 0;
    let fpsTime = lastTime;

    const animate = (time: number) => {
      this.animationId = requestAnimationFrame(animate);
      
      const delta = (time - lastTime) / 1000;
      lastTime = time;
      
      if (this.isPlaying && !this.isPaused) {
        this.updatePlayer(delta);
      }
      
      this.renderPlayer(delta);
      
      // FPS calculation
      frameCount++;
      if (time - fpsTime >= 500) {
        fps = Math.round((frameCount * 1000) / (time - fpsTime));
        frameCount = 0;
        fpsTime = time;
        
        if (this.onStatsUpdate) {
          this.onStatsUpdate({
            fps,
            time: this.elapsedTime,
            tileIndex: this.currentTileIndex
          });
        }
      }
    };
    
    this.animationId = requestAnimationFrame(animate);
  }

  public updatePlayer(delta: number): void {
    if (!this.planetRed || !this.planetBlue) return;

    // Calculate current time
    if (this.music.isPlaying) {
        const musicTime = this.music.position * 1000;
        
        // Sync logic: Only sync if music has actually started (position > 0)
        // This prevents "twitching" (0 -> 50 -> 0) during audio buffering/startup
        if (musicTime > 0) {
            const expectedTime = performance.now() - this.startTime;
            // If drift is significant (> 50ms), hard sync
            if (Math.abs(musicTime - expectedTime) > 50) {
                 this.startTime = performance.now() - musicTime;
                 this.elapsedTime = musicTime;
            } else {
                 this.elapsedTime = expectedTime;
            }
        } else {
            // Music is theoretically playing but position is 0 (loading/buffering)
            // Hold visual time at 0 to avoid jump
            this.startTime = performance.now();
            this.elapsedTime = 0;
        }
    } else {
        // If not playing music (or fallback), use standard timer
        // But if we are in "Play" mode and waiting for music to start?
        // isPlaying flag is true in startPlay().
        // So we fall here only if music.isPlaying is false (e.g. ended or failed).
        // If we are just paused, we don't update elapsedTime.
        if (this.isPlaying && !this.isPaused) {
             const now = performance.now();
             this.elapsedTime = now - this.startTime;
        }
    }
    
    // Logic from original Previewer to update planets
    this.updatePlanetsPosition();
    
    // Update camera to follow
    this.updateCameraFollow(delta);
  }

  public renderPlayer(delta: number): void {
    if (this.renderer && this.scene && this.camera) {
      if (this.rendererType === 'webgpu') {
        (this.renderer as any).renderAsync(this.scene, this.camera);
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    }
  }

  public startPlay(): void {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.isPaused = false;
    this.startTime = performance.now();
    this.elapsedTime = 0;
    this.currentTileIndex = 0;
    
    // Play Music
    this.music.play();
    
    this.createPlanets();
    
    // Reset camera state
    this.lastCameraEventTileIndex = -1;
    this.cameraMode = {
        relativeTo: 'Player',
        position: { x: 0, y: 0 },
        zoom: 100,
        rotation: 0,
        angleOffset: 0
    };
    this.cameraTransition.active = false;
  }

  public stopPlay(): void {
    this.isPlaying = false;
    this.isPaused = false;
    this.removePlanets();
    
    // Stop Music
    this.music.stop();
    
    // Reset camera to start or keep where it is? Usually reset for preview.
    // this.cameraPosition.set(0, 0, 0);
    // this.updateCamera();
  }

  public pausePlay(): void {
    if (!this.isPlaying || this.isPaused) return;
    this.isPaused = true;
    this.pauseTime = performance.now();
    this.music.pause();
  }

  public resumePlay(): void {
    if (!this.isPlaying || !this.isPaused) return;
    this.isPaused = false;
    // Adjust start time to account for pause duration
    const pauseDuration = performance.now() - this.pauseTime;
    this.startTime += pauseDuration;
    this.music.resume();
  }

  public resetPlayer(): void {
    this.stopPlay();
    this.startPlay();
  }

  public destroyPlayer(): void {
    this.stopPlay();
    this.music.dispose();
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    this.removeEventListeners();
    
    if (this.container && this.renderer.domElement && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
    
    this.renderer.dispose();
  }

  // --- Helper Methods ---

  public onWindowResize(): void {
    if (!this.container) return;
    
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    const aspect = width / height;
    const frustumSize = 20 / this.zoom; // Adjust based on zoom (smaller frustum = zoom in)
    
    this.camera.left = -frustumSize * aspect / 2;
    this.camera.right = frustumSize * aspect / 2;
    this.camera.top = frustumSize / 2;
    this.camera.bottom = -frustumSize / 2;
    
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    
    this.updateVisibleTiles();
  }

  private createPlanets(): void {
    this.planetRed = new Planet(0xff0000);
    this.planetBlue = new Planet(0x0000ff);
    
    this.planetRed.render(this.scene);
    this.planetBlue.render(this.scene);
    
    // Initial positioning logic (simplified)
    if (this.levelData.tiles && this.levelData.tiles.length > 1) {
      const t0 = this.levelData.tiles[0];
      const t1 = this.levelData.tiles[1];
      if (t0 && t1) {
        // Assume red is pivot at t0, blue at t1 (waiting state)
        // Adjust coordinates as per ADOFAI grid logic
        
        // Use standard t0, t1 positions
        this.planetRed.position.set(t0.position[0], t0.position[1], 0);
        this.planetBlue.position.set(t1.position[0], t1.position[1], 0);
      }
    }
  }

  private removePlanets(): void {
    if (this.planetRed) {
      this.scene.remove(this.planetRed.mesh);
      this.planetRed.dispose();
      this.planetRed = null;
    }
    if (this.planetBlue) {
      this.scene.remove(this.planetBlue.mesh);
      this.planetBlue.dispose();
      this.planetBlue = null;
    }
  }

  private getContainerSize(): { width: number; height: number } {
    if (!this.container) return { width: window.innerWidth, height: window.innerHeight };
    return {
      width: this.container.clientWidth,
      height: this.container.clientHeight,
    };
  }

  private createTileMaterials(): THREE.MeshBasicMaterial[] {
    const materials: THREE.MeshBasicMaterial[] = [];
    // User requested only one color: #debb7b (opaque)
    const colors = [
      0xdebb7b
    ];

    colors.forEach((color) => {
      const m = new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
      });
      m.color = new THREE.Color(color);
      // Transparency removed as per request
      //m.opacity = 1.0;
      m.transparent = false;
      materials.push(m);
    });

    return materials;
  }

  private updateVisibleTiles(): void {
    if (!this.scene || !this.levelData.tiles) return;

    const containerSize = this.getContainerSize();
    const aspect = containerSize.width / containerSize.height;
    const frustumSize = 20 / this.zoom;

    const left = this.cameraPosition.x - (frustumSize * aspect) / 2;
    const right = this.cameraPosition.x + (frustumSize * aspect) / 2;
    const bottom = this.cameraPosition.y - frustumSize / 2;
    const top = this.cameraPosition.y + frustumSize / 2;

    // Clear current visible tiles
    this.visibleTiles.forEach((tileId) => {
      if (this.tiles.has(tileId)) {
        this.scene.remove(this.tiles.get(tileId)!);
      }
    });
    this.visibleTiles.clear();

    const visibleIndices: number[] = [];
    this.levelData.tiles.forEach((tile, index) => {
      const [x, y] = tile.position;
      if (x >= left - 2 && x <= right + 2 && y >= bottom - 2 && y <= top + 2) {
        visibleIndices.push(index);
      }
    });

    let indicesToRender = visibleIndices;
    if (this.tileLimit > 0 && visibleIndices.length > this.tileLimit) {
      indicesToRender = visibleIndices
        .map(i => {
          const tile = this.levelData.tiles[i];
          const dist = Math.sqrt(
            Math.pow(tile.position[0] - this.cameraPosition.x, 2) + 
            Math.pow(tile.position[1] - this.cameraPosition.y, 2)
          );
          return { i, dist };
        })
        .sort((a, b) => a.dist - b.dist)
        .slice(0, this.tileLimit)
        .map(item => item.i);
    }

    indicesToRender.forEach(index => {
      const id = index.toString();
      const tile = this.levelData.tiles[index];
      const [x, y] = tile.position;

      let tileMesh: THREE.Mesh;
      if (this.tiles.has(id)) {
        tileMesh = this.tiles.get(id)!;
      } else {
        const zLevel = 12 - index;
        const materialIndex = index % this.tileMaterials.length;
        
        let pred = -180; // Default if index == 0
        if (index > 0) {
           const prevTile = this.levelData.tiles[index - 1];
           pred = (prevTile.direction || 0) - 180;
           if (prevTile.direction === 999 && index > 1) {
             pred = (this.levelData.tiles[index - 2].direction || 0);
           }
        }
        
        const currentDirection = tile.direction || 0;
        const is999 = (tile.angle === 0);
        
        const meshData = createTrackMesh(pred, currentDirection, is999);
        
        if (!meshData || !meshData.faces) {
          return;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setIndex(meshData.faces);
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(meshData.vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(meshData.colors, 3));
        geometry.computeVertexNormals();

        // Use position from current tile (no offset, no +1)
        const posX = x;
        const posY = y;

        tileMesh = new THREE.Mesh(geometry, this.tileMaterials[materialIndex]);
        tileMesh.position.set(posX, posY, zLevel * 0.001);
        tileMesh.castShadow = true;
        tileMesh.receiveShadow = true;
        
        // Add decorations for Twirl and SetSpeed events
        // Size: height * 0.8 (approx 0.22)
        const decoSize = 0.275 * 0.8;
        const decoZ = 0.002; // Slightly above tile
        
        // Check for Twirl
        let hasTwirl = false;
        let hasSetSpeed = false;
        
        if (this.tileEvents.has(index)) {
            const events = this.tileEvents.get(index)!;
            events.forEach(e => {
                if (e.eventType === 'Twirl') hasTwirl = true;
                if (e.eventType === 'SetSpeed') hasSetSpeed = true;
            });
        }
        
        if (hasTwirl) {
            const twirlGeo = new THREE.CircleGeometry(decoSize / 2, 32);
            const twirlMat = new THREE.MeshBasicMaterial({ color: 0x800080 }); // Purple
            const twirlMesh = new THREE.Mesh(twirlGeo, twirlMat);
            twirlMesh.position.set(0, 0, decoZ);
            tileMesh.add(twirlMesh);
        }
        
        if (hasSetSpeed) {
            // Determine speed change
            // Compare current tile BPM with previous tile BPM
            // tileBPM[index] is the BPM for the movement STARTING at tile index
            // But the SetSpeed event is ON tile index.
            // So we compare tileBPM[index] (new speed) with tileBPM[index-1] (old speed)
            
            const currentBPM = this.tileBPM[index];
            const prevBPM = index > 0 ? this.tileBPM[index - 1] : (this.levelData.settings.bpm || 100);
            
            const ratio = currentBPM / prevBPM;
            
            let speedMesh: THREE.Mesh | null = null;
            
            if (ratio > 1.05) {
                // Faster - Red Dot
                const geo = new THREE.CircleGeometry(decoSize / 2, 32);
                const mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                speedMesh = new THREE.Mesh(geo, mat);
            } else if (ratio < 0.95) {
                // Slower - Blue Dot
                const geo = new THREE.CircleGeometry(decoSize / 2, 32);
                const mat = new THREE.MeshBasicMaterial({ color: 0x0000ff });
                speedMesh = new THREE.Mesh(geo, mat);
            } else if (ratio >= 0.95 && ratio <= 1.05 && Math.abs(ratio - 1.0) > 0.0001) {
                // Equal Sign - White
                // Two rectangles
                const barWidth = decoSize * 0.8;
                const barHeight = decoSize * 0.2;
                const gap = decoSize * 0.1;
                
                const group = new THREE.Group();
                
                const topBarGeo = new THREE.PlaneGeometry(barWidth, barHeight);
                const botBarGeo = new THREE.PlaneGeometry(barWidth, barHeight);
                const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
                
                const topBar = new THREE.Mesh(topBarGeo, mat);
                topBar.position.set(0, gap + barHeight/2, 0);
                
                const botBar = new THREE.Mesh(botBarGeo, mat);
                botBar.position.set(0, -(gap + barHeight/2), 0);
                
                group.add(topBar);
                group.add(botBar);
                
                // Wrap in a mesh-like object or add group directly
                // tileMesh.add can accept Group
                // But let's keep type consistency if possible, though Object3D is fine
                tileMesh.add(group);
                // Adjust group position
                group.position.set(0, 0, decoZ + (hasTwirl ? 0.001 : 0)); // Stack if twirl exists
                speedMesh = null; // Handled by group
            }
            
            if (speedMesh) {
                speedMesh.position.set(0, 0, decoZ + (hasTwirl ? 0.001 : 0)); // Stack if twirl exists
                tileMesh.add(speedMesh);
            }
        }
        
        this.tiles.set(id, tileMesh);
      }
      
      this.scene.add(tileMesh);
      this.visibleTiles.add(id);
    });
  }

  private updatePlanetsPosition(): void {
    if (!this.planetRed || !this.planetBlue) return;
    
    const settings = this.levelData.settings;
    const countdownTicks = settings.countdownTicks || 4;
    
    // Time in seconds
    // Only use offset if audio is present
    const offset = this.music.hasAudio ? (this.levelData.settings.offset || 0) : 0;
    const timeInSeconds = (this.elapsedTime - offset) / 1000;
    
    // Countdown duration
    // Countdown uses the initial BPM
    const initialBPM = settings.bpm || 100;
    const initialSecPerBeat = 60 / initialBPM;
    const countdownDuration = countdownTicks * initialSecPerBeat;
    
    // Logical time relative to start of first tile
    // If offset is correctly set, timeInSeconds=0 means we hit the first tile.
    const timeInLevel = timeInSeconds;
    
    if (timeInLevel < 0) {
        // Countdown Phase (Approaching Tile 1)
        // We use the same logic as Playing Phase for Tile 0, but with negative time.
        // Tile 0 movement: from startAngle to targetAngle (at Tile 1)
        // Duration: tileDurations[0]
        // Start time: tileStartTimes[0] (which is negative)
        // End time: tileStartTimes[1] (which is 0)
        
        // Find if we are within the T0->T1 movement range
        // If timeInLevel < tileStartTimes[0], we are even before the first movement (e.g. waiting)
        // But let's assume we just render the T0->T1 movement extended backwards or clamped.
        
        // Actually, "Countdown" usually means spinning on Tile 0 or approaching it.
        // User request: "Ball pre-spin ends, ball hits 1st tile EXACTLY when music reaches offset."
        // This is exactly what we achieved by shifting tileStartTimes.
        // The movement T0->T1 ends at t=0.
        
        // So we can just use the standard update logic?
        // But binary search might fail for negative times if we don't handle it.
        // Let's check binary search:
        // low=0, high=len-1.
        // tileStartTimes[0] is negative (e.g. -0.5).
        // If timeInLevel = -0.2.
        // tileStartTimes[0] <= -0.2 is true.
        // tileStartTimes[1] (0) <= -0.2 is false.
        // So tileIndex will be 0.
        // So the standard logic SHOULD work for the approach phase too!
        
        // Only if timeInLevel is LESS than tileStartTimes[0] (start of approach), we might need extra logic.
        // But usually approach starts at... -infinity?
        // Or we just clamp to Tile 0.
        
        // Let's reuse the standard logic below instead of returning early.
        // But we need to handle "Pre-Countdown" if time is very early.
        // If timeInLevel < tileStartTimes[0], we can just simulate infinite rotation on Tile 0?
        // Or just let it run Tile 0 logic (which will calculate angle based on time).
        // Tile 0 logic uses linear interpolation?
        // No, it uses `angle = startAngle + ...`.
        // Let's see how `updatePlanetsPosition` calculates position for a tile.
    }
    
    // Playing Phase (and Countdown/Approach if timeInLevel >= tileStartTimes[0])
    // Find current tile index using binary search
    let tileIndex = 0;
    let low = 0, high = this.tileStartTimes.length - 1;
    
    // If time is before the first recorded start time, we default to 0.
    if (this.tileStartTimes.length > 0 && timeInLevel < this.tileStartTimes[0]) {
         tileIndex = 0;
    } else {
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            if (this.tileStartTimes[mid] <= timeInLevel) {
                tileIndex = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
    }
    
    this.currentTileIndex = tileIndex;
    
    // Check if we are past the last tile (Infinite Rotation)
    if (tileIndex >= this.levelData.tiles.length - 1) {
        const lastIndex = this.levelData.tiles.length - 1;
        const lastTile = this.levelData.tiles[lastIndex];
        
        if (lastTile) {
             const isRedPivot = (lastIndex % 2 === 0);
             const pivotPlanet = isRedPivot ? this.planetRed : this.planetBlue;
             const movingPlanet = isRedPivot ? this.planetBlue : this.planetRed;
             
             const pivotPos = lastTile.position;
             pivotPlanet.position.set(pivotPos[0], pivotPos[1], 0);
             
             let startAngle = 0;
             if (lastIndex > 0) {
                 const prevTile = this.levelData.tiles[lastIndex - 1];
                 const pdx = prevTile.position[0] - pivotPos[0];
                 const pdy = prevTile.position[1] - pivotPos[1];
                 startAngle = Math.atan2(pdy, pdx);
             }
             
             const extraTime = timeInLevel - this.tileStartTimes[lastIndex];
             const bpm = this.tileBPM[lastIndex] || 100;
             // 1 beat = 180 degrees = PI radians
             // bpm = beats per minute
             // beats per second = bpm / 60
             // radians per second = (bpm / 60) * PI
             const radiansPerSecond = (bpm / 60) * Math.PI;
             const isCW = this.tileIsCW[lastIndex];
             
             const totalAngle = extraTime * radiansPerSecond;
             
             // Initial angle should be consistent with arrival
             // startAngle is the angle FROM the previous tile TO the current tile (pivot)
             // The moving planet arrives at the pivot from the previous tile.
             // Wait, startAngle calculated above is atan2(prev->curr).
             // That is the direction the ball CAME FROM.
             // So the ball is AT angle `startAngle` relative to the pivot?
             // No, atan2(y, x) is angle of vector (x, y).
             // Vector is prev -> curr.
             // So the ball is at `prev` position relative to `curr`?
             // No, the ball is at `curr` (pivot) position. The other ball is rotating.
             // The other ball arrives at angle `startAngle + PI`?
             
             // Let's trace normal rotation end state.
             // In normal rotation:
             // startAngle = atan2(prev->curr)
             // endAngle = atan2(next->curr) + PI (roughly)
             
             // When arriving at last tile:
             // The "moving" planet becomes the "pivot" planet for the next step.
             // But here we just want the *other* planet to keep rotating.
             // So the planet that WAS moving in the last step (lastIndex-1) has landed on lastIndex.
             // Now that planet becomes the pivot.
             // The *other* planet (which was pivot at lastIndex-1) is now the moving planet.
             
             // Let's verify who is pivot.
             // lastIndex is the index of the tile we are ON.
             // isRedPivot = (lastIndex % 2 === 0). Correct.
             // The pivot planet is fixed at lastTile.position.
             
             // Where does the moving planet start?
             // It starts from where it was left off in the previous turn?
             // The previous turn was pivoting around lastIndex-1.
             // The moving planet (which is now pivot) moved from lastIndex-1 to lastIndex.
             // The *other* planet was at lastIndex-1.
             // So relative to pivot (lastIndex), the moving planet starts at lastIndex-1.
             
             // Vector from pivot (lastIndex) to moving (lastIndex-1):
             // dx = prev.x - curr.x
             // dy = prev.y - curr.y
             // angle = atan2(dy, dx)
             
             // My code above:
             // pdx = prev.x - curr.x
             // pdy = prev.y - curr.y
             // startAngle = atan2(pdy, pdx)
             // This seems correct! This is the angle of the moving planet relative to the pivot at t=0.
             
             const currentAngle = isCW ? (startAngle - totalAngle) : (startAngle + totalAngle);
             
             const dist = 1.0;
             movingPlanet.position.set(
                 pivotPos[0] + Math.cos(currentAngle) * dist,
                 pivotPos[1] + Math.sin(currentAngle) * dist,
                 0
             );
             
             // Ensure meshes are updated
             pivotPlanet.update(0);
             movingPlanet.update(0);
        }
        return;
    }

    // Normal Rotation Logic
    const pivot = this.levelData.tiles[tileIndex];
    const next = this.levelData.tiles[tileIndex + 1];
    
    if (pivot && next) {
        const isRedPivot = (tileIndex % 2 === 0);
        const pivotPlanet = isRedPivot ? this.planetRed : this.planetBlue;
        const movingPlanet = isRedPivot ? this.planetBlue : this.planetRed;
        
        pivotPlanet.position.set(pivot.position[0], pivot.position[1], 0);
        
        const startTime = this.tileStartTimes[tileIndex];
        const duration = this.tileDurations[tileIndex];
        // Prevent division by zero if duration is 0 (should not happen usually)
        const progress = duration > 0.0001 ? (timeInLevel - startTime) / duration : 1;
        
        const pivotPos = pivot.position;
        const nextPos = next.position;
        
        const dx = nextPos[0] - pivotPos[0];
        const dy = nextPos[1] - pivotPos[1];
        const targetAngle = Math.atan2(dy, dx);
        
        let startAngle = targetAngle + Math.PI;
        if (tileIndex > 0) {
            const prev = this.levelData.tiles[tileIndex - 1];
            const pdx = prev.position[0] - pivotPos[0];
            const pdy = prev.position[1] - pivotPos[1];
            startAngle = Math.atan2(pdy, pdx);
        }
        
        // Calculate Angle based on direction
        const isCW = this.tileIsCW[tileIndex];
        let totalAngle = 0;
        
        // Midspin check
        if (pivot.angle === 360) {
             totalAngle = isCW ? -2 * Math.PI : 2 * Math.PI;
        } else if (isCW) {
             // Force CW (negative diff)
             let diff = targetAngle - startAngle;
             while (diff > 0.0001) diff -= 2 * Math.PI;
             while (diff <= -2 * Math.PI + 0.0001) diff += 2 * Math.PI;
             totalAngle = diff;
        } else {
             // Force CCW (positive diff)
             let diff = targetAngle - startAngle;
             while (diff < -0.0001) diff += 2 * Math.PI;
             while (diff >= 2 * Math.PI - 0.0001) diff -= 2 * Math.PI;
             totalAngle = diff;
        }

        const currentAngle = startAngle + totalAngle * progress;
        
        // Interpolate radius
        let startDist = 1.0;
        if (tileIndex > 0) {
            const prev = this.levelData.tiles[tileIndex - 1];
            const pdx = prev.position[0] - pivotPos[0];
            const pdy = prev.position[1] - pivotPos[1];
            startDist = Math.sqrt(pdx*pdx + pdy*pdy);
        }
        
        const endDist = Math.sqrt(dx*dx + dy*dy);
        const currentDist = startDist + (endDist - startDist) * progress;
        
        movingPlanet.position.set(
            pivotPos[0] + Math.cos(currentAngle) * currentDist,
            pivotPos[1] + Math.sin(currentAngle) * currentDist,
            0
        );
    }
    
    // Sync meshes
    this.planetRed.update(0);
    this.planetBlue.update(0);
  }
  
  private updateCameraFollow(delta: number): void {
      if (!this.planetRed || !this.planetBlue) return;

      // 1. Process new camera events
      if (this.currentTileIndex > this.lastCameraEventTileIndex) {
          // Process events for the current tile
          const events = this.tileCameraEvents.get(this.currentTileIndex);
          if (events && events.length > 0) {
               events.forEach(event => {
                   const duration = (event.duration !== undefined) ? event.duration : 0;
                   const relativeTo = (event.relativeTo !== undefined) ? event.relativeTo : 'Player';
                   
                   // Update Camera Mode (Target)
                   // Handle enum string or int if necessary, though usually string from JSON
                   if (typeof relativeTo === 'string') {
                       this.cameraMode.relativeTo = relativeTo;
                   } else if (typeof relativeTo === 'number') {
                       this.cameraMode.relativeTo = ['Player', 'Tile', 'Global', 'LastPosition', 'LastPositionNoRotation'][relativeTo] || 'Player';
                   }
                        
                   if (event.position) {
                       // Ensure position is treated as offset or absolute based on relativeTo
                       this.cameraMode.position = { x: event.position[0], y: event.position[1] };
                   }
                   if (event.zoom !== undefined) this.cameraMode.zoom = event.zoom;
                   if (event.rotation !== undefined) this.cameraMode.rotation = event.rotation;
                   if (event.angleOffset !== undefined) this.cameraMode.angleOffset = event.angleOffset;
                   
                   // Setup Transition
                   // Duration in beats. Convert to seconds.
                   const currentBPM = (this.tileBPM && this.tileBPM[this.currentTileIndex]) || 100;
                   const durationSeconds = duration * (60 / currentBPM);
                   
                   this.cameraTransition.active = true;
                   this.cameraTransition.startTime = this.elapsedTime / 1000; // seconds
                   this.cameraTransition.duration = durationSeconds;
                   this.cameraTransition.ease = event.ease || 'Linear';
                   
                   // Snapshot current state (World)
                   this.cameraTransition.startSnapshot = {
                       position: { x: this.cameraPosition.x, y: this.cameraPosition.y },
                       zoom: this.zoom,
                       rotation: this.camera.rotation.z * (180 / Math.PI)
                   };
               });
          }
          this.lastCameraEventTileIndex = this.currentTileIndex;
      }
      
      // 2. Calculate Target State (World Coordinates)
      let targetX = 0;
      let targetY = 0;
      
      // Calculate Player Position (Midpoint)
      const playerX = (this.planetRed.position.x + this.planetBlue.position.x) / 2;
      const playerY = (this.planetRed.position.y + this.planetBlue.position.y) / 2;
      
      if (this.cameraMode.relativeTo === 'Player') {
          targetX = playerX + this.cameraMode.position.x;
          targetY = playerY + this.cameraMode.position.y;
      } else if (this.cameraMode.relativeTo === 'Global') {
          targetX = this.cameraMode.position.x;
          targetY = this.cameraMode.position.y;
      } else if (this.cameraMode.relativeTo === 'Tile') {
          const tile = this.levelData.tiles[this.currentTileIndex];
          if (tile) {
              targetX = tile.position[0] + this.cameraMode.position.x;
              targetY = tile.position[1] + this.cameraMode.position.y;
          } else {
              targetX = playerX;
              targetY = playerY;
          }
      } else {
          // Fallback
          targetX = playerX;
          targetY = playerY;
      }

      const targetZoom = this.cameraMode.zoom / 100; // Convert 100% to 1.0
      const targetRotation = this.cameraMode.rotation; // Degrees
      
      // 3. Apply Transition or Smoothing
      let finalX = targetX;
      let finalY = targetY;
      let finalZoom = targetZoom;
      let finalRotation = targetRotation;
      
      const timeInSeconds = this.elapsedTime / 1000;
      
      if (this.cameraTransition.active) {
          let t = 0;
          if (this.cameraTransition.duration > 0.0001) {
              t = (timeInSeconds - this.cameraTransition.startTime) / this.cameraTransition.duration;
          } else {
              t = 1;
          }
          
          if (t >= 1) {
              this.cameraTransition.active = false;
              // Settle at target
          } else {
              // Interpolate
              const easeFunc = EasingFunctions[this.cameraTransition.ease] || EasingFunctions.Linear;
              const progress = easeFunc(t);
              
              const start = this.cameraTransition.startSnapshot;
              
              finalX = start.position.x + (targetX - start.position.x) * progress;
              finalY = start.position.y + (targetY - start.position.y) * progress;
              finalZoom = start.zoom + (targetZoom - start.zoom) * progress;
              finalRotation = start.rotation + (targetRotation - start.rotation) * progress;
          }
      } else {
          // Default Smoothing behavior if following Player
          if (this.cameraMode.relativeTo === 'Player') {
               const currentBPM = (this.tileBPM && this.tileBPM[this.currentTileIndex]) || 100;
               const twoBeatsDuration = 120 / currentBPM;
               
               // Use exponential smoothing
               // delta is in seconds
               const smoothT = 1.0 - Math.pow(0.001, delta / twoBeatsDuration);
               
               this.cameraPosition.x += (targetX - this.cameraPosition.x) * smoothT;
               this.cameraPosition.y += (targetY - this.cameraPosition.y) * smoothT;
               
               finalX = this.cameraPosition.x;
               finalY = this.cameraPosition.y;
          } else {
               // For Global/Tile, snap directly (or maintain last position if we wanted smoothing there too)
               this.cameraPosition.x = finalX;
               this.cameraPosition.y = finalY;
          }
      }
      
      // Update Three.js Camera
      this.camera.position.x = finalX;
      this.camera.position.y = finalY;
      
      // Update Zoom
      this.camera.zoom = finalZoom;
      this.zoom = finalZoom;
      this.camera.updateProjectionMatrix();
      
      // Update Rotation
      this.camera.rotation.z = finalRotation * (Math.PI / 180);
      
      this.updateVisibleTiles();
  }

  // API for external control
  public setZoom(zoom: number): void {
    this.zoom = zoom;
    this.onWindowResize();
  }

  public loadMusic(src: string): void {
    this.music.load(src);
    
    // Apply settings if available
    if (this.levelData.settings) {
        if (this.levelData.settings.volume !== undefined) {
            this.music.volume = this.levelData.settings.volume / 100;
        }
        if (this.levelData.settings.pitch !== undefined) {
            this.music.pitch = this.levelData.settings.pitch / 100;
        }
    }
  }
}
