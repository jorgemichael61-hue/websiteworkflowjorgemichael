/* FLO Skincare — real-time tropical world.
   One continuous WebGL scene behind the whole page; the camera travels
   through it as you scroll (beach → over the water → under the surface →
   back up into golden hour → dusk). */
import * as THREE from '../vendor/three.module.min.js';

const canvas = document.getElementById('world');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SNAP = /[?&]snap/.test(location.search);   // test mode: no easing, used for screenshots
const MOB = innerWidth < 820 || matchMedia('(pointer: coarse)').matches;
const signal = n => { window['__' + n] = true; dispatchEvent(new Event('flo:' + n)); };

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !MOB, powerPreference: 'high-performance' });
  if (!renderer.getContext()) throw 0;
} catch (e) {
  document.documentElement.classList.add('no-webgl');
  dispatchEvent(new Event('flo:nowebgl'));
  signal('ready');
}
if (renderer) build();

function build() {
  let dpr = Math.min(devicePixelRatio, MOB ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);
  if ('transmissionResolutionScale' in renderer) renderer.transmissionResolutionScale = .5;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1200);

  const U = {
    uTime: { value: 0 },
    uSunDir: { value: new THREE.Vector3(0, .3, -1).normalize() },
    uWarm: { value: .35 },
    uTide: { value: 0 },
    uUnder: { value: 0 },
    uCam: { value: new THREE.Vector3() },
    uWM: { value: null }, uWMRect: { value: new THREE.Vector4() }, uWMz: { value: -95 }, uWMTint: { value: new THREE.Color(1,1,1) }, uWMA: { value: 1 }
  };

  /* ---------------- shared GLSL ---------------- */
  const COMMON = /* glsl */`
    uniform float uTime; uniform vec3 uSunDir; uniform float uWarm; uniform float uTide; uniform float uUnder; uniform vec3 uCam;
    uniform sampler2D uWM; uniform vec4 uWMRect; uniform float uWMz; uniform vec3 uWMTint; uniform float uWMA;
    float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float vnoise(vec2 p){ vec2 i=floor(p),f=fract(p); vec2 u=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y); }
    float fbm(vec2 p){ float s=0.,a=.5; for(int i=0;i<4;i++){ s+=a*vnoise(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return s; }
    float fbm2(vec2 p){ return .5*vnoise(p)+.25*vnoise(p*2.03+vec2(1.7,9.2))+.125*vnoise(p*4.1+vec2(3.1,1.2)); }
    vec3 sunCol(){ return mix(vec3(1.,.93,.80), vec3(1.,.55,.28), clamp(uWarm,0.,1.3)/1.3); }
    vec3 skyBase(vec3 d, bool clouds){
      float h=d.y;
      float w=clamp(uWarm,0.,1.4);
      vec3 zen=mix(vec3(.008,.15,.66), vec3(.04,.08,.26), smoothstep(.55,1.4,w));
      vec3 hor=mix(vec3(.36,.74,.90), vec3(1.,.48,.22), smoothstep(.5,1.,w));
      hor=mix(hor, vec3(.85,.32,.30), smoothstep(1.05,1.4,w));
      vec3 c=mix(hor, zen, pow(clamp(h,0.,1.),.55));
      if(h<0.) c=mix(hor, vec3(.03,.18,.25), clamp(-h*3.,0.,1.));
      float sd=max(dot(d,uSunDir),0.);
      c+=sunCol()*pow(sd,6.)*(.06+.55*w);
      c+=sunCol()*pow(sd,48.)*.9;
      c+=sunCol()*28.*smoothstep(.99955,.9998,sd);
      // clouds
      if(clouds && h>0.){
        vec2 cp=d.xz/(h+.07)*.9+vec2(uTime*.008,0.);
        float cl=smoothstep(.64,.94,fbm(cp*.55));
        vec3 cc=mix(vec3(1.,.97,.93), vec3(1.,.55,.42), smoothstep(.2,1.1,w))*(.55+1.1*pow(sd,3.));
        cc=mix(cc, cc*vec3(.75,.55,.7), smoothstep(1.1,1.4,w));
        c=mix(c, cc, cl*.45*smoothstep(0.,.12,h));
      }
      c=mix(c, hor*1.05, exp(-abs(h)*40.)*.3);
      return c;
    }
    vec3 skyCol(vec3 d){ return skyBase(d,true); }
    vec3 skyFlat(vec3 d){ return skyBase(d,false); }
    float sandH(vec2 p){
      float b=(p.y-6.)*.11 + .28*sin(p.x*.11) + .14*sin(p.x*.29+1.3);
      float fl=-6.5 + .7*sin(p.x*.06)*sin(p.y*.08);
      return max(b, fl);
    }
    void addW(inout float h, inout vec2 g, vec2 p, vec2 d, float a, float k, float w){
      float ph=dot(d,p)*k-uTime*w; h+=a*sin(ph); g+=a*k*cos(ph)*d;
    }
    vec3 bigWaves(vec2 p){ float h=0.; vec2 g=vec2(0.);
      addW(h,g,p,normalize(vec2(.15,1.)),.28,.12,.78);
      addW(h,g,p,normalize(vec2(-.5,1.)),.15,.23,1.06);
      addW(h,g,p,normalize(vec2(.7,.6)),.08,.41,1.45);
      return vec3(h,g); }
    vec3 fineWaves(vec2 p){ float h=0.; vec2 g=vec2(0.);
      addW(h,g,p,normalize(vec2(-.9,.35)),.045,.73,1.9);
      addW(h,g,p,normalize(vec2(.25,-1.)),.025,1.27,2.6);
      addW(h,g,p,normalize(vec2(.8,-.3)),.018,2.1,3.3);
      addW(h,g,p,normalize(vec2(-.3,-.8)),.01,3.4,4.1);
      return vec3(h,g); }
    float caustic(vec2 p,float t){
      vec2 q=p;
      for(int i=0;i<3;i++){ float fi=float(i);
        q+=vec2(sin(q.y*1.35+t*.9+fi*1.7),sin(q.x*1.2-t*.75+fi*2.3))*.55; }
      float l=min(abs(sin(q.x*1.6)),abs(sin(q.y*1.6)));
      return pow(1.-clamp(l,0.,1.),12.);
    }
    vec3 underFog(vec3 c, float dist){
      vec3 uw=vec3(.0,.36,.44);
      return mix(c, uw, 1.-exp(-dist*.055));
    }
  `;

  /* ---------------- sky ---------------- */
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(900, 48, 24),
    new THREE.ShaderMaterial({
      uniforms: U, side: THREE.BackSide, depthWrite: false,
      vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position=p.xyww; }',
      fragmentShader: COMMON + `varying vec3 vD; void main(){ vec3 sc=skyCol(normalize(vD)); sc=max(mix(vec3(dot(sc,vec3(.3,.59,.11))),sc,1.18),0.); gl_FragColor=vec4(sc,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
    })
  );
  sky.renderOrder = -10;
  scene.add(sky);

  /* ---------------- helper: dense-near grid ---------------- */
  function grid(nx, nz, xMax, xPow, z0, z1, zPow) {
    const g = new THREE.BufferGeometry();
    const pos = [], idx = [];
    for (let j = 0; j <= nz; j++) {
      const tz = Math.pow(j / nz, zPow);
      const z = z0 + (z1 - z0) * tz;
      for (let i = 0; i <= nx; i++) {
        const s = i / nx * 2 - 1;
        pos.push(Math.sign(s) * xMax * Math.pow(Math.abs(s), xPow), 0, z);
      }
    }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    return g;
  }

  /* ---------------- ocean ---------------- */
  const ocean = new THREE.Mesh(
    grid(MOB ? 140 : 220, MOB ? 140 : 220, 700, 2.2, 22, -700, 2.3),
    new THREE.ShaderMaterial({
      uniforms: U, side: THREE.DoubleSide,
      vertexShader: COMMON + `
        varying vec3 vW; varying float vDepth;
        void main(){
          vec3 p=position;
          float sh=sandH(p.xz);
          float depth=uTide-sh;
          float damp=smoothstep(-.3,3.,depth);
          vec3 w=bigWaves(p.xz);
          p.y=uTide + w.x*damp;
          vW=(modelMatrix*vec4(p,1.)).xyz; vDepth=depth;
          gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.);
        }`,
      fragmentShader: COMMON + `
        varying vec3 vW; varying float vDepth;
        void main(){
          vec2 xz=vW.xz;
          float sh=sandH(xz);
          float depth=vW.y-sh;
          float damp=smoothstep(-.3,3.,uTide-sh);
          vec3 a=bigWaves(xz), b=fineWaves(xz);
          float dist=length(uCam-vW);
          float fineFade=1.-smoothstep(30.,140.,dist);
          vec2 g=a.yz*damp + b.yz*fineFade*(.4+.6*damp);
          vec3 N=normalize(vec3(-g.x,1.,-g.y));
          vec3 V=normalize(uCam-vW);
          if(!gl_FrontFacing){
            // seen from below: Snell's window and total internal reflection
            float c=abs(dot(N,V));
            vec3 col=mix(vec3(.0,.42,.48), vec3(.55,1.,.95), smoothstep(.62,.82,c));
            col+=sunCol()*pow(max(dot(-V,uSunDir),0.),40.)*1.5;
            col+=caustic(xz*.5,uTime*.6)*.25;
            gl_FragColor=vec4(underFog(col,dist),1.);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
            return;
          }
          // refraction colour from depth over the sand
          vec3 sand=vec3(.78,.60,.38);
          vec3 crystal=vec3(.10,.86,.72);
          vec3 lagoon=vec3(.0,.55,.60);
          vec3 deep=vec3(.0,.16,.42);
          vec3 refr=mix(sand*vec3(.8,1.,.95), crystal, smoothstep(0.,.9,depth));
          refr=mix(refr, lagoon, smoothstep(.6,3.5,depth));
          refr=mix(refr, deep, smoothstep(6.,28.,depth)*.85);
          refr+=caustic(xz*.7,uTime*.6)*.35*(1.-smoothstep(.2,3.5,depth))*vec3(.8,1.,.95);
          refr*=.85+.35*max(dot(N,uSunDir),0.);
          vec3 R=reflect(-V,N); R.y=abs(R.y);
          vec3 refl=dist<160. ? skyCol(R) : skyFlat(R);
          // reflection of the horizon wordmark (ray / plane intersection)
          if(R.z<-.01 && uUnder<.5){
            float tt=(uWMz-vW.z)/R.z; vec3 hp=vW+R*tt;
            vec2 wuv=vec2((hp.x-uWMRect.x)/uWMRect.z,(hp.y-uWMRect.y)/uWMRect.w);
            if(wuv.x>0.&&wuv.x<1.&&wuv.y>0.&&wuv.y<1.){ vec4 tc=texture2D(uWM,wuv); refl=mix(refl,tc.rgb*uWMTint,tc.a*.85*uWMA); }
          }
          float fres=.02+.98*pow(1.-max(dot(N,V),0.),5.);
          fres*=(smoothstep(-.2,1.2,depth)*.9+.1)*.42;
          vec3 col=mix(refr, refl, fres);
          // sun glitter
          vec3 H=normalize(uSunDir+V);
          float sp=pow(max(dot(N,H),0.),600.)*6.+pow(max(dot(N,H),0.),90.)*.25;
          col+=sunCol()*sp;
          // shore foam
          float n=depth<.5 ? fbm2(xz*1.3+vec2(0.,uTime*.25)) : 0.;
          float foam=smoothstep(.22,.0,depth)*smoothstep(.35,.7,n+.25);
          foam+=smoothstep(.03,0.,abs(depth-.06-.04*sin(xz.x*.6+uTime)))*.6;
          col=mix(col, vec3(.95,.97,.95), clamp(foam,0.,1.)*.85);
          // horizon haze
          vec3 hz=skyFlat(normalize(vec3(-V.x,.012,-V.z)));
          col=mix(col, mix(hz, deep*1.6, .45), smoothstep(140.,620.,dist));
          col=max(mix(vec3(dot(col,vec3(.3,.59,.11))),col,1.22),0.);   // tropical saturation
          if(uUnder>.5) col=underFog(col,dist);
          gl_FragColor=vec4(col,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    })
  );
  ocean.frustumCulled = false;
  scene.add(ocean);

  /* ---------------- sand / sea floor ---------------- */
  const sand = new THREE.Mesh(
    grid(MOB ? 120 : 200, MOB ? 120 : 180, 260, 1.6, 60, -60, 1.0),
    new THREE.ShaderMaterial({
      uniforms: U,
      extensions: { derivatives: true },
      vertexShader: COMMON + `varying vec3 vW;
        void main(){ vec3 p=position; p.y=sandH(p.xz) + .05*(fbm2(p.xz*.4)-.5);
          vW=(modelMatrix*vec4(p,1.)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.); }`,
      fragmentShader: COMMON + `varying vec3 vW;
        void main(){
          vec3 N=normalize(cross(dFdx(vW),dFdy(vW))); if(N.y<0.) N=-N;
          float h=vW.y;
          vec3 dry=vec3(.86,.68,.46);
          float ripple=.5+.5*sin(vW.z*3.1+fbm2(vW.xz*.8)*4.);
          vec3 col=dry*(.9+.12*ripple);
          col*=.9+.2*hash(floor(vW.xz*55.));
          float wet=smoothstep(.16,-.02,h-uTide);
          col=mix(col, col*vec3(.55,.52,.5), wet);
          float dist=length(uCam-vW);
          float lit=max(dot(N,uSunDir),0.);
          col*= .55 + .95*lit*sunCol() + .3*vec3(.6,.8,.9);
          // sparkles on dry sand
          float sp=step(.9965,hash(floor(vW.xz*70.)+floor(uTime*2.)));
          col+=sp*(1.-wet)*sunCol()*1.6*(1.-smoothstep(4.,25.,dist));
          if(h<uTide){
            float c=caustic(vW.xz*.55,uTime*.55);
            col=mix(col*vec3(.5,.85,.9), col, .3)+c*vec3(.35,.7,.65)*smoothstep(-8.,-1.,h);
          }
          if(uUnder>.5) col=underFog(col,dist);
          else col=mix(col, skyFlat(normalize(vec3(-normalize(uCam-vW).x,.02,-normalize(uCam-vW).z))), smoothstep(80.,300.,dist));
          gl_FragColor=vec4(col,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    })
  );
  sand.frustumCulled = false;
  scene.add(sand);

  /* ---------------- environment for metals/glass ---------------- */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(new THREE.SphereGeometry(50, 48, 24), sky.material.clone());
  envSky.material.uniforms = U;
  envSky.material.depthWrite = true;
  envSky.material.vertexShader = 'varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }';
  envScene.add(envSky);
  let envRT = null, envWarm = -1;
  function updateEnv() {
    if (Math.abs(U.uWarm.value - envWarm) < .07) return;
    envWarm = U.uWarm.value;
    const rt = pmrem.fromScene(envScene, .02);
    scene.environment = rt.texture;
    if (envRT) envRT.dispose();
    envRT = rt;
  }

  /* ---------------- lights ---------------- */
  const sun = new THREE.DirectionalLight('#fff1d6', 2.4);
  const hemi = new THREE.HemisphereLight('#cfeff7', '#b88a55', .55);
  scene.add(sun, hemi);

  /* ---------------- palms ---------------- */
  function frondTexture() {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
    const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 1024, 0);
    grd.addColorStop(0, '#2c5a2a'); grd.addColorStop(.6, '#4f8a35'); grd.addColorStop(1, '#8aa64a');
    g.strokeStyle = grd; g.fillStyle = grd; g.lineCap = 'round';
    g.lineWidth = 9; g.beginPath(); g.moveTo(0, 128); g.lineTo(1010, 128); g.stroke();
    for (let i = 0; i < 46; i++) {
      const x = 20 + i * 21.5, len = 118 * Math.sin(Math.PI * Math.min(1, (i + 4) / 50)) + 6;
      for (const s of [-1, 1]) {
        g.lineWidth = 7 - i * .1;
        g.beginPath(); g.moveTo(x, 128);
        g.quadraticCurveTo(x + 22, 128 + s * len * .5, x + 44 + Math.random() * 10, 128 + s * len);
        g.stroke();
      }
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  }
  function barkTexture() {
    const c = document.createElement('canvas'); c.width = 64; c.height = 256;
    const g = c.getContext('2d'); g.fillStyle = '#7b6a55'; g.fillRect(0, 0, 64, 256);
    for (let y = 0; y < 256; y += 12) { g.fillStyle = 'rgba(40,30,20,.45)'; g.fillRect(0, y, 64, 3); g.fillStyle = 'rgba(200,180,150,.25)'; g.fillRect(0, y + 4, 64, 2); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 9); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const frondMat = new THREE.MeshStandardMaterial({ map: frondTexture(), alphaTest: .45, side: THREE.DoubleSide, roughness: .7, metalness: 0 });
  frondMat.map.premultiplyAlpha = false;
  const barkMat = new THREE.MeshStandardMaterial({ map: barkTexture(), roughness: .95 });
  function frondGeo(len) {
    const g = new THREE.PlaneGeometry(len, len * .26, 24, 2);
    g.translate(len / 2, 0, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), t = x / len;
      p.setXYZ(i, x, -t * t * len * .55 + Math.abs(y) * .35, y * (1 - t * .3));
    }
    g.rotateX(Math.PI / 2 * .15);
    g.computeVertexNormals();
    return g;
  }
  const palms = [];
  function palm(x, z, height, lean, rotY) {
    const base = new THREE.Vector3(x, 0, z);
    const pts = [];
    for (let i = 0; i <= 5; i++) {
      const t = i / 5;
      pts.push(new THREE.Vector3(Math.sin(rotY) * lean * t * t * height, t * height, Math.cos(rotY) * lean * t * t * height));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tub = new THREE.TubeGeometry(curve, 40, .26, 10);
    const pa = tub.attributes.position;
    for (let i = 0; i <= 40; i++) {
      const c = curve.getPointAt(i / 40), s = 1 - .42 * (i / 40) + (i === 0 ? .25 : 0);
      for (let r = 0; r <= 10; r++) {
        const k = i * 11 + r;
        pa.setXYZ(k, c.x + (pa.getX(k) - c.x) * s, pa.getY(k), c.z + (pa.getZ(k) - c.z) * s);
      }
    }
    tub.computeVertexNormals();
    const group = new THREE.Group();
    group.add(new THREE.Mesh(tub, barkMat));
    const crown = new THREE.Group();
    crown.position.copy(curve.getPointAt(1));
    const n = MOB ? 9 : 13;
    for (let i = 0; i < n; i++) {
      const f = new THREE.Mesh(frondGeo(3.2 + Math.random() * 1.4), frondMat);
      const holder = new THREE.Group();
      holder.rotation.y = i / n * Math.PI * 2 + Math.random() * .3;
      f.rotation.z = .35 + Math.random() * .45;
      holder.add(f); crown.add(holder);
      holder.userData = { f, base: f.rotation.z, ph: Math.random() * 6 };
    }
    group.add(crown);
    group.position.set(x, -.3, z);
    group.userData = { crown, ph: Math.random() * 6 };
    scene.add(group); palms.push(group);
  }
  palm(-9.5, 12, 9.5, .45, .9);
  palm(-12.5, 16, 8.2, .3, .3);
  palm(11.5, 15, 10.5, .5, -1.1);
  if (!MOB) { palm(-26, 9, 9, .5, .5); palm(24, 10, 8.5, .4, -.6); palm(-6, 26, 11, .35, 1.6); }

  /* ---------------- sculptures ---------------- */
  const glass = MOB
    ? new THREE.MeshPhysicalMaterial({ color: '#bff7f0', roughness: .05, metalness: 0, transparent: true, opacity: .45, clearcoat: 1, envMapIntensity: 1.6 })
    : new THREE.MeshPhysicalMaterial({ color: '#d6fff8', roughness: .04, metalness: 0, transmission: 1, thickness: 1.4, ior: 1.33, clearcoat: 1, attenuationColor: new THREE.Color('#38d6cf'), attenuationDistance: 2.2, envMapIntensity: 1.4 });
  const gold = new THREE.MeshStandardMaterial({ color: '#f1b75a', metalness: 1, roughness: .22, envMapIntensity: 1.3 });
  const pearl = new THREE.MeshPhysicalMaterial({ color: '#fff3ea', roughness: .18, metalness: .1, iridescence: 1, iridescenceIOR: 1.6, clearcoat: 1, sheen: 1, sheenColor: new THREE.Color('#ffd0c0') });
  const coralShell = new THREE.MeshPhysicalMaterial({ color: '#ff9d7e', roughness: .35, metalness: 0, sheen: 1, sheenColor: new THREE.Color('#ffe2c8'), clearcoat: .6, iridescence: .4 });

  function dropletGeo() {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40, a = t * Math.PI;
      const r = Math.sin(a) * (1 - .55 * Math.pow(1 - t, 2)) * (t < .02 ? 0 : 1);
      pts.push(new THREE.Vector2(Math.max(r * .95, 0.0001), -Math.cos(a) * 1.25 + Math.pow(1 - t, 3) * .9));
    }
    return new THREE.LatheGeometry(pts, 64);
  }
  function ribbonGeo(len, width, turns, amp) {
    const nu = 160, nv = 8, pos = [], idx = [];
    for (let i = 0; i <= nu; i++) {
      const u = i / nu, th = u * Math.PI * 2 * turns;
      const cx = (u - .5) * len, cy = Math.sin(u * Math.PI * 2) * amp, cz = Math.cos(u * Math.PI * 1.5) * amp * 1.2;
      for (let j = 0; j <= nv; j++) {
        const v = (j / nv - .5) * width * (Math.sin(u * Math.PI) * .8 + .2);
        pos.push(cx, cy + Math.cos(th) * v, cz + Math.sin(th) * v);
      }
    }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const a = i * (nv + 1) + j, b = a + 1, c = a + nv + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  function shellGeo() {
    const pts = [];
    for (let i = 0; i <= 50; i++) { const t = i / 50; pts.push(new THREE.Vector2(Math.max(.0001, Math.sin(t * Math.PI * .92) * (1 - t * .6) * 1.1), t * 2.2 - 1.1)); }
    const g = new THREE.LatheGeometry(pts, 96);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 + .09 * Math.pow(Math.abs(Math.sin(a * 9)), .6);
      p.setXYZ(i, x * k, p.getY(i), z * k * .8);
    }
    g.computeVertexNormals();
    return g;
  }


  /* the FLO tin — modelled, wearing the real Tinted Tallow Sun Balm label */
  const labelTex = new THREE.TextureLoader().load('assets/img/label-tinted-sun-balm.jpg', t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; signal('label'); });
  const alu = new THREE.MeshStandardMaterial({ color: '#dde1e6', metalness: 1, roughness: .24, envMapIntensity: 1.2 });
  const aluDark = new THREE.MeshStandardMaterial({ color: '#b9bec4', metalness: 1, roughness: .34 });
  const labelMat = new THREE.MeshStandardMaterial({ map: labelTex, roughness: .5, metalness: 0 });
  function makeTin() {
    const g = new THREE.Group(), R = 1, BH = .46, LH = .2;
    const prof = [[0,0],[R-.06,0],[R-.015,.02],[R,.06],[R,BH-.05],[R-.03,BH-.03],[R-.03,BH]].map(([x,y]) => new THREE.Vector2(x,y));
    g.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 96), alu));
    const lp = [[R+.02,BH-.04],[R+.035,BH-.02],[R+.035,BH+LH-.045],[R+.015,BH+LH-.01],[R-.03,BH+LH],[R-.06,BH+LH-.005]].map(([x,y]) => new THREE.Vector2(x,y));
    g.add(new THREE.Mesh(new THREE.LatheGeometry(lp, 96), alu));
    for (let i = 0; i < 5; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(R+.036,.0045,6,96), aluDark); r.rotation.x = Math.PI/2; r.position.y = BH+.01+i*.025; g.add(r); }
    const lab = new THREE.Mesh(new THREE.CircleGeometry(R-.05, 96), labelMat); lab.rotation.x = -Math.PI/2; lab.position.y = BH+LH-.004; g.add(lab);
    g.children.forEach(m => m.position.y -= (BH+LH)/2);
    return g;
  }

  const clusterA = new THREE.Group();
  const drop = new THREE.Mesh(dropletGeo(), glass); drop.scale.setScalar(.7); drop.position.set(-2.4, 1.3, -.6);
  const tinA = makeTin(); tinA.scale.setScalar(1.55);
  const tinPivot = new THREE.Group(); tinPivot.add(tinA); tinPivot.rotation.set(1.05, 0, -.18);
  const ribbonA = new THREE.Mesh(ribbonGeo(6.5, .7, 1.5, .7), gold); ribbonA.material.side = THREE.DoubleSide; ribbonA.position.set(-.3, -.2, 0); ribbonA.rotation.set(.3, .4, .2);
  const shell = new THREE.Mesh(shellGeo(), coralShell); shell.position.set(2.6, -.9, 1.4); shell.scale.setScalar(.75); shell.rotation.set(.9, 0, -.8);
  const pearls = [];
  for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(.22 + i * .05, 32, 16), pearl); s.userData.ph = i * 1.7; pearls.push(s); clusterA.add(s); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, .04, 16, 120), gold); ring.rotation.x = 1.45; ring.position.y = -.7;
  clusterA.add(tinPivot, drop, ribbonA, shell, ring);
  const clBase = new THREE.Vector3(7.2, 2.7, -4);
  clusterA.position.copy(clBase);
  scene.add(clusterA);

  const clusterB = new THREE.Group();
  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(2.1, .55, MOB ? 120 : 220, 32, 2, 3), glass);
  const ribbonB = new THREE.Mesh(ribbonGeo(12, 1.1, 2.5, 1.4), gold); ribbonB.position.set(0, -.6, -1); ribbonB.rotation.set(.2, .3, .1);
  const bubbles = [];
  for (let i = 0; i < (MOB ? 14 : 28); i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(.08 + Math.random() * .22, 20, 12), MOB ? glass : pearl);
    b.position.set((Math.random() - .5) * 12, (Math.random() - .5) * 6, (Math.random() - .5) * 8);
    b.userData = { y: b.position.y, sp: .3 + Math.random() * .6 };
    bubbles.push(b); clusterB.add(b);
  }
  const tinB = makeTin(); tinB.scale.setScalar(1.2); tinB.position.set(3.6, 1.2, 2.5); tinB.rotation.set(1.2, 0, .3);
  clusterB.add(knot, ribbonB, tinB);
  clusterB.position.set(0, -4.2, -26);
  scene.add(clusterB);

  // light shafts under water
  const shaftTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(200,255,245,.55)'); gr.addColorStop(1, 'rgba(200,255,245,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
    const gx = g.createLinearGradient(0, 0, 64, 0); gx.addColorStop(0, 'rgba(0,0,0,1)'); gx.addColorStop(.5, 'rgba(0,0,0,0)'); gx.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = gx; g.fillRect(0, 0, 64, 256);
    return new THREE.CanvasTexture(c); })();
  const shafts = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4 + Math.random() * 2, 16), new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .35, side: THREE.DoubleSide }));
    m.position.set((Math.random() - .5) * 26, -7, -18 - Math.random() * 18); m.rotation.z = -.25 + Math.random() * .1; m.rotation.y = Math.random();
    m.userData.ph = Math.random() * 6; shafts.add(m);
  }
  scene.add(shafts);

  /* ---------------- the wordmark on the horizon ---------------- */
  const wmCanvas = document.createElement('canvas'); wmCanvas.width = 2048; wmCanvas.height = 420;
  const wmTex = new THREE.CanvasTexture(wmCanvas); wmTex.colorSpace = THREE.SRGBColorSpace; wmTex.anisotropy = 8;
  function drawWordmark() {
    const g = wmCanvas.getContext('2d');
    g.clearRect(0, 0, 2048, 420);
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    const gr = g.createLinearGradient(0, 20, 0, 330);
    gr.addColorStop(0, '#FFB259'); gr.addColorStop(1, '#E8821E');
    g.fillStyle = gr;
    g.font = '700 300px "Bodoni Moda", Didot, "Bodoni 72", Georgia, serif';
    if ('letterSpacing' in g) g.letterSpacing = '6px';
    g.fillText('FLO', 1024, 300);
    g.fillStyle = '#FFF4E4';
    g.font = '500 44px "Instrument Sans", Arial, sans-serif';
    if ('letterSpacing' in g) g.letterSpacing = '28px';
    g.fillText('SKINCARE CO.', 1024, 392);
    wmTex.needsUpdate = true;
  }
  drawWordmark();
  if (document.fonts) Promise.all([document.fonts.load('700 100px "Bodoni Moda"'), document.fonts.load('500 20px "Instrument Sans"')]).then(drawWordmark).catch(() => {});
  const wmMat = new THREE.MeshBasicMaterial({ map: wmTex, transparent: true, depthWrite: false, toneMapped: false, color: new THREE.Color(1, 1, 1) });
  const WM_W = 58, WM_H = WM_W * 420 / 2048;
  const wordmark = new THREE.Mesh(new THREE.PlaneGeometry(WM_W, WM_H), wmMat);
  wordmark.position.set(0, WM_H * .5 - 1.6, -95);
  scene.add(wordmark);
  U.uWM.value = wmTex;
  U.uWMRect.value.set(-WM_W / 2, -1.6, WM_W, WM_H);


  /* ---------------- camera journey ---------------- */
  // one state per [data-scene] section
  const STATES = [
    { pos: [0, 2.6, 14], look: [1.5, .6, -40], warm: .18, fov: 44, wm: 1, cl: 1 },     // hero beach
    { pos: [-4, 4.6, 0], look: [6, 1.4, -40], warm: .24, fov: 46, wm: 1, cl: 1 },       // experience — gliding over water
    { pos: [0, -3.4, -12], look: [0, -3.8, -34], warm: .3, fov: 52, wm: 0, cl: 1 },   // ingredients — under the surface
    { pos: [12, 5, 16], look: [-8, 1.5, -30], warm: .4, fov: 44, wm: 1, cl: 1 },       // shop panel
    { pos: [-1.5, 3.2, 24], look: [-14, 7.5, -60], warm: 1.05, fov: 52, wm: 0, cl: 0 },  // atmosphere — golden hour
    { pos: [0, 8, 30], look: [0, 4.5, -80], warm: 1.38, fov: 40, wm: 0, cl: 0 }        // final — dusk
  ];
  const INTRO = { pos: [0, 30, 70], look: [0, 0, -60], warm: .18, fov: 44, wm: 1, cl: 1 };
  const sections = [...document.querySelectorAll('[data-scene]')];
  let anchors = [];
  function measure() {
    anchors = sections.map((s, i) => i === 0 ? 0 : s.dataset.anchor === 'start' ? s.getBoundingClientRect().top + scrollY + innerHeight * .2 : s.getBoundingClientRect().top + scrollY + s.offsetHeight / 2 - innerHeight / 2);
  }
  const mixS = (a, b, t) => ({
    pos: a.pos.map((v, i) => v + (b.pos[i] - v) * t),
    look: a.look.map((v, i) => v + (b.look[i] - v) * t),
    warm: a.warm + (b.warm - a.warm) * t,
    fov: a.fov + (b.fov - a.fov) * t,
    wm: a.wm + (b.wm - a.wm) * t,
    cl: a.cl + (b.cl - a.cl) * t
  });
  const sstep = t => t * t * (3 - 2 * t);
  function stateAt(y) {
    if (!anchors.length) return STATES[0];
    if (y <= anchors[0]) return STATES[0];
    for (let i = 0; i < anchors.length - 1; i++) {
      if (y < anchors[i + 1]) return mixS(STATES[i], STATES[i + 1], sstep((y - anchors[i]) / (anchors[i + 1] - anchors[i])));
    }
    return STATES[STATES.length - 1];
  }

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    // portrait screens: lift the tin into the upper frame, centred
    if (camera.aspect < .9) clBase.set(1.2, 5.6, -3); else clBase.set(7.2, 2.7, -4);
    measure();
  }
  resize();
  addEventListener('resize', resize);
  addEventListener('load', measure);
  addEventListener('flo:measure', measure);
  setTimeout(measure, 1500);

  let mx = 0, my = 0, tmx = 0, tmy = 0;
  if (!MOB) addEventListener('pointermove', e => { tmx = e.clientX / innerWidth - .5; tmy = e.clientY / innerHeight - .5; }, { passive: true });

  let introT = reduce ? 1 : 0, introRun = reduce;
  const goIntro = () => { introRun = true; };
  if (window.__floIntro) goIntro(); else addEventListener('flo:intro', goIntro);

  const cur = { pos: new THREE.Vector3(...INTRO.pos), look: new THREE.Vector3(...INTRO.look), warm: INTRO.warm, fov: INTRO.fov, wm: 1, cl: 1 };
  if (reduce) { const s = STATES[0]; cur.pos.set(...s.pos); cur.look.set(...s.look); }
  let lastY = scrollY, vel = 0, spin = 0, t = 0;
  const clock = new THREE.Clock();
  const tmpLook = new THREE.Vector3();
  let running = true;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) clock.getDelta(); });

  function frame() {
    requestAnimationFrame(frame);
    if (!running) return;
    const dt = Math.min(clock.getDelta(), .05);
    t += dt * (reduce ? .25 : 1);
    if (introRun && introT < 1) introT = SNAP ? 1 : Math.min(1, introT + dt / 3.4);
    const ie = 1 - Math.pow(1 - introT, 3);

    const y = scrollY;
    vel += ((y - lastY) / Math.max(dt, .001) - vel) * .1; lastY = y;

    const target = mixS(INTRO, stateAt(y), ie);
    const k = SNAP ? 1 : 1 - Math.pow(.0015, dt);       // frame-rate independent smoothing
    mx += (tmx - mx) * k * .6; my += (tmy - my) * k * .6;
    cur.pos.lerp(new THREE.Vector3(target.pos[0] + mx * 1.4, target.pos[1] - my * .7, target.pos[2]), k);
    cur.look.lerp(tmpLook.set(target.look[0] + mx * 3, target.look[1] - my * 2, target.look[2]), k);
    cur.warm += (target.warm - cur.warm) * k;
    cur.fov += (target.fov - cur.fov) * k;
    cur.wm += (target.wm - cur.wm) * k * .6;
    cur.cl += (target.cl - cur.cl) * k * .6;

    camera.position.copy(cur.pos);
    camera.lookAt(cur.look);
    if (Math.abs(camera.fov - cur.fov) > .01) { camera.fov = cur.fov; camera.updateProjectionMatrix(); }

    // sun & time of day
    const w = cur.warm;
    const elev = .6 - .57 * Math.min(w / 1.3, 1), az = -.18;
    U.uSunDir.value.set(Math.sin(az) * Math.cos(elev), Math.sin(elev), -Math.cos(az) * Math.cos(elev)).normalize();
    U.uWarm.value = w;
    U.uTime.value = t;
    U.uTide.value = .07 * Math.sin(t * .33) + .03 * Math.sin(t * .81 + 1.);
    U.uCam.value.copy(camera.position);
    const under = camera.position.y < U.uTide.value - .05;
    U.uUnder.value = under ? 1 : 0;
    sky.visible = !under;
    renderer.setClearColor(under ? 0x03383F : 0x000000); wordmark.visible = !under && cur.wm > .01;
    wmMat.opacity = cur.wm; U.uWMA.value = cur.wm;
    clusterA.visible = cur.cl > .05; clusterA.scale.setScalar(.4 + .6 * cur.cl);
    shafts.visible = under || camera.position.y < 1.5;
    document.documentElement.classList.toggle('is-under', under);

    sun.position.copy(U.uSunDir.value).multiplyScalar(50);
    sun.color.setRGB(1, .95 - .35 * Math.min(w, 1.2), .84 - .5 * Math.min(w, 1.2));
    sun.intensity = 2.6 - Math.max(0, w - .9) * 2.4;
    hemi.intensity = .55 - Math.max(0, w - 1) * .6;
    wmMat.color.setRGB(1, 1 - Math.max(0, w - .6) * .25, 1 - Math.max(0, w - .6) * .45);
    U.uWMTint.value.copy(wmMat.color);
    updateEnv();

    // life
    spin += (Math.min(Math.abs(vel), 4000) * .00004 - spin) * .05;
    const r = dt * (.25 + spin * 6);
    drop.rotation.y += r; tinA.rotation.y = Math.sin(t * .45) * .35; tinPivot.rotation.x = 1.05 + Math.sin(t * .7) * .06 - my * .25; tinB.rotation.y += r * .5; ribbonA.rotation.y += r * .6; ribbonA.rotation.z = .2 + Math.sin(t * .5) * .15;
    ring.rotation.z += r * .4; ring.rotation.x = 1.45 + Math.sin(t * .4) * .08;
    shell.rotation.y = Math.sin(t * .6) * .3;
    pearls.forEach((p, i) => { const a = t * .5 + p.userData.ph; p.position.set(Math.cos(a) * 2.9, -.6 + Math.sin(a * 1.3) * .5, Math.sin(a) * 2.9); });
    clusterA.position.set(clBase.x, clBase.y + Math.sin(t * .8) * .18, clBase.z);
    clusterA.rotation.y = mx * .4; clusterA.rotation.x = my * .2;
    knot.rotation.x += r * .5; knot.rotation.y += r * .7;
    ribbonB.rotation.y += r * .3;
    bubbles.forEach(b => { b.position.y += dt * b.userData.sp; if (b.position.y > 4) b.position.y = -4; });
    shafts.children.forEach(s => { s.material.opacity = .22 + .14 * Math.sin(t * .7 + s.userData.ph); });
    palms.forEach(p => {
      const c = p.userData.crown;
      c.rotation.z = Math.sin(t * .7 + p.userData.ph) * .04;
      c.rotation.x = Math.sin(t * .55 + p.userData.ph) * .03;
      c.children.forEach(h => { h.userData.f.rotation.z = h.userData.base + Math.sin(t * 1.4 + h.userData.ph) * .06; });
    });

    renderer.render(scene, camera);

    // adaptive resolution: keep motion smooth on modest GPUs
    perfN++; perfT += dt;
    if (perfT > 2) {
      const fps = perfN / perfT; perfN = 0; perfT = 0;
      if (fps < 42 && dpr > .6) { dpr = Math.max(.6, dpr - .25); renderer.setPixelRatio(dpr); renderer.setSize(innerWidth, innerHeight, false); }
      else if (fps > 58 && dpr < Math.min(devicePixelRatio, MOB ? 1.25 : 1.5) - .01) { dpr = Math.min(dpr + .1, Math.min(devicePixelRatio, MOB ? 1.25 : 1.5)); renderer.setPixelRatio(dpr); renderer.setSize(innerWidth, innerHeight, false); }
    }
  }
  let perfN = 0, perfT = 0;
  frame();
  signal('ready');
}
