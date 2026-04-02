const GAS = "https://script.google.com/macros/s/AKfycby-ApxknjJjXxRJtMSkwC62tzzGuRGLffGKE0Qq5duhv8dw7G-w4yHKA166Bx0WZkM/exec";

function jsonp(url){
  return new Promise((resolve, reject) => {
    const cb = "cb_" + Math.random().toString(36).substring(2);
    const s = document.createElement("script");

    window[cb] = data => {
      resolve(data);
      try{ delete window[cb]; }catch(e){}
      s.remove();
    };

    s.src = url + "&callback=" + cb + "&t=" + Date.now();

    s.onerror = function(){
      try{ delete window[cb]; }catch(e){}
      s.remove();
      reject(new Error("JSONP error"));
    };

    document.body.appendChild(s);
  });
}

// 一覧
async function load(){
  const list = document.getElementById("list");
  const d = await jsonp(GAS + "?type=reservations");
  list.innerHTML = (d || []).map(x =>
    `${x.date} ${x.start}-${x.end}<br>🚗 ${x.car} / 👤 ${x.user}<br>📌 ${x.purpose || ""}<hr>`
  ).join("");
}

// 車両
async function initCars(){
  const data = await jsonp(GAS + "?type=init");
  const car = document.getElementById("car");
  car.innerHTML = "";
  (data.cars || []).forEach(c => {
    const o = document.createElement("option");
    o.value = c;
    o.textContent = c;
    car.appendChild(o);
  });
}

// 追加
async function addReservation(){
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const date = document.getElementById("date").value;
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;
  const car = document.getElementById("car").value;
  const purpose = document.getElementById("purpose").value;

  const res = await jsonp(
    GAS + "?type=addReservation" +
    "&date=" + encodeURIComponent(date) +
    "&start=" + encodeURIComponent(start) +
    "&end=" + encodeURIComponent(end) +
    "&car=" + encodeURIComponent(car) +
    "&user=" + encodeURIComponent(user.name || "") +
    "&purpose=" + encodeURIComponent(purpose)
  );

  if(res.status === "conflict"){
    alert("予約済み");
    return;
  }

  alert("OK");
  load();
}

function logout(){
  localStorage.clear();
  location.href = "index.html";
}

window.onload = () => {
  load();
  initCars();
};
