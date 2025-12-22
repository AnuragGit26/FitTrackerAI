import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { gsap } from 'gsap';
import { MuscleStatus, MuscleGroup, RecoveryStatus } from '@/types/muscle';
import { formatMuscleNameForDisplay, getMuscleGroupFromMeshName } from '@/utils/muscleNameMapper';
import { musclePositions3D, getMuscleDisplayName } from '@/utils/musclePositions';

// State configuration
const MUSCLE_STATES = {
  ready: {
    color: '#2ecc71',
    emissive: '#2ecc71',
    intensity: 0.2,
    tip: 'Optimal for training'
  },
  recovering: {
    color: '#f1c40f',
    emissive: '#f1c40f',
    intensity: 0.3,
    tip: 'Light stretching only'
  },
  fatigued: {
    color: '#e74c3c',
    emissive: '#e74c3c',
    intensity: 0.5,
    pulse: true,
    tip: 'Rest recommended'
  }
} as const;

type MuscleState = 'ready' | 'recovering' | 'fatigued';

// Helper function to create geometry based on shape type
function createGeometryForShape(shape: 'capsule' | 'sphere' | 'box' | 'ellipsoid', scale: [number, number, number]): THREE.BufferGeometry {
  const [sx, sy, sz] = scale;

  switch (shape) {
    case 'capsule': {
      const radius = Math.max(sx, sz) * 0.5;
      const height = sy;
      return new THREE.CapsuleGeometry(radius, height, 8, 16);
    }
    case 'sphere': {
      const radius = Math.max(sx, sy, sz) * 0.5;
      return new THREE.SphereGeometry(radius, 16, 16);
    }
    case 'box': {
      return new THREE.BoxGeometry(sx, sy, sz);
    }
    case 'ellipsoid': {
      const geometry = new THREE.SphereGeometry(1, 16, 16);
      geometry.scale(sx * 0.5, sy * 0.5, sz * 0.5);
      return geometry;
    }
    default:
      return new THREE.CapsuleGeometry(Math.max(sx, sz) * 0.5, sy, 8, 16);
  }
}

// Create procedural muscle meshes from predefined positions
function createProceduralMuscleMeshes(
  scene: THREE.Scene,
  muscleMeshesRef: React.MutableRefObject<Map<string, MuscleMeshData>>
) {
  // Create a base human body silhouette (optional, for context)
  const bodyGroup = new THREE.Group();
  bodyGroup.name = 'HumanBodyBase';

  // Torso
  const torsoGeometry = new THREE.CapsuleGeometry(0.35, 1.4, 8, 16);
  const torsoMaterial = new THREE.MeshStandardMaterial({
    color: '#4a4a4a',
    transparent: true,
    opacity: 0.4,
    roughness: 0.7,
    metalness: 0.1
  });
  const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
  torso.position.set(0, 0.2, 0);
  bodyGroup.add(torso);

  // Head
  const headGeometry = new THREE.SphereGeometry(0.28, 16, 16);
  const head = new THREE.Mesh(headGeometry, torsoMaterial);
  head.position.set(0, 1.3, 0);
  bodyGroup.add(head);

  // Create muscle meshes
  Object.entries(musclePositions3D).forEach(([muscleGroup, posData]) => {
    const positions = Array.isArray(posData) ? posData : [posData];
    const muscleGroupEnum = muscleGroup as MuscleGroup;

    positions.forEach((pos, index) => {
      const geometry = createGeometryForShape(pos.shape || 'capsule', pos.scale);
      const material = new THREE.MeshStandardMaterial({
        color: MUSCLE_STATES.ready.color,
        emissive: MUSCLE_STATES.ready.emissive,
        emissiveIntensity: MUSCLE_STATES.ready.intensity,
        transparent: true,
        opacity: 0.8,
        roughness: 0.4,
        metalness: 0.05
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...pos.position);
      if (pos.rotation) {
        mesh.rotation.set(...pos.rotation);
      }
      mesh.name = `${muscleGroup}_${index}`;
      mesh.userData.muscleGroup = muscleGroupEnum;
      mesh.userData.meshName = `${getMuscleDisplayName(muscleGroupEnum)}${pos.side === 'left' ? ' (Left)' : pos.side === 'right' ? ' (Right)' : ''}`;

      bodyGroup.add(mesh);

      muscleMeshesRef.current.set(mesh.name, {
        mesh,
        muscleGroup: muscleGroupEnum,
        originalMaterial: material
      });
    });
  });

  scene.add(bodyGroup);
}

interface ThreeJSMuscleModelProps {
  muscleStatuses: MuscleStatus[];
  selectedMuscle?: MuscleStatus | null;
  onMuscleClick: (muscle: MuscleStatus) => void;
  viewMode?: 'fatigue' | 'strength' | 'activity';
  modelPath?: string;
}

interface MuscleMeshData {
  mesh: THREE.Mesh;
  muscleGroup: MuscleGroup | null;
  originalMaterial: THREE.Material;
  pulseAnimation?: gsap.core.Tween;
}

export function ThreeJSMuscleModel({
  muscleStatuses,
  selectedMuscle: _selectedMuscle,
  onMuscleClick,
  viewMode: _viewMode,
  modelPath = '/human_anatomy_v2.glb'
}: ThreeJSMuscleModelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const muscleMeshesRef = useRef<Map<string, MuscleMeshData>>(new Map());
  const animationFrameRef = useRef<number | null>(null);
  const isInteractingRef = useRef(false);
  const autoRotateRef = useRef(true);
  const [modelLoadError, setModelLoadError] = useState(false);
  const useProceduralGeometryRef = useRef(false);

  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    muscleName: string;
    status: MuscleState;
    tip: string;
  } | null>(null);

  // Map recovery status to muscle state
  const mapRecoveryToState = useCallback((recoveryStatus: RecoveryStatus): MuscleState => {
    if (recoveryStatus === 'ready') {
      return 'ready';
    } else if (recoveryStatus === 'recovering' || recoveryStatus === 'fresh' || recoveryStatus === 'sore') {
      return 'recovering';
    } else {
      return 'fatigued';
    }
  }, []);

  // Set muscle statuses
  const setMuscleStatuses = useCallback((statusData: MuscleStatus[]) => {
    if (!modelRef.current) return;

    // Clear previous animations
    muscleMeshesRef.current.forEach((data) => {
      if (data.pulseAnimation) {
        data.pulseAnimation.kill();
        data.pulseAnimation = undefined;
      }
    });

    // Create status map
    const statusMap = new Map<MuscleGroup, MuscleStatus>();
    statusData.forEach((status) => {
      statusMap.set(status.muscle, status);
    });

    // Update each muscle mesh
    muscleMeshesRef.current.forEach((data) => {
      if (!data.muscleGroup) return;

      const status = statusMap.get(data.muscleGroup);
      if (!status) {
        // Default to ready state
        const state = MUSCLE_STATES.ready;
        const material = data.mesh.material as THREE.MeshStandardMaterial;
        material.color.set(state.color);
        material.emissive.set(state.emissive);
        material.emissiveIntensity = state.intensity;
        return;
      }

      const muscleState = mapRecoveryToState(status.recoveryStatus);
      const state = MUSCLE_STATES[muscleState];
      const material = data.mesh.material as THREE.MeshStandardMaterial;

      // Apply color
      gsap.to(material.color, {
        r: parseInt(state.color.slice(1, 3), 16) / 255,
        g: parseInt(state.color.slice(3, 5), 16) / 255,
        b: parseInt(state.color.slice(5, 7), 16) / 255,
        duration: 0.5,
        ease: 'power2.out'
      });

      gsap.to(material.emissive, {
        r: parseInt(state.emissive.slice(1, 3), 16) / 255,
        g: parseInt(state.emissive.slice(3, 5), 16) / 255,
        b: parseInt(state.emissive.slice(5, 7), 16) / 255,
        duration: 0.5,
        ease: 'power2.out'
      });

      gsap.to(material, {
        emissiveIntensity: state.intensity,
        duration: 0.5,
        ease: 'power2.out'
      });

      // Handle pulse animation for fatigued muscles
      if ('pulse' in state && state.pulse && muscleState === 'fatigued') {
        if (data.pulseAnimation) {
          data.pulseAnimation.kill();
        }

        data.pulseAnimation = gsap.to(material, {
          emissiveIntensity: state.intensity + 0.3,
          duration: 1,
          yoyo: true,
          repeat: -1,
          ease: 'power1.inOut'
        });
      } else if (data.pulseAnimation) {
        data.pulseAnimation.kill();
        data.pulseAnimation = undefined;
      }
    });
  }, [mapRecoveryToState]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Capture refs for cleanup
    const meshesMap = muscleMeshesRef.current;

    // Scene
    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight1.position.set(10, 10, 5);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight2.position.set(-10, -10, -5);
    scene.add(directionalLight2);

    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(0, 5, 5);
    scene.add(pointLight);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.enableRotate = true;
    controls.minDistance = 3;
    controls.maxDistance = 8;
    controls.autoRotate = false;
    controlsRef.current = controls;

    // Handle interaction
    const onMouseDown = () => {
      isInteractingRef.current = true;
      autoRotateRef.current = false;
      controls.autoRotate = false;
    };

    const onMouseUp = () => {
      isInteractingRef.current = false;
      // Re-enable auto-rotate after a delay
      setTimeout(() => {
        if (!isInteractingRef.current) {
          autoRotateRef.current = true;
          controls.autoRotate = true;
          controls.autoRotateSpeed = 1.0;
        }
      }, 2000);
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('touchstart', onMouseDown);
    renderer.domElement.addEventListener('touchend', onMouseUp);

    // Load GLTF model
    const loader = new GLTFLoader();

    // Try multiple possible paths (public folder is most common for GLB files in Vite)
    const possiblePaths = [
      '/human_anatomy_v2.glb',
      '/assets/human_anatomy_v2.glb',
      modelPath,
      '/src/assets/human_anatomy_v2.glb'
    ];

    let modelLoaded = false;
    let currentPathIndex = 0;

    const tryLoadModel = () => {
      if (modelLoaded || currentPathIndex >= possiblePaths.length) {
        if (!modelLoaded) {
          console.warn('Could not load model from any path. Please ensure human_anatomy_v2.glb is in the public folder.');
          setModelLoadError(true);
        }
        return;
      }

      const path = possiblePaths[currentPathIndex];
      loader.load(
        path,
        (gltf) => {
          if (modelLoaded) return;
          modelLoaded = true;

          const model = gltf.scene;
          modelRef.current = model;
          scene.add(model);

          // Debug: Collect all object names and types
          const allObjects: Array<{ name: string; type: string; children: number }> = [];
          const allMeshNames: string[] = [];
          const mappedMeshes: Array<{ meshName: string; muscleGroup: MuscleGroup | null }> = [];

          // First pass: collect all objects for debugging
          model.traverse((child) => {
            allObjects.push({
              name: child.name || '(unnamed)',
              type: child.type,
              children: child.children.length
            });
          });

          // Traverse model and map meshes
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              const meshName = child.name || '(unnamed mesh)';
              const muscleGroup = getMuscleGroupFromMeshName(meshName);

              allMeshNames.push(meshName);
              mappedMeshes.push({ meshName, muscleGroup });

              // Create material
              const material = new THREE.MeshStandardMaterial({
                color: MUSCLE_STATES.ready.color,
                emissive: MUSCLE_STATES.ready.emissive,
                emissiveIntensity: MUSCLE_STATES.ready.intensity,
                transparent: true,
                opacity: 0.8,
                roughness: 0.4,
                metalness: 0.05
              });

              child.material = material;
              child.userData.muscleGroup = muscleGroup;
              child.userData.meshName = meshName;

              muscleMeshesRef.current.set(meshName, {
                mesh: child,
                muscleGroup,
                originalMaterial: material
              });
            }
          });

          // Debug: Log all mesh information
          console.group('🔬 3D Model Debug Info');
          console.log(`✅ Model loaded successfully from: ${path}`);
          console.log(`📊 Total objects in scene: ${allObjects.length}`);
          console.log(`📊 Total meshes found: ${allMeshNames.length}`);

          if (allObjects.length > 0) {
            console.log('\n📋 All objects in model (including groups, meshes, etc.):');
            console.table(allObjects);
          }

          if (allMeshNames.length > 0) {
            console.log('\n📋 All mesh names in model:');
            console.table(allMeshNames.sort());
          }

          const mappedCount = mappedMeshes.filter(m => m.muscleGroup !== null).length;
          console.log(`\n✅ Mapped to muscle groups: ${mappedCount}/${allMeshNames.length}`);

          if (mappedMeshes.length > 0) {
            console.log('\n🗺️  Mesh to Muscle Group mapping:');
            const mappingTable = mappedMeshes.map(m => ({
              'Mesh Name': m.meshName,
              'Muscle Group': m.muscleGroup || '❌ Not mapped',
              'Status': m.muscleGroup ? '✅' : '⚠️'
            }));
            console.table(mappingTable);
          }

          const unmappedMeshes = mappedMeshes.filter(m => m.muscleGroup === null);
          if (unmappedMeshes.length > 0) {
            console.warn(`\n⚠️  ${unmappedMeshes.length} unmapped mesh(es):`);
            unmappedMeshes.forEach(m => {
              console.warn(`   - "${m.meshName}" (not found in muscleNameMapper.ts)`);
            });
          }

          // Check if we need to use procedural geometry fallback
          const needsFallback = allMeshNames.length <= 1 || mappedCount === 0;

          if (needsFallback) {
            console.warn('\n⚠️  Using procedural geometry fallback (model has insufficient meshes)');
            console.log('   Creating muscle meshes from predefined positions...');

            // Remove the loaded model if it's not useful
            if (modelRef.current) {
              scene.remove(modelRef.current);
              modelRef.current = null;
            }

            // Create procedural muscle meshes
            useProceduralGeometryRef.current = true;
            createProceduralMuscleMeshes(scene, muscleMeshesRef);

            console.log('✅ Procedural geometry created successfully!');
          } else {
            // Special warning if only one mesh found (but we have fallback now)
            if (allMeshNames.length === 1) {
              console.warn('\n⚠️  Model has only 1 mesh - using procedural geometry fallback');
            }
          }

          console.groupEnd();

          // Set initial statuses
          setMuscleStatuses(muscleStatuses);
        },
        undefined,
        () => {
          console.warn(`Failed to load model from ${path}, trying next path...`);
          currentPathIndex++;
          tryLoadModel();
        }
      );
    };

    tryLoadModel();

    // Raycasting for tooltips
    const onMouseMove = (event: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      const intersects = raycasterRef.current.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const intersect = intersects[0];
        if (intersect.object instanceof THREE.Mesh) {
          const meshName = intersect.object.userData.meshName;
          const muscleGroup = intersect.object.userData.muscleGroup as MuscleGroup | null;

          if (muscleGroup) {
            const status = muscleStatuses.find(s => s.muscle === muscleGroup);
            if (status) {
              const muscleState = mapRecoveryToState(status.recoveryStatus);
              const state = MUSCLE_STATES[muscleState];

              setTooltip({
                visible: true,
                x: event.clientX,
                y: event.clientY,
                muscleName: formatMuscleNameForDisplay(meshName),
                status: muscleState,
                tip: state.tip
              });
            } else {
              setTooltip({
                visible: true,
                x: event.clientX,
                y: event.clientY,
                muscleName: formatMuscleNameForDisplay(meshName),
                status: 'ready',
                tip: MUSCLE_STATES.ready.tip
              });
            }
          }
        }
      } else {
        setTooltip(null);
      }
    };

    const onMouseClick = (event: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      const intersects = raycasterRef.current.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const intersect = intersects[0];
        if (intersect.object instanceof THREE.Mesh) {
          const muscleGroup = intersect.object.userData.muscleGroup as MuscleGroup | null;
          if (muscleGroup) {
            const status = muscleStatuses.find(s => s.muscle === muscleGroup);
            if (status) {
              onMuscleClick(status);
            }
          }
        }
      }
    };

    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onMouseClick);

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      if (autoRotateRef.current && !isInteractingRef.current) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.0;
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('click', onMouseClick);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('touchstart', onMouseDown);
      renderer.domElement.removeEventListener('touchend', onMouseUp);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Clean up animations
      meshesMap.forEach((data) => {
        if (data.pulseAnimation) {
          data.pulseAnimation.kill();
        }
      });

      controls.dispose();
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update muscle statuses when props change
  useEffect(() => {
    if (modelRef.current && muscleStatuses.length > 0) {
      setMuscleStatuses(muscleStatuses);
    }
  }, [muscleStatuses, setMuscleStatuses]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>

      {/* Model Load Error Message */}
      {modelLoadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/95 dark:bg-background-dark/95 backdrop-blur z-50">
          <div className="text-center p-6 max-w-sm">
            <div className="text-4xl mb-4">🔬</div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Model Not Found
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Please place <code className="bg-gray-100 dark:bg-surface-dark px-2 py-1 rounded text-xs">human_anatomy_v2.glb</code> in the <code className="bg-gray-100 dark:bg-surface-dark px-2 py-1 rounded text-xs">public</code> folder.
            </p>
            <div className="text-xs text-gray-500 dark:text-gray-500 space-y-1">
              <p>Expected location: <code className="bg-gray-100 dark:bg-surface-dark px-1 rounded">/public/human_anatomy_v2.glb</code></p>
              <p className="mt-2">The component will automatically load once the file is added.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {tooltip && tooltip.visible && (
        <div
          className="fixed pointer-events-none z-50 bg-surface-dark/90 dark:bg-surface-dark/90 backdrop-blur border border-primary/30 px-3 py-1.5 rounded-lg shadow-lg"
          style={{
            left: `${tooltip.x + 10}px`,
            top: `${tooltip.y - 10}px`,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className={`size-2 rounded-full ${tooltip.status === 'ready'
                ? 'bg-primary'
                : tooltip.status === 'recovering'
                  ? 'bg-orange-400'
                  : 'bg-red-500'
                }`}
            />
            <div className="flex flex-col">
              <span className="text-white text-xs font-bold leading-none">
                {tooltip.muscleName}
              </span>
              <span
                className={`text-[10px] leading-none mt-0.5 ${tooltip.status === 'ready'
                  ? 'text-primary'
                  : tooltip.status === 'recovering'
                    ? 'text-orange-400'
                    : 'text-red-400'
                  }`}
              >
                {tooltip.status === 'ready'
                  ? 'Ready'
                  : tooltip.status === 'recovering'
                    ? 'Recovering'
                    : 'Fatigued'}
              </span>
            </div>
          </div>
          <p className="text-gray-300 text-[10px] mt-1.5 leading-relaxed">
            {tooltip.tip}
          </p>
        </div>
      )}

      {/* Legend Overlay */}
      <div className="absolute bottom-4 right-4 bg-white/90 dark:bg-surface-dark/90 backdrop-blur border border-gray-200 dark:border-white/5 rounded-lg p-3 shadow-lg">
        <p className="text-gray-400 dark:text-gray-500 text-xs uppercase tracking-widest mb-2 text-center">
          Status Legend
        </p>
        <div className="flex flex-col gap-2 text-xs font-medium">
          <div className="flex items-center gap-2 text-primary">
            <span className="size-2 rounded-full bg-primary" style={{ boxShadow: '0 0 10px rgba(13, 242, 105, 0.3)' }} />
            <span>Ready</span>
          </div>
          <div className="flex items-center gap-2 text-orange-400">
            <span className="size-2 rounded-full bg-orange-400" />
            <span>Recovering</span>
          </div>
          <div className="flex items-center gap-2 text-red-500">
            <span className="size-2 rounded-full bg-red-500" />
            <span>Fatigued</span>
          </div>
        </div>
      </div>
    </div>
  );
}

