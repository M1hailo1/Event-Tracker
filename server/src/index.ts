import express from "express";

const app = express();
const PORT = 3000;

app.get("/", (req, res) => {
  res.end("proverica");
});

app.listen(PORT, () => console.log("Srvr runnuje na portu", PORT));
