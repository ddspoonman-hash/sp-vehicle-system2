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

async function load(){

const data=await jsonp(GAS+"?type=init");

const div=document.getElementById("running");
div.innerHTML="";

data.running.forEach(r=>{
div.innerHTML+=`車両：${r.car}<br>運転者：${r.driver}<hr>`;
});
}

window.onload=()=>{
load();
setInterval(load,5000);
};
