import * as THREE from 'three';

// Screen-space ribbons keep subpixel luminaires covered. Their energy fades
// continuously with projected width instead of switching whole pixels on/off.
export function createCorridorLights(segments) {
  const positions=[],starts=[],ends=[],sides=[],along=[],widths=[];
  for (const {start,end,width=.025} of segments) {
    for (const [t,side] of [[0,-1],[1,-1],[1,1],[0,-1],[1,1],[0,1]]) {
      positions.push(...start.map((v,i)=>v+(end[i]-v)*t));
      starts.push(...start);ends.push(...end);sides.push(side);along.push(t);widths.push(width);
    }
  }
  const geometry=new THREE.BufferGeometry();
  for (const [name,data,size] of [['position',positions,3],['lineStart',starts,3],['lineEnd',ends,3],['lineSide',sides,1],['lineAlong',along,1],['lineWidth',widths,1]]) geometry.setAttribute(name,new THREE.Float32BufferAttribute(data,size));
  geometry.computeBoundingSphere();
  const material=new THREE.ShaderMaterial({
    uniforms:{uResolution:{value:new THREE.Vector2(1,1)},uColor:{value:new THREE.Color('#c0d8c9')}},
    vertexShader:`
      attribute vec3 lineStart,lineEnd;
      attribute float lineSide,lineAlong,lineWidth;
      uniform vec2 uResolution;
      varying float vOffset,vHalf,vEnergy;
      void main(){
        vec4 va=modelViewMatrix*vec4(lineStart,1.0),vb=modelViewMatrix*vec4(lineEnd,1.0);
        vec4 a=projectionMatrix*va,b=projectionMatrix*vb;
        vec2 direction=(b.xy/b.w-a.xy/a.w)*uResolution;
        direction/=max(length(direction),.00001);
        vec2 normal=vec2(-direction.y,direction.x);
        vec4 viewPoint=mix(va,vb,lineAlong);
        float pixels=lineWidth*projectionMatrix[1][1]*uResolution.y*.5/max(-viewPoint.z,.1);
        vHalf=max(pixels*.5,.75);vEnergy=min(1.0,pixels/1.5);
        float support=vHalf+2.8;vOffset=lineSide*support;
        vec4 point=mix(a,b,lineAlong);
        point.xy+=normal*lineSide*support*2.0/uResolution*point.w;
        gl_Position=point;
      }`,
    fragmentShader:`
      uniform vec3 uColor;
      varying float vOffset,vHalf,vEnergy;
      void main(){
        float distanceToLine=abs(vOffset),aa=max(fwidth(vOffset)*.8,.65);
        float core=1.0-smoothstep(vHalf-aa,vHalf+aa,distanceToLine);
        float halo=exp(-pow(distanceToLine/(vHalf+1.15),2.0))*.16;
        gl_FragColor=vec4(uColor,(core*.85+halo)*vEnergy);
        #include <colorspace_fragment>
      }`,
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,side:THREE.DoubleSide
  });
  const mesh=new THREE.Mesh(geometry,material);mesh.name='Filtered corridor luminaires';
  mesh.onBeforeRender=renderer=>{
    const target=renderer.getRenderTarget();
    if(target)material.uniforms.uResolution.value.set(target.width,target.height);
    else renderer.getDrawingBufferSize(material.uniforms.uResolution.value);
  };
  return mesh;
}
