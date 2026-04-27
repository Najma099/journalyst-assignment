import brokerParseRoute from "./broker-parse.route.js";
import { Router } from "express";

const router = Router();

router.use("/broker", brokerParseRoute);

export default router;
