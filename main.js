import * as THREE from 'three';
import { GLTFLoader } from './addons/loaders/GLTFLoader.js';
import { RGBELoader } from './addons/loaders/RGBELoader.js';
import { Reflector } from './addons/objects/Reflector.js';
import { selectQuality, renderRatio } from './quality.js';
import { batchStatic } from './batch-static.js';
import { createMonitor } from './perf-monitor.js';

const $=selector=>document.querySelector(selector);
const hero=$('#experience'),canvas=$('#world');
const quality=selectQuality(),monitor=createMonitor(quality);
let viewWidth=1,viewHeight=1,resolutionScale=1;
let rafId=0,lastFrame=0,lastSimulation=0,dirty=true,scrollUntil=0;
let reflectionDirty=true,mirrorStamp=-Infinity,reflectionPasses=0;
let adaptiveStart=0,adaptiveFrames=0,adaptiveSlow=0;
let corridorGroup,graphicsReady=false;
const controlPositions=[],uiPositions=[];
let reducedMotion=document.documentElement.dataset.motion==='reduced';
const mobile=()=>innerWidth<800;
const portraitView=()=>viewWidth<viewHeight;
const cameraDistance=()=>portraitView()?Math.max(3.65,3.85/(2*Math.tan(THREE.MathUtils.degToRad(68/2))*camera.aspect)-1.6):1.45;
const floors=[
 {label:'Главная',kicker:'ИНЖЕНЕРИЯ ДВИЖЕНИЯ',lines:['Уверенность.','На каждом','этаже.'],body:['Монтаж, обслуживание и модернизация','лифтового оборудования.'],action:'Наши направления',anchor:'#services'},
 {label:'Услуги',kicker:'НАПРАВЛЕНИЯ РАБОТЫ',lines:['Один партнёр.','Весь путь','лифта.'],body:['01   Монтаж и пусконаладка','02   Техническое обслуживание','03   Модернизация оборудования'],action:'Подробнее об услугах',anchor:'#services'},
 {label:'Подход',kicker:'ВНИМАНИЕ К ДЕТАЛЯМ',lines:['Сначала —','разобраться','в задаче.'],body:['Изучаем объект и исходные данные.','Подбираем решение. Согласовываем','состав работ и сопровождаем проект.'],action:'Наш подход',anchor:'#approach'},
 {label:'Контакты',kicker:'НАЧНЁМ С РАЗГОВОРА',lines:['Что вы','планируете?'],body:['Расскажите об объекте и задаче.','Подготовьте обращение в форме','ниже на странице.'],action:'Обсудить объект',anchor:'#contact'}
];
let renderer,model,mirror,textGroup,veil,screenPlane,frontLight;
let controls=[],leds=[],textLayers=[];
let selected=0,targetFloor=0,trip=null,revealStart=0,phase='loading';
let sceneTime=0,heroVisible=true,displayTime=0,lastDisplay=-1;
let pointer={x:0,y:0},drift={x:0,y:0};
let lastPortrait=mobile(),loadingValue=0;
window.addEventListener('motionchange',()=>{reducedMotion=document.documentElement.dataset.motion==='reduced';revealStart=sceneTime+(reducedMotion?-5:.15);requestRender();});
const navButtons=[...document.querySelectorAll('[data-floor]')];
const tmp=new THREE.Vector3();
const camera=new THREE.PerspectiveCamera(61,1,.05,150);
const scene=new THREE.Scene();scene.background=new THREE.Color('#090e0b');scene.fog=new THREE.FogExp2('#090e0b',.016);
const clamp=THREE.MathUtils.clamp,lerp=THREE.MathUtils.lerp;
const easeOut=t=>1-Math.pow(1-clamp(t,0,1),4);
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};

function progress(value){loadingValue=Math.max(loadingValue,value);$('#loading-progress').setAttribute('aria-valuenow',Math.round(loadingValue));$('#loading-progress i').style.width=loadingValue+'%';$('#loading-number').textContent=String(Math.round(loadingValue)).padStart(2,'0');}
function openDoors(){
 progress(100);phase='inside';revealStart=sceneTime+.4;
 $('#physical-nav').hidden=false;$('#wall-action').hidden=false;
 document.body.classList.remove('is-loading');document.body.classList.add('site-ready');
 $('#door-loader').classList.add('is-open');$('#door-loader').setAttribute('aria-hidden','true');
 requestRender();
}
function replayDoors(){
 if(phase!=='inside')return;
 window.scrollTo({top:0,behavior:reducedMotion?'instant':'smooth'});
 $('#door-loader').classList.remove('is-open');$('#door-loader').setAttribute('aria-hidden','false');
 document.body.classList.remove('site-ready');
 revealStart=sceneTime+100;requestRender();
 setTimeout(()=>{revealStart=sceneTime+.35;document.body.classList.add('site-ready');$('#door-loader').classList.add('is-open');$('#door-loader').setAttribute('aria-hidden','true');requestRender()},reducedMotion?20:900);
}
$('#replay').addEventListener('click',replayDoors);
$('#brand').addEventListener('click',()=>{if(selected!==0)chooseFloor(0)});
$('#wall-action').addEventListener('click',()=>document.querySelector(floors[selected].anchor).scrollIntoView({behavior:reducedMotion?'instant':'smooth'}));
navButtons.forEach((button,i)=>{
 button.addEventListener('click',()=>chooseFloor(i));
 button.addEventListener('pointerenter',()=>{const rect=button.getBoundingClientRect(),hr=hero.getBoundingClientRect();$('#tooltip').textContent=floors[i].label;$('#tooltip').style.left=rect.left-hr.left-90+'px';$('#tooltip').style.top=rect.top-hr.top+6+'px';$('#tooltip').hidden=false});
 button.addEventListener('pointerleave',()=>$('#tooltip').hidden=true);
});
canvas.addEventListener('pointermove',event=>{if(quality.mobile)return;const rect=hero.getBoundingClientRect();pointer.x=(event.clientX/viewWidth-.5)*2;pointer.y=((event.clientY-rect.top)/viewHeight-.5)*2;requestRender()},{passive:true});
canvas.addEventListener('pointerleave',()=>{pointer.x=0;pointer.y=0});
window.addEventListener('keydown',event=>{if(phase==='inside'&&heroVisible&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)&&/^[1-4]$/.test(event.key))chooseFloor(Number(event.key)-1)});
new IntersectionObserver(entries=>{const entry=entries[0];heroVisible=entry.isIntersecting&&entry.intersectionRatio>.10;if(heroVisible)requestRender();else suspend('offscreen')},{threshold:[0,.10,.15,.5]}).observe(hero);
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend('hidden');else requestRender()});
window.addEventListener('scroll',()=>{scrollUntil=performance.now()+140;if(quality.mobile&&heroVisible)requestRender()},{passive:true});

function updateAccessible(i){const data=floors[i];$('#accessible-title').textContent=data.lines.join(' ');$('#accessible-description').textContent=data.body.join(' ');$('#floor-readout').textContent=`0${i+1} — ${data.label.toUpperCase()}`;$('#wall-action').setAttribute('aria-label',data.action);navButtons.forEach((button,j)=>button.setAttribute('aria-pressed',String(i===j)));}
function chooseFloor(i){
 if(phase!=='inside'||i===selected&&!trip)return;
 if(reducedMotion){selected=i;buildText(i);revealStart=sceneTime-5;drawDisplay(i);reflectionDirty=true;requestRender();return;}
 targetFloor=i;trip={start:sceneTime,switched:false,direction:i>=selected?1:-1};$('#tooltip').hidden=true;reflectionDirty=true;requestRender();
}

const textVertex=`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const textFragment=`uniform sampler2D uMap;uniform float uReveal;uniform float uAlpha;varying vec2 vUv;
 void main(){vec4 col=texture2D(uMap,vUv);if(uReveal<.995 && MOBILE_FAST==0){float blur=(1.0-uReveal)*0.012;col*=0.5;col+=texture2D(uMap,vUv+vec2(0.0,blur))*0.25;col+=texture2D(uMap,vUv-vec2(0.0,blur))*0.25;}float mask=smoothstep(1.0-uReveal,1.08-uReveal,vUv.y);gl_FragColor=vec4(col.rgb,col.a*mask*uAlpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`;
function disposeText(){textLayers.forEach(layer=>{layer.mesh.material.uniforms.uMap.value.dispose();layer.mesh.material.dispose();layer.mesh.geometry.dispose();textGroup.remove(layer.mesh)});textLayers=[];}
function makeText(text,fontSize,color,top,delay,type='normal'){
 const scale=2.58/1800,height=Math.ceil(fontSize*1.65);
 const measure=document.createElement('canvas').getContext('2d');measure.font=`${type==='kicker'?500:400} ${fontSize}px Manrope`;
 const width=Math.min(1600,Math.ceil(measure.measureText(text).width+28));
 const c=document.createElement('canvas');c.width=Math.ceil(width*quality.textScale);c.height=Math.ceil(height*quality.textScale);const ctx=c.getContext('2d');ctx.scale(quality.textScale,quality.textScale);ctx.font=`${type==='kicker'?500:400} ${fontSize}px Manrope`;ctx.textBaseline='top';ctx.fillStyle=color;ctx.fillText(text,8,12);
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.anisotropy=Math.min(quality.anisotropy,renderer.capabilities.getMaxAnisotropy());
 const material=new THREE.ShaderMaterial({defines:{MOBILE_FAST:quality.mobile?1:0},uniforms:{uMap:{value:texture},uReveal:{value:0},uAlpha:{value:0}},vertexShader:textVertex,fragmentShader:textFragment,transparent:true,depthWrite:false,toneMapped:false});
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width*scale,height*scale),material);
 const x=-.29-1.29+130*scale+width*scale/2;
 const y=1.6+1.15-top*scale-height*scale/2;
 mesh.position.set(x,y,-1.625);mesh.renderOrder=5;textGroup.add(mesh);
 textLayers.push({mesh,baseY:y,delay,duration:type==='title'?1.15:.85,travel:type==='title'?.12:.055});
}
function buildText(i){
 if(!textGroup)return;disposeText();const data=floors[i],portrait=mobile();
 makeText(`0${i+1}  /  ${data.kicker}`,portrait?39:25,'#b9cebe',170,.04,'kicker');
 data.lines.forEach((line,j)=>makeText(line,portrait?178:148,j===data.lines.length-1?'#a6bdab':'#eff7ef',318+j*(portrait?184:157),.18+j*.16,'title'));
 const bodyY=data.lines.length===2?748:portrait?938:888;
 data.body.forEach((line,j)=>makeText(line,portrait?68:40,'#b8cebb',bodyY+j*(portrait?90:62),.65+j*.09));
 makeText(data.action+'     ↗',portrait?54:30,'#e0eee0',1253,.95);
 updateAccessible(i);drawDisplay(i);
}
function initContent(){
 textGroup=new THREE.Group();scene.add(textGroup);
 const c=document.createElement('canvas');c.width=256;c.height=256;const ctx=c.getContext('2d');const g=ctx.createLinearGradient(0,0,256,0);g.addColorStop(0,'rgba(5,13,9,.82)');g.addColorStop(.72,'rgba(5,13,9,.52)');g.addColorStop(1,'rgba(5,13,9,.05)');ctx.fillStyle=g;ctx.fillRect(0,0,256,256);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 veil=new THREE.Mesh(new THREE.PlaneGeometry(2.58,2.30),new THREE.MeshBasicMaterial({map:t,transparent:true,opacity:0,depthWrite:false,toneMapped:false}));veil.position.set(-.29,1.6,-1.632);veil.renderOrder=4;textGroup.add(veil);
 const display=document.createElement('canvas');display.width=320;display.height=180;const tex=new THREE.CanvasTexture(display);tex.colorSpace=THREE.SRGBColorSpace;
 screenPlane=new THREE.Mesh(new THREE.PlaneGeometry(.30,.17),new THREE.MeshBasicMaterial({map:tex,toneMapped:false}));screenPlane.position.set(1.62,2.05,-1.514);screenPlane.userData.canvas=display;scene.add(screenPlane);
 buildText(0);
}
function drawDisplay(i,travelling=false){if(!screenPlane)return;const c=screenPlane.userData.canvas,ctx=c.getContext('2d');ctx.fillStyle='#07100c';ctx.fillRect(0,0,320,180);ctx.textBaseline='middle';ctx.fillStyle='#bedfc8';ctx.font='400 110px Manrope';ctx.fillText('0'+(i+1),35,96);ctx.font='400 65px Manrope';const offset=travelling?Math.sin(sceneTime*7)*7:0;ctx.globalAlpha=travelling?.65+.35*Math.sin(sceneTime*6):1;ctx.fillText(travelling&&trip?.direction<0?'↓':'↑',205,96+offset);ctx.globalAlpha=1;screenPlane.material.map.needsUpdate=true;}
function addBox(w,h,d,x,y,z,material){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);corridorGroup.add(mesh);return mesh;}
function setupCorridor(){
 corridorGroup=new THREE.Group();corridorGroup.name='Reflected corridor';scene.add(corridorGroup);
 const structure=new THREE.MeshStandardMaterial({color:'#102017',metalness:.5,roughness:.3});const glow=new THREE.MeshBasicMaterial({color:'#aacbb3',toneMapped:false});
 for(let i=0;i<7;i++){const z=8+i*4;for(const x of [-1.76,1.76]){addBox(.045,2.95,.10,x,1.5,z,structure);addBox(.009,2.85,.015,x+.015,1.5,z-.06,glow)}addBox(3.5,.035,.10,0,2.97,z,structure);addBox(3.5,.009,.015,0,2.944,z-.06,glow);addBox(3.5,.025,.06,0,.025,z,structure)}
 addBox(4,.10,40,0,-.08,24,new THREE.MeshStandardMaterial({color:'#0a130d',metalness:.45,roughness:.28}));addBox(.1,3.2,40,-2,1.55,24,structure);addBox(.1,3.2,40,2,1.55,24,structure);
}
function initMirror(){
 model.getObjectByName('Mirror_Back').visible=false;
 mirror=new Reflector(new THREE.PlaneGeometry(2.85,2.53),{color:0xa1b6a7,textureWidth:quality.mirrorSize,textureHeight:quality.mirrorSize,clipBias:.003,multisample:0});mirror.position.set(-.29,1.60,-1.652);scene.add(mirror);
 const reflect=mirror.onBeforeRender;mirror.onBeforeRender=function(...args){const now=performance.now();if(quality.mobile&&!reflectionDirty&&now-mirrorStamp<1000/quality.mirrorFps)return;mirrorStamp=now;reflectionDirty=false;reflectionPasses++;const visible=textGroup?.visible;if(textGroup)textGroup.visible=false;reflect.apply(this,args);if(textGroup)textGroup.visible=visible};
}
async function init(){
 const start=performance.now();progress(4);
 renderer=new THREE.WebGLRenderer({canvas,antialias:!quality.mobile,alpha:false,stencil:false,powerPreference:quality.safe?'low-power':'high-performance'});renderer.info.autoReset=false;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
 const manager=new THREE.LoadingManager();manager.onProgress=(url,loaded,total)=>{monitor?.asset(url);progress(8+loaded/total*78)};
 const [hdr,baked,gltf,wood]=await Promise.all([
  new RGBELoader(manager).loadAsync(quality.assets.environment),
  new RGBELoader(manager).loadAsync(quality.assets.lighting),
  new GLTFLoader(manager).loadAsync(quality.assets.model),
  new THREE.TextureLoader(manager).loadAsync(quality.assets.wood)
 ]);
 const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromEquirectangular(hdr).texture;scene.environmentIntensity=.21;hdr.dispose();pmrem.dispose();
 baked.channel=1;baked.flipY=false;baked.colorSpace=THREE.LinearSRGBColorSpace;
 wood.colorSpace=THREE.SRGBColorSpace;wood.wrapS=wood.wrapT=THREE.RepeatWrapping;
 scene.add(new THREE.HemisphereLight(0xd3e4d9,0x07110a,quality.mobile?.32:.20));
 if(quality.mobile){
  frontLight=new THREE.DirectionalLight(0xd5e0df,.65);frontLight.position.set(-.5,2,4.6);scene.add(frontLight);frontLight.userData.baseIntensity=.65;
 }else{
  const {RectAreaLightUniformsLib}=await import('./addons/lights/RectAreaLightUniformsLib.js');RectAreaLightUniformsLib.init();
  const ceiling=new THREE.RectAreaLight(0xeee6d0,2.2,3.1,2.6);ceiling.position.set(0,2.96,0);ceiling.rotation.x=-Math.PI/2;scene.add(ceiling);
  frontLight=new THREE.RectAreaLight(0xd5e0df,1.6,3.3,3);frontLight.position.set(-.5,2,4.6);frontLight.lookAt(0,1.4,0);scene.add(frontLight);frontLight.userData.baseIntensity=1.6;
  const side=new THREE.RectAreaLight(0xd6c7ab,.85,.3,2.4);side.position.set(-1.8,1.6,-1.45);side.lookAt(0,1.4,0);scene.add(side);
  const right=new THREE.RectAreaLight(0xcad9ce,.8,.3,2.4);right.position.set(1.75,1.6,-1.45);right.lookAt(0,1.4,0);scene.add(right);
 }
 model=gltf.scene;scene.add(model);const steelMaterials=new Map();
 model.traverse(object=>{
  if(!object.isMesh)return;const m=object.material;
  if(['WALNUT','STONE','LOBBY_STONE','SHADOW'].includes(m.name)&&object.geometry.attributes.uv1){m.lightMap=baked;m.lightMapIntensity=quality.mobile?1.15:.85;m.needsUpdate=true;}
  if(m.name==='STONE'){m.color.set('#88928e');m.metalness=.15;m.roughness=.36;m.envMapIntensity=.8;}
  if(m.name==='WALNUT'){m.map=wood;m.color.set('#707a73');m.roughness=.65;m.envMapIntensity=.3;m.needsUpdate=true;}
  if(m.name==='SATIN_STEEL'){
   if(!steelMaterials.has(m.uuid)){
    const Material=quality.mobile?THREE.MeshStandardMaterial:THREE.MeshPhysicalMaterial;
    const steel=new Material({map:m.map,normalMap:quality.safe?null:m.normalMap,aoMap:m.aoMap,roughnessMap:m.roughnessMap,metalnessMap:m.metalnessMap,color:'#747d7c',metalness:.94,roughness:.27,envMapIntensity:1.25,aoMapIntensity:.6});
    steel.name='SATIN_STEEL';if(!quality.mobile){steel.anisotropy=.7;steel.anisotropyRotation=Math.PI/2}steelMaterials.set(m.uuid,steel);
   }
   object.material=steelMaterials.get(m.uuid);
  }
  if(quality.safe&&object.material.normalMap)object.material.normalMap=null;
  if(m.aoMap)m.aoMapIntensity=.6;
 });
 ['Door_Left','Door_Right','Mirror_Back'].forEach(name=>{const door=model.getObjectByName(name);if(door)door.visible=false});
 controls=Array.from({length:4},(_,i)=>model.getObjectByName('Button_'+i));leds=Array.from({length:4},(_,i)=>{const led=model.getObjectByName('LED_'+i);led.material=led.material.clone();return led});
 model.updateMatrixWorld(true);controls.forEach(control=>controlPositions.push(control.getWorldPosition(new THREE.Vector3())));
 batchStatic(model,new Set([...controls,...leds]));setupCorridor();batchStatic(corridorGroup);initMirror();
 await Promise.all([document.fonts.ready,document.fonts.load('400 148px Manrope'),document.fonts.load('500 30px Manrope'),...Array.from(document.querySelectorAll('.door-leaf img'),image=>image.decode().catch(()=>{}))]);
 reducedMotion=document.documentElement.dataset.motion==='reduced';
 initContent();resize();progress(96);
 camera.position.set(0,1.58,cameraDistance());camera.lookAt(portraitView()?.12:0,1.52,-1.6);camera.updateMatrixWorld();
 if(renderer.compileAsync)await renderer.compileAsync(scene,camera);
 graphicsReady=true;requestRender();
 await new Promise(resolve=>setTimeout(resolve,Math.max(0,750-(performance.now()-start))));
 requestAnimationFrame(()=>requestAnimationFrame(openDoors));
}
function resize(){
 if(!renderer)return;const w=hero.clientWidth,h=hero.clientHeight;
 if(w!==viewWidth||h!==viewHeight){viewWidth=w;viewHeight=h;renderer.setPixelRatio(renderRatio(quality,w,h)*resolutionScale);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();navButtons.forEach(button=>{button.style.width=44+'px';button.style.height=(quality.mobile?24:44)+'px'});reflectionDirty=true;}
 if(textGroup&&lastPortrait!==mobile()){lastPortrait=mobile();buildText(selected);revealStart=sceneTime-5;}
 requestRender();
}
window.addEventListener('resize',resize);
function project(point){tmp.copy(point).project(camera);return{x:(tmp.x*.5+.5)*viewWidth,y:(-.5*tmp.y+.5)*viewHeight};}
function place(element,point,index){const old=uiPositions[index];if(!old||Math.abs(old.x-point.x)>.1||Math.abs(old.y-point.y)>.1){element.style.transform=`translate3d(${point.x.toFixed(2)}px,${point.y.toFixed(2)}px,0) translate(-50%,-50%)`;uiPositions[index]=point;}}
function anchorUI(){
 controlPositions.forEach((position,i)=>place(navButtons[i],project(position),i));
 const p=project(new THREE.Vector3(-1.38,.94,-1.60)),q=project(new THREE.Vector3(-.48,.94,-1.60));place($('#wall-action'),{x:(p.x+q.x)*.5,y:p.y},4);const width=Math.abs(q.x-p.x);if(Math.abs(($('#wall-action').dataset.width||0)-width)>1){$('#wall-action').style.width=width+'px';$('#wall-action').dataset.width=width;}
}
function requestRender(){dirty=true;if(!rafId&&graphicsReady&&renderer&&textGroup&&heroVisible&&!document.hidden){lastSimulation=0;rafId=requestAnimationFrame(render);}}
function nextFrame(){if(!rafId&&heroVisible&&!document.hidden)rafId=requestAnimationFrame(render);}
function suspend(reason){if(rafId)cancelAnimationFrame(rafId);rafId=0;lastSimulation=lastFrame=0;adaptiveStart=0;adaptiveSlow=0;monitor?.status(reason);}
function adaptResolution(now){
 if(!quality.mobile||trip||sceneTime<4)return;
 if(!adaptiveStart){adaptiveStart=now;adaptiveFrames=0;return;}adaptiveFrames++;
 const elapsed=now-adaptiveStart;if(elapsed<3500)return;
 const fps=adaptiveFrames*1000/elapsed;adaptiveSlow=fps<quality.fps*.72?adaptiveSlow+1:0;
 if(adaptiveSlow>=2&&resolutionScale>.68){resolutionScale=Math.max(.65,resolutionScale*.85);renderer.setPixelRatio(renderRatio(quality,viewWidth,viewHeight)*resolutionScale);renderer.setSize(viewWidth,viewHeight,false);quality.mirrorFps=Math.max(2,quality.mirrorFps-1);reflectionDirty=true;adaptiveSlow=0;}
 adaptiveStart=now;adaptiveFrames=0;
}
function render(now){
 rafId=0;if(!heroVisible||document.hidden)return;
 const budget=1000/quality.fps;
 if(lastFrame&&now-lastFrame<budget){nextFrame();return;}
 if(quality.mobile&&now<scrollUntil&&!trip){lastSimulation=0;adaptiveStart=0;nextFrame();return;}
 const gap=lastSimulation?now-lastSimulation:0;
 if(gap>250){adaptiveStart=0;adaptiveSlow=0;}
 const dt=gap?Math.min(gap/1000,.15):0;lastSimulation=now;lastFrame=lastFrame?now-((now-lastFrame)%budget):now;
 const perfStart=performance.now();reflectionPasses=0;renderer.info.reset();
 sceneTime+=dt;const damping=1-Math.exp(-dt*2.2);drift.x=lerp(drift.x,pointer.x,damping);drift.y=lerp(drift.y,pointer.y,damping);
 let exit=1,shake=0,travel=0;
 if(trip){
  const elapsed=sceneTime-trip.start;
  if(elapsed<.35)exit=1-smooth(elapsed/.35);
  if(elapsed>=.56&&!trip.switched){selected=targetFloor;buildText(selected);revealStart=sceneTime+.16;trip.switched=true;}
  if(!trip.switched)exit=elapsed<.35?exit:0;
  const startImpulse=Math.exp(-Math.pow((elapsed-.12)/.16,2));
  const stopImpulse=Math.exp(-Math.pow((elapsed-1.45)/.20,2));
  shake=(startImpulse*.75+stopImpulse)*.012;travel=Math.sin(clamp(elapsed/1.65,0,1)*Math.PI)*trip.direction*.045;
  if(elapsed>1.8){trip=null;drawDisplay(selected);}
 }
 const amplitude=reducedMotion?0:1;
 const idleX=Math.sin(sceneTime*.29)*.035+Math.sin(sceneTime*.17+1.1)*.020;
 const idleY=Math.sin(sceneTime*.34+.4)*.017;
 const idleZ=Math.cos(sceneTime*.23)*.018;
 camera.position.set(amplitude*(idleX+drift.x*.035+Math.sin(sceneTime*71)*shake),1.58+amplitude*(idleY-drift.y*.018+travel+Math.sin(sceneTime*93)*shake*.65),cameraDistance()+amplitude*idleZ);
 camera.fov=portraitView()?68:61;camera.lookAt((portraitView()?.12:0)+amplitude*Math.sin(sceneTime*.18)*.012,1.52+amplitude*Math.cos(sceneTime*.27)*.009,-1.6);
 camera.rotateZ(amplitude*(Math.sin(sceneTime*.21)*.0012+Math.sin(sceneTime*65)*shake*.13));camera.updateProjectionMatrix();camera.updateMatrixWorld();
 frontLight.intensity=frontLight.userData.baseIntensity+amplitude*Math.sin(sceneTime*.4)*.025;
 const age=sceneTime-revealStart;
 textLayers.forEach(layer=>{const progress=reducedMotion?1:easeOut((age-layer.delay)/layer.duration);layer.mesh.material.uniforms.uReveal.value=progress;layer.mesh.material.uniforms.uAlpha.value=progress*exit;layer.mesh.position.y=layer.baseY-(1-progress)*layer.travel+(1-exit)*.045;});
 veil.material.opacity=(reducedMotion?1:smooth(age/.7))*.95;
 leds.forEach((led,i)=>{const isTarget=trip&&i===targetFloor,isActive=i===selected;const pulse=isTarget?.65+.35*Math.sin(sceneTime*9):1;led.material.emissiveIntensity=(isTarget?2.8*pulse:isActive?2.2:.035);led.material.color.set(isTarget||isActive?'#afdbb9':'#333b35');});
 if(trip&&sceneTime-displayTime>.09){drawDisplay(targetFloor,true);displayTime=sceneTime;}
 anchorUI();renderer.render(scene,camera);dirty=false;
 monitor?.frame(renderer,canvas,performance.now()-perfStart,reflectionPasses);adaptResolution(now);
 if(!reducedMotion||trip)nextFrame();else monitor?.status('still');
}
init().catch(error=>{console.error('Scene failed',error);phase='failed';progress(100);document.body.classList.remove('is-loading');document.body.classList.add('site-ready');$('#door-loader').classList.add('is-open');$('#fallback').hidden=false;});
