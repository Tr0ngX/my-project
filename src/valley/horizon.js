// What lies past the field's own ground, out to where the painted backdrop takes over: the valley's plain, with
// forest in masses, meadows between, a river winding through and fields round a hamlet. It is real ground, so it
// shifts as you walk; what stands on it (farwoods.js) is cheap. At its inner edge it is the same grass, lit the
// same way, as the ground it meets; at its outer edge it is lost in the same haze as the backdrop.
import * as THREE from 'three';
import { COMMON, LEAF_LIGHT } from '../lib/index.js';
import { fieldsAt, forestAt, heightAt, HERO } from './world.js';

/** How far the plain reaches, metres. The backdrop begins a little inside this. */
export const REACH = 6200;

const vertex = /* glsl */ `
${COMMON}
out vec3 vWorld;
out vec3 vNormal;
out float vCloud;
void main() {
  vWorld = position;
  vNormal = normal;
  vec2 cp = (position.xz - uWindScroll * 2.6) / 3400.0;
  float cc = textureLod(tNoiseHi, cp, 0.0).b * 0.7 + textureLod(tNoiseHi, cp * 2.7 + 0.19, 0.0).a * 0.3;
  vCloud = 1.0 - uCloudShade * smoothstep(0.47, 0.6, cc);
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}
`;

const fragment = /* glsl */ `
${COMMON}
${LEAF_LIGHT}
layout(location = 0) out vec4 outC;
in vec3 vWorld;
in vec3 vNormal;
in float vCloud;
uniform sampler2D tFar;     // forest, fields, over the square the plain covers
uniform float uFarInv;      // 1 / that square's side
uniform vec2 uAlong;        // the way the valley runs

// The river's middle: metres right of the valley's line at u metres down it (world.js riverLine).
float riverLine(float u) {
  return 60.0 + 330.0 * sin(u / 520.0 + 0.6) + 80.0 * sin(u / 170.0 + 2.0) + 900.0 * exp(-max(u, -400.0) / 350.0);
}

void main() {
  vec3 N = normalize(vNormal);
  if (N.y < 0.0) N = -N;
  vec2 xz = vWorld.xz;
  float dist = distance(vWorld, uCamPos);
  vec3 V = normalize(uCamPos - vWorld);
  float cloud = vCloud;
  float rel = slopeRel(N);
  float sunny = cloud * slopeSun(rel);

  float farMix = smoothstep(650.0, 1400.0, dist);
  vec4 a = farMix > 0.0 ? texture(tNoiseHi, xz / 2300.0) : vec4(0.5);
  vec4 fl = floorAt(xz);

  // blend near and far base grass before running the shared brush passes once instead of twice
  float gIdx = mix(0.6, 0.5 + 0.2 * smoothstep(0.3, 0.7, a.g), farMix) + (rel - 0.5) * 0.4;
  vec3 col = paintGround(mix(meadowGreen(gIdx), fl.rgb, fl.a), xz, dist, 0.0);
  if (dist < 4620.0) {
    float sx = strokeCoord(vWorld);
    col = landStrokes(col, xz, dist, sx, fwidth(sx));
    float sy = strokeCoord2(xz);
    col = landStrokes(col, xz, dist, sy, fwidth(sy));
  }
  if (distance(xz, uHeroEye.xz) < 3620.0) {
    vec2 hq = heroAngle(vWorld);
    col = heroPaint(col, vWorld, hq, fwidth(hq), dist);
  }

  vec3 near = farMix < 1.0 ? col * meadowLight(sunny) : vec3(0.0);
  vec3 far = near;
  if (farMix > 0.0) {
    vec4 b = texture(tNoiseHi, xz / 810.0 + 0.31);
    vec4 c = texture(tNoiseHi, xz / 230.0 + 0.57);
    vec4 e = texture(tNoiseHi, xz / 47.0 + 0.13);
    vec4 far4 = texture(tFar, xz * uFarInv + 0.5);

    // forest floor: dark under the trees that stand on it, its edge ragged
    float forest = smoothstep(0.38, 0.62, far4.r + (c.r - 0.5) * 0.34 + (e.g - 0.5) * 0.2);
    vec3 fcol = mix(col, mix(vec3(0.03, 0.14, 0.07), vec3(0.06, 0.2, 0.08), e.b), forest);
    // (green land seen from far off is lit a little from every side)
    far = fcol * meadowLight(sunny);

    // the river: it holds the pale sky low down, and the sun where the sun is
    float u = dot(xz, uAlong);
    float v = dot(xz, vec2(-uAlong.y, uAlong.x));
    float slope = (330.0 / 520.0) * cos(u / 520.0 + 0.6) + (80.0 / 170.0) * cos(u / 170.0 + 2.0) - (u > -400.0 ? (900.0 / 350.0) * exp(-u / 350.0) : 0.0);
    float rd = abs(v - riverLine(u)) / sqrt(1.0 + slope * slope);
    float width = 15.0 + 8.0 * b.g + max(u, 0.0) * 0.0045;
    float water = (1.0 - smoothstep(width - 2.5, width + 1.5, rd + (e.a - 0.5) * 5.0)) * (1.0 - smoothstep(-2.0, 6.0, vWorld.y + u * 0.0035));
    // (a pale shingle bank on the inside of its bends)
    far = mix(far, vec3(0.62, 0.6, 0.48) * (uSunColor * 0.35 * cloud + uSkyColor * 0.5), (1.0 - smoothstep(width + 2.0, width + 9.0, rd)) * step(0.55, b.r) * 0.8);
    vec3 R = reflect(-V, vec3(0.0, 1.0, 0.0));
    vec3 mirror = mix(uFogColor * 1.08, uSkyColor * 1.45, smoothstep(0.0, 0.5, R.y)) + uSunColor * pow(max(dot(R, uSunDir), 0.0), 90.0) * 0.5;
    far = mix(far, mirror, water);
  }

  vec3 outCol = mix(near, far, farMix);
  outC = vec4(applyFog(outCol, vWorld), mix(1.0, 0.4, smoothstep(520.0, 700.0, dist)));
}
`;

/** The far land's map, baked once: forest in red, fields in green, over the square the plain covers. */
function farMap(size = 1024) {
  const data = new Uint8Array(size * size * 4);
  const side = REACH * 2;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = ((i + 0.5) / size - 0.5) * side;
      const z = ((j + 0.5) / size - 0.5) * side;
      const k = (i + j * size) * 4;
      data[k] = 255 * forestAt(x, z);
      data[k + 1] = 255 * fieldsAt(x, z);
      data[k + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** @param inner half the side of the square the field's ground covers; the land starts just inside it */
export function createHorizon(field, inner = 512, { simple = false } = {}) {
  const sectors = 8;
  const around = simple ? 360 : 720;
  const rings = simple ? 40 : 64;
  const edge = inner - 6;
  const reach = REACH / edge;
  const positions = new Float32Array(around * (rings + 1) * 3);
  let p = 0;
  for (let k = 0; k <= rings; k++) {
    const scale = Math.pow(reach, k / rings);
    for (let i = 0; i < around; i++) {
      // a point on the square's edge, pushed outwards
      const t = (i / around) * 4;
      const side = Math.floor(t);
      const u = (t - side) * 2 - 1;
      let x = side === 0 ? u : side === 1 ? 1 : side === 2 ? -u : -1;
      let z = side === 0 ? -1 : side === 1 ? u : side === 2 ? 1 : -u;
      // further out the square rounds off into a circle, so the plain ends as far off whichever way you look
      const round = Math.min(1, k / (rings * 0.4));
      const len = Math.hypot(x, z);
      x *= edge * scale * (1 + (1 / len - 1) * round);
      z *= edge * scale * (1 + (1 / len - 1) * round);
      positions[p++] = x;
      // (over its last two kilometres it settles to level ground, so its edge is no hill standing against the
      // backdrop, and never a wall)
      const out = Math.min(1, Math.max(0, (Math.hypot(x, z) - 4000) / 2000));
      positions[p++] = heightAt(x, z) * (1 - 0.9 * out * out * (3 - 2 * out));
      positions[p++] = z;
    }
  }
  const indices = new Uint32Array(rings * around * 6);
  let q = 0;
  for (let k = 0; k < rings; k++) {
    for (let i = 0; i < around; i++) {
      const a = k * around + i;
      const b = k * around + ((i + 1) % around);
      indices[q++] = a;
      indices[q++] = b;
      indices[q++] = a + around;
      indices[q++] = b;
      indices[q++] = b + around;
      indices[q++] = a + around;
    }
  }
  const posAttr = new THREE.BufferAttribute(positions, 3);
  const fullGeom = new THREE.BufferGeometry();
  fullGeom.setAttribute('position', posAttr);
  fullGeom.setIndex(new THREE.BufferAttribute(indices, 1));
  fullGeom.computeVertexNormals();
  const norAttr = fullGeom.getAttribute('normal');

  const far = farMap(simple ? 512 : 1024);
  const uniforms = { ...field.uniforms, tFar: { value: far }, uFarInv: { value: 1 / (REACH * 2) }, uAlong: { value: new THREE.Vector2(HERO[0], HERO[1]) } };
  const material = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: vertex, fragmentShader: fragment, uniforms, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 12 });

  // Split the ring into angular sectors so hardware frustum culling skips wedges behind the camera.
  const group = new THREE.Group();
  group.renderOrder = 2;
  const colsPerSector = around / sectors;
  for (let s = 0; s < sectors; s++) {
    const i0 = s * colsPerSector;
    const i1 = i0 + colsPerSector;
    const sIdx = new Uint32Array(rings * colsPerSector * 6);
    let sq = 0;
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let k = 0; k <= rings; k++) {
      for (let c = i0; c <= i1; c++) {
        const vi = (k * around + (c % around)) * 3;
        const x = positions[vi], y = positions[vi + 1], z = positions[vi + 2];
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      }
    }
    for (let k = 0; k < rings; k++) {
      for (let i = i0; i < i1; i++) {
        const a = k * around + i;
        const b = k * around + ((i + 1) % around);
        sIdx[sq++] = a;
        sIdx[sq++] = b;
        sIdx[sq++] = a + around;
        sIdx[sq++] = b;
        sIdx[sq++] = b + around;
        sIdx[sq++] = a + around;
      }
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', posAttr);
    sg.setAttribute('normal', norAttr);
    sg.setIndex(new THREE.BufferAttribute(sIdx, 1));
    const mesh = new THREE.Mesh(sg, material);
    mesh.boundingSphere = new THREE.Sphere(
      new THREE.Vector3((minX + maxX) * 0.5, (minY + maxY) * 0.5, (minZ + maxZ) * 0.5),
      Math.hypot(maxX - minX, maxY - minY, maxZ - minZ) * 0.5,
    );
    mesh.renderOrder = 2;
    group.add(mesh);
  }
  let horizonRange = REACH;
  group.group = group;
  group.setViewDistance = (meters) => {
    horizonRange = Math.max(800, Number(meters) || REACH);
    return group;
  };
  group.setFogDistance = (meters) => group.setViewDistance(meters);
  group.update = () => {};
  group.stats = () => ({ totalChunks: sectors, builtChunks: sectors, visibleChunks: sectors, viewDistance: horizonRange });
  return group;
}
