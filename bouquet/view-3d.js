import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/** A procedural, shared-state view. The host owns selection and progression. */
export function create3DView({ container, onPlace, onSelect, onError } = {}) {
  if (!container) throw new Error('A container is required for the bouquet view.');

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none;';
  renderer.domElement.setAttribute('aria-label', '3D');
  renderer.domElement.setAttribute('role', 'img');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = null;
  const camera = new THREE.PerspectiveCamera(37, 1, 0.08, 65);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.085;
  controls.enablePan = false;
  controls.minDistance = 3.6;
  controls.maxDistance = 19;
  controls.minPolarAngle = 0.045;
  controls.maxPolarAngle = Math.PI - 0.045;
  controls.rotateSpeed = 0.72;
  controls.zoomSpeed = 0.8;
  controls.autoRotateSpeed = 0.72;
  controls.touches.ONE = THREE.TOUCH.ROTATE;
  controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;

  const geometries = new Set();
  const materials = new Set();
  const ghostMaterials = new Map();
  const futureMaterials = new Map();
  const keepGeometry = geometry => (geometries.add(geometry), geometry);
  const material = (color, options = {}) => {
    const value = new THREE.MeshStandardMaterial({ color, roughness: 0.47, metalness: 0.015, ...options });
    materials.add(value);
    return value;
  };
  const colors = {
    stem: material('#588969'), leaf: material('#6a9c78'), leafLight: material('#83ae87'),
    purple: material('#9872bd'), purpleLight: material('#b698d4'), purpleEdge: material('#aa85ca'),
    orange: material('#e67513'), orangeLight: material('#f79522'), amber: material('#b95c16'),
    pollen: material('#f4b64d'), ceramic: material('#dac2b6'), board: material('#e7d9ca'),
    paper: material('#e6deee', { roughness: 0.78, side: THREE.DoubleSide }),
    ribbon: material('#a88ac2', { roughness: 0.3, metalness: 0.045, side: THREE.DoubleSide }),
    tag: material('#fff9ee', { roughness: 0.82 }), string: material('#c3a984', { roughness: 0.9 }),
  };
  const cylinder = keepGeometry(new THREE.CylinderGeometry(1, 1, 1, 16));
  const sphere = keepGeometry(new THREE.SphereGeometry(1, 14, 10));
  const torus = keepGeometry(new THREE.TorusGeometry(1, 0.08, 8, 32));

  const mesh = (geometry, surface, parent, position, scale) => {
    const object = new THREE.Mesh(geometry, surface);
    object.castShadow = true;
    object.receiveShadow = true;
    object.userData.solidMaterial = surface;
    if (position) object.position.set(...position);
    if (scale) object.scale.set(...scale);
    if (parent) parent.add(object);
    return object;
  };

  // Two closed surfaces plus the four edge walls give every petal real thickness.
  function thickSurface(point, normal, across = 10, along = 15, thickness = 0.032) {
    const positions = [];
    const indices = [];
    const stride = across + 1;
    const faceSize = stride * (along + 1);
    for (let side = 0; side < 2; side++) {
      for (let row = 0; row <= along; row++) {
        for (let column = 0; column <= across; column++) {
          const u = column / across;
          const v = row / along;
          const p = point(u, v);
          const n = normal(u, v);
          const d = (side ? -0.5 : 0.5) * thickness;
          positions.push(p[0] + n[0] * d, p[1] + n[1] * d, p[2] + n[2] * d);
        }
      }
    }
    for (let row = 0; row < along; row++) {
      for (let column = 0; column < across; column++) {
        const a = row * stride + column;
        const b = a + 1;
        const c = a + stride + 1;
        const d = a + stride;
        indices.push(a, b, d, b, c, d);
        indices.push(a + faceSize, d + faceSize, b + faceSize, b + faceSize, d + faceSize, c + faceSize);
      }
    }
    const boundary = [];
    for (let x = 0; x <= across; x++) boundary.push(x);
    for (let y = 1; y <= along; y++) boundary.push(y * stride + across);
    for (let x = across - 1; x >= 0; x--) boundary.push(along * stride + x);
    for (let y = along - 1; y > 0; y--) boundary.push(y * stride);
    for (let i = 0; i < boundary.length; i++) {
      const a = boundary[i];
      const b = boundary[(i + 1) % boundary.length];
      indices.push(a, a + faceSize, b, b, a + faceSize, b + faceSize);
    }
    // Different parameterizations may reverse the surface's handedness. Match
    // the front skin to its supplied thickness normal, including all edge walls.
    const sampleU = 0.46, sampleV = 0.51, epsilon = 0.001;
    const p = new THREE.Vector3(...point(sampleU, sampleV));
    const du = new THREE.Vector3(...point(sampleU + epsilon, sampleV)).sub(p);
    const dv = new THREE.Vector3(...point(sampleU, sampleV + epsilon)).sub(p);
    const intendedNormal = new THREE.Vector3(...normal(sampleU, sampleV));
    if (du.cross(dv).dot(intendedNormal) < 0) {
      for (let i = 0; i < indices.length; i += 3) {
        [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return keepGeometry(geometry);
  }

  const tulipPetal = thickSurface((u, v) => {
    const x = u * 2 - 1;
    const width = 0.026 + 0.36 * Math.pow(Math.sin(Math.PI * (0.075 + v * 0.82)), 0.7);
    const radius = 0.055 + 0.53 * Math.sin(v * Math.PI * 0.52) - 0.09 * v ** 4;
    return [x * width, v * 0.94 - 0.085 * x * x * v ** 3, radius - 0.075 * (1 - x * x) * Math.sin(Math.PI * v)];
  }, () => [0, 0, 1], 10, 17, 0.038);

  const calendulaPetal = thickSurface((u, v) => {
    const x = u * 2 - 1;
    const width = 0.012 + 0.082 * Math.pow(Math.sin(Math.PI * v), 0.62);
    return [x * width, 0.04 + 0.12 * Math.sin(Math.PI * v * 0.85) - 0.065 * v + 0.016 * x * x, 0.12 + 0.62 * v];
  }, () => [0, 1, 0], 6, 12, 0.025);

  const leafGeometry = thickSurface((u, v) => {
    const x = u * 2 - 1;
    const width = 0.008 + 0.185 * Math.pow(Math.sin(Math.PI * v), 0.85);
    return [x * width, v * 1.1, 0.26 * v + 0.06 * (1 - x * x) * Math.sin(Math.PI * v)];
  }, () => [0, 0, 1], 8, 14, 0.03);

  const hemisphere = new THREE.HemisphereLight('#fff9ee', '#b5a5ba', 2.4);
  scene.add(hemisphere);
  const key = new THREE.DirectionalLight('#fff0d9', 3.3);
  key.position.set(-3.5, 7.5, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 6, bottom: -3, near: 0.5, far: 18 });
  key.shadow.normalBias = 0.035;
  key.shadow.bias = -0.00015;
  key.shadow.radius = 3;
  scene.add(key);
  const fill = new THREE.DirectionalLight('#e9ddff', 1.25);
  fill.position.set(4, 3.5, -4.5);
  scene.add(fill);
  const groundMaterial = new THREE.ShadowMaterial({ color: '#957c9d', opacity: 0.14 });
  materials.add(groundMaterial);
  const ground = mesh(keepGeometry(new THREE.PlaneGeometry(180, 180)), groundMaterial, scene, [0, -0.09, 0]);
  ground.rotation.x = -Math.PI / 2;
  ground.castShadow = false;

  const workRoot = new THREE.Group();
  workRoot.position.set(0.95, 0.1, 0.12);
  scene.add(workRoot);
  const workStand = new THREE.Group();
  workRoot.add(workStand);
  mesh(cylinder, colors.board, workStand, [0, -0.015, 0], [0.69, 0.08, 0.69]);
  mesh(cylinder, colors.stem, workStand, [0, 0.04, 0], [0.12, 0.07, 0.12]);

  const bouquetRoot = new THREE.Group();
  scene.add(bouquetRoot);
  const pot = new THREE.Group();
  bouquetRoot.add(pot);
  const potProfile = [new THREE.Vector2(0.31, 0), new THREE.Vector2(0.33, 0.04), new THREE.Vector2(0.43, 0.63), new THREE.Vector2(0.45, 0.68), new THREE.Vector2(0.40, 0.7), new THREE.Vector2(0.385, 0.12)];
  mesh(keepGeometry(new THREE.LatheGeometry(potProfile, 40)), colors.ceramic, pot);
  const rim = mesh(torus, colors.ceramic, pot, [0, 0.675, 0], [0.425, 0.425, 0.34]);
  rim.rotation.x = Math.PI / 2;

  function makeFlower(id) {
    const root = new THREE.Group();
    const stages = [];
    const tulip = id < 3;
    const heights = [2.11, 2.30, 2.03, 2.40, 2.35];
    const height = heights[id];
    for (const y of [0, height * 0.4, height, height]) {
      const group = new THREE.Group();
      group.position.y = y;
      group.userData.baseY = y;
      root.add(group);
      stages.push(group);
    }
    const [stem, leaves, outer, inner] = stages;
    mesh(cylinder, colors.stem, stem, [0, height / 2, 0], [0.055, height, 0.055]);
    mesh(sphere, colors.stem, stem, [0, height, 0], [0.058, 0.058, 0.058]);
    for (const y of [0.12, height - 0.1]) {
      mesh(cylinder, colors.leaf, stem, [0, y, 0], [0.077, 0.052, 0.077]);
    }
    const leaf1 = mesh(leafGeometry, colors.leaf, leaves, [0, 0, 0], tulip ? [1, 1, 1] : [0.86, 0.78, 0.85]);
    leaf1.rotation.set(-0.12, 0.35, -0.48);
    const leaf2 = mesh(leafGeometry, colors.leafLight, leaves, [0, -0.28, 0], tulip ? [0.87, 0.88, 0.9] : [0.7, 0.7, 0.8]);
    leaf2.rotation.set(0.08, Math.PI + 0.35, 0.48);
    mesh(cylinder, colors.stem, outer, [0, -0.045, 0], [0.13, 0.13, 0.13]);
    mesh(sphere, colors.leaf, outer, [0, 0.015, 0], [0.23, 0.10, 0.23]);
    if (tulip) {
      for (let i = 0; i < 3; i++) {
        const petal = mesh(tulipPetal, i === 1 ? colors.purpleEdge : colors.purple, outer);
        petal.rotation.y = i * Math.PI * 2 / 3 + id * 0.18;
      }
      for (let i = 0; i < 3; i++) {
        const petal = mesh(tulipPetal, i === 2 ? colors.purpleEdge : colors.purpleLight, inner, [0, 0.018, 0], [0.91, 1.02, 0.91]);
        petal.rotation.y = i * Math.PI * 2 / 3 + Math.PI / 3 + id * 0.18;
      }
      mesh(sphere, colors.pollen, inner, [0, 0.27, 0], [0.11, 0.09, 0.11]);
      for (let i = 0; i < 3; i++) {
        const angle = i * Math.PI * 2 / 3;
        mesh(sphere, colors.amber, inner, [Math.sin(angle) * 0.09, 0.34, Math.cos(angle) * 0.09], [0.025, 0.06, 0.025]);
      }
    } else {
      outer.rotation.x = 0.9;
      inner.rotation.x = 0.9;
      for (let i = 0; i < 19; i++) {
        const petal = mesh(calendulaPetal, i % 3 ? colors.orange : colors.orangeLight, outer);
        petal.rotation.y = i * Math.PI * 2 / 19;
        petal.position.y = (i % 3) * 0.009;
      }
      for (let i = 0; i < 15; i++) {
        const petal = mesh(calendulaPetal, i % 3 ? colors.orangeLight : colors.orange, inner, [0, 0.055, 0], [0.85, 1.0, 0.74]);
        petal.rotation.y = i * Math.PI * 2 / 15 + 0.12;
      }
      mesh(sphere, colors.amber, inner, [0, 0.13, 0], [0.215, 0.095, 0.215]);
      const pollen = new THREE.InstancedMesh(sphere, colors.pollen, 27);
      pollen.userData.solidMaterial = colors.pollen;
      const dummy = new THREE.Object3D();
      for (let i = 0; i < 27; i++) {
        const radius = 0.17 * Math.sqrt(i / 27);
        const angle = i * 2.399963;
        dummy.position.set(Math.cos(angle) * radius, 0.215 - radius * radius * 0.7, Math.sin(angle) * radius);
        dummy.scale.set(0.020, 0.022, 0.020);
        dummy.updateMatrix();
        pollen.setMatrixAt(i, dummy.matrix);
      }
      pollen.castShadow = true;
      inner.add(pollen);
    }
    return { root, stages, id };
  }

  const activeFlowers = Array.from({ length: 5 }, (_, id) => {
    const flower = makeFlower(id);
    flower.root.userData.action = { kind: 'place', id };
    workRoot.add(flower.root);
    return flower;
  });
  const bouquetFlowers = Array.from({ length: 5 }, (_, id) => {
    const flower = makeFlower(id);
    flower.root.userData.action = { kind: 'select', id };
    bouquetRoot.add(flower.root);
    return flower;
  });

  const wrapping = new THREE.Group();
  bouquetRoot.add(wrapping);
  const wrapperGeometry = thickSurface((u, v) => {
    const angle = u * Math.PI * 2;
    const radius = 0.22 + v * 0.69;
    const top = 1.54 + 0.24 * Math.cos(angle + 0.4) + 0.075 * Math.sin(angle * 2);
    return [Math.sin(angle) * radius, 0.1 + v * (top - 0.1), Math.cos(angle) * radius];
  }, u => [Math.sin(u * Math.PI * 2), 0, Math.cos(u * Math.PI * 2)], 48, 5, 0.022);
  mesh(wrapperGeometry, colors.paper, wrapping);
  const ribbonBandGeometry = keepGeometry(new THREE.CylinderGeometry(0.54, 0.48, 0.14, 48, 1, true));
  mesh(ribbonBandGeometry, colors.ribbon, wrapping, [0, 0.78, 0]);

  function addRibbon(points, width) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const geometry = thickSurface((u, v) => {
      const p = curve.getPoint(v);
      const tangent = curve.getTangent(v);
      const perpendicular = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
      p.addScaledVector(perpendicular, (u - 0.5) * width);
      return [p.x, p.y, p.z];
    }, () => [0, 0, 1], 2, 32, 0.018);
    return mesh(geometry, colors.ribbon, wrapping);
  }
  addRibbon([[0, 0.82, 0.56], [-0.31, 1.02, 0.61], [-0.66, 0.99, 0.57], [-0.57, 0.75, 0.58], [0, 0.82, 0.6]], 0.13);
  addRibbon([[0, 0.82, 0.59], [0.33, 1.02, 0.63], [0.62, 0.94, 0.58], [0.51, 0.72, 0.60], [0, 0.82, 0.62]], 0.13);
  addRibbon([[-0.035, 0.81, 0.61], [-0.17, 0.61, 0.67], [-0.23, 0.3, 0.56], [-0.15, 0.2, 0.48]], 0.17);
  addRibbon([[0.04, 0.81, 0.63], [0.19, 0.62, 0.69], [0.32, 0.43, 0.66], [0.28, 0.24, 0.51]], 0.16);
  mesh(sphere, colors.ribbon, wrapping, [0, 0.82, 0.65], [0.115, 0.09, 0.075]);

  const tagShape = new THREE.Shape();
  const tw = 0.42, th = 0.57, tr = 0.045;
  tagShape.moveTo(-tw / 2 + tr, -th / 2);
  tagShape.lineTo(tw / 2 - tr, -th / 2);
  tagShape.quadraticCurveTo(tw / 2, -th / 2, tw / 2, -th / 2 + tr);
  tagShape.lineTo(tw / 2, th / 2 - tr);
  tagShape.quadraticCurveTo(tw / 2, th / 2, tw / 2 - tr, th / 2);
  tagShape.lineTo(-tw / 2 + tr, th / 2);
  tagShape.quadraticCurveTo(-tw / 2, th / 2, -tw / 2, th / 2 - tr);
  tagShape.lineTo(-tw / 2, -th / 2 + tr);
  tagShape.quadraticCurveTo(-tw / 2, -th / 2, -tw / 2 + tr, -th / 2);
  const hole = new THREE.Path();
  hole.absarc(0, th / 2 - 0.075, 0.024, 0, Math.PI * 2, true);
  tagShape.holes.push(hole);
  const tagGeometry = keepGeometry(new THREE.ExtrudeGeometry(tagShape, { depth: 0.022, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.008, bevelThickness: 0.007, curveSegments: 8 }));
  const tag = mesh(tagGeometry, colors.tag, wrapping, [0.49, 0.61, 0.67]);
  tag.rotation.z = -0.19;
  const signatureMaterial = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false });
  materials.add(signatureMaterial);
  const signaturePlane = new THREE.Mesh(keepGeometry(new THREE.PlaneGeometry(0.36, 0.46)), signatureMaterial);
  signaturePlane.position.z = 0.038;
  signaturePlane.visible = false;
  tag.add(signaturePlane);
  let signatureTexture = null;
  let renderedSignature = null;
  function setSignature(signature) {
    if (signature === renderedSignature) return;
    renderedSignature = signature;
    signaturePlane.visible = Boolean(signature);
    if (signatureTexture) { signatureTexture.dispose(); signatureTexture = null; }
    signatureMaterial.map = null;
    if (signature) {
      const canvas = document.createElement('canvas');
      canvas.width = 768;
      canvas.height = 1024;
      const context = canvas.getContext('2d');
      if (context) {
        const lines = signature.split(/\r?\n/);
        context.font = 'italic 100px Georgia, serif';
        const widest = Math.max(1, ...lines.map(line => context.measureText(line).width));
        const fontSize = Math.min(132, 620 / widest * 100, 650 / (lines.length * 1.25));
        context.font = `italic ${fontSize}px Georgia, serif`;
        context.fillStyle = '#60466c';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        const lineHeight = fontSize * 1.25;
        const startY = canvas.height * 0.55 - (lines.length - 1) * lineHeight / 2;
        lines.forEach((line, index) => context.fillText(line, canvas.width / 2, startY + index * lineHeight));
        signatureTexture = new THREE.CanvasTexture(canvas);
        signatureTexture.colorSpace = THREE.SRGBColorSpace;
        signatureTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        signatureMaterial.map = signatureTexture;
      }
    }
    signatureMaterial.needsUpdate = true;
  }
  const stringCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.02, 0.85, 0.69), new THREE.Vector3(0.2, 1.01, 0.71), new THREE.Vector3(0.39, 0.91, 0.73), new THREE.Vector3(0.53, 0.81, 0.70)]);
  mesh(keepGeometry(new THREE.TubeGeometry(stringCurve, 24, 0.009, 5, false)), colors.string, wrapping);

  let state = { active: 0, stages: [0, 0, 0, 0, 0], wrapped: false, order: [0, 1, 2, 3, 4], signature: '' };
  let active = false;
  let destroyed = false;
  let frame = 0;
  let lastTime = 0;
  let width = 0;
  let height = 0;
  let portrait = false;
  let hasFramed = false;
  let fittedDistance = 0;
  let reportedError = false;
  const arrivals = new Map();
  const bouquetArrivals = new Map();
  const pickRoots = [...activeFlowers.map(f => f.root), ...bouquetFlowers.map(f => f.root)];

  function setStage(stage, mode) {
    stage.visible = mode !== 'hidden';
    stage.userData.ghost = mode === 'ghost';
    stage.traverse(object => {
      if (!object.isMesh) return;
      const original = object.userData.solidMaterial;
      if (mode !== 'ghost' && mode !== 'future') object.material = original;
      else {
        const cache = mode === 'ghost' ? ghostMaterials : futureMaterials;
        if (!cache.has(original)) {
          const ghost = original.clone();
          ghost.transparent = true;
          ghost.opacity = mode === 'ghost' ? 0.19 : 0.065;
          ghost.depthWrite = false;
          materials.add(ghost);
          cache.set(original, ghost);
        }
        object.material = cache.get(original);
      }
      object.castShadow = mode !== 'ghost' && mode !== 'future';
    });
  }

  function layout() {
    workRoot.visible = !state.wrapped;
    workRoot.position.x = portrait ? 0.68 : 0.95;
    pot.visible = !state.wrapped;
    wrapping.visible = state.wrapped;
    bouquetRoot.scale.setScalar(state.wrapped ? 1 : (portrait ? 0.42 : 0.50));
    bouquetRoot.position.set(state.wrapped ? 0 : (portrait ? -1.12 : -1.8), state.wrapped ? 0.02 : 0.03, state.wrapped ? 0 : -0.16);
    bouquetRoot.rotation.y = state.wrapped ? -0.08 : 0.10;
    const slots = [
      [-0.48, 0.35, -0.12, 0.18], [0, 0.55, -0.28, 0],
      [0.48, 0.33, -0.15, -0.18], [-0.34, 0.05, 0.38, 0.18], [0.34, 0.08, 0.42, -0.18],
    ];
    state.order.forEach((id, slot) => {
      const flower = bouquetFlowers[id];
      const [x, y, z, lean] = slots[slot];
      flower.root.position.set(x, y, z + (id >= 3 ? 0.13 : 0));
      flower.root.rotation.set(id >= 3 ? 0.10 : -0.04, id >= 3 ? (slot - 2) * 0.12 : slot * 0.45, lean);
    });
  }

  function framingDistance() {
    const aspect = width / Math.max(height, 1) || 1;
    const visualHeight = state.wrapped ? 4.15 : 3.95;
    const visualWidth = state.wrapped ? 3.45 : (portrait ? 3.95 : 4.85);
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
    return Math.max(visualHeight / (2 * Math.tan(halfFov)), visualWidth / (2 * Math.tan(halfFov) * aspect));
  }

  function cameraLimits(distance) {
    controls.minDistance = Math.max(2.7, distance * 0.43);
    controls.maxDistance = Math.max(15, distance * 2.1);
  }

  function resetView() {
    if (destroyed) return;
    const target = new THREE.Vector3(state.wrapped ? 0 : (portrait ? 0.10 : -0.12), state.wrapped ? 1.85 : 1.61, 0);
    const distance = framingDistance();
    const direction = new THREE.Vector3(0.28, 0.23, 1).normalize();
    camera.position.copy(target).addScaledVector(direction, distance);
    controls.target.copy(target);
    cameraLimits(distance);
    fittedDistance = distance;
    controls.update();
    hasFramed = true;
    if (active) renderer.render(scene, camera);
  }

  function resize() {
    if (destroyed) return;
    const nextWidth = container.clientWidth;
    const nextHeight = container.clientHeight;
    if (nextWidth <= 0 || nextHeight <= 0) return;
    if (nextWidth === width && nextHeight === height) return;
    const oldPortrait = portrait;
    width = nextWidth;
    height = nextHeight;
    portrait = width / height < 1.2;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    layout();
    if (!hasFramed || oldPortrait !== portrait) resetView();
    else {
      // Refit even within one breakpoint, retaining the user's orbit and zoom ratio.
      const offset = camera.position.clone().sub(controls.target);
      const zoomRatio = offset.length() / (fittedDistance || offset.length() || 1);
      fittedDistance = framingDistance();
      camera.position.copy(controls.target).addScaledVector(offset.normalize(), fittedDistance * zoomRatio);
      cameraLimits(fittedDistance);
      controls.update();
      if (active) renderer.render(scene, camera);
    }
  }

  function sanitizeState(value) {
    const stages = Array.from({ length: 5 }, (_, i) => Math.max(0, Math.min(4, Math.floor(Number(value?.stages?.[i]) || 0))));
    const proposedOrder = Array.isArray(value?.order) ? value.order : [];
    const order = proposedOrder.length === 5 && new Set(proposedOrder).size === 5 && proposedOrder.every(id => Number.isInteger(id) && id >= 0 && id < 5) ? [...proposedOrder] : [0, 1, 2, 3, 4];
    return { active: Math.max(0, Math.min(4, Math.floor(Number(value?.active) || 0))), stages, order, wrapped: Boolean(value?.wrapped), signature: typeof value?.signature === 'string' ? value.signature : state.signature };
  }

  function update(value) {
    if (destroyed) return;
    const next = sanitizeState(value);
    const changedMode = state.wrapped !== next.wrapped;
    const now = performance.now();
    for (let id = 0; id < 5; id++) {
      const previousCount = state.stages[id];
      const count = next.stages[id];
      activeFlowers[id].root.visible = id === next.active && !next.wrapped;
      for (let stageIndex = 0; stageIndex < 4; stageIndex++) {
        const stage = activeFlowers[id].stages[stageIndex];
        setStage(stage, stageIndex < count ? 'solid' : stageIndex === count ? 'ghost' : 'future');
        setStage(bouquetFlowers[id].stages[stageIndex], 'solid');
        if (!reducedMotion && count > previousCount && stageIndex >= previousCount && stageIndex < count) arrivals.set(stage, now);
        if (stageIndex >= count) arrivals.delete(stage);
      }
      bouquetFlowers[id].root.visible = count === 4 || next.wrapped;
      if (!reducedMotion && count === 4 && previousCount < 4) bouquetArrivals.set(bouquetFlowers[id].root, now);
    }
    state = next;
    setSignature(state.signature);
    layout();
    if (changedMode) resetView();
    if (active) render(performance.now(), false);
  }

  function render(now, schedule = true) {
    if (!active || destroyed) return;
    try {
      const delta = Math.min(0.05, Math.max(0, (now - (lastTime || now)) / 1000));
      lastTime = now;
      for (const flower of activeFlowers) {
        for (const stage of flower.stages) {
          const start = arrivals.get(stage);
          if (start !== undefined) {
            const t = Math.min(1, (now - start) / 470);
            const eased = 1 - (1 - t) ** 3;
            const settle = Math.sin(t * Math.PI) * 0.035;
            stage.position.y = stage.userData.baseY + (1 - eased) * 0.32;
            stage.scale.setScalar(0.83 + eased * 0.17 + settle);
            stage.rotation.y = (1 - eased) * -0.15;
            if (t >= 1) arrivals.delete(stage);
          } else {
            stage.position.y = stage.userData.baseY;
            stage.rotation.y = 0;
            stage.scale.setScalar(stage.userData.ghost && !reducedMotion ? 1 + Math.sin(now * 0.0027) * 0.008 : 1);
          }
        }
      }
      for (const [object, start] of bouquetArrivals) {
        const t = Math.min(1, (now - start) / 550);
        object.scale.setScalar(0.88 + 0.12 * (1 - (1 - t) ** 3));
        if (t >= 1) { object.scale.setScalar(1); bouquetArrivals.delete(object); }
      }
      for (const ghost of ghostMaterials.values()) ghost.opacity = reducedMotion ? 0.19 : 0.19 + Math.sin(now * 0.0027) * 0.018;
      controls.update(delta);
      renderer.render(scene, camera);
      if (schedule) frame = requestAnimationFrame(render);
    } catch (error) {
      active = false;
      if (!reportedError) { reportedError = true; onError?.(error); }
    }
  }

  function setActive(value) {
    if (destroyed) return;
    const nextActive = Boolean(value);
    if (nextActive === active) return;
    active = nextActive;
    cancelAnimationFrame(frame);
    controls.enabled = active;
    if (active) {
      resize();
      if (!hasFramed) resetView();
      lastTime = 0;
      frame = requestAnimationFrame(render);
    }
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const pointers = new Set();
  let down = null;
  let wasGesture = false;
  function pointerDown(event) {
    pointers.add(event.pointerId);
    if (pointers.size > 1) wasGesture = true;
    if (pointers.size === 1) { down = { x: event.clientX, y: event.clientY, id: event.pointerId }; wasGesture = false; }
  }
  function pointerUp(event) {
    const originalDown = down;
    const isClick = active && originalDown?.id === event.pointerId && !wasGesture && Math.hypot(event.clientX - originalDown.x, event.clientY - originalDown.y) < 8;
    pointers.delete(event.pointerId);
    if (!pointers.size) down = null;
    if (!isClick) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    scene.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickRoots, true);
    for (const hit of hits) {
      let current = hit.object;
      let action = null;
      let visible = true;
      while (current) {
        if (!current.visible) visible = false;
        if (current.userData.action) action = current.userData.action;
        current = current.parent;
      }
      if (!visible || !action) continue;
      if (action.kind === 'place' && !state.wrapped) onPlace?.(action.id);
      else if (action.kind === 'select') onSelect?.(action.id);
      break;
    }
  }
  function pointerCancel(event) { pointers.delete(event.pointerId); if (!pointers.size) down = null; }
  function contextLost(event) {
    event.preventDefault();
    setActive(false);
    if (!reportedError) { reportedError = true; onError?.(new Error('The three dimensional view lost its graphics context.')); }
  }
  renderer.domElement.addEventListener('pointerdown', pointerDown);
  renderer.domElement.addEventListener('pointerup', pointerUp);
  renderer.domElement.addEventListener('pointercancel', pointerCancel);
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();
  update(state);
  controls.enabled = false;

  function toggleRotate() {
    controls.autoRotate = !controls.autoRotate;
    return controls.autoRotate;
  }

  function destroy() {
    if (destroyed) return;
    setActive(false);
    destroyed = true;
    resizeObserver.disconnect();
    renderer.domElement.removeEventListener('pointerdown', pointerDown);
    renderer.domElement.removeEventListener('pointerup', pointerUp);
    renderer.domElement.removeEventListener('pointercancel', pointerCancel);
    renderer.domElement.removeEventListener('webglcontextlost', contextLost);
    controls.dispose();
    scene.traverse(object => { if (object.isInstancedMesh) object.dispose(); });
    for (const geometry of geometries) geometry.dispose();
    for (const surface of materials) surface.dispose();
    signatureTexture?.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    scene.clear();
    arrivals.clear();
    bouquetArrivals.clear();
  }

  return { update, setActive, resetView, toggleRotate, destroy, renderer, scene, camera, controls, handlesSignature: true };
}
