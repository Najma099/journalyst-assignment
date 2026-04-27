import type { NextFunction, Response, Request } from "express";

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const message = err instanceof Error ? err.message : "Internal server error";
  const statusCode = deriveStatusCode(message);
  res.status(statusCode).json({ error: message });
};

function deriveStatusCode(message: string): number {
  if (message.startsWith("Empty file") || message.startsWith("Unrecognized CSV")) return 400;
  return 500;
}