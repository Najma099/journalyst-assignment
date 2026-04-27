import { type Request, type Response, type NextFunction } from "express";
import { extractBrokerCSV } from "../core/broker/index.js";

export const brokerImport = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    if (!req.file) {
      res
        .status(400)
        .json({ error: "No file uploaded. Use field name 'file'." });
      return;
    }

    const csvText = req.file.buffer.toString("utf-8");
    const result = extractBrokerCSV(csvText);

    // 200 even when some rows fail — partial success is still success
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
