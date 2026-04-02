const GAS = "https://script.google.com/macros/s/AKfycby-ApxknjJjXxRJtMSkwC62tzzGuRGLffGKE0Qq5duhv8dw7G-w4yHKA166Bx0WZkM/exec";

// ---------------- JSONP共通 ----------------
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

let map;
let markers = [];
let latestInit = null;
let loadBusy = false;
let refreshTimer = null;

// ---------------- 地図 ----------------
function initMap(){
  if(typeof google === "undefined" || !google.maps){
    console.warn("Google Maps未読込");
    return;
  }

  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 12,
    center: { lat: 35.0, lng: 136.0 }
  });
}

// ---------------- 初期データ ----------------
async function fetchInit(){
  const data = await jsonp(GAS + "?type=init");
  latestInit = data;
  return data;
}

// ---------------- 管理画面描画 ----------------
function renderRunning(data){
  const div = document.getElementById("running");
  div.innerHTML = "";

  const running = (data && data.running) ? data.running : [];

  if(running.length === 0){
    div.innerHTML = "使用中の車両はありません";
    return;
  }

  running.forEach(r => {
    div.innerHTML +=
      "車両：" + (r.car || "") + "<br>" +
      "運転者：" + (r.driver || "") + "<hr>";
  });
}

function renderMarkers(data){
  if(!map) return;

  markers.forEach(m => m.setMap(null));
  markers = [];

  const running = (data && data.running) ? data.running : [];
  running.forEach(r => {
    if(!r.lat || !r.lng) return;

    const marker = new google.maps.Marker({
      position: { lat:Number(r.lat), lng:Number(r.lng) },
      map: map,
      title: (r.car || "") + " " + (r.driver || "")
    });

    markers.push(marker);
  });
}

function renderCars(data){
  const cars = (data && data.cars) ? data.cars : [];
  const csvCar = document.getElementById("csvCar");
  const csvCarMonth = document.getElementById("csvCarMonth");

  if(csvCar){
    const current = csvCar.value;
    csvCar.innerHTML = "";
    cars.forEach(c => {
      const o = document.createElement("option");
      o.value = c;
      o.textContent = c;
      if(c === current) o.selected = true;
      csvCar.appendChild(o);
    });
  }

  if(csvCarMonth){
    const current = csvCarMonth.value;
    csvCarMonth.innerHTML = "";
    cars.forEach(c => {
      const o = document.createElement("option");
      o.value = c;
      o.textContent = c;
      if(c === current) o.selected = true;
      csvCarMonth.appendChild(o);
    });
  }
}

async function loadGroups(){
  try{
    const groups = await jsonp(GAS + "?type=groups");
    const select = document.getElementById("pGroup");
    if(!select) return;

    const current = select.value;
    select.innerHTML = "";

    (groups || []).forEach(g => {
      const o = document.createElement("option");
      o.value = g;
      o.textContent = g;
      if(g === current) o.selected = true;
      select.appendChild(o);
    });
  }catch(e){
    console.error("loadGroups error", e);
  }
}

// ---------------- 一括ロード ----------------
async function load(forceReload = true){
  if(loadBusy) return;
  loadBusy = true;

  try{
    const data = forceReload || !latestInit ? await fetchInit() : latestInit;
    renderRunning(data);
    renderMarkers(data);
    renderCars(data);
  }catch(e){
    console.error("load error", e);
  }finally{
    loadBusy = false;
  }
}

// ---------------- 車両追加 ----------------
async function addCar(){
  const input = document.getElementById("newCar");
  const car = String(input.value || "").trim();

  if(!car){
    alert("車両名を入力してください");
    return;
  }

  try{
    await jsonp(GAS + "?type=addCar&car=" + encodeURIComponent(car));
    alert("追加OK");
    input.value = "";
    latestInit = null;
    await load(true);
  }catch(e){
    alert("追加失敗");
    console.error(e);
  }
}

// ---------------- ドライバー追加 ----------------
async function addDriver(){
  const id = String(document.getElementById("newId").value || "").trim();
  const name = String(document.getElementById("newName").value || "").trim();
  const dept = String(document.getElementById("newDept").value || "").trim();
  const pass = String(document.getElementById("newPass").value || "").trim();

  if(!id || !name || !pass){
    alert("ID・名前・PASSは必須です");
    return;
  }

  try{
    await jsonp(
      GAS + "?type=addDriver" +
      "&id=" + encodeURIComponent(id) +
      "&name=" + encodeURIComponent(name) +
      "&dept=" + encodeURIComponent(dept) +
      "&pass=" + encodeURIComponent(pass)
    );

    alert("追加OK");
    document.getElementById("newId").value = "";
    document.getElementById("newName").value = "";
    document.getElementById("newDept").value = "";
    document.getElementById("newPass").value = "";
    latestInit = null;
    await load(true);
  }catch(e){
    alert("追加失敗");
    console.error(e);
  }
}

// ---------------- メーター補正 ----------------
async function fixMeterAction(){
  const car = String(document.getElementById("fixCar").value || "").trim();
  const meter = String(document.getElementById("fixMeter").value || "").trim();

  if(!car || meter === ""){
    alert("車両とメーターを入力してください");
    return;
  }

  try{
    await jsonp(
      GAS + "?type=fixMeter" +
      "&car=" + encodeURIComponent(car) +
      "&meter=" + encodeURIComponent(meter)
    );

    alert("更新OK");
    document.getElementById("fixCar").value = "";
    document.getElementById("fixMeter").value = "";
    latestInit = null;
    await load(true);
  }catch(e){
    alert("更新失敗");
    console.error(e);
  }
}

// ---------------- 同乗者追加 ----------------
async function addPassenger(){
  const group = String(document.getElementById("pGroup").value || "").trim();
  const name = String(document.getElementById("pName").value || "").trim();

  if(!group || !name){
    alert("グループと名前を入力してください");
    return;
  }

  try{
    await jsonp(
      GAS + "?type=addPassenger" +
      "&group=" + encodeURIComponent(group) +
      "&name=" + encodeURIComponent(name)
    );

    alert("追加OK");
    document.getElementById("pName").value = "";
    await loadGroups();
  }catch(e){
    alert("追加失敗");
    console.error(e);
  }
}

// ---------------- 行き先追加 ----------------
async function addDestination(){
  const name = String(document.getElementById("dName").value || "").trim();

  if(!name){
    alert("行き先を入力してください");
    return;
  }

  try{
    await jsonp(GAS + "?type=addDestination&name=" + encodeURIComponent(name));
    alert("追加OK");
    document.getElementById("dName").value = "";
  }catch(e){
    alert("追加失敗");
    console.error(e);
  }
}

// ---------------- 用件追加 ----------------
async function addPurpose(){
  const name = String(document.getElementById("uName").value || "").trim();

  if(!name){
    alert("用件を入力してください");
    return;
  }

  try{
    await jsonp(GAS + "?type=addPurpose&name=" + encodeURIComponent(name));
    alert("追加OK");
    document.getElementById("uName").value = "";
  }catch(e){
    alert("追加失敗");
    console.error(e);
  }
}

// ---------------- CSV ----------------
function downloadCSV(){
  window.open(GAS + "?type=csv");
}

function downloadCarCSV(){
  const select = document.getElementById("csvCar");
  const car = select ? select.value : "";

  if(!car){
    alert("車両を選択してください");
    return;
  }

  window.open(GAS + "?type=csvCar&car=" + encodeURIComponent(car));
}

function downloadCarMonthCSV(){
  const car = document.getElementById("csvCarMonth").value;
  const month = document.getElementById("csvMonth").value;

  if(!car){
    alert("車両を選択してください");
    return;
  }

  if(!month){
    alert("月を選択してください");
    return;
  }

  window.open(
    GAS + "?type=csvCarMonth" +
    "&car=" + encodeURIComponent(car) +
    "&month=" + encodeURIComponent(month)
  );
}

// ---------------- logout ----------------
function logout(){
  localStorage.clear();
  location.href = "index.html";
}

// ---------------- 初期化 ----------------
window.onload = async () => {
  initMap();
  await load(true);
  await loadGroups();

  if(refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    load(true);
  }, 5000);
};
