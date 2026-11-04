export const themes = {
  red: { name:'Фирменный красный', scene:{background:'#111010',sky:'#eee6df',ground:'#211815',light:'#f7e4d5',sideLight:'#edb6a2',wood:'#8c7d72',stone:'#99968f',metal:'#898684',mirror:'#c8bdb6',frame:'#24201e',floor:'#151311',ribbon:'#e8bbab',cabinLight:'#f5e9df',led:'#ef6756',inactive:'#3c3430',displayBg:'#170f0d',display:'#f2b9a9',veil:'#100d0c',kicker:'#dda89b',title:'#f7f2ec',accent:'#eaa897',body:'#c9beb3',action:'#eee1d6',label:'#e7dad0'} },
  graphite: { name:'Графит', scene:{background:'#0d1116',sky:'#dce8f1',ground:'#111923',light:'#dce8f4',sideLight:'#91b2cd',wood:'#75828e',stone:'#8997a3',metal:'#8b9ba9',mirror:'#b5c4d0',frame:'#17212c',floor:'#0f1720',ribbon:'#a9c8e1',cabinLight:'#dfedfa',led:'#9ac5ee',inactive:'#2e3943',displayBg:'#0c1621',display:'#bedcfa',veil:'#0a1017',kicker:'#a0bfd8',title:'#f0f5fa',accent:'#acc8df',body:'#b7c5d1',action:'#dce9f5',label:'#dce9f5'} },
  bronze: { name:'Тёплая бронза', scene:{background:'#14110e',sky:'#f2e5cc',ground:'#23190e',light:'#f4dfbe',sideLight:'#e7b673',wood:'#aa8967',stone:'#a89a86',metal:'#a9977b',mirror:'#d0c0a8',frame:'#2b241b',floor:'#1c1710',ribbon:'#e9c58e',cabinLight:'#f4e4c8',led:'#e7be75',inactive:'#41372b',displayBg:'#1c140b',display:'#ecd19f',veil:'#161009',kicker:'#d5b67e',title:'#faf1e1',accent:'#e1bf87',body:'#cfc0a7',action:'#f0dfc0',label:'#e9d4ad'} }
};

export function getTheme() { return themes[document.documentElement.dataset.theme] || themes.red; }

export function setTheme(name,{persist=true,updateUrl=true}={}) {
  if(!themes[name])return;
  document.documentElement.dataset.theme=name;
  if(persist)try{localStorage.setItem('lms-color',name)}catch{}
  if(updateUrl){const url=new URL(location.href);url.searchParams.set('color',name);history.replaceState(null,'',url);}
  document.querySelectorAll('[data-color]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.color===name)));
  const status=document.querySelector('#theme-status');if(status)status.textContent='Цвет оформления: '+themes[name].name;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',themes[name].scene.background);
  window.dispatchEvent(new CustomEvent('themechange',{detail:{name}}));
}
