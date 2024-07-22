var path = require("path");
var express = require("express");
var app = express();
var http = require("http").Server(app);

app.use("/", express.static(path.join(__dirname)));

const { JIFFServer, JIFFServerBigNumber } = require("jiff-mpc");
const jiffServer = new JIFFServer(http, { logs: true });
jiffServer.apply_extension(JIFFServerBigNumber);

http.listen(8080, function () {
  console.log("listening on *:8080");
});
