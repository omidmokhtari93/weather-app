const WMO = {
  0: { label: "آسمان صاف", icon: "☀️" },
  1: { label: "عمدتاً صاف", icon: "🌤️" },
  2: { label: "نیمهابری", icon: "⛅" },
  3: { label: "ابری", icon: "☁️" },
  45: { label: "مه", icon: "🌫️" },
  48: { label: "مه یخزده", icon: "🌫️" },
  51: { label: "نمنم خفیف", icon: "🌦️" },
  53: { label: "نمنم متوسط", icon: "🌦️" },
  55: { label: "نمنم شدید", icon: "🌧️" },
  56: { label: "نمنم یخزده خفیف", icon: "🌧️" },
  57: { label: "نمنم یخزده شدید", icon: "🌧️" },
  61: { label: "باران خفیف", icon: "🌧️" },
  63: { label: "باران متوسط", icon: "🌧️" },
  65: { label: "باران شدید", icon: "🌧️" },
  66: { label: "باران یخزده خفیف", icon: "🌧️" },
  67: { label: "باران یخزده شدید", icon: "🌧️" },
  71: { label: "برف خفیف", icon: "🌨️" },
  73: { label: "برف متوسط", icon: "🌨️" },
  75: { label: "برف شدید", icon: "❄️" },
  77: { label: "دانههای برف", icon: "❄️" },
  80: { label: "رگبار خفیف", icon: "🌦️" },
  81: { label: "رگبار متوسط", icon: "🌧️" },
  82: { label: "رگبار شدید", icon: "⛈️" },
  85: { label: "رگبار برف خفیف", icon: "🌨️" },
  86: { label: "رگبار برف شدید", icon: "❄️" },
  95: { label: "رعد و برق", icon: "⛈️" },
  96: { label: "رعد و برق با تگرگ خفیف", icon: "⛈️" },
  99: { label: "رعد و برق با تگرگ شدید", icon: "⛈️" },
};

const WEEKDAYS = ["یکشنبه", "دوشنبه", "سهشنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];

const els = {
  statusCard: document.getElementById("location-status"),
  weatherCard: document.getElementById("weather-card"),
  errorCard: document.getElementById("error-card"),
  statusTitle: document.getElementById("status-title"),
  statusDesc: document.getElementById("status-desc"),
  statusIcon: document.getElementById("status-icon"),
  getLocationBtn: document.getElementById("get-location-btn"),
  refreshBtn: document.getElementById("refresh-btn"),
  retryBtn: document.getElementById("retry-btn"),
  cityName: document.getElementById("city-name"),
  coordinates: document.getElementById("coordinates"),
  temperature: document.getElementById("temperature"),
  weatherDesc: document.getElementById("weather-desc"),
  weatherIcon: document.getElementById("weather-icon"),
  feelsLike: document.getElementById("feels-like"),
  humidity: document.getElementById("humidity"),
  wind: document.getElementById("wind"),
  pressure: document.getElementById("pressure"),
  forecastList: document.getElementById("forecast-list"),
  errorTitle: document.getElementById("error-title"),
  errorDesc: document.getElementById("error-desc"),
};

let lastCoords = null;

function show(el) {
  el.classList.remove("hidden");
}

function hide(el) {
  el.classList.add("hidden");
}

function setStatus(title, desc, icon = "📍") {
  els.statusTitle.textContent = title;
  els.statusDesc.textContent = desc;
  els.statusIcon.textContent = icon;
}

function showError(title, desc) {
  hide(els.statusCard);
  hide(els.weatherCard);
  show(els.errorCard);
  els.errorTitle.textContent = title;
  els.errorDesc.textContent = desc;
}

function weatherInfo(code) {
  return WMO[code] || { label: "نامشخص", icon: "🌡️" };
}

function formatDay(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return "امروز";
  if (d.toDateString() === tomorrow.toDateString()) return "فردا";
  return WEEKDAYS[d.getDay()];
}

async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=&count=1&language=fa&format=json&latitude=${lat}&longitude=${lon}`
    );
    // Open-Meteo reverse via Nominatim-style fallback
  } catch (_) {}

  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=fa`
    );
    if (!res.ok) throw new Error("geocode failed");
    const data = await res.json();
    const parts = [data.city || data.locality, data.principalSubdivision, data.countryName].filter(Boolean);
    return parts.join("، ") || "موقعیت فعلی شما";
  } catch (_) {
    return "موقعیت فعلی شما";
  }
}

async function fetchWeather(lat, lon) {
  const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
  if (!res.ok) throw new Error("خطا در دریافت اطلاعات آبوهوا");
  return res.json();
}

function renderWeather(data, placeName, lat, lon) {
  const current = data.current;
  const daily = data.daily;
  const info = weatherInfo(current.weather_code);

  els.cityName.textContent = placeName;
  els.coordinates.textContent = `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`;
  els.temperature.textContent = Math.round(current.temperature_2m);
  els.weatherDesc.textContent = info.label;
  els.weatherIcon.textContent = info.icon;
  els.feelsLike.textContent = `${Math.round(current.apparent_temperature)}°C`;
  els.humidity.textContent = `${current.relative_humidity_2m}%`;
  els.wind.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  els.pressure.textContent = `${Math.round(current.pressure_msl)} hPa`;

  els.forecastList.innerHTML = "";
  const days = daily.time.length;
  for (let i = 0; i < days; i++) {
    const dayInfo = weatherInfo(daily.weather_code[i]);
    const item = document.createElement("div");
    item.className = "forecast-item";
    item.innerHTML = `
      <span class="forecast-day">${formatDay(daily.time[i])}</span>
      <span class="forecast-icon">${dayInfo.icon}</span>
      <span class="forecast-temps">
        <span class="forecast-max">${Math.round(daily.temperature_2m_max[i])}°</span>
        <span class="forecast-min">${Math.round(daily.temperature_2m_min[i])}°</span>
      </span>
    `;
    els.forecastList.appendChild(item);
  }

  hide(els.statusCard);
  hide(els.errorCard);
  show(els.weatherCard);
}

async function loadWeather(lat, lon) {
  setStatus("در حال دریافت آبوهوا...", "لطفاً صبر کنید", "⏳");
  show(els.statusCard);
  hide(els.weatherCard);
  hide(els.errorCard);
  els.getLocationBtn.disabled = true;

  try {
    const [weather, placeName] = await Promise.all([
      fetchWeather(lat, lon),
      reverseGeocode(lat, lon),
    ]);
    lastCoords = { lat, lon };
    renderWeather(weather, placeName, lat, lon);
  } catch (err) {
    showError("خطا در دریافت آبوهوا", err.message || "لطفاً دوباره تلاش کنید");
  } finally {
    els.getLocationBtn.disabled = false;
  }
}

function requestLocation() {
  if (!navigator.geolocation) {
    showError("پشتیبانی نمیشود", "مرورگر شما از GPS پشتیبانی نمیکند");
    return;
  }

  setStatus("در حال دریافت موقعیت...", "مجوز دسترسی را تأیید کنید", "📡");
  show(els.statusCard);
  hide(els.weatherCard);
  hide(els.errorCard);
  els.getLocationBtn.disabled = true;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      loadWeather(latitude, longitude);
    },
    (err) => {
      els.getLocationBtn.disabled = false;
      let msg = "دسترسی به موقعیت مکانی ممکن نشد";
      if (err.code === 1) msg = "دسترسی به موقعیت مکانی رد شد. لطفاً در تنظیمات مرورگر اجازه دهید.";
      if (err.code === 2) msg = "موقعیت مکانی در دسترس نیست";
      if (err.code === 3) msg = "زمان درخواست موقعیت تمام شد";
      showError("خطای موقعیت مکانی", msg);
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
  );
}

els.getLocationBtn.addEventListener("click", requestLocation);
els.retryBtn.addEventListener("click", () => {
  if (lastCoords) loadWeather(lastCoords.lat, lastCoords.lon);
  else requestLocation();
});
els.refreshBtn.addEventListener("click", () => {
  if (lastCoords) loadWeather(lastCoords.lat, lastCoords.lon);
  else requestLocation();
});

// Enable button after page load
els.getLocationBtn.disabled = false;
setStatus("آماده", "روی دکمه زیر بزنید تا موقعیت شما شناسایی شود", "📍");

// Auto-request if permission already granted
if (navigator.permissions) {
  navigator.permissions.query({ name: "geolocation" }).then((result) => {
    if (result.state === "granted") requestLocation();
  }).catch(() => {});
}
