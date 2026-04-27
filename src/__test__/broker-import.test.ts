import request from "supertest";
import { ZERODHA_CSV, IBKR_CSV } from "./broker-data.js";
import app from "../app.js";
import { Broker, type ImportResponse } from "../types/broker.js";

describe("POST /import", () => {
  describe("Zerodha CSV", () => {
    let response: request.Response;
    let body: ImportResponse;

    beforeAll(async () => {
      response = await request(app)
        .post("/import")
        .attach("file", Buffer.from(ZERODHA_CSV), { filename: "zerodha.csv", contentType: "text/csv" });
      body = response.body as ImportResponse;
    });

    it("returns HTTP 200", () => {
      expect(response.status).toBe(200);
    });

    it("identifies the broker as zerodha", () => {
      expect(body.broker).toBe(Broker.ZERODHA);
    });

    it("reports correct summary counts", () => {
      expect(body.summary.total).toBe(7);
      expect(body.summary.valid).toBe(5);
      expect(body.summary.skipped).toBe(2);
    });

    it("returns 5 trade objects", () => {
      expect(body.trades).toHaveLength(5);
    });

    it("returns 2 error objects", () => {
      expect(body.errors).toHaveLength(2);
    });

    it("error objects have row number and reason", () => {
      for (const err of body.errors) {
        expect(typeof err.row).toBe("number");
        expect(typeof err.reason).toBe("string");
        expect(err.reason.length).toBeGreaterThan(0);
      }
    });
  });

  describe("IBKR CSV", () => {
    let response: request.Response;
    let body: ImportResponse;

    beforeAll(async () => {
      response = await request(app)
        .post("/import")
        .attach("file", Buffer.from(IBKR_CSV), { filename: "ibkr.csv", contentType: "text/csv" });
      body = response.body as ImportResponse;
    });

    it("returns HTTP 200", () => {
      expect(response.status).toBe(200);
    });

    it("identifies the broker as ibkr", () => {
      expect(body.broker).toBe(Broker.IBKR);
    });

    it("reports correct summary counts", () => {
      expect(body.summary.total).toBe(6);
      expect(body.summary.valid).toBe(5);
      expect(body.summary.skipped).toBe(1);
    });
  });

  describe("Edge cases", () => {
    it("returns 400 when no file is uploaded", async () => {
      const res = await request(app).post("/import");
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/no file/i);
    });

    it("returns 400 for an empty file", async () => {
      const res = await request(app)
        .post("/import")
        .attach("file", Buffer.from(""), { filename: "empty.csv", contentType: "text/csv" });
      expect(res.status).toBe(400);
    });

    it("returns 400 for an unrecognized CSV format", async () => {
      const unknown = "col1,col2\nval1,val2";
      const res = await request(app)
        .post("/import")
        .attach("file", Buffer.from(unknown), { filename: "unknown.csv", contentType: "text/csv" });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/unrecognized/i);
    });

    it("returns 200 with 0 trades for a CSV with only a header row", async () => {
      const headerOnly = "symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment";
      const res = await request(app)
        .post("/import")
        .attach("file", Buffer.from(headerOnly), { filename: "header_only.csv", contentType: "text/csv" });
      expect(res.status).toBe(200);
      expect(res.body.summary.total).toBe(0);
      expect(res.body.trades).toHaveLength(0);
    });

    it("returns 200 with all rows in errors for an all-invalid CSV", async () => {
      const allBad = [
        "symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment",
        "X,,-999,buy,-1,-1,T1,O1,NSE,EQ",
        "Y,,bad_date,sell,-5,-5,T2,O2,BSE,EQ",
      ].join("\n");

      const res = await request(app)
        .post("/import")
        .attach("file", Buffer.from(allBad), { filename: "all_bad.csv", contentType: "text/csv" });
      expect(res.status).toBe(200);
      expect(res.body.summary.valid).toBe(0);
      expect(res.body.errors.length).toBeGreaterThan(0);
    });

    it("handles a single valid Zerodha row correctly", async () => {
      const singleRow = [
        "symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment",
        "RELIANCE,INE002A01018,01-04-2026,buy,10,2450.50,TRD001,ORD001,NSE,EQ",
      ].join("\n");

      const res = await request(app)
        .post("/import")
        .attach("file", Buffer.from(singleRow), { filename: "single.csv", contentType: "text/csv" });
      expect(res.status).toBe(200);
      expect(res.body.summary.total).toBe(1);
      expect(res.body.summary.valid).toBe(1);
      expect(res.body.trades[0].symbol).toBe("RELIANCE");
    });
  });
});
