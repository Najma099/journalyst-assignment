import { TradeSchema, type Trade } from "../../schema/broker-trade.js";
import { Broker, type ParseResult } from "../../types/broker.js";
import { parseCsvRows } from "../../utils/csv-utils.js";

const BROKER_NAME = Broker.ZERODHA;

// Zerodha uses DD-MM-YYYY dates with no time component.
// We treat all trades as executed at midnight IST (UTC+5:30).
function parseZerodhaDate(raw: string): string {
  const match = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) {
    throw new Error(`Invalid date: '${raw}'`);
  }
  const [, dd, mm, yyyy] = match;
  if (!dd || !mm || !yyyy) throw new Error(`Invalid date format: ${raw}`);

  // Validate calendar ranges before constructing ISO string
  const day = parseInt(dd, 10);
  const month = parseInt(mm, 10);
  const year = parseInt(yyyy, 10);
  
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Invalid date: '${raw}'`);
  }
  // Use UTC midnight — consumers can apply IST offset if needed
  return `${yyyy}-${mm}-${dd}T00:00:00.000Z`;
}

function normalizeSide(raw: string): "BUY" | "SELL" {
  const upper = raw.toUpperCase();
  if (upper === "BUY") return "BUY";
  if (upper === "SELL") return "SELL";
  throw new Error(`Unrecognized trade_type: '${raw}'`);
}

/**
 * Zerodha always trades on NSE or BSE → currency is always INR.
 * The CSV does not include a currency column; we infer it from the exchange.
 */
function inferCurrency(exchange: string): string {
  const upper = exchange.toUpperCase();
  if (upper === "NSE" || upper === "BSE") return "INR";
  throw new Error(`Unknown exchange for currency inference: '${exchange}'`);
}

export function parseZerodhaRow(
  raw: Record<string, string>,
  rowIndex: number,
): ParseResult {
  try {
    const symbol = raw["symbol"]?.trim();
    if (!symbol) throw new Error("Missing symbol");

    const side = normalizeSide(raw["trade_type"] ?? "");
    const quantity = parseFloat(raw["quantity"] ?? "");
    if (!isFinite(quantity)) throw new Error("Missing or invalid quantity");
    if (quantity <= 0)
      throw new Error(`Quantity must be positive, got ${quantity}`);

    const price = parseFloat(raw["price"] ?? "");
    if (!isFinite(price) || price <= 0)
      throw new Error("Missing or invalid price");

    const executedAt = parseZerodhaDate(raw["trade_date"] ?? "");
    const currency = inferCurrency(raw["exchange"] ?? "");

    // For sells the total flows out, so we negate
    const totalAmount =
      side === "SELL" ? -(quantity * price) : quantity * price;

    const trade = TradeSchema.parse({
      symbol,
      side,
      quantity,
      price,
      totalAmount,
      currency,
      executedAt,
      broker: BROKER_NAME,
      rawData: raw,
    } satisfies Trade);

    return { ok: true, trade, rowIndex };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { ok: false, rowIndex, reason };
  }
}

export function parseZerodha(csvText: string): ParseResult[] {
  const rows = parseCsvRows(csvText);
  return rows.map((raw, idx) => parseZerodhaRow(raw, idx + 2)); // +2: 1-based + header row
}
