import path from "path";
import express from "express";
import http from "http";
// @ts-ignore
import { JIFFServer, JIFFServerBigNumber } from "jiff-mpc";

const port = process.env.PORT || 8080;

const app = express();
const server = http.createServer(app);

app.use("/", express.static(path.join(__dirname)));

const jiffServer = new JIFFServer(server, { logs: true });
jiffServer.apply_extension(JIFFServerBigNumber);

server.listen(port, () => {
  console.log(`listening on *:${port}`);
});
