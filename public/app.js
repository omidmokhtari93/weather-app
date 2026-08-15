const WMO = {
  0: { label: "آسمان صاف", icon: "☀️" },
  1: { label: "عمدتاً صاف", icon: "🌤️" },
  2: { label: "نیمه‌ابری", icon: "⛅" },
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
  77: { label: "دانه‌های برف", icon: "❄️" },
  80: { label: "رگبار خفیف", icon: "🌦️" },
  81: { label: "رگبار متوسط", icon: "🌧️" },
  82: { label: "رگبار شدید", icon: "⛈️" },
  85: { label: "رگبار برف خفیف", icon: "🌨️" },
  86: { label: "رگبار برف شدید", icon: "❄️" },
  95: { label: "رعد و برق", icon: "⛈️" },
  96: { label: "رعد و برق با تگرگ خفیف", icon: "⛈️" },
  99: { label: "رعد و برق با تگرگ شدید", icon: "⛈️" },
};

const WEEKDAYS = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه"];

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
  changeCityBtn: document.getElementById("change-city-btn"),
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
  notifyCard: document.getElementById("notify-card"),
  notifyToggle: document.getElementById("notify-toggle"),
  notifyDesc: document.getElementById("notify-desc"),
};

const VAPID_PUBLIC_KEY = "BFI_DWXbqDRLCiE9CfP6vyv90UPZEeijyoOvQV0lxb36A2u4S7VXAO0Pb8mIodcrsbcOvUEJayDENqL5aSBHOgc";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

let lastCoords = null;
let lastPlaceName = null;

const STORAGE_KEY = "weather-last-location";

function loadSavedLocation() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      if (data.lat && data.lon && data.placeName) {
        lastCoords = { lat: data.lat, lon: data.lon };
        lastPlaceName = data.placeName;
        return true;
      }
    }
  } catch (_) {}
  return false;
}

function saveLocation(lat, lon, placeName) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ lat, lon, placeName }));
  } catch (_) {}
}

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
  if (!res.ok) throw new Error("خطا در دریافت اطلاعات آب‌وهوا");
  return res.json();
}

function animateNumber(el, target) {
  const start = Number(el.textContent) || 0;
  const duration = 500;
  const startTime = performance.now();

  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * eased);
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

function renderWeather(data, placeName, lat, lon) {
  const current = data.current;
  const daily = data.daily;
  const info = weatherInfo(current.weather_code);

  els.cityName.textContent = placeName;
  els.coordinates.textContent = `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`;
  animateNumber(els.temperature, Math.round(current.temperature_2m));
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
    item.style.animationDelay = `${i * 0.06}s`;
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

  if (pushSupported) show(els.notifyCard);

  hide(els.statusCard);
  hide(els.errorCard);
  show(els.weatherCard);
}

async function loadWeather(lat, lon, knownPlaceName) {
  setStatus("در حال دریافت آبوهوا...", "لطفاً صبر کنید", "⏳");
  show(els.statusCard);
  hide(els.weatherCard);
  hide(els.errorCard);
  els.getLocationBtn.disabled = true;

  try {
    const [weather, placeName] = await Promise.all([
      fetchWeather(lat, lon),
      knownPlaceName ? Promise.resolve(knownPlaceName) : reverseGeocode(lat, lon),
    ]);
    lastCoords = { lat, lon };
    lastPlaceName = placeName;
    saveLocation(lat, lon, placeName);
    renderWeather(weather, placeName, lat, lon);
  } catch (err) {
    showError("خطا در دریافت آبوهوا", err.message || "لطفاً دوباره تلاش کنید");
  } finally {
    els.getLocationBtn.disabled = false;
  }
}

function requestLocation() {
  if (!navigator.geolocation) {
    showError("پشتیبانی نمی‌شود", "مرورگر شما از GPS پشتیبانی نمی‌کند");
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
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

function changeCity() {
  requestLocation();
}

const themeToggleBtn = document.getElementById("theme-toggle-btn");
const themeColorMeta = document.getElementById("theme-color-meta");

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeToggleBtn.innerHTML = `<span class="icon-swap">${theme === "dark" ? "☀️" : "🌙"}</span>`;
  if (themeColorMeta) themeColorMeta.content = theme === "dark" ? "#0f1420" : "#4a90e2";
  localStorage.setItem("theme", theme);
}

applyTheme(document.documentElement.getAttribute("data-theme") || "light");

themeToggleBtn.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
});

const pushSupported = "serviceWorker" in navigator && "PushManager" in window;

async function syncNotifyToggle() {
  if (!pushSupported) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    els.notifyToggle.checked = !!sub;
  } catch (_) {}
}

async function enableNotifications() {
  if (!lastCoords) {
    els.notifyToggle.checked = false;
    return;
  }
  if (Notification.permission === "denied") {
    els.notifyToggle.checked = false;
    els.notifyDesc.textContent = "دسترسی اعلان مسدود است. از تنظیمات مرورگر اجازه دهید.";
    return;
  }

  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") {
    els.notifyToggle.checked = false;
    return;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) await existing.unsubscribe();

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON(), lat: lastCoords.lat, lon: lastCoords.lon, city: lastPlaceName })
    });
    els.notifyDesc.textContent = "هر چند ساعت دمای فعلی رو به‌صورت اعلان دریافت می‌کنی";
  } catch (err) {
    els.notifyToggle.checked = false;
    els.notifyDesc.textContent = "فعال‌سازی اعلان با خطا مواجه شد";
  }
}

async function disableNotifications() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint })
      });
      await sub.unsubscribe();
    }
  } catch (_) {}
  els.notifyDesc.textContent = "هر چند ساعت دمای فعلی رو به‌صورت اعلان دریافت کن";
}

if (pushSupported) {
  els.notifyToggle.addEventListener("change", () => {
    if (els.notifyToggle.checked) enableNotifications();
    else disableNotifications();
  });
  syncNotifyToggle();
}

els.getLocationBtn.addEventListener("click", requestLocation);
els.retryBtn.addEventListener("click", () => {
  if (lastCoords) loadWeather(lastCoords.lat, lastCoords.lon, lastPlaceName);
  else requestLocation();
});
els.refreshBtn.addEventListener("click", () => {
  if (lastCoords) loadWeather(lastCoords.lat, lastCoords.lon, lastPlaceName);
  else requestLocation();
});
if (els.changeCityBtn) els.changeCityBtn.addEventListener("click", changeCity);

// Enable button after page load
els.getLocationBtn.disabled = false;

if (loadSavedLocation()) {
  setStatus("موقعیت ذخیره شده", lastPlaceName, "📍");
  loadWeather(lastCoords.lat, lastCoords.lon, lastPlaceName);
} else {
  setStatus("آماده", "روی دکمه زیر بزنید تا موقعیت شما شناسایی شود", "📍");
}

// Auto-request if permission already granted
if (navigator.permissions) {
  navigator.permissions.query({ name: "geolocation" }).then((result) => {
    if (result.state === "granted" && !lastCoords) requestLocation();
  }).catch(() => {});
}
