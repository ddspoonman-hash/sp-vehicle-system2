const GAS="https://script.google.com/macros/s/AKfycbwbMFxKiQlT_hpb_iNjljeEvKZ7LMr9q8i2KpdW6iWrO6d3pv40iun7SLRTFAstn9C5/exec";

let init;
let gpsTimer=null;

// JSONP
function jsonp(url){
return new Promise(res=>{
const cb="cb_"+Date.now();
window[cb]=d=>{res(d);delete window[cb];};
const s=document.createElement("script");
s.src=url+"&callback="+cb+"&t="+Date.now();
document.body.appendChild(s);
});
}

window.onload=async()=>{

const user=JSON.parse(localStorage.getItem("user"));
if(!user){location.href="index.html";return;}

// init
init=await jsonp(GAS+"?type=init");

// driver
const driver=document.getElementById("driverName");
if(driver){
driver.innerHTML="";
const def=document.createElement("option");
def.textContent="運転者を選択";
driver.appendChild(def);

init.drivers.forEach(d=>{
const o=document.createElement("option");
o.value=d.name;
o.textContent=`${d.name}（${d.dept}）`;
driver.appendChild(o);
});
}

// car
const car=document.getElementById("car");
if(car){
car.innerHTML="";
init.cars.forEach(c=>{
const o=document.createElement("option");
o.value=c;
o.textContent=c;
car.appendChild(o);
});

car.onchange=async()=>{
const m=await jsonp(GAS+"?type=meter&car="+encodeURIComponent(car.value));
document.getElementById("meter").value=m;
};

car.dispatchEvent(new Event("change"));
}

// arrival画面
if(document.getElementById("endMeter")){
const carName=localStorage.getItem("lastCar");

const m=await jsonp(GAS+"?type=meter&car="+encodeURIComponent(carName));
document.getElementById("endMeter").value=m;

// GPS
localStorage.setItem("gpsLog","[]");

gpsTimer=setInterval(()=>{
navigator.geolocation.getCurrentPosition(pos=>{
let log=JSON.parse(localStorage.getItem("gpsLog"));
log.push({lat:pos.coords.latitude,lng:pos.coords.longitude});
localStorage.setItem("gpsLog",JSON.stringify(log));
});
},30000);
}

};

// 出発
function start(){

const user=JSON.parse(localStorage.getItem("user"));

const car=carEl().value;
const driver=driverEl().value||user.name;
const meter=meterEl().value;

const s=document.createElement("script");
s.src=GAS+"?type=start"
+"&car="+encodeURIComponent(car)
+"&driver="+encodeURIComponent(driver)
+"&dept="+encodeURIComponent(user.dept)
+"&startMeter="+meter
+"&t="+Date.now();

document.body.appendChild(s);

localStorage.setItem("lastCar",car);
location.href="driver_arrival.html";
}

// 到着
function arrival(){

const gpsLog=JSON.parse(localStorage.getItem("gpsLog")||"[]");
const car=localStorage.getItem("lastCar");

const s=document.createElement("script");
s.src=GAS+"?type=arrival"
+"&car="+encodeURIComponent(car)
+"&gpsLog="+encodeURIComponent(JSON.stringify(gpsLog))
+"&t="+Date.now();

document.body.appendChild(s);

alert("完了");
location.href="driver_start.html";
localStorage.removeItem("gpsLog");
}

function logout(){
localStorage.clear();
location.href="index.html";
}

function carEl(){return document.getElementById("car");}
function driverEl(){return document.getElementById("driverName");}
function meterEl(){return document.getElementById("meter");}
