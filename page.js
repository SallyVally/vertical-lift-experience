(() => {
  const root=document.documentElement;
  let mode='full';try{mode=localStorage.getItem('vertical-motion')||'full'}catch{}
  root.dataset.motion=mode;
  const toggle=document.querySelector('#motion-toggle');
  function showMode(){const active=root.dataset.motion!=='reduced';toggle.textContent='Движение: '+(active?'вкл':'выкл');toggle.setAttribute('aria-pressed',String(active));}
  showMode();
  toggle.addEventListener('click',()=>{root.dataset.motion=root.dataset.motion==='reduced'?'full':'reduced';try{localStorage.setItem('vertical-motion',root.dataset.motion)}catch{}showMode();window.dispatchEvent(new Event('motionchange'));});
  if('IntersectionObserver' in window){
    root.classList.add('motion-ready');
    const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}});},{threshold:.16,rootMargin:'0px 0px -30px 0px'});
    document.querySelectorAll('.reveal,.reveal-lines').forEach(element=>observer.observe(element));
  }
  const form=document.querySelector('#request-form');
  document.querySelectorAll('[data-service]').forEach(link=>link.addEventListener('click',()=>form.elements.service.value=link.dataset.service));
  form.addEventListener('submit',async event=>{
    event.preventDefault();const data=new FormData(form);
    const request=`Запрос по лифтовому оборудованию\nУслуга: ${data.get('service')}\nОбъект: ${data.get('object')}\nКонтакт: ${data.get('contact')}\nЗадача: ${data.get('details')||'—'}`;
    const status=document.querySelector('#form-status');
    try{await navigator.clipboard.writeText(request);status.textContent='Обращение скопировано. Его можно вставить в письмо или сообщение.'}
    catch{status.textContent='Скопируйте подготовленный текст ниже.';let output=document.querySelector('#request-output');if(!output){output=document.createElement('textarea');output.id='request-output';output.rows=5;output.setAttribute('aria-label','Текст обращения');form.append(output)}output.value=request;output.focus();output.select()}
  });
})();
