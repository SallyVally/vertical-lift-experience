import { themes,setTheme } from './themes.js?v=company-4';
import { company,createRequest,requestMailto } from './company.js?v=company-4';

const root=document.documentElement;
let mode='full';try{mode=localStorage.getItem('vertical-motion')||'full'}catch{}
root.dataset.motion=mode;
const motionToggle=document.querySelector('#motion-toggle');
function showMode(){const active=root.dataset.motion!=='reduced';motionToggle.textContent='Движение: '+(active?'вкл':'выкл');motionToggle.setAttribute('aria-pressed',String(active));}
showMode();
motionToggle.addEventListener('click',()=>{root.dataset.motion=root.dataset.motion==='reduced'?'full':'reduced';try{localStorage.setItem('vertical-motion',root.dataset.motion)}catch{}showMode();window.dispatchEvent(new Event('motionchange'));});

setTheme(themes[root.dataset.theme]?root.dataset.theme:'red',{persist:false,updateUrl:false});
document.querySelectorAll('[data-color]').forEach(button=>button.addEventListener('click',()=>setTheme(button.dataset.color)));

const menu=document.querySelector('#mobile-menu'),menuToggle=document.querySelector('#menu-toggle');
function closeMenu(){menu.hidden=true;menuToggle.setAttribute('aria-expanded','false');menuToggle.setAttribute('aria-label','Открыть меню');}
menuToggle.addEventListener('click',()=>{const open=menu.hidden;menu.hidden=!open;menuToggle.setAttribute('aria-expanded',String(open));menuToggle.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');});
menu.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeMenu));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!menu.hidden){closeMenu();menuToggle.focus();}});
document.addEventListener('pointerdown',event=>{if(!menu.hidden&&!menu.contains(event.target)&&!menuToggle.contains(event.target))closeMenu();});
matchMedia('(min-width:1001px)').addEventListener('change',event=>{if(event.matches)closeMenu();});

if('IntersectionObserver' in window){
 root.classList.add('motion-ready');
 const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}});},{threshold:.12,rootMargin:'0px 0px -25px 0px'});
 document.querySelectorAll('.reveal,.reveal-lines').forEach(element=>observer.observe(element));
}

const form=document.querySelector('#request-form'),draft=document.querySelector('#request-draft'),output=document.querySelector('#request-output'),emailLink=document.querySelector('#draft-email'),status=document.querySelector('#form-status');
const payload=()=>Object.fromEntries(new FormData(form));
function updateContext(){const selected=[form.elements.service.value,form.elements.building.value].filter(Boolean);document.querySelector('#form-context').textContent=selected.length?'Выбрано: '+selected.join(' · '):'Поможем определить следующий шаг.';}
function showDraft(){const data=payload();output.value=createRequest(data);emailLink.href=requestMailto(data);draft.hidden=false;return output.value;}
document.querySelectorAll('[data-service],[data-object]').forEach(link=>link.addEventListener('click',()=>{
 if(link.dataset.service)form.elements.service.value=link.dataset.service;
 if(link.dataset.object)form.elements.building.value=link.dataset.object;
 updateContext();if(!draft.hidden)showDraft();
}));
form.addEventListener('change',updateContext);
form.addEventListener('input',()=>{if(!draft.hidden)showDraft();});
form.addEventListener('submit',event=>{event.preventDefault();showDraft();status.textContent='Обращение готово. Проверьте текст и откройте письмо в почтовом приложении.';draft.scrollIntoView({behavior:root.dataset.motion==='reduced'?'auto':'smooth',block:'nearest'});});
document.querySelector('#copy-request').addEventListener('click',async()=>{
 if(!form.reportValidity())return;
 const request=showDraft();
 try{await navigator.clipboard.writeText(request);status.textContent='Обращение скопировано. Его можно вставить в письмо или сообщение.';}
 catch{output.focus();output.select();status.textContent='Текст обращения выделен. Скопируйте его или откройте готовое письмо.';}
});
document.querySelector('#copy-phone').addEventListener('click',async()=>{
 const phoneStatus=document.querySelector('#phone-status');
 try{await navigator.clipboard.writeText(company.phone);phoneStatus.textContent='Номер скопирован.';}
 catch{phoneStatus.textContent='Номер для связи: '+company.phone;}
});
