import express,  { type Request, type Response, type NextFunction } from "express";
import { errorHandler } from "./middleware/error-handler.middleware.js";
import routes from "./routes/index.js";

const app = express();

app.get("/", (_, res) => {
    res.status(200).send("Journalyst - Take Home Assignment");
});

app.use("/api", routes);

app.use(errorHandler);

export default app;