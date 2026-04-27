import type { Trade } from "../schema/broker-trade.js";

export enum Broker {
  IBKR = "IBKR",
  ZERODHA = "ZERODHA",
  UNKNOWN = "UNKNOWN",
}

export interface BrokerParser {
  name: Broker;
  requiredHeaders: string[];
  parse: (csvText: string) => ParseResult[];
}


export interface ParsedRow {
  rowIndex: number;
  raw: Record<string, string>;
}

export interface ParseSuccess {
  ok: true;
  trade: Trade;
  rowIndex: number;
}

export interface ParseFailure {
  ok: false;
  rowIndex: number;
  reason: string;
}

export type ParseResult = ParseSuccess | ParseFailure;

export interface ImportResponse {
  broker: string;
  summary: {
    total: number;
    valid: number;
    skipped: number;
  };
  trades: Trade[];
  errors: Array<{ row: number; reason: string }>;
}

