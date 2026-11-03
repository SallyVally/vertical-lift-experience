import * as THREE from 'three';

export function createCabinLayout(model,controls,leds,wood) {
  const panelMeshes=[];
  model.traverse(object=>{if(object.isMesh&&/^(Panel_|Display$|Button_|LED_|Fixing|SpeakerHole)/.test(object.name))panelMeshes.push(object);});
  const panel=new THREE.Group();panel.name='Responsive physical control panel';
  panel.position.set(1.62,1.51,-1.55);model.add(panel);model.updateMatrixWorld(true);
  panelMeshes.forEach(mesh=>panel.attach(mesh));
  panelMeshes.filter(mesh=>mesh.name.startsWith('Button_Label_')).forEach(mesh=>mesh.scale.multiplyScalar(1.5));
  const originals=new Map([...controls,...leds].map(mesh=>[mesh,mesh.scale.clone()]));
  let woodPanel;
  model.traverse(object=>{if(object.isMesh&&object.name.startsWith('Rear_Wood')&&object.position.x>0)woodPanel=object;});
  const column=new THREE.Mesh(woodPanel.geometry.clone(),wood);
  // Keep the original board UVs, baked illumination and AO on the new pilaster.
  column.scale.set(1.62/.94,2.98/2.75,1);
  column.name='Mobile walnut pilaster';column.position.set(1.29,1.5,-1.59);column.visible=false;model.add(column);
  return {
    panel,panelMeshes,
    setCompact(compact,width){
      const scale=compact?Math.max(1.35,480/width):1;
      panel.position.set(compact?.88:1.62,1.51,compact?-1.46:-1.55);panel.scale.setScalar(scale);
      column.visible=compact;
      for(const mesh of [...controls,...leds])mesh.scale.copy(originals.get(mesh)).multiplyScalar(compact?1.28:1);
      model.updateMatrixWorld(true);
    },
    attachDisplay(mesh){panel.add(mesh);mesh.position.set(0,.54,.036);}
  };
}
