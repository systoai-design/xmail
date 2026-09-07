import { useEffect, useRef } from "react";

/**
 * The hero light field.
 *
 * A dark ground with a broad arc of light sweeping across it, dispersing into
 * chromatic fringes at its edge. This carries the page's character: without a
 * real light source the layout collapses into a flat card grid.
 *
 * Raw WebGL on a fullscreen triangle -- no three.js, no postprocessing, one
 * draw call per frame. It parks itself when off-screen or when the tab is
 * hidden, and never mounts under prefers-reduced-motion.
 */

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2  uRes;
uniform float uTime;
uniform vec3  uAccent;
uniform float uIntensity;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float arcDist(vec2 uv, float t) {
  float curve = 0.13
              + 0.070 * sin(uv.x * 1.9 + t * 0.16)
              + 0.034 * sin(uv.x * 3.7 - t * 0.11);
  return uv.y - curve;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  float t = uTime;

  float d = arcDist(uv, t);

  float core = exp(-abs(d) * 120.0);
  float halo = exp(-abs(d) * 8.5) * 0.80;
  float under = exp(-max(d, 0.0) * 3.4) * 0.30;

  const float SPREAD = 0.030;
  float d0 = arcDist(uv + vec2(0.0,  SPREAD * 1.00), t);
  float d1 = arcDist(uv + vec2(0.0,  SPREAD * 0.62), t);
  float d2 = arcDist(uv + vec2(0.0,  SPREAD * 0.26), t);
  float d3 = arcDist(uv + vec2(0.0, -SPREAD * 0.26), t);
  float d4 = arcDist(uv + vec2(0.0, -SPREAD * 0.62), t);
  float d5 = arcDist(uv + vec2(0.0, -SPREAD * 1.00), t);

  float k = 46.0;
  vec3 fringe = vec3(0.0);
  fringe += vec3(1.00, 0.16, 0.10) * exp(-abs(d0) * k);
  fringe += vec3(1.00, 0.55, 0.10) * exp(-abs(d1) * k);
  fringe += vec3(0.95, 0.90, 0.20) * exp(-abs(d2) * k);
  fringe += vec3(0.20, 0.95, 0.45) * exp(-abs(d3) * k);
  fringe += vec3(0.15, 0.75, 1.00) * exp(-abs(d4) * k);
  fringe += vec3(0.45, 0.35, 1.00) * exp(-abs(d5) * k);
  fringe *= 0.62;

  float along = smoothstep(0.0, 0.45, uv.x) * smoothstep(1.0, 0.55, uv.x);
  float travel = 0.55 + 0.45 * sin(uv.x * 2.2 - t * 0.35);

  vec3 warm = vec3(1.0, 0.98, 0.94);
  vec3 col = vec3(0.0);
  col += warm * core * (0.85 + 1.15 * along) * travel * 1.35;
  col += mix(uAccent, warm, 0.55) * halo * (0.5 + 0.7 * along);
  col += fringe * (0.35 + 0.85 * along);
  col += uAccent * under * 0.6;

  float starMask = smoothstep(0.02, 0.35, -d);
  vec2 sp = uv * asp * 190.0;
  float star = step(0.9975, hash(floor(sp)));
  float twinkle = 0.5 + 0.5 * sin(t * 1.6 + hash(floor(sp)) * 30.0);
  col += vec3(0.75, 0.8, 1.0) * star * twinkle * starMask * 0.5;

  col += (noise(gl_FragCoord.xy * 0.9 + t * 12.0) - 0.5) * 0.016;

  col *= uIntensity;
  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("aurora shader:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export interface AuroraSweepProps {
  className?: string;
  /** HSL triplet, e.g. [250, 0.9, 0.72]. Defaults to the primary token. */
  accent?: [number, number, number];
  intensity?: number;
}

export function AuroraSweep({
  className = "",
  accent,
  intensity = 1,
}: AuroraSweepProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: false,
      powerPreference: "low-power",
    });
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("aurora link:", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // One oversized triangle covers the viewport with no index buffer.
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uAccent = gl.getUniformLocation(prog, "uAccent");
    const uIntensity = gl.getUniformLocation(prog, "uIntensity");

    // HSL -> RGB, so the art tracks the design token rather than a hardcoded
    // colour that drifts when the brand changes.
    const [hue, sat, light] = accent ?? [250, 0.9, 0.72];
    const c = (1 - Math.abs(2 * light - 1)) * sat;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = light - c / 2;
    const seg = Math.floor(hue / 60) % 6;
    const table: [number, number, number][] = [
      [c, x, 0],
      [x, c, 0],
      [0, c, x],
      [0, x, c],
      [x, 0, c],
      [c, 0, x],
    ];
    const [r0, g0, b0] = table[seg];
    gl.uniform3f(uAccent, r0 + m, g0 + m, b0 + m);
    gl.uniform1f(uIntensity, intensity);

    let raf = 0;
    let visible = true;
    const start = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };

    const frame = (now: number) => {
      resize();
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = visible && !document.hidden ? requestAnimationFrame(frame) : 0;
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) {
        raf = requestAnimationFrame(frame);
      } else if (!visible && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    });
    io.observe(canvas);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    raf = requestAnimationFrame(frame);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      // Deliberately NOT calling WEBGL_lose_context. React reuses the same
      // canvas node across remounts, and a force-lost context is handed straight
      // back by getContext, so the effect re-runs against a dead context and the
      // canvas silently stays black.
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, [accent, intensity]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}
