var express = require("express"); // імпортує модуль "express" з бібліотеки Node.js, яка дозволяє створювати веб-додатки та API за допомогою Node.js
var app = express(); //створює новий екземпляр додатку Express із допомогою функції, яка була імпортована з модуля "express".

var http = require("http").Server(app); //створює новий екземпляр сервера HTTP з модуля "http" в Node.js і передає йому додаток Express, який був створений раніше з використанням функції express().
var io = require("socket.io")(http); //імпортує та створює новий екземпляр модуля Socket.IO і передає йому сервер HTTP, який був створений раніше за допомогою модуля "http".

app.use(express.static("public")); //встановлює директиву middleware (проміжний обробник) в додатку Express, який вказує на те, що статичні ресурси (такі як HTML, CSS, JavaScript, зображення) будуть знаходитись у папці з назвою "public" в кореневій директорії додатку.

//встановлює маршрут у додатку Express, який буде відповідати за запити до кореневого шляху ("/") на веб-сайті. Коли користувач відправляє запит на адресу, цей маршрут буде оброблювати запит та відправляти файл "index.html" до клієнта.
app.get("/", function (req, res) {
  res.sendFile(__dirname + "/index.html");
});

var answer = "";
var ruller = -1;
var started = false;
var gamers = 1;

//функція скидання
function wipe() {
  ruller = -1; // початок, не визначено автора
  started = false; //гра не почалася
  gamers = 1; //кількість гравців на початку
  answer = ""; // відповідь
  io.emit("gamers", gamers); //відправляє повідомлення з назвою gamers до всіх підключених клієнтів за допомогою фреймворку socket.io.
}

//відповідає за обробку події "connection" (з'єднання) на сервері за допомогою фреймворку socket.io.

//викликається при кожному підключенні клієнта до сервера. Параметр socket цієї функції представляє собою об'єкт, який відповідає за комунікацію з підключеним клієнтом.
io.on("connection", function (socket) {
  socket.on("create", function (msg) {
    if (ruller < 0) {
      answer = msg;
      socket.emit("transform_wait");
      socket.broadcast.emit("transform_join", false);
      ruller = socket.id; //встановлює ruller в ID сокета підключеного клієнта, який розпочав гру
      gamers = 1; //к-ть гравців = 1
    } else {
      socket.emit("alert", "Вже йде сеанс гри");
      socket.emit("transform_join", false);
    }
  });

  // відповідає за обробку події "join" на сервері за допомогою фреймворку socket.io.

  socket.on("join", function () {
    if (!started) {
      io.to(ruller).emit("trasform_start");
      socket.emit("transform_wait");
      io.emit("gamers", ++gamers);
    } else {
      socket.emit("transform_slave");
      io.emit("gamers", ++gamers);
    }
  });

  //початок гри
  socket.on("start", function () {
    if (gamers > 1) {
      started = true;
      socket.emit("transform_master");
      socket.broadcast.emit("transform_slave");
    } else {
      socket.emit("alert", "Недостатно гравців");
    }
  });

  //обробка кнопок
  socket.on("send message", function (msg) {
    io.emit("receive message", msg);
    io.to(ruller).emit("allow");
    io.emit("block_slave");
  });
  socket.on("yes", function () {
    io.emit("receive message", "Так");
    io.emit("allow_slave");
  });
  socket.on("no", function () {
    io.emit("receive message", "Ні");
    io.emit("allow_slave");
  });
  socket.on("incorrect", function () {
    io.emit("receive message", "Запитання некоректне");
    io.emit("allow_slave");
  });
  socket.on("finish", function () {
    io.emit("finish", answer);
    wipe();
  });

  //вихід ведучого або залишився тільки ведучий
  socket.on("disconnect", function () {
    if (started) {
      if (socket.id == ruller) {
        io.emit("gamers", 1);
        io.emit("finish", answer);
        io.emit("alert", "Ведучий вибув");
        wipe();
      } else {
        --gamers;
        if (gamers < 2) {
          gamers = 1;
          io.emit("gamers", gamers);
          io.emit("alert", "Немає інших гравців");
        }
      }
    }
  });
});

http.listen(3000);
