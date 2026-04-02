const GAS = "https://script.google.com/macros/s/AKfycby-ApxknjJjXxRJtMSkwC62tzzGuRGLffGKE0Qq5duhv8dw7G-w4yHKA166Bx0WZkM/exec";

let gpsWatchId = null;
let wakeLockSentinel = null;

let initCache = null;
let meterLoading = false;
let startProcessing = false;

// ---------------- JSONP ----------------
function jsonp(url){
  return new Promise((resolve, reject) => {
    const cb = "cb_" + Math.random().toString(36).substring(2);
    const script = document.createElement("script");

    window[cb] = function(data){
      resolve(data);
      try{ delete window[cb]; }catch(e){}
      script.remove();
    };

    script.src = url + "&callback=" + cb + "&t=" + Date.now();

    script.onerror = function(){
      try{ delete window[cb]; }catch(e){}
      script.remove();
      reject(new Error("JSONP error"));
    };

    document.body.appendChild(script);
  });
}

// ---------------- UI補助 ----------------
function setStartButtonState(enabled, text){
  const btn = document.getElementById("startBtn");
  if(!btn) return;
  btn.disabled = !enabled;
  if(text) btn.textContent = text;
}

function setMeterLoadingState(loading){
  meterLoading = loading;
  const meterInput = document.getElementById("meter");
  if(!meterInput) return;

  if(loading){
    meterInput.value = "読込中...";
    setStartButtonState(false, "メーター読込中...");
  }
}

function setMeterLoaded(value){
  const meterInput = document.getElementById("meter");
  if(!meterInput) return;

  meterLoading = false;
  meterInput.value = value;
  setStartButtonState(true, "出発");
}

function setMeterLoadError(){
  const meterInput = document.getElementById("meter");
  if(!meterInput) return;

  meterLoading = false;
  meterInput.value = "取得失敗";
  setStartButtonState(false, "メーター取得失敗");
}

// ---------------- 初期 ----------------
window.onload = async () => {
  const user = JSON.parse(localStorage.getItem("user"));
  if(!user){
    location.href = "index.html";
    return;
  }

  if(document.getElementById("car")){
    await initStart();
  }

  if(document.getElementById("endMeter")){
    await loadEndMeter();
    startGPS();
    await enableWakeLock();
  }
};

// ---------------- 出発画面 ----------------
async function getInitData(force = false){
  if(initCache && !force) return initCache;
  initCache = await jsonp(GAS + "?type=init");
  return initCache;
}

async function loadMeterForSelectedCar(){
  const carSelect = document.getElementById("car");
  if(!carSelect) return;

  const car = String(carSelect.value || "").trim();
  if(!car){
    setMeterLoadError();
    return;
  }

  setMeterLoadingState(true);

  try{
    const m = await jsonp(GAS + "?type=meter&car=" + encodeURIComponent(car));
    setMeterLoaded(m);
  }catch(e){
    console.error("meter load error", e);
    setMeterLoadError();
  }
}

async function initStart(){
  try{
    setStartButtonState(false, "読込中...");

    const data = await getInitData();
    const driverSelect = document.getElementById("driverName");
    const carSelect = document.getElementById("car");
    const user = JSON.parse(localStorage.getItem("user"));

    driverSelect.innerHTML = "";
    (data.drivers || []).forEach(d => {
      const o = document.createElement("option");
      o.value = d.name;
      o.textContent = d.name;
      if(user && d.name === user.name) o.selected = true;
      driverSelect.appendChild(o);
    });

    carSelect.innerHTML = "";
    (data.cars || []).forEach(c => {
      const o = document.createElement("option");
      o.value = c;
      o.textContent = c;
      carSelect.appendChild(o);
    });

    carSelect.onchange = async () => {
      await loadMeterForSelectedCar();
    };

    await loadMeterForSelectedCar();
  }catch(e){
    console.error("initStart error", e);
    setStartButtonState(false, "初期化失敗");
    alert("初期データの読込に失敗しました");
  }
}

// ---------------- 位置情報確認 ----------------
function getCurrentPositionPromise(options){
  return new Promise((resolve, reject) => {
    if(!navigator.geolocation){
      reject(new Error("位置情報未対応端末"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => resolve(pos),
      err => reject(err),
      options || { enableHighAccuracy:true, timeout:10000, maximumAge:3000 }
    );
  });
}

function wait(ms){
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function ensureGpsReady(){
  const options = { enableHighAccuracy:true, timeout:10000, maximumAge:3000 };

  try{
    return await getCurrentPositionPromise(options);
  }catch(firstErr){
    console.log("GPS確認1回目失敗", firstErr);
    await wait(1500);

    try{
      return await getCurrentPositionPromise({
        enableHighAccuracy:true,
        timeout:12000,
        maximumAge:0
      });
    }catch(secondErr){
      console.log("GPS確認2回目失敗", secondErr);
      throw secondErr;
    }
  }
}

// ---------------- 出発 ----------------
async function start(){
  if(startProcessing) return;
  if(meterLoading){
    alert("メーター読込中です。少し待ってください。");
    return;
  }

  const startBtn = document.getElementById("startBtn");
  const meterValue = String(document.getElementById("meter")?.value || "").trim();

  if(!meterValue || meterValue === "読込中..." || meterValue === "取得失敗"){
    alert("メーター取得完了後に出発してください。");
    return;
  }

  try{
    startProcessing = true;
    setStartButtonState(false, "出発処理中...");

    const user = JSON.parse(localStorage.getItem("user"));
    const selectedCar = String(document.getElementById("car").value || "").trim();
    const selectedDriver = String(document.getElementById("driverName").value || "").trim();
    const selectedMeter = meterValue;

    try{
      await ensureGpsReady();
    }catch(e){
      alert("位置情報が取得できません。\n位置情報をONにして、アプリ画面に戻って数秒待ってからもう一度お試しください。");
      console.error("start gps check error", e);
      startProcessing = false;
      setStartButtonState(true, "出発");
      return;
    }

    await jsonp(
      GAS + "?type=start" +
      "&car=" + encodeURIComponent(selectedCar) +
      "&driver=" + encodeURIComponent(selectedDriver) +
      "&dept=" + encodeURIComponent(user.dept || "") +
      "&startMeter=" + encodeURIComponent(selectedMeter)
    );

    localStorage.setItem("lastCar", selectedCar);
    location.href = "driver_arrival.html";
  }catch(e){
    alert("出発処理エラー");
    console.error(e);
    startProcessing = false;
    setStartButtonState(true, "出発");
  }
}

// ---------------- GPS ----------------
function startGPS(){
  if(!navigator.geolocation){
    alert("この端末はGPS未対応です");
    return;
  }

  localStorage.setItem("gpsLog", "[]");
  updateGpsCount();

  navigator.geolocation.getCurrentPosition(
    pos => saveGps(pos),
    err => console.error("GPS初回取得失敗", err),
    { enableHighAccuracy:true, timeout:30000, maximumAge:5000 }
  );

  gpsWatchId = navigator.geolocation.watchPosition(
    pos => saveGps(pos),
    err => console.error("GPS監視失敗", err),
    { enableHighAccuracy:true, timeout:30000, maximumAge:5000 }
  );
}

function saveGps(pos){
  const accuracy = Number(pos.coords.accuracy || 9999);
  let log = JSON.parse(localStorage.getItem("gpsLog") || "[]");

  const point = {
    lat: Number(pos.coords.latitude),
    lng: Number(pos.coords.longitude),
    accuracy: accuracy,
    ts: Date.now()
  };

  if(log.length === 0){
    if(accuracy > 200){
      console.log("GPS初回破棄 accuracy>", accuracy);
      return;
    }

    log.push(point);
    localStorage.setItem("gpsLog", JSON.stringify(log));
    updateGpsCount();
    return;
  }

  if(accuracy > 150){
    console.log("GPS破棄 accuracy>", accuracy);
    return;
  }

  const last = log[log.length - 1];
  const d = distanceOnePoint(last.lat, last.lng, point.lat, point.lng);
  const dt = point.ts - (last.ts || 0);

  if(dt < 5000){
    console.log("GPS破棄 時間短すぎ", dt);
    return;
  }

  if(d < 15){
    console.log("GPS破棄 近すぎ", d);
    return;
  }

  log.push(point);

  if(log.length > 1500){
    log = log.slice(-1500);
  }

  localStorage.setItem("gpsLog", JSON.stringify(log));
  updateGpsCount();
}

function updateGpsCount(){
  const el = document.getElementById("gpsCount");
  if(el){
    const log = JSON.parse(localStorage.getItem("gpsLog") || "[]");
    el.textContent = "GPS件数：" + log.length;
  }
}

function distanceOnePoint(lat1, lng1, lat2, lng2){
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000;
}

function stopGPS(){
  if(gpsWatchId !== null){
    navigator.geolocation.clearWatch(gpsWatchId);
    gpsWatchId = null;
  }
}

// ---------------- Wake Lock ----------------
function updateWakeLockStatus(text, isVisible = true){
  const el = document.getElementById("wakeLockStatus");
  if(!el) return;
  el.style.display = isVisible ? "block" : "none";
  el.textContent = text;
}

async function enableWakeLock(){
  try{
    if(!document.getElementById("endMeter")) return false;

    if(!("wakeLock" in navigator)){
      updateWakeLockStatus("画面点灯補助：この端末は未対応です", true);
      return false;
    }

    if(document.visibilityState !== "visible"){
      return false;
    }

    wakeLockSentinel = await navigator.wakeLock.request("screen");
    updateWakeLockStatus("画面点灯補助：ON", true);

    wakeLockSentinel.addEventListener("release", () => {
      updateWakeLockStatus("画面点灯補助：OFF", true);
      console.log("Wake Lock released");
    });

    return true;
  }catch(e){
    console.log("Wake Lock取得失敗", e);
    updateWakeLockStatus("画面点灯補助：取得失敗", true);
    return false;
  }
}

async function disableWakeLock(){
  try{
    if(wakeLockSentinel){
      await wakeLockSentinel.release();
      wakeLockSentinel = null;
      updateWakeLockStatus("画面点灯補助：OFF", true);
    }
  }catch(e){
    console.log("Wake Lock解除失敗", e);
  }
}

document.addEventListener("visibilitychange", async () => {
  if(document.visibilityState === "visible" && document.getElementById("endMeter")){
    await enableWakeLock();
  }
});

// ---------------- 到着画面メーター ----------------
async function loadEndMeter(){
  const car = localStorage.getItem("lastCar");
  if(!car) return;

  const m = await jsonp(GAS + "?type=meter&car=" + encodeURIComponent(car));
  document.getElementById("endMeter").value = m;
}

// ---------------- logout ----------------
async function logout(){
  stopGPS();
  await disableWakeLock();
  localStorage.clear();
  location.href = "index.html";
}
