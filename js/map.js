import { createCustomPopup } from './card.js';
import {
  setFormActive,
  formElement,
  CLASS_NAME_DISABLED_FORM,
  fieldsetElement,
  mapFormElement,
  CLASS_NAME_DISABLED_MAP,
  mapFiltersElement,
} from './form-status.js';

const addressElement = document.querySelector('[name="address"]');
const locationTokyo = {
  lat: 35.6895,
  lng: 139.692,
};
addressElement.value = `${locationTokyo.lat}, ${locationTokyo.lng}`;

const map = L.map('map-canvas')
  .on('load', () => {
    //переход страницы в активное состояние после инициализации карты
    setFormActive(formElement, CLASS_NAME_DISABLED_FORM, fieldsetElement);
    setFormActive(mapFormElement, CLASS_NAME_DISABLED_MAP, mapFiltersElement);
  })
  .setView(locationTokyo, 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

const mainPinIcon = L.icon({
  iconUrl: './img/main-pin.svg',
  iconSize: [52, 52],
  iconAnchor: [26, 52],
});

const mainPinMarker = L.marker(locationTokyo, {
  draggable: true,
  icon: mainPinIcon,
});

mainPinMarker.addTo(map);

mainPinMarker.on('moveend', (evt) => {
  const mainMarkerLat = evt.target.getLatLng().lat.toFixed(5);
  const mainMarkerLng = evt.target.getLatLng().lng.toFixed(5);
  addressElement.value = `${mainMarkerLat},${mainMarkerLng}`;
});

const customPinIcon = L.icon({
  iconUrl: './img/pin.svg',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});
const mapFiltersContainer = document.querySelector('.map__filters-container');
const typeFilterElement = mapFiltersContainer.querySelector('[name="housing-type"]');
const priceFilterElement = mapFiltersContainer.querySelector('[name="housing-price"]');
const priceOption = {
  middle: 0,
  low: 10000,
  high: 50000,
};
const roomsFilterElement = mapFiltersContainer.querySelector('[name="housing-rooms"]');
const guestsFilterElement = mapFiltersContainer.querySelector('[name="housing-guests"]');
const featuresFilterArrays = [];
const featuresCheckboxes = mapFiltersContainer.querySelectorAll('input[type=checkbox]');

//функция для отбора объявлений, удовлетворяющих условиям фильтра
const getAdvertFilter = (advert) => {
  let sameAdvert = 0;
  //1 проверка Тип жилья
  if (advert.offer.type === typeFilterElement.value || typeFilterElement.value === 'any') {
    //увеличиваем счетчик если тип жилья в объявлении совпадает с фильтром
    //либо если фильтр не задан - "any" (тогда подходят все условия)
    sameAdvert += 1;
  }
  //2 проверка Цена
  switch (priceFilterElement.value) {
    case 'low':
      sameAdvert += advert.offer.price < priceOption['low'] ? 1 : 0;
      break;
    case 'high':
      sameAdvert += advert.offer.price > priceOption['high'] ? 1 : 0;
      break;
    case 'middle':
      //проверяем, что цена между значениями low и high
      sameAdvert +=
        advert.offer.price <= priceOption['high'] && advert.offer.price >= priceOption['low']
          ? 1
          : 0;
      break;
    case 'any':
      sameAdvert += 1;
  }
  //3 проверка кол-во комнат
  if (
    advert.offer.rooms === Number(roomsFilterElement.value) ||
    roomsFilterElement.value === 'any'
  ) {
    sameAdvert += 1;
  }
  //4 проверка Кол-во гостей
  if (
    advert.offer.guests === Number(guestsFilterElement.value) ||
    guestsFilterElement.value === 'any'
  ) {
    sameAdvert += 1;
  }
  //5 проверка Удобства
  //Если есть выбранные checkbox, то проверяем, что в обявленияхесть такие же
  if (featuresFilterArrays.length > 0 && advert.offer.features) {
    let i = 0;
    featuresFilterArrays.forEach((el) => {
      if (advert.offer.features.includes(el)) {
        i += 1; //если элемент в массиве есть, то увеличиваем счетчик i
      }
    });

    /*увеличиваем счетчик sameAdvert в том случае если колв-во совпадений (счетчик i)
    такое же как и кол-во выбранных удобств*/
    sameAdvert += i === featuresFilterArrays.length ? 1 : 0;
  }
  //если удобства не выбраны, то ничего не проверяем, считаем, что все объявления удовлетворяют данному условию
  if (featuresFilterArrays.length === 0) {
    sameAdvert += 1;
  }
  return sameAdvert;
};

const markerGroup = L.layerGroup().addTo(map);

const createMarker = (similarAdverts) => {
  const filterAdverts = similarAdverts
    .filter((advert) => getAdvertFilter(advert) === 5) //всего 5 проверок, объявление должно удовлетворять всем 5-ти
    .slice(0, 10);

  filterAdverts.forEach(({ location, offer, author }) => {
    const marker = L.marker(
      {
        lat: location.lat,
        lng: location.lng,
      },
      {
        icon: customPinIcon,
      },
    );
    marker.addTo(markerGroup).bindPopup(createCustomPopup({ offer, author }));
  });
};
//сброс карты
const clearMap = () => {
  markerGroup.clearLayers();
  mainPinMarker.setLatLng(locationTokyo);
  map.setView(locationTokyo, 12);
};

//функция для вывода меток в зависимости от указанных фильтров
const setMarkerFilter = (cb) => {
  typeFilterElement.addEventListener('change', () => {
    clearMap();
    cb();
  });
  priceFilterElement.addEventListener('change', () => {
    clearMap();
    cb();
  });
  roomsFilterElement.addEventListener('change', () => {
    clearMap();
    cb();
  });
  guestsFilterElement.addEventListener('change', () => {
    clearMap();
    cb();
  });
  featuresCheckboxes.forEach((item) =>
    item.addEventListener('change', () => {
      if (item.checked) {
        featuresFilterArrays.push(item.value);
      } else {
        featuresFilterArrays.splice(featuresFilterArrays.indexOf(item.value, 0), 1);
      }
      clearMap();
      cb();
    }),
  );
};

//функция для сброса данных меток на карте
const restMarkers = () => {
  clearMap();
  addressElement.value = `${locationTokyo.lat}, ${locationTokyo.lng}`;
};

export { createMarker, restMarkers, setMarkerFilter };
