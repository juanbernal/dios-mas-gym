import express from "express";

const app = express();
const PORT = 3005;

app.get("/api/test", (req, res) => {
  res.json({ message: "API is working on 3005" });
});

app.get("*", (req, res) => {
  res.send("<h1>Dios Mas Gym - Debug Server</h1>");
});

app.listen(PORT, () => {
  console.log(`Debug server running on http://localhost:${PORT}`);
});
