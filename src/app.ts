import express from "express";
import { errorHandler } from "./middleware/error-handler.middleware.js";
import { extractFile } from "./middleware/extract-file.middleware.js";
import { brokerImport } from "./controllers/broker-import.controller.js";

const app = express();

app.get("/", (_, res) => {
  res.status(200).send("Journalyst - Take Home Assignment");
});


app.use("/import", extractFile.single("file"), brokerImport);

app.use((req, res, next) => {
  res.status(404);
  next(new Error("Route not found"));
})
// Error handler
app.use(errorHandler);

export default app;