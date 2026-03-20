const GAS="https://script.google.com/macros/s/AKfycbwbMFxKiQlT_hpb_iNjljeEvKZ7LMr9q8i2KpdW6iWrO6d3pv40iun7SLRTFAstn9C5/exec";

function jsonp(url){
return new Promise(res=>{
const cb="cb_"+Date.now();
window[cb]=d=>{res(d);delete window[cb];};
const s=document.createElement("script");
s.src=url+"&callback="+cb+"&t="+Date.now();
document.body.appendChild(s);
});
}

// 一覧
async function load(){
const d=await jsonp(GAS+"?type=reservations");

list.innerHTML=d.map(x=>`
${x.date} ${x.start}-${x.end}<br>
🚗 ${x.car} / 👤 ${x.user}<br>
📌 ${x.purpose || ""}<hr>
`).join("");
}

// 車両
async function initCars(){
const data=await jsonp(GAS+"?type=init");

car.innerHTML="";
data.cars.forEach(c=>{
const o=document.createElement("option");
o.value=c;
o.textContent=c;
car.appendChild(o);
});
}

// 追加
function addReservation(){

const user=JSON.parse(localStorage.getItem("user"));

const s=document.createElement("script");
s.src=
GAS+"?type=addReservation"
+"&date="+date.value
+"&start="+start.value
+"&end="+end.value
+"&car="+encodeURIComponent(car.value)
+"&user="+encodeURIComponent(user.name)
+"&purpose="+encodeURIComponent(purpose.value)
+"&t="+Date.now();

document.body.appendChild(s);

alert("予約OK");
load();
}

function logout(){
localStorage.clear();
location.href="index.html";
}

window.onload=()=>{
load();
initCars();
};
