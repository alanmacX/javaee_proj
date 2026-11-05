import { useEffect, useRef, useState } from "react";

const vertex = `attribute vec2 position;
void main(){gl_Position=vec4(position,0.,1.);}`;
const fragment = `precision highp float;
uniform vec2 viewport, imageSize;
uniform vec4 bounds;
uniform float radius, dark, pixelRatio, surfaceRole;
uniform sampler2D frosted;
float distanceToGlass(vec2 p){
  vec2 q=abs(p-bounds.xy-bounds.zw*.5)-(bounds.zw*.5-radius);
  return length(max(q,0.))+min(max(q.x,q.y),0.)-radius;
}
vec2 sceneUV(vec2 p){
  float cover=max(viewport.x/imageSize.x,viewport.y/imageSize.y);
  return clamp((p-viewport*.5)/(imageSize*cover)+.5,vec2(.001),vec2(.999));
}
void main(){
  vec2 p=vec2(gl_FragCoord.x/pixelRatio,viewport.y-gl_FragCoord.y/pixelRatio);
  float d=distanceToGlass(p);
  if(d>30.) discard;
  float shadowDistance=max(distanceToGlass(p-vec2(0.,1.5)),0.);
  float shadowAlpha=mix(.095,.11,surfaceRole)*mix(1.,1.1,dark)*exp(-.5*shadowDistance*shadowDistance/49.);
  vec3 shadowColor=vec3(.035,.04,.045);
  if(d>1.) {
    gl_FragColor=vec4(shadowColor*shadowAlpha,shadowAlpha);
    return;
  }
  float inside=max(-d,0.);
  vec2 gradient=vec2(distanceToGlass(p+vec2(.5,0.))-distanceToGlass(p-vec2(.5,0.)),distanceToGlass(p+vec2(0.,.5))-distanceToGlass(p-vec2(0.,.5)));
  // Rounded, rough glass perimeter: thickness stays inside the front surface.
  float curvedEdge=1.-smoothstep(0.,mix(4.5,3.,surfaceRole),inside);
  vec3 normal=normalize(vec3(gradient*curvedEdge*.30,1.));
  vec3 ray=refract(vec3(0.,0.,-1.),normal,1./1.46);
  vec2 hit=p+ray.xy/max(-ray.z,.1)*12.;
  vec3 environment=texture2D(frosted,sceneUV(hit)).rgb;
  // The perimeter scatters a little more light inside the same frosted material.
  float edgeScatter=exp(-inside/5.);
  vec3 diffuse=(texture2D(frosted,sceneUV(hit+vec2(10.,0.))).rgb
    +texture2D(frosted,sceneUV(hit-vec2(10.,0.))).rgb
    +texture2D(frosted,sceneUV(hit+vec2(0.,10.))).rgb
    +texture2D(frosted,sceneUV(hit-vec2(0.,10.))).rgb)*.25;
  environment=mix(environment,diffuse,edgeScatter*.6);
  float luminance=dot(environment,vec3(.2126,.7152,.0722));
  // Adapt luminance for readable labels without bleaching the environment's chroma.
  vec3 chroma=environment-vec3(luminance);
  float materialLuminance=mix(.40+.44*luminance,.065+.38*luminance,dark);
  vec3 color=clamp(vec3(materialLuminance)+chroma*.95,vec3(.025),vec3(.92));
  // Broad, low-contrast environment reflection on the curved frosted perimeter.
  // Its color comes from the room; there is no white rim or displaced rear plate.
  vec3 roomLight=texture2D(frosted,sceneUV(vec2(viewport.x*.12,viewport.y*.32))).rgb;
  float facingLight=max(dot(gradient,normalize(vec2(-.65,-.76))),0.);
  float facingShade=max(dot(gradient,normalize(vec2(.65,.76))),0.);
  vec3 reflection=mix(roomLight,environment,.35);
  color=mix(color,reflection,curvedEdge*(.10+.06*facingLight));
  // Diffuse, rounded sidewall exists in the resting state as well as on hover.
  color*=1.+curvedEdge*(facingLight*.03-facingShade*.055);
  color=mix(color,vec3(materialLuminance)+chroma*.85,surfaceRole*.10);
  // A softly rolled lip, confined within the arc, carries the finest edge cue.
  float lip=1.-smoothstep(.15,.9,inside);
  color=mix(color,reflection,lip*facingLight*.065);
  float coverage=1.-smoothstep(-.65,.65,d);
  float shadowVisible=shadowAlpha*(1.-coverage);
  gl_FragColor=vec4(color*coverage+shadowColor*shadowVisible,coverage+shadowVisible);
}`;

/** Static environment optics. One shared context; no animation loop or pointer tracking. */
export function EnvironmentGlass({ environment }: { environment: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    const node = canvas.current!;
    const root = document.documentElement;
    const reduced = matchMedia("(prefers-reduced-transparency: reduce)");
    const gl = node.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) return;
    let stopped = false,
      ready = false,
      frame = 0;
    const shaders: WebGLShader[] = [];
    const program = gl.createProgram()!;
    for (const [type, source] of [
      [gl.VERTEX_SHADER, vertex],
      [gl.FRAGMENT_SHADER, fragment],
    ] as const) {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn("Environment glass shader:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        gl.deleteProgram(program);
        for (const previous of shaders) gl.deleteShader(previous);
        return;
      }
      shaders.push(shader);
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      for (const shader of shaders) gl.deleteShader(shader);
      gl.deleteProgram(program);
      return;
    }
    gl.useProgram(program);
    // Premultiplied source-over also composes the ornament over the window beneath it.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const location = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    const uniforms = Object.fromEntries(
      [
        "viewport",
        "imageSize",
        "bounds",
        "radius",
        "dark",
        "pixelRatio",
        "frosted",
        "surfaceRole",
      ].map((name) => [name, gl.getUniformLocation(program, name)]),
    );
    const texture = gl.createTexture()!;
    let imageWidth = 1,
      imageHeight = 1;
    let renderCount = 0;
    function render() {
      frame = 0;
      if (stopped || !ready || gl!.isContextLost()) return;
      if (reduced.matches) {
        delete root.dataset.optics;
        node.hidden = true;
        return;
      }
      node.hidden = false;
      // Static rendering can afford a bounded 2x target for clean rounded edges.
      const width = innerWidth,
        height = innerHeight;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      const renderWidth = Math.round(width * ratio),
        renderHeight = Math.round(height * ratio);
      if (node.width !== renderWidth || node.height !== renderHeight) {
        node.width = renderWidth;
        node.height = renderHeight;
      }
      gl!.viewport(0, 0, renderWidth, renderHeight);
      gl!.uniform1f(uniforms.pixelRatio, ratio);
      gl!.disable(gl!.SCISSOR_TEST);
      gl!.clearColor(0, 0, 0, 0);
      gl!.clear(gl!.COLOR_BUFFER_BIT);
      gl!.uniform2f(uniforms.viewport, width, height);
      gl!.uniform2f(uniforms.imageSize, imageWidth, imageHeight);
      gl!.uniform1f(uniforms.dark, root.dataset.theme === "dark" ? 1 : 0);
      const app = document.querySelector<HTMLElement>(".app");
      if (!app) return;
      const style = getComputedStyle(app);
      const left = parseFloat(style.paddingLeft),
        top = parseFloat(style.paddingTop);
      const windowRect = {
        x: left,
        y: top,
        width: width - left - parseFloat(style.paddingRight),
        height: height - top - parseFloat(style.paddingBottom),
      };
      const padding = parseFloat(
        getComputedStyle(root).getPropertyValue("--optical-surface-outset"),
      );
      const windowRadius = parseFloat(
        getComputedStyle(root).getPropertyValue("--radius-window"),
      );
      const clear = () => {
        gl!.disable(gl!.SCISSOR_TEST);
        gl!.clear(gl!.COLOR_BUFFER_BIT);
      };
      const draw = (
        rect: { x: number; y: number; width: number; height: number },
        radius: number,
        role: number,
      ) => {
        const x = Math.max(0, Math.floor((rect.x - padding) * ratio));
        const y = Math.max(
          0,
          Math.floor((height - rect.y - rect.height - padding) * ratio),
        );
        const right = Math.min(
          renderWidth,
          Math.ceil((rect.x + rect.width + padding) * ratio),
        );
        const top = Math.min(
          renderHeight,
          Math.ceil((height - rect.y + padding) * ratio),
        );
        gl!.enable(gl!.SCISSOR_TEST);
        gl!.scissor(x, y, Math.max(0, right - x), Math.max(0, top - y));
        gl!.uniform4f(uniforms.bounds, rect.x, rect.y, rect.width, rect.height);
        gl!.uniform1f(uniforms.radius, radius);
        gl!.uniform1f(uniforms.surfaceRole, role);
        gl!.drawArrays(gl!.TRIANGLES, 0, 6);
      };
      let surfaceCount = 1;
      // Render each floating surface in isolation. Its transparent padding includes
      // the whole shadow and cannot copy a rectangular patch of the page behind it.
      for (const foreground of document.querySelectorAll<HTMLCanvasElement>(
        ".ornament-glass",
      )) {
        const parent = foreground.parentElement!;
        if (!parent.getClientRects().length) continue;
        const rect = parent.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        const parentStyle = getComputedStyle(parent);
        const radius = Math.min(
          parseFloat(parentStyle.borderTopLeftRadius),
          rect.width / 2,
          rect.height / 2,
        );
        clear();
        draw(rect, radius, 1);
        const cssWidth = rect.width + padding * 2,
          cssHeight = rect.height + padding * 2;
        const targetWidth = Math.max(1, Math.round(cssWidth * ratio));
        const targetHeight = Math.max(1, Math.round(cssHeight * ratio));
        foreground.style.left = `${-padding - parseFloat(parentStyle.borderLeftWidth)}px`;
        foreground.style.top = `${-padding - parseFloat(parentStyle.borderTopWidth)}px`;
        foreground.style.width = `${cssWidth}px`;
        foreground.style.height = `${cssHeight}px`;
        if (
          foreground.width !== targetWidth ||
          foreground.height !== targetHeight
        ) {
          foreground.width = targetWidth;
          foreground.height = targetHeight;
        }
        const context = foreground.getContext("2d");
        if (!context) continue;
        context.clearRect(0, 0, targetWidth, targetHeight);
        context.drawImage(
          node,
          (rect.x - padding) * ratio,
          (rect.y - padding) * ratio,
          cssWidth * ratio,
          cssHeight * ratio,
          0,
          0,
          targetWidth,
          targetHeight,
        );
        surfaceCount++;
      }
      // The shared rear canvas retains only the main window, not duplicate ornaments.
      clear();
      draw(windowRect, windowRadius, 0);
      node.dataset.renderCount = String(++renderCount);
      node.dataset.surfaceCount = String(surfaceCount);
      root.dataset.optics = "ready";
    }
    function schedule() {
      if (!frame && !stopped) frame = requestAnimationFrame(render);
    }
    const observed = new Set<Element>();
    const resize = new ResizeObserver(schedule);
    function syncSurfaces() {
      const current = new Set(
        document.querySelectorAll(
          ".app, .rail, .refresh-control, .compose-row",
        ),
      );
      for (const element of observed)
        if (!current.has(element)) {
          resize.unobserve(element);
          observed.delete(element);
        }
      for (const element of current)
        if (!observed.has(element)) {
          resize.observe(element);
          observed.add(element);
        }
      schedule();
    }
    const changes = new MutationObserver(syncSurfaces);
    changes.observe(document.body, { childList: true, subtree: true });
    const appearance = new MutationObserver(schedule);
    appearance.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    syncSurfaces();
    window.addEventListener("resize", schedule);
    reduced.addEventListener("change", schedule);
    const lost = (event: Event) => {
      event.preventDefault();
      delete root.dataset.optics;
      node.hidden = true;
    };
    node.addEventListener("webglcontextlost", lost);
    // Retry setup after context restoration using the same mounted component.
    const restored = () => setGeneration((value) => value + 1);
    node.addEventListener("webglcontextrestored", restored);
    const image = new Image();
    image.onload = () => {
      if (stopped) return;
      imageWidth = image.naturalWidth;
      imageHeight = image.naturalHeight;
      const rough = document.createElement("canvas");
      rough.width = Math.min(1200, imageWidth);
      rough.height = Math.round((rough.width * imageHeight) / imageWidth);
      // Extend edge pixels before blurring, so the texture has no transparent fringe.
      const padding = 96;
      const extended = document.createElement("canvas");
      extended.width = rough.width + padding * 2;
      extended.height = rough.height + padding * 2;
      const source = extended.getContext("2d")!;
      source.drawImage(image, padding, padding, rough.width, rough.height);
      source.drawImage(
        image,
        0,
        0,
        1,
        imageHeight,
        0,
        padding,
        padding,
        rough.height,
      );
      source.drawImage(
        image,
        imageWidth - 1,
        0,
        1,
        imageHeight,
        padding + rough.width,
        padding,
        padding,
        rough.height,
      );
      source.drawImage(
        extended,
        0,
        padding,
        extended.width,
        1,
        0,
        0,
        extended.width,
        padding,
      );
      source.drawImage(
        extended,
        0,
        padding + rough.height - 1,
        extended.width,
        1,
        0,
        padding + rough.height,
        extended.width,
        padding,
      );
      const context = rough.getContext("2d")!;
      context.filter = "blur(24px)";
      context.drawImage(extended, -padding, -padding);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        rough,
      );
      gl.uniform1i(uniforms.frosted, 0);
      ready = true;
      schedule();
    };
    image.src =
      environment === "corridor"
        ? "/environments/office-loft.jpg"
        : "/environments/office-lounge.jpg";
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      delete root.dataset.optics;
      image.onload = null;
      changes.disconnect();
      appearance.disconnect();
      resize.disconnect();
      window.removeEventListener("resize", schedule);
      reduced.removeEventListener("change", schedule);
      node.removeEventListener("webglcontextlost", lost);
      node.removeEventListener("webglcontextrestored", restored);
      gl.deleteTexture(texture);
      for (const shader of shaders) gl.deleteShader(shader);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [environment, generation]);
  return (
    <canvas ref={canvas} className="environment-glass" aria-hidden="true" />
  );
}
