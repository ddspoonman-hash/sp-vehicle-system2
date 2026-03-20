const GAS="https://script.google.com/macros/s/AKfycbxkgNmKdoeilTzXtelG_1VZNu8MHP0wxxkPNLaS-OY4Ix2V08bxJx7CyYMlozKyirLN/exec";

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
const d=await jsonp(GAS+"?type=board");
list.innerText=d.map(x=>x.msg).join("\n");
}

function post(){

const s=document.createElement("script");
s.src=
GAS+"?type=board"
+"&msg="+encodeURIComponent(msg.value)
+"&t="+Date.now();

document.body.appendChild(s);

msg.value="";
load();
}

function logout(){
localStorage.clear();
location.href="index.html";
}

window.onload=load;
