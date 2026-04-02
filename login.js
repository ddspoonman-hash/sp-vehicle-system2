const GAS = "https://script.google.com/macros/s/AKfycby-ApxknjJjXxRJtMSkwC62tzzGuRGLffGKE0Qq5duhv8dw7G-w4yHKA166Bx0WZkM/exec";

function login(){
  const id = String(document.getElementById("id").value || "").trim();
  const pass = String(document.getElementById("pass").value || "").trim();

  window.handleLogin = function(list){
    const user = (list || []).find(u =>
      String(u.id || "").trim() === id &&
      String(u.pass || "").trim() === pass
    );

    if(!user){
      alert("IDまたはPASS違う");
      return;
    }

    localStorage.setItem("user", JSON.stringify(user));

    if(String(user.id || "").trim().toLowerCase() === "admin"){
      location.href = "admin.html";
    }else{
      location.href = "driver_start.html";
    }
  };

  const script = document.createElement("script");
  script.src = GAS + "?type=drivers&callback=handleLogin&t=" + Date.now();
  script.onerror = function(){
    alert("ログイン通信に失敗しました");
  };
  document.body.appendChild(script);
}
