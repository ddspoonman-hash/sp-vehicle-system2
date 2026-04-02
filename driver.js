const GAS = "https://script.google.com/macros/s/AKfycby-ApxknjJjXxRJtMSkwC62tzzGuRGLffGKE0Qq5duhv8dw7G-w4yHKA166Bx0WZkM/exec";

let gpsWatchId = null;
let wakeLockSentinel = null;

let initCache = null;
let startProcessing = false;
let meterLoading = false;

// ---------------- JSONP ----------------
function jsonp(url){
  return new Promise((resolve, reject) => {
    const cb = "cb_" + Math.random().toString(36).substring(2);
    const script = document.createElement("script");

    window[cb] = data => {
      resolve(data);
      delete window[cb];
      script.remove();
    };

    script.src = url + "&callback=" + cb + "&t=" + Date.now();

    script.onerror = () => {
      delete window[cb];
      script.remove();
      reject(new Error("JSONP error"));
    };

    document.body.appendChild(script);
  });
}

// ---------------- initキャッシュ ----------------
async function getInit(){
  if(initCache) return initCache;
  initCache = await jsonp(GAS + "?type=init");
  return initCache;
}

// ---------------- UI ----------------
function setStartBtn(enable, text){
  const btn = document.getElementById("startBtn");
  if(!btn) return;
  btn.disabled = !enable;
  if(text) btn.textContent = text;
}

// ---------------- 出発画面 ----------------
async function initStart(){
  try{
    setStartBtn(false,"読込中...");

    const data = await getInit();
    const user = JSON.parse(localStorage.getItem("user"));

    const driver = document.getElementById("driverName");
    const car = document.getElementById("car");

    driver.innerHTML="";
    data.drivers.forEach(d=>{
      const o=document.createElement("option");
      o.value=d.name;
      o.textContent=d.name;
      if(d.name===user.name) o.selected=true;
      driver.appendChild(o);
    });

    car.innerHTML="";
    data.cars.forEach(c=>{
      const o=document.createElement("option");
      o.value=c;
      o.textContent=c;
      car.appendChild(o);
    });

    car.onchange=loadMeter;

    await loadMeter();

  }catch(e){
    alert("初期化失敗");
  }
}

// ---------------- メーター ----------------
async function loadMeter(){
  const car = document.getElementById("car").value;
  const meter = document.getElementById("meter");

  meterLoading = true;
  meter.value = "読込中...";
  setStartBtn(false,"メーター読込中...");

  try{
    const m = await jsonp(GAS+"?type=meter&car="+encodeURIComponent(car));
    meter.value = m;
    meterLoading = false;
    setStartBtn(true,"出発");
  }catch(e){
    meter.value="取得失敗";
    meterLoading=false;
    setStartBtn(false,"取得失敗");
  }
}

// ---------------- GPS ----------------
function startGPS(){
  localStorage.setItem("gpsLog","[]");

  gpsWatchId = navigator.geolocation.watchPosition(pos=>{
    let log = JSON.parse(localStorage.getItem("gpsLog")||"[]");

    const p={
      lat:pos.coords.latitude,
      lng:pos.coords.longitude,
      ts:Date.now(),
      accuracy:pos.coords.accuracy
    };

    if(p.accuracy>150) return;

    if(log.length>0){
      const last=log[log.length-1];
      const d=distance(last,p);
      if(d<15) return;
    }

    log.push(p);
    if(log.length>1500) log=log.slice(-1500);

    localStorage.setItem("gpsLog",JSON.stringify(log));

  },e=>console.log(e),{
    enableHighAccuracy:true,
    timeout:30000
  });
}

// ---------------- 距離 ----------------
function distance(a,b){
  const R=6371;
  const dLat=(b.lat-a.lat)*Math.PI/180;
  const dLng=(b.lng-a.lng)*Math.PI/180;

  const x=Math.sin(dLat/2)**2+
    Math.cos(a.lat*Math.PI/180)*
    Math.cos(b.lat*Math.PI/180)*
    Math.sin(dLng/2)**2;

  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))*1000;
}

// ---------------- 出発 ----------------
async function start(){
  if(startProcessing) return;
  if(meterLoading){
    alert("メーター読込中");
    return;
  }

  const meter=document.getElementById("meter").value;
  if(!meter || meter==="取得失敗"){
    alert("メーター未取得");
    return;
  }

  startProcessing=true;
  setStartBtn(false,"出発中...");

  const user=JSON.parse(localStorage.getItem("user"));

  await jsonp(
    GAS+"?type=start"+
    "&car="+encodeURIComponent(car.value)+
    "&driver="+encodeURIComponent(driverName.value)+
    "&dept="+encodeURIComponent(user.dept||"")+
    "&startMeter="+encodeURIComponent(meter)
  );

  localStorage.setItem("lastCar",car.value);
  location.href="driver_arrival.html";
}

// ---------------- WakeLock ----------------
async function enableWakeLock(){
  try{
    if(!navigator.wakeLock) return;

    wakeLockSentinel=await navigator.wakeLock.request("screen");

    wakeLockSentinel.addEventListener("release",()=>{
      console.log("WakeLock解除");
    });

  }catch(e){
    console.log("WakeLock失敗",e);
  }
}

document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="visible"){
    enableWakeLock();
  }
});

// ---------------- logout ----------------
function logout(){
  if(gpsWatchId) navigator.geolocation.clearWatch(gpsWatchId);
  localStorage.clear();
  location.href="index.html";
}

// ---------------- 起動 ----------------
window.onload=async()=>{
  if(document.getElementById("car")){
    await initStart();
  }

  if(document.getElementById("endMeter")){
    startGPS();
    enableWakeLock();
  }
};
