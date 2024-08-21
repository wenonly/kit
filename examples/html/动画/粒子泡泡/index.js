import "./style.css";

var data = []; //data用来存储每一个点的数据，x,y,r,xv,yv,op,clr颜色
let c, ctx;

document.addEventListener("DOMContentLoaded", function () {
  c = document.querySelector("#cv");
  c.setAttribute("width", window.innerWidth);
  c.setAttribute("height", window.innerHeight);
  ctx = c.getContext("2d");
  update();

  setInterval(function () {
    addNode(Math.random() * c.width, Math.random() * c.height, 5);
  }, 300);
});

document.addEventListener("click", (e) => {
  addNode(e.clientX, e.clientY, 5);
});

function update() {
  for (var i = data.length - 1; i >= 0; i--) {
    data[i][0] += data[i][3];
    data[i][1] += data[i][4];
    data[i][5] -= 0.01;
    if (data[i][5] < 0) {
      data.splice(i, 1);
    }
  }
  ctx.clearRect(0, 0, c.width, c.height);
  drawNodes();
  requestAnimationFrame(update);
}

// 新增node
function addNode(x, y, num) {
  var di = [];
  for (var i = 0; i < num; i++) {
    di = [];
    di.push(x);
    di.push(y);
    di.push(Math.floor((Math.random() + 0.1) * 23)); //半径
    var v = Math.abs((Math.random() + 0.5) * 5); // 速度
    var a = Math.random() * 2 * Math.PI; // 角度
    di.push(Math.floor(Math.cos(a) * v)); // x方向速度
    di.push(Math.floor(Math.sin(a) * v)); // y方向速度
    di.push(1);
    di.push(color16());
    data.push(di);
  }
}

//根据data画圆
function drawNodes() {
  for (var i = 0; i < data.length; i++) {
    drawNode(ctx, data[i][0], data[i][1], data[i][2], data[i][5], data[i][6]);
  }
}

//画随机大小随机颜色的圆
function drawNode(context, x, y, r, op, c) {
  context.beginPath();
  context.arc(x, y, r, 0, 2 * Math.PI);
  context.globalAlpha = op;
  context.strokeStyle = c;
  context.fillStyle = c;
  context.shadowColor = c;
  context.shadowBlur = Math.random() * 20;
  context.fill();
  context.stroke();
  return r;
}

//十六进制颜色随机
function color16() {
  var r = Math.floor(Math.random() * 256);
  var g = Math.floor(Math.random() * 256);
  var b = Math.floor(Math.random() * 256);
  var color = "#" + r.toString(16) + g.toString(16) + b.toString(16);
  return color;
}
