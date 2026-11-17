import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { canSnapDrop } from './drag-math.js';

/** A procedural, shared-state view. The host owns selection and progression. */
export function create3DView({ container, onPlace, onSelect, onError, onDragChange } = {}) {
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
  const lockedMaterials = new Map();
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

  // Loose components are the actual flower meshes, centered in four physical
  // tray wells. Their final transform is exactly the corresponding stage's.
  const trayRoot = new THREE.Group();
  trayRoot.name = 'bouquet-component-tray';
  scene.add(trayRoot);
  const trayShape = new THREE.Shape();
  const trayWidth = 3.85, trayDepth = 1.05, trayRadius = 0.18;
  trayShape.moveTo(-trayWidth / 2 + trayRadius, -trayDepth / 2);
  trayShape.lineTo(trayWidth / 2 - trayRadius, -trayDepth / 2);
  trayShape.quadraticCurveTo(trayWidth / 2, -trayDepth / 2, trayWidth / 2, -trayDepth / 2 + trayRadius);
  trayShape.lineTo(trayWidth / 2, trayDepth / 2 - trayRadius);
  trayShape.quadraticCurveTo(trayWidth / 2, trayDepth / 2, trayWidth / 2 - trayRadius, trayDepth / 2);
  trayShape.lineTo(-trayWidth / 2 + trayRadius, trayDepth / 2);
  trayShape.quadraticCurveTo(-trayWidth / 2, trayDepth / 2, -trayWidth / 2, trayDepth / 2 - trayRadius);
  trayShape.lineTo(-trayWidth / 2, -trayDepth / 2 + trayRadius);
  trayShape.quadraticCurveTo(-trayWidth / 2, -trayDepth / 2, -trayWidth / 2 + trayRadius, -trayDepth / 2);
  const trayBoard = mesh(keepGeometry(new THREE.ExtrudeGeometry(trayShape, { depth: 0.055, bevelEnabled: true, bevelSegments: 3, bevelSize: 0.045, bevelThickness: 0.035, steps: 1, curveSegments: 8 })), colors.board, trayRoot, [0, 0.035, 1.22]);
  trayBoard.rotation.x = -Math.PI / 2;
  const wellMaterial = material('#ddd0c5', { roughness: 0.72 });
  for (let index = 0; index < 4; index++) {
    mesh(cylinder, wellMaterial, trayRoot, [(index - 1.5) * 0.92, 0.115, 1.22], [0.40, 0.018, 0.40]);
  }
  const pickupHalo = mesh(torus, material('#ad8ac2', { roughness: 0.36 }), trayRoot, [0, 0.15, 1.22], [0.405, 0.405, 0.405]);
  pickupHalo.rotation.x = Math.PI / 2;
  const looseFlowers = activeFlowers.map(({ stages }, id) => stages.map((source, index) => {
    const content = source.clone(true);
    content.position.set(0, 0, 0);
    content.rotation.set(0, 0, 0);
    content.scale.setScalar(1);
    content.traverse(object => {
      if (object.isMesh) object.userData.solidMaterial = object.material;
    });
    content.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(content);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    content.position.sub(center);
    const piece = new THREE.Group();
    piece.name = `bouquet-part-${id}-${index}`;
    piece.add(content);
    const scale = Math.min(0.82 / Math.max(size.x, size.y, size.z), 0.83);
    const restQuaternion = source.quaternion.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (index - 1.5) * 0.07, (index % 2 ? 1 : -1) * 0.035)));
    piece.quaternion.copy(restQuaternion);
    piece.scale.setScalar(scale);
    piece.updateMatrixWorld(true);
    const restingBounds = new THREE.Box3().setFromObject(piece);
    const restPosition = new THREE.Vector3((index - 1.5) * 0.92, 0.17 - restingBounds.min.y, 1.22);
    piece.position.copy(restPosition);
    piece.userData.part = index;
    trayRoot.add(piece);
    return { root: piece, content, center, restPosition, restQuaternion, restScale: scale, id, index };
  }));

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
  let drag = null;
  const arrivals = new Map();
  const bouquetArrivals = new Map();
  const pickRoots = bouquetFlowers.map(f => f.root);
  const snapMarker = document.createElement('div');
  snapMarker.className = 'snap-target';
  snapMarker.setAttribute('aria-hidden', 'true');
  snapMarker.hidden = true;
  snapMarker.style.position = 'absolute';
  snapMarker.style.pointerEvents = 'none';
  snapMarker.style.transform = 'translate(-50%, -50%)';
  container.appendChild(snapMarker);
  container.dataset.dragging = 'false';
  container.dataset.snapReady = 'false';

  function setStage(stage, mode) {
    stage.visible = mode !== 'hidden';
    stage.userData.ghost = mode === 'ghost';
    stage.traverse(object => {
      if (!object.isMesh) return;
      const original = object.userData.solidMaterial;
      if (mode !== 'ghost' && mode !== 'future' && mode !== 'locked') object.material = original;
      else {
        const cache = mode === 'ghost' ? ghostMaterials : mode === 'locked' ? lockedMaterials : futureMaterials;
        if (!cache.has(original)) {
          const ghost = original.clone();
          ghost.transparent = true;
          ghost.opacity = mode === 'ghost' ? 0.19 : mode === 'locked' ? 0.25 : 0.065;
          if (mode === 'locked') ghost.color.lerp(new THREE.Color('#d4c8be'), 0.55);
          ghost.depthWrite = false;
          materials.add(ghost);
          cache.set(original, ghost);
        }
        object.material = cache.get(original);
      }
      object.castShadow = mode !== 'ghost' && mode !== 'future' && mode !== 'locked';
    });
  }

  function layout() {
    workRoot.visible = !state.wrapped;
    trayRoot.visible = !state.wrapped;
    pickupHalo.visible = !state.wrapped && state.stages[state.active] < 4;
    pickupHalo.position.x = (state.stages[state.active] - 1.5) * 0.92;
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
    const visualHeight = state.wrapped ? 4.15 : 4.25;
    const visualWidth = state.wrapped ? 3.45 : (portrait ? 4.25 : 5.05);
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
    return Math.max(visualHeight / (2 * Math.tan(halfFov)), visualWidth / (2 * Math.tan(halfFov) * aspect));
  }

  function cameraLimits(distance) {
    controls.minDistance = Math.max(2.7, distance * 0.43);
    controls.maxDistance = Math.max(15, distance * 2.1);
  }

  function resetView() {
    if (destroyed) return;
    cancelDrag();
    const target = new THREE.Vector3(state.wrapped ? 0 : (portrait ? 0.10 : -0.12), state.wrapped ? 1.85 : 1.53, state.wrapped ? 0 : 0.35);
    const distance = framingDistance();
    const direction = new THREE.Vector3(0.22, state.wrapped ? 0.23 : 0.31, 1).normalize();
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
    cancelDrag();
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
    if (drag && (next.active !== drag.id || next.stages[drag.id] !== drag.index || next.wrapped)) cancelDrag();
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
        const loose = looseFlowers[id][stageIndex];
        loose.root.visible = id === next.active && !next.wrapped && stageIndex >= count;
        setStage(loose.content, stageIndex === count ? 'solid' : 'locked');
        if (!reducedMotion && count > previousCount && stageIndex >= previousCount && stageIndex < count) arrivals.set(stage, now);
        if (stageIndex >= count) arrivals.delete(stage);
      }
      bouquetFlowers[id].root.visible = count === 4 || next.wrapped;
      if (!reducedMotion && count === 4 && previousCount < 4) bouquetArrivals.set(bouquetFlowers[id].root, now);
    }
    state = next;
    container.dataset.part = String(state.stages[state.active]);
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
      advanceDrag(now);
      for (const ghost of ghostMaterials.values()) ghost.opacity = drag?.ready ? 0.32 : reducedMotion ? 0.19 : 0.19 + Math.sin(now * 0.0027) * 0.018;
      if (!drag) controls.update(delta);
      const nextPiece = state.stages[state.active] < 4 && !state.wrapped ? looseFlowers[state.active][state.stages[state.active]] : null;
      if (nextPiece) {
        nextPiece.root.updateWorldMatrix(true, false);
        const trayPoint = screenPoint(nextPiece.root.getWorldPosition(new THREE.Vector3()));
        container.dataset.trayX = String(Math.round(trayPoint.x * 100) / 100);
        container.dataset.trayY = String(Math.round(trayPoint.y * 100) / 100);
      } else { delete container.dataset.trayX; delete container.dataset.trayY; }
      updateSnapMarker();
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
    if (!nextActive) cancelDrag();
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
  function setRay(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
    camera.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    return rect;
  }
  function screenPoint(world) {
    const rect = renderer.domElement.getBoundingClientRect();
    const point = world.clone().project(camera);
    return { x: rect.left + (point.x + 1) * rect.width / 2, y: rect.top + (1 - point.y) * rect.height / 2, z: point.z };
  }
  function attachment(piece) {
    const source = activeFlowers[piece.id].stages[piece.index];
    source.updateWorldMatrix(true, false);
    return {
      position: source.localToWorld(piece.center.clone()),
      quaternion: source.getWorldQuaternion(new THREE.Quaternion()),
    };
  }
  function notifyDragChange(value) {
    container.dataset.dragging = String(value);
    onDragChange?.(value);
  }
  function updateSnapMarker() {
    if (!drag) {
      snapMarker.hidden = true;
      snapMarker.classList.remove('is-ready');
      container.dataset.snapReady = 'false';
      delete container.dataset.snapX;
      delete container.dataset.snapY;
      return;
    }
    const target = screenPoint(drag.targetWorld);
    const rect = renderer.domElement.getBoundingClientRect();
    const visible = target.z >= -1 && target.z <= 1 && target.x >= rect.left && target.x <= rect.right && target.y >= rect.top && target.y <= rect.bottom;
    snapMarker.hidden = !visible;
    snapMarker.style.left = `${target.x - rect.left}px`;
    snapMarker.style.top = `${target.y - rect.top}px`;
    snapMarker.classList.toggle('is-ready', drag.ready);
    container.dataset.snapReady = String(drag.ready);
    container.dataset.snapX = String(Math.round(target.x * 100) / 100);
    container.dataset.snapY = String(Math.round(target.y * 100) / 100);
  }
  function restorePiece(piece) {
    piece.root.position.copy(piece.restPosition);
    piece.root.quaternion.copy(piece.restQuaternion);
    piece.root.scale.setScalar(piece.restScale);
  }
  function releaseCapture(previous) {
    const id = previous.pointerId;
    previous.pointerId = null;
    if (id !== null && id !== undefined && renderer.domElement.hasPointerCapture(id)) {
      try { renderer.domElement.releasePointerCapture(id); } catch { /* The browser may have released it already. */ }
    }
    pointers.delete(id);
  }
  function endDrag() {
    if (!drag) return null;
    const previous = drag;
    drag = null;
    restorePiece(previous.piece);
    releaseCapture(previous);
    controls.enabled = active;
    updateSnapMarker();
    notifyDragChange(false);
    return previous;
  }
  function cancelDrag() {
    endDrag();
  }
  function isCurrentDrag(value = drag) {
    return Boolean(value && active && !destroyed && !state.wrapped && state.active === value.id && state.stages[value.id] === value.index);
  }
  function validateDrop(value = drag) {
    if (!value) return false;
    const rect = renderer.domElement.getBoundingClientRect();
    const targetScreen = screenPoint(value.targetWorld);
    const forward = camera.getWorldDirection(new THREE.Vector3());
    const depth = value.targetWorld.clone().sub(camera.position).dot(forward);
    const worldPerPixel = 2 * depth * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / rect.height;
    const inside = point => point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
    const valid = isCurrentDrag(value) && depth > camera.near && depth < camera.far && targetScreen.z >= -1 && targetScreen.z <= 1 && inside(targetScreen) && inside(value.screen) && inside(value.pointerScreen);
    return canSnapDrop({
      pieceScreen: value.screen, targetScreen,
      pieceWorld: value.rawPosition, targetWorld: value.targetWorld,
      screenRadius: value.radius, worldRadius: worldPerPixel * value.radius * 1.2,
      moved: value.maxTravel >= value.movementThreshold, valid,
    });
  }
  function moveDrag(clientX, clientY) {
    if (!drag || (drag.phase !== 'pointer' && drag.phase !== 'keyboard')) return false;
    const value = drag;
    value.pointerScreen = { x: clientX, y: clientY };
    value.screen = { x: clientX + value.grabOffset.x, y: clientY + value.grabOffset.y };
    value.maxTravel = Math.max(value.maxTravel, Math.hypot(clientX - value.startScreen.x, clientY - value.startScreen.y));
    setRay(value.screen.x, value.screen.y);
    const position = raycaster.ray.intersectPlane(value.plane, new THREE.Vector3());
    if (!position || !Number.isFinite(position.x + position.y + position.z)) { value.ready = false; return false; }
    value.rawPosition.copy(position);
    const target = attachment(value.piece);
    value.targetWorld.copy(target.position);
    value.targetQuaternion.copy(target.quaternion);
    value.ready = validateDrop(value);
    updateSnapMarker();
    return true;
  }
  function startDrag(input, event = null, expectedIndex = null) {
    if (drag || !active || state.wrapped || destroyed) return false;
    const index = state.stages[state.active];
    if (index >= 4 || (expectedIndex !== null && expectedIndex !== index)) return false;
    const piece = looseFlowers[state.active][index];
    scene.updateMatrixWorld(true);
    const target = attachment(piece);
    const initial = screenPoint(piece.root.getWorldPosition(new THREE.Vector3()));
    const pointerScreen = event ? { x: event.clientX, y: event.clientY } : { x: initial.x, y: initial.y };
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()), target.position);
    const value = {
      piece, id: state.active, index, phase: input, pointerId: event?.pointerId ?? null,
      radius: event?.pointerType === 'touch' ? 84 : 72,
      movementThreshold: event?.pointerType === 'touch' ? 10 : 6,
      plane, targetWorld: target.position, targetQuaternion: target.quaternion,
      rawPosition: piece.root.position.clone(), screen: { x: initial.x, y: initial.y }, pointerScreen,
      startScreen: { ...pointerScreen }, grabOffset: { x: initial.x - pointerScreen.x, y: initial.y - pointerScreen.y },
      maxTravel: 0, ready: false, pickupStarted: performance.now(),
    };
    drag = value;
    controls.enabled = false;
    down = null;
    if (event) renderer.domElement.setPointerCapture(event.pointerId);
    moveDrag(pointerScreen.x, pointerScreen.y);
    piece.root.position.copy(value.rawPosition);
    container.dataset.part = String(index);
    notifyDragChange(true);
    return true;
  }
  function finishDrag() {
    if (!drag || (drag.phase !== 'pointer' && drag.phase !== 'keyboard')) return false;
    const value = drag;
    value.ready = validateDrop(value);
    value.phase = value.ready ? 'snapping' : 'returning';
    value.animationStarted = performance.now();
    value.fromPosition = value.piece.root.position.clone();
    value.fromQuaternion = value.piece.root.quaternion.clone();
    value.fromScale = value.piece.root.scale.x;
    releaseCapture(value);
    updateSnapMarker();
    return value.ready;
  }
  function advanceDrag(now) {
    if (!drag) return;
    if (!isCurrentDrag()) { cancelDrag(); return; }
    const value = drag;
    const object = value.piece.root;
    if (value.phase === 'pointer' || value.phase === 'keyboard') {
      const target = attachment(value.piece);
      value.targetWorld.copy(target.position);
      value.targetQuaternion.copy(target.quaternion);
      value.ready = validateDrop(value);
      const targetScreen = screenPoint(value.targetWorld);
      const distance = Math.hypot(value.screen.x - targetScreen.x, value.screen.y - targetScreen.y);
      const attraction = value.ready ? 0.20 + 0.58 * (1 - Math.min(1, distance / value.radius)) ** 2 : 0;
      object.position.copy(value.rawPosition).lerp(value.targetWorld, attraction);
      object.quaternion.copy(value.piece.restQuaternion).slerp(value.targetQuaternion, value.ready ? 0.9 : 0.2);
      const lift = reducedMotion ? 1 : Math.min(1, (now - value.pickupStarted) / 170);
      object.scale.setScalar(THREE.MathUtils.lerp(value.piece.restScale, value.ready ? 1 : 0.91, 1 - (1 - lift) ** 3));
      return;
    }
    const snapping = value.phase === 'snapping';
    const duration = reducedMotion ? 1 : snapping ? 230 : 260;
    const t = Math.min(1, (now - value.animationStarted) / duration);
    const eased = 1 - (1 - t) ** 3;
    object.position.copy(value.fromPosition).lerp(snapping ? value.targetWorld : value.piece.restPosition, eased);
    object.quaternion.copy(value.fromQuaternion).slerp(snapping ? value.targetQuaternion : value.piece.restQuaternion, eased);
    object.scale.setScalar(THREE.MathUtils.lerp(value.fromScale, snapping ? 1 : value.piece.restScale, eased));
    if (t >= 1) {
      const completed = endDrag();
      if (snapping && completed && isCurrentDrag(completed)) onPlace?.(completed.id, completed.index);
    }
  }
  function beginKeyboardDrag(index = null) { return startDrag('keyboard', null, index); }
  function moveKeyboardDrag(dx, dy) {
    if (!drag || drag.phase !== 'keyboard' || !Number.isFinite(dx) || !Number.isFinite(dy)) return false;
    return moveDrag(drag.pointerScreen.x + dx, drag.pointerScreen.y + dy);
  }
  function finishKeyboardDrag() {
    if (!drag || drag.phase !== 'keyboard') return false;
    return finishDrag();
  }
  function visibleHit(roots, clientX, clientY) {
    setRay(clientX, clientY);
    scene.updateMatrixWorld(true);
    for (const hit of raycaster.intersectObjects(roots, true)) {
      let node = hit.object;
      let visible = true;
      while (node) { if (!node.visible) visible = false; node = node.parent; }
      if (visible) return hit;
    }
    return null;
  }
  function canPickPart(piece, event) {
    if (visibleHit([piece], event.clientX, event.clientY)) return true;
    // A thin stem still has a generous touch target. This affects pickup only;
    // attachment always uses the stricter, matching-anchor drop validation.
    const bounds = new THREE.Box3().setFromObject(piece);
    const points = [];
    for (const x of [bounds.min.x, bounds.max.x]) {
      for (const y of [bounds.min.y, bounds.max.y]) {
        for (const z of [bounds.min.z, bounds.max.z]) points.push(screenPoint(new THREE.Vector3(x, y, z)));
      }
    }
    if (points.some(point => !Number.isFinite(point.x + point.y + point.z) || point.z < -1 || point.z > 1)) return false;
    const minX = Math.min(...points.map(point => point.x));
    const maxX = Math.max(...points.map(point => point.x));
    const minY = Math.min(...points.map(point => point.y));
    const maxY = Math.max(...points.map(point => point.y));
    const padding = event.pointerType === 'touch' ? 22 : 12;
    const halfWidth = Math.max(22, (maxX - minX) / 2 + padding);
    const halfHeight = Math.max(22, (maxY - minY) / 2 + padding);
    return Math.abs(event.clientX - (minX + maxX) / 2) <= halfWidth && Math.abs(event.clientY - (minY + maxY) / 2) <= halfHeight;
  }
  function pointerDown(event) {
    if (!active || event.button !== 0) return;
    pointers.add(event.pointerId);
    if (pointers.size > 1) { down = null; cancelDrag(); return; }
    if (event.isPrimary === false) { down = null; return; }
    if (drag) { event.preventDefault(); event.stopImmediatePropagation(); return; }
    const index = state.stages[state.active];
    const currentPiece = !state.wrapped && index < 4 ? looseFlowers[state.active][index].root : null;
    if (currentPiece && canPickPart(currentPiece, event) && startDrag('pointer', event)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    down = { x: event.clientX, y: event.clientY, id: event.pointerId, maxTravel: 0 };
  }
  function pointerMove(event) {
    if (down?.id === event.pointerId) down.maxTravel = Math.max(down.maxTravel, Math.hypot(event.clientX - down.x, event.clientY - down.y));
    if (drag?.phase === 'pointer' && drag.pointerId === event.pointerId) {
      event.preventDefault();
      event.stopImmediatePropagation();
      moveDrag(event.clientX, event.clientY);
    }
  }
  function pointerUp(event) {
    if (drag?.phase === 'pointer' && drag.pointerId === event.pointerId) {
      event.preventDefault();
      event.stopImmediatePropagation();
      moveDrag(event.clientX, event.clientY);
      finishDrag();
      pointers.delete(event.pointerId);
      down = null;
      return;
    }
    const originalDown = down;
    const isClick = active && !drag && originalDown?.id === event.pointerId && originalDown.maxTravel < 8 && Math.hypot(event.clientX - originalDown.x, event.clientY - originalDown.y) < 8;
    pointers.delete(event.pointerId);
    if (!pointers.size) down = null;
    if (!isClick) return;
    const hit = visibleHit(pickRoots, event.clientX, event.clientY);
    let current = hit?.object;
    while (current && !current.userData.action) current = current.parent;
    if (current?.userData.action?.kind === 'select') onSelect?.(current.userData.action.id);
  }
  function pointerCancel(event) {
    if (drag?.pointerId === event.pointerId) cancelDrag();
    pointers.delete(event.pointerId);
    if (!pointers.size) down = null;
  }
  function lostCapture(event) {
    if (drag?.phase === 'pointer' && drag.pointerId === event.pointerId) cancelDrag();
    pointers.delete(event.pointerId);
    if (down?.id === event.pointerId) down = null;
  }
  function otherPointerDown(event) {
    if (drag && event.pointerId !== drag.pointerId) cancelDrag();
  }
  function blur() { cancelDrag(); pointers.clear(); down = null; }
  function visibilityChange() { if (document.hidden) blur(); }
  function contextLost(event) {
    event.preventDefault();
    setActive(false);
    if (!reportedError) { reportedError = true; onError?.(new Error('The three dimensional view lost its graphics context.')); }
  }
  renderer.domElement.addEventListener('pointerdown', pointerDown, true);
  renderer.domElement.addEventListener('pointermove', pointerMove, true);
  renderer.domElement.addEventListener('pointerup', pointerUp, true);
  renderer.domElement.addEventListener('pointercancel', pointerCancel, true);
  renderer.domElement.addEventListener('lostpointercapture', lostCapture);
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  window.addEventListener('pointerdown', otherPointerDown, true);
  window.addEventListener('blur', blur);
  document.addEventListener('visibilitychange', visibilityChange);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();
  update(state);
  controls.enabled = false;

  function toggleRotate() {
    cancelDrag();
    controls.autoRotate = !controls.autoRotate;
    return controls.autoRotate;
  }

  function destroy() {
    if (destroyed) return;
    cancelDrag();
    setActive(false);
    destroyed = true;
    resizeObserver.disconnect();
    renderer.domElement.removeEventListener('pointerdown', pointerDown, true);
    renderer.domElement.removeEventListener('pointermove', pointerMove, true);
    renderer.domElement.removeEventListener('pointerup', pointerUp, true);
    renderer.domElement.removeEventListener('pointercancel', pointerCancel, true);
    renderer.domElement.removeEventListener('lostpointercapture', lostCapture);
    renderer.domElement.removeEventListener('webglcontextlost', contextLost);
    window.removeEventListener('pointerdown', otherPointerDown, true);
    window.removeEventListener('blur', blur);
    document.removeEventListener('visibilitychange', visibilityChange);
    controls.dispose();
    scene.traverse(object => { if (object.isInstancedMesh) object.dispose(); });
    for (const geometry of geometries) geometry.dispose();
    for (const surface of materials) surface.dispose();
    signatureTexture?.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    snapMarker.remove();
    scene.clear();
    arrivals.clear();
    bouquetArrivals.clear();
  }

  return { update, setActive, resetView, toggleRotate, destroy, renderer, scene, camera, controls, handlesSignature: true,
    beginKeyboardDrag, moveKeyboardDrag, finishKeyboardDrag, cancelDrag,
    get dragging() { return Boolean(drag); },
  };
}
