let initCache=null;
let loading=false;

async function load(force=false){
  if(loading) return;
  loading=true;

  try{
    if(!initCache||force){
      initCache=await jsonp(GAS+"?type=init");
    }

    render(initCache);

  }finally{
    loading=false;
  }
}

function render(data){
  const r=data.running||[];
  const div=document.getElementById("running");

  if(r.length===0){
    div.innerHTML="なし";
    return;
  }

  div.innerHTML=r.map(x=>
    `車両:${x.car}<br>運転者:${x.driver}<hr>`
  ).join("");
}

setInterval(()=>load(false),5000);
