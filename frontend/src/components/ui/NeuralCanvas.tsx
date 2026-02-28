// src/components/ui/NeuralCanvas.tsx
// ── World-wide-web neural network — sparkle travelers, zero flicker ──
//
// Technique:
//  • alpha:true renderer  → canvas is transparent until first paint → no black flash
//  • background set via CSS on container div → instant colour, no blank frame
//  • ONE pre-allocated LineSegments buffer (setDrawRange) for edges
//  • ONE pre-allocated Points buffer for sparkle travelers
//  • ZERO geometry/object allocation after init → zero flicker forever

import { useEffect, useRef } from "react";
import * as THREE from "three";

export interface NeuralCanvasProps {
  bgColor?:    number;   // scene background  (default 0x0c1825)
  nodeColor?:  number;   // node tint          (default 0x008a58)
  hubColor?:   number;   // hub node tint      (default 0x00d492)
  edgeColor?:  number;   // edge tint          (default 0x006341)
  edgeDist?:   number;   // max edge distance  (default 5.5)
  nodeCount?:  number;   // total nodes        (default 60)
  sparkles?:   number;   // traveling balls    (default 28)
  height?:     string;
  style?:      React.CSSProperties;
}

export default function NeuralCanvas({
  bgColor    = 0x0c1825,
  nodeColor  = 0x008a58,
  hubColor   = 0x00d492,
  edgeColor  = 0x006341,
  edgeDist   = 5.5,
  nodeCount  = 60,
  sparkles   = 28,
  height     = "100%",
  style,
}: NeuralCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    /* ── renderer — alpha:true so canvas is transparent until first paint ── */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(bgColor, 1);          // fill after alpha clear
    el.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
    camera.position.z = 13;
    scene.fog = new THREE.FogExp2(bgColor, 0.026);

    const setSize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    setSize();

    /* ── nodes ─────────────────────────────────────────────────────── */
    const SX = 20, SY = 11, SZ = 4;
    const HUB_N = Math.ceil(nodeCount * 0.12);

    type NodeData = { pos: THREE.Vector3; vel: THREE.Vector3; isHub: boolean };
    const nodes: NodeData[] = Array.from({ length: nodeCount }, (_, i) => ({
      pos: new THREE.Vector3(
        (Math.random() - .5) * SX,
        (Math.random() - .5) * SY,
        (Math.random() - .5) * SZ,
      ),
      vel: new THREE.Vector3(
        (Math.random() - .5) * .005,
        (Math.random() - .5) * .003,
        0,
      ),
      isHub: i < HUB_N,
    }));

    /* ── point cloud ────────────────────────────────────────────── */
    const ptBuf = new Float32Array(nodeCount * 3);
    nodes.forEach((n, i) => {
      ptBuf[i*3]   = n.pos.x;
      ptBuf[i*3+1] = n.pos.y;
      ptBuf[i*3+2] = n.pos.z;
    });
    const ptGeo = new THREE.BufferGeometry();
    ptGeo.setAttribute("position", new THREE.BufferAttribute(ptBuf, 3));

    const ptColBuf  = new Float32Array(nodeCount * 3);
    const hubC      = new THREE.Color(hubColor);
    const nodeC     = new THREE.Color(nodeColor);
    nodes.forEach((n, i) => {
      const c = n.isHub ? hubC : nodeC;
      ptColBuf[i*3] = c.r; ptColBuf[i*3+1] = c.g; ptColBuf[i*3+2] = c.b;
    });
    // Rename attribute to avoid colliding with any built-in `color`
    ptGeo.setAttribute("aColor", new THREE.BufferAttribute(ptColBuf, 3));

    const ptSzBuf = new Float32Array(nodeCount);
    nodes.forEach((n, i) => { ptSzBuf[i] = n.isHub ? .22 : .07 + Math.random() * .06; });
    ptGeo.setAttribute("size", new THREE.BufferAttribute(ptSzBuf, 1));

    const ptMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0.0 } },
      vertexShader: `
        attribute float size;
        attribute vec3  aColor;
        varying   vec3  vColor;
        varying   float vAlpha;
        uniform   float uTime;
        void main(){
          vColor  = aColor;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float pulse = 1.0 + 0.15 * sin(uTime * 1.6 + position.x * 0.9);
          gl_PointSize = size * pulse * (300.0 / -mv.z);
          vAlpha  = 0.6 + 0.3 * sin(uTime * 0.8 + position.y * 1.2);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3  vColor;
        varying float vAlpha;
        void main(){
          float d    = length(gl_PointCoord - 0.5) * 2.0;
          float core = 1.0 - smoothstep(0.3, 0.9, d);
          float halo = exp(-d * 3.5) * 0.55;
          gl_FragColor = vec4(vColor + halo * vColor, (core + halo) * vAlpha);
          if(gl_FragColor.a < 0.01) discard;
        }
      `,
      transparent: true, depthWrite: false,
    });
    scene.add(new THREE.Points(ptGeo, ptMat));

    /* ── edges — pre-allocated, never re-created ────────────────── */
    const MAX_EDGES  = Math.floor(nodeCount * (nodeCount - 1) / 2);
    const edgePosArr = new Float32Array(MAX_EDGES * 2 * 3);
    const edgeColArr = new Float32Array(MAX_EDGES * 2 * 3);
    const edgeGeo    = new THREE.BufferGeometry();
    const edgePosAttr = new THREE.BufferAttribute(edgePosArr, 3);
    const edgeColAttr = new THREE.BufferAttribute(edgeColArr, 3);
    edgePosAttr.setUsage(THREE.DynamicDrawUsage);
    edgeColAttr.setUsage(THREE.DynamicDrawUsage);
    edgeGeo.setAttribute("position", edgePosAttr);
    edgeGeo.setAttribute("color",    edgeColAttr);
    edgeGeo.setDrawRange(0, 0);           // ← nothing drawn until first real frame
    const edgeMat = new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true,
      opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    scene.add(new THREE.LineSegments(edgeGeo, edgeMat));

    const DIST_SQ  = edgeDist * edgeDist;
    const edgeC    = new THREE.Color(edgeColor);
    const hubEdgeC = new THREE.Color(hubColor).multiplyScalar(.4);

    /* ── active-edge table (rebuilt each frame, cheap typed array) ── */
    // store [fromIdx, toIdx] pairs so sparkles can pick a random live edge
    const MAX_ACTIVE = MAX_EDGES;
    const activeFrom = new Int16Array(MAX_ACTIVE);
    const activeTo   = new Int16Array(MAX_ACTIVE);
    let   activeCount = 0;

    /* ── sparkle travelers ──────────────────────────────────────── */
    // Each sparkle rides one edge: lerp(nodeFrom.pos, nodeTo.pos, t)
    type Sparkle = { from: number; to: number; t: number; speed: number };
    const sparkleList: Sparkle[] = Array.from({ length: sparkles }, () => ({
      from: 0, to: 1,
      t: Math.random(),
      speed: 0.003 + Math.random() * 0.006,
    }));

    const spkPosBuf = new Float32Array(sparkles * 3);
    const spkSzBuf  = new Float32Array(sparkles);
    sparkleList.forEach((_, i) => { spkSzBuf[i] = 0.28 + Math.random() * 0.12; });

    const spkGeo  = new THREE.BufferGeometry();
    const spkPosAttr = new THREE.BufferAttribute(spkPosBuf, 3);
    spkPosAttr.setUsage(THREE.DynamicDrawUsage);
    spkGeo.setAttribute("position", spkPosAttr);
    spkGeo.setAttribute("size",     new THREE.BufferAttribute(spkSzBuf, 1));

    // bright white-green glow shader for sparkles
    const spkMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0.0 } },
      vertexShader: `
        attribute float size;
        varying   float vGlow;
        uniform   float uTime;
        void main(){
          vec4 mv  = modelViewMatrix * vec4(position, 1.0);
          float pb = 1.0 + 0.4 * sin(uTime * 8.0 + position.x * 3.0);
          gl_PointSize = size * pb * (340.0 / -mv.z);
          vGlow = pb;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying float vGlow;
        void main(){
          float d    = length(gl_PointCoord - 0.5) * 2.0;
          float core = 1.0 - smoothstep(0.0, 0.55, d);
          float ring = exp(-d * 5.0);
          // white-hot centre fading to GO green on edge
          vec3 innerCol = vec3(0.85, 1.0, 0.92);
          vec3 outerCol = vec3(0.0, 0.82, 0.5);
          vec3 col = mix(outerCol, innerCol, core);
          float alpha = (core * 0.95 + ring * 0.45) * vGlow;
          gl_FragColor = vec4(col, alpha);
          if(gl_FragColor.a < 0.02) discard;
        }
      `,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const spkMesh = new THREE.Points(spkGeo, spkMat);
    spkGeo.setDrawRange(0, 0);   // hide until first active edges exist
    scene.add(spkMesh);

    /* assign a sparkle to a random active edge */
    function reassignSparkle(s: Sparkle) {
      if (activeCount === 0) return;
      const idx = Math.floor(Math.random() * activeCount);
      s.from  = activeFrom[idx];
      s.to    = activeTo[idx];
      s.t     = 0;
      s.speed = 0.003 + Math.random() * 0.007;
    }

    /* ── animation loop ─────────────────────────────────────────── */
    let tick = 0, frameId = 0;

    function frame() {
      frameId = requestAnimationFrame(frame);
      tick++;
      const t = tick * .016;

      /* --- move nodes --- */
      for (let i = 0; i < nodeCount; i++) {
        const n = nodes[i];
        n.pos.x += n.vel.x;
        n.pos.y += n.vel.y;
        if (n.pos.x > SX*.5 || n.pos.x < -SX*.5) n.vel.x *= -1;
        if (n.pos.y > SY*.5 || n.pos.y < -SY*.5) n.vel.y *= -1;
        ptBuf[i*3]   = n.pos.x;
        ptBuf[i*3+1] = n.pos.y;
        ptBuf[i*3+2] = n.pos.z;
      }
      ptGeo.attributes.position.needsUpdate = true;
      (ptMat.uniforms as any).uTime.value = t;

      /* --- rebuild edges in-place --- */
      let eIdx = 0;
      activeCount = 0;
      for (let i = 0; i < nodeCount; i++) {
        for (let j = i + 1; j < nodeCount; j++) {
          const dx = nodes[i].pos.x - nodes[j].pos.x;
          const dy = nodes[i].pos.y - nodes[j].pos.y;
          const dz = nodes[i].pos.z - nodes[j].pos.z;
          const d2 = dx*dx + dy*dy + dz*dz;
          if (d2 < DIST_SQ) {
            const alpha    = 1 - d2 / DIST_SQ;
            const isGreen  = nodes[i].isHub || nodes[j].isHub;
            const c        = isGreen ? hubEdgeC : edgeC;
            const fa       = alpha * (isGreen ? .5 : .22);
            const b        = eIdx * 6;
            edgePosArr[b]   = nodes[i].pos.x; edgePosArr[b+1] = nodes[i].pos.y; edgePosArr[b+2] = nodes[i].pos.z;
            edgePosArr[b+3] = nodes[j].pos.x; edgePosArr[b+4] = nodes[j].pos.y; edgePosArr[b+5] = nodes[j].pos.z;
            edgeColArr[b]   = c.r*fa; edgeColArr[b+1] = c.g*fa; edgeColArr[b+2] = c.b*fa;
            edgeColArr[b+3] = c.r*fa; edgeColArr[b+4] = c.g*fa; edgeColArr[b+5] = c.b*fa;
            if (activeCount < MAX_ACTIVE) {
              activeFrom[activeCount] = i;
              activeTo[activeCount]   = j;
              activeCount++;
            }
            eIdx++;
          }
        }
      }
      edgeGeo.setDrawRange(0, eIdx * 2);
      edgePosAttr.needsUpdate = true;
      edgeColAttr.needsUpdate = true;

      /* --- advance sparkles along edges --- */
      let live = 0;
      for (let si = 0; si < sparkles; si++) {
        const s = sparkleList[si];
        s.t += s.speed;
        if (s.t >= 1.0) { reassignSparkle(s); }
        const fn = nodes[s.from];
        const tn = nodes[s.to];
        if (!fn || !tn) continue;
        const tt = s.t;
        spkPosBuf[si*3]   = fn.pos.x + (tn.pos.x - fn.pos.x) * tt;
        spkPosBuf[si*3+1] = fn.pos.y + (tn.pos.y - fn.pos.y) * tt;
        spkPosBuf[si*3+2] = fn.pos.z + (tn.pos.z - fn.pos.z) * tt;
        live++;
      }
      spkGeo.setDrawRange(0, live);
      spkPosAttr.needsUpdate = true;
      (spkMat.uniforms as any).uTime.value = t;

      /* --- seed sparkles on first frame with active edges --- */
      if (tick === 1 && activeCount > 0) {
        sparkleList.forEach(s => reassignSparkle(s));
      }

      /* gentle camera drift */
      camera.position.x = Math.sin(tick * .0008) * .8;
      camera.position.y = Math.cos(tick * .0011) * .4;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }

    // render one frame immediately so no blank canvas flash
    frame();

    const obs = new ResizeObserver(setSize);
    obs.observe(el);

    return () => {
      cancelAnimationFrame(frameId);
      obs.disconnect();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* background colour on the div = instant colour, no blank-canvas flash */
  const bgHex = "#" + bgColor.toString(16).padStart(6, "0");

  return (
    <div
      ref={mountRef}
      style={{
        position: "absolute", inset: 0,
        width: "100%", height,
        background: bgHex,   // shown immediately while Three.js initialises
        ...style,
      }}
    />
  );
}
