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

async function load(){
  const list = document.getElementById("list");
  const d = await jsonp(GAS + "?type=board");
  list.innerText = (d || []).map(x => x.msg).join("\n");
}

async function postMessage(){
  const msg = document.getElementById("msg");
  const text = String(msg.value || "").trim();
  if(!text) return;

  await jsonp(GAS + "?type=board&msg=" + encodeURIComponent(text));
  msg.value = "";
  load();
}

function logout(){
  localStorage.clear();
  location.href = "index.html";
}

load();
