/* FLO hero — real-time WebGL scene.
   A procedurally animated pool surface with caustics, and a modelled
   aluminium FLO tin whose lid carries the real Tinted Tallow Sun Balm label
   (cropped from the supplied product photography). */
import * as THREE from '../vendor/three.module.min.js';

const canvas = document.getElementById('hero-canvas');
const hero = document.querySelector('.hero');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ready = () => { window.__floReady = true; window.dispatchEvent(new Event('flo:ready')); };

function fail(err) {
  console.warn('[FLO] WebGL unavailable, using video fallback.', err || '');
  window.dispatchEvent(new Event('flo:nowebgl'));
  ready();
}

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  if (!renderer.getContext()) throw new Error('no context');
} catch (e) { fail(e); }

if (renderer) init();

function init() {
  const mobile = () => innerWidth < 900;
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile() ? 1.25 : 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#8fd3d6');
  scene.fog = new THREE.Fog('#8fd3d6', 18, 42);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 120);

  /* ---------- environment for the metal (sky gradient + sun) ---------- */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(
    new THREE.SphereGeometry(10, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {},
      vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `varying vec3 vP;
        void main(){
          float h=vP.y;
          vec3 top=vec3(1.0,0.98,0.94), hor=vec3(0.78,0.93,0.93), bot=vec3(0.05,0.45,0.5);
          vec3 c = h>0. ? mix(hor,top,pow(h,0.6)) : mix(hor,bot,pow(-h,0.5));
          float sun=pow(max(dot(vP,normalize(vec3(-0.5,0.75,0.4))),0.),180.);
          gl_FragColor=vec4(c+sun*vec3(6.,5.4,4.5),1.);
        }`
    })
  ));
  // a few soft "palm shadow" bands in the reflection for realism
  const bandMat = new THREE.MeshBasicMaterial({ color: '#1f5a3a', side: THREE.DoubleSide });
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(9, .6), bandMat);
    b.position.set(0, 3 + i * 1.6, -7); b.rotation.z = -0.4 + i * .25;
    envScene.add(b);
  }
  scene.environment = pmrem.fromScene(envScene, 0.035).texture;

  /* ---------- lights ---------- */
  const sun = new THREE.DirectionalLight('#fff3df', 2.6);
  sun.position.set(-5, 9, 4);
  scene.add(sun, new THREE.HemisphereLight('#f6fbff', '#0f6e78', 0.7));

  /* ---------- water ---------- */
  const waterU = {
    uTime: { value: 0 },
    uSun: { value: new THREE.Vector3(-0.5, 0.75, 0.4).normalize() },
    uCam: { value: new THREE.Vector3() },
    uFogC: { value: new THREE.Color('#8fd3d6') }
  };
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90, mobile() ? 120 : 220, mobile() ? 120 : 220),
    new THREE.ShaderMaterial({
      uniforms: waterU,
      vertexShader: `
        uniform float uTime; varying vec3 vW; varying vec3 vN;
        float h(vec2 p){
          float t=uTime;
          return .055*sin(p.x*1.3+t*1.1)+.045*sin(p.y*1.7-t*.9)
               +.03*sin((p.x+p.y)*2.6+t*1.7)+.018*sin((p.x-p.y)*4.3-t*2.1);
        }
        void main(){
          vec3 p=position; vec2 q=vec2(p.x,-p.y);
          float e=.05;
          float y=h(q);
          vec3 n=normalize(vec3(-(h(q+vec2(e,0.))-y)/e,1.,-(h(q+vec2(0.,e))-y)/e));
          vec4 w=modelMatrix*vec4(p.x,p.y,y,1.);
          vW=w.xyz; vN=n;
          gl_Position=projectionMatrix*viewMatrix*w;
        }`,
      fragmentShader: `
        uniform float uTime; uniform vec3 uSun; uniform vec3 uCam; uniform vec3 uFogC;
        varying vec3 vW; varying vec3 vN;
        // caustic web: domain-warped grid lines, sharpened
        float caustic(vec2 p,float t){
          vec2 q=p;
          for(int i=0;i<3;i++){
            float fi=float(i);
            q+=vec2(sin(q.y*1.35+t*.9+fi*1.7),sin(q.x*1.2-t*.75+fi*2.3))*.55;
          }
          float l=min(abs(sin(q.x*1.6)),abs(sin(q.y*1.6)));
          return pow(1.-clamp(l,0.,1.),14.);
        }
        void main(){
          vec3 N=normalize(vN);
          vec3 V=normalize(uCam-vW);
          float fres=pow(1.-max(dot(N,V),0.),4.);
          vec2 uv=vW.xz*.42;
          float c=caustic(uv*1.9,uTime*.55);
          float c2=caustic(uv*1.1+vec2(4.,7.),uTime*.4+2.);
          // colours authored in linear space (sRGB #075560 -> #22B5BD)
          vec3 deep=vec3(.002,.09,.115), shallow=vec3(.016,.46,.51);
          float band=smoothstep(-7.,5.,vW.x*.7+vW.z*.35);
          vec3 col=mix(deep,shallow,.35+.65*band);
          col+=(c*.55+c2*.3)*vec3(.55,.85,.82)*(.5+.5*band);
          // sun glints
          vec3 R=reflect(-uSun,N);
          float spec=pow(max(dot(R,V),0.),220.);
          col+=spec*vec3(1.6,1.5,1.3);
          col=mix(col,vec3(.35,.68,.7),fres*.6);
          float d=length(uCam-vW);
          float f=smoothstep(16.,40.,d);
          gl_FragColor=vec4(mix(col,uFogC,f),1.);
          #include <colorspace_fragment>
        }`
    })
  );
  water.rotation.x = -Math.PI / 2;
  scene.add(water);

  /* ---------- the tin ---------- */
  const tin = new THREE.Group();
  const R = 1, BODY_H = .46, LID_H = .2;
  const alu = new THREE.MeshStandardMaterial({ color: '#d9dde2', metalness: 1, roughness: .26 });
  const aluDark = new THREE.MeshStandardMaterial({ color: '#b9bec4', metalness: 1, roughness: .34 });

  // body: lathe profile gives a rolled bottom edge and a screw-thread neck
  const prof = [
    [0, 0], [R - .06, 0], [R - .015, .02], [R, .06], [R, BODY_H - .05], [R - .03, BODY_H - .03], [R - .03, BODY_H]
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 128), alu);
  tin.add(body);

  // lid: a lathe profile for the side + rim, then the label disc
  const lidProf = [
    [R + .02, BODY_H - .04], [R + .035, BODY_H - .02], [R + .035, BODY_H + LID_H - .045],
    [R + .015, BODY_H + LID_H - .01], [R - .03, BODY_H + LID_H], [R - .06, BODY_H + LID_H - .005]
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const lid = new THREE.Mesh(new THREE.LatheGeometry(lidProf, 128), alu);
  tin.add(lid);
  // fine ridges on the lid wall
  for (let i = 0; i < 6; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R + .036, .0045, 6, 128), aluDark);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = BODY_H + .005 + i * .022;
    tin.add(ring);
  }

  const labelMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .55, metalness: 0 });
  const label = new THREE.Mesh(new THREE.CircleGeometry(R - .05, 128), labelMat);
  label.rotation.x = -Math.PI / 2;
  label.position.y = BODY_H + LID_H - .004;
  tin.add(label);

  // contact shadow on the water
  const sh = document.createElement('canvas'); sh.width = sh.height = 256;
  const g = sh.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 20, 128, 128, 128);
  grd.addColorStop(0, 'rgba(2,40,45,.75)'); grd.addColorStop(.55, 'rgba(2,40,45,.32)'); grd.addColorStop(1, 'rgba(2,40,45,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sh), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = .04;
  scene.add(shadow);

  const pivot = new THREE.Group();
  tin.position.y = -BODY_H * .5;
  pivot.add(tin);
  scene.add(pivot);

  /* ---------- layout ---------- */
  const layout = { x: 0, z: 0, s: 1 };
  function resize() {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (mobile()) {
      camera.fov = 40;
      // portrait: float the tin in the upper part of the frame, above the headline
      layout.x = .15; layout.z = -4.2 - Math.max(0, (1 / camera.aspect - 1.6)) * 1.5; layout.s = 1.2;
    } else {
      camera.fov = 30;
      layout.x = Math.min(2.6, 1.15 * camera.aspect); layout.z = 0; layout.s = 1.15;
    }
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize);

  /* ---------- interaction state ---------- */
  let mx = 0, my = 0, tmx = 0, tmy = 0;
  addEventListener('pointermove', e => { tmx = e.clientX / innerWidth - .5; tmy = e.clientY / innerHeight - .5; }, { passive: true });

  let emerge = reduce ? 1 : 0, emergeTarget = reduce ? 1 : 0;
  const startEmerge = () => { emergeTarget = 1; };
  if (window.__floIntro) startEmerge(); else addEventListener('flo:intro', startEmerge);

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hero);

  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => 1 - Math.pow(1 - t, 4);
  const clock = new THREE.Clock();
  let t = 0, emergeT = 0;

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), .05);
    if (!reduce) t += dt;

    // emerge timeline (0 → 1 over ~2.2s after the intro)
    if (emergeTarget === 1 && emergeT < 1) emergeT = Math.min(1, emergeT + dt / 2.2);
    emerge = reduce ? 1 : ease(emergeT);

    // scroll progress through the hero
    const r = hero.getBoundingClientRect();
    const sp = Math.min(Math.max(-r.top / r.height, 0), 1);

    mx = lerp(mx, tmx, .05); my = lerp(my, tmy, .05);

    // camera: high three-quarter view, sinking towards the water as you scroll
    camera.position.set(mx * .6, lerp(8.2, 4.2, sp) - my * .3, lerp(9.4, 7.2, sp));
    camera.lookAt(0, lerp(0, 1.1, sp), lerp(-.6, 0, sp));
    waterU.uCam.value.copy(camera.position);

    // tin: rises out of the water, bobs, then lifts towards the viewer on scroll
    const bob = Math.sin(t * 1.3) * .06;
    const rise = lerp(-1.1, .14, emerge);
    pivot.position.set(layout.x, rise + bob + sp * 1.6, layout.z + sp * 1.4);
    pivot.scale.setScalar(layout.s * (1 + sp * .12));
    pivot.rotation.x = .38 + Math.sin(t * .9) * .03 + sp * .55 - my * .12;
    pivot.rotation.z = -.12 + Math.sin(t * .7) * .035 + mx * .1;
    pivot.rotation.y = (1 - emerge) * -1.4 + Math.sin(t * .35) * .22 + mx * .3;

    // shadow follows, fading as it lifts
    shadow.position.x = layout.x + .25; shadow.position.z = layout.z + .2;
    const lift = Math.max(0, pivot.position.y);
    shadow.scale.setScalar(1 + lift * .35);
    shadow.material.opacity = Math.min(1, emerge * 1.4) * (1 - Math.min(lift / 2.4, .75));

    waterU.uTime.value = t;
    renderer.render(scene, camera);
  }

  /* ---------- load the real label, then start ---------- */
  new THREE.TextureLoader().load('assets/img/label-tinted-sun-balm.jpg', tex => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.center.set(.5, .5);
    labelMat.map = tex; labelMat.needsUpdate = true;
    frame();
    ready();
  }, undefined, () => { frame(); ready(); });
}
