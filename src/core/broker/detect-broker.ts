import { Broker, type BrokerParser } from "../../types/broker.js";
import { extractHeaders } from "../../utils/csv-utils.js";
import { parseIbkr } from "./ibkr.js";
import { parseZerodha } from "./zerodha.js";

const BROKER_REGISTRY: BrokerParser[] = [
  {
    name: Broker.ZERODHA,
    requiredHeaders: ["symbol", "trade_date", "trade_type", "quantity", "price", "exchange"],
    parse: parseZerodha,
  },
  {
    name: Broker.IBKR,
    requiredHeaders: ["TradeID", "Symbol", "DateTime", "Quantity", "TradePrice", "Currency"],
    parse: parseIbkr,
  },
];

export function detectBroker(csvText: string) {
  const headers = extractHeaders(csvText);
  const headerSet = new Set(headers);

  for (const broker of BROKER_REGISTRY) {
    const allPresent = broker.requiredHeaders.every((h) => headerSet.has(h));
    if (allPresent) return broker;
  }

  const knownFormats = BROKER_REGISTRY.map((b) => b.name).join(", ");
  throw new Error(
    `Unrecognized CSV format. Headers found: [${headers.join(", ")}]. ` +
      `Supported formats: ${knownFormats}.`
  );
}