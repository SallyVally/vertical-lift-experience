export const company = {
  name:'Лифт Монтаж Сервис',phone:'8 952 907-83-66',tel:'+79529078366',email:'maxotin08@mail.ru',address:'г. Новосибирск, ул. Гоголя, 237'
};

export function createRequest(data) {
  return `Здравствуйте!\n\nХочу обсудить проект с компанией «${company.name}».\n\nНаправление: ${data.service || 'Подбор решения'}\nТип объекта: ${data.building || 'Уточним при обсуждении'}\nОбъект: ${data.object || '—'}\nКонтакт для ответа: ${data.contact || '—'}\nЗадача: ${data.details || 'Обсудить подходящее решение.'}`;
}

export function requestMailto(data) {
  return `mailto:${company.email}?subject=${encodeURIComponent('Запрос: '+(data.service || 'лифтовое оборудование'))}&body=${encodeURIComponent(createRequest(data))}`;
}
