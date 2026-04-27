# Broker CSV Trade Import Service

A TypeScript service that normalises broker trade export CSVs into a standardised format.

---

## Quick Start

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9

### Install dependencies

```bash
npm install
```

### Run the server (development)

```bash
npm run dev
# Server starts at http://localhost:3000
```

### Run the server (production build)

```bash
npm run build
npm start
```

### Run tests

```bash
npm test
```

---

## API

### `POST /import`

Upload a broker CSV file and receive normalised trades.

**Request** — `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| `file` | File | The broker CSV file |

**Example with curl**

```bash
curl -X POST http://localhost:3000/import \
  -F "file=@zerodha_trades.csv"
```

**Response shape**

```json
{
  "broker": "zerodha",
  "summary": {
    "total": 7,
    "valid": 5,
    "skipped": 2
  },
  "trades": [
    {
      "symbol": "RELIANCE",
      "side": "BUY",
      "quantity": 10,
      "price": 2450.50,
      "totalAmount": 24505,
      "currency": "INR",
      "executedAt": "2026-04-01T00:00:00.000Z",
      "broker": "zerodha",
      "rawData": { "trade_id": "TRD001", "..." : "..." }
    }
  ],
  "errors": [
    { "row": 7, "reason": "Invalid date: 'invalid_date'" },
    { "row": 8, "reason": "Quantity must be positive, got -5" }
  ]
}
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | No file uploaded |
| 400 | Empty file |
| 400 | Unrecognised CSV format |
| 500 | Internal server error |

---

## Supported Brokers

| Broker | Detection columns |
|--------|-------------------|
| `zerodha` | `symbol`, `trade_date`, `trade_type`, `quantity`, `price`, `exchange` |
| `ibkr` | `TradeID`, `Symbol`, `DateTime`, `Quantity`, `TradePrice`, `Currency` |

Broker detection is automatic — the service inspects the CSV header row and matches it against the registry.

---

## Design Decisions

### 1. Error-first architecture

Each row parser returns a `ParseResult` — either `{ ok: true, trade }` or `{ ok: false, reason }`. No exceptions escape the per-row boundary. This means a single bad row never prevents valid rows from being returned. Financial data is dirty; partial success is the norm.

### 2. Broker detection pattern (easy to extend)

All broker parsers are registered in `src/core/broker/detect-broker.ts` as `BrokerParser` objects:

```ts
interface BrokerParser {
  name: string;
  requiredHeaders: string[];   // used for auto-detection
  parse: (csvText: string) => ParseResult[];
}
```

**To add Broker C:**
1. Create `src/core/broker/brokerC.ts` and export a `parseBrokerC` function.
2. Add one entry to the `BROKER_REGISTRY` array in `registry.ts`.
3. Done — no other files change.

### 3. `rawData` stores everything

Every original column from the CSV is stored verbatim in `rawData`, including extra columns the schema doesn't know about (e.g. IBKR's `Commission`, `AccountID`, `AssetClass`). Nothing is thrown away.

### 4. `totalAmount` sign convention

SELL trades produce a negative `totalAmount` (`-(quantity × price)`). This matches standard double-entry bookkeeping — cash flows in on a sell mean the asset position flows out.

### 5. Date normalisation

- **Zerodha** uses `DD-MM-YYYY` with no time. We emit UTC midnight (`T00:00:00.000Z`) since IST timezone is not in the CSV.
- **IBKR** uses ISO 8601 with timezone for most rows, and `MM/DD/YYYY` (no time) for some. We handle both and normalise to ISO 8601.

### 6. Framework choice

Express + Multer — stable, well-typed, minimal footprint. The HTTP layer is thin on purpose; all logic lives in `importService.ts` and the parser files, making them testable without spinning up a server.

---

## Project Structure

```
src/
  index.ts            # Server entry point
  app.ts              # Express app + POST /import route
  importService.ts    # Core orchestration (detect → parse → respond)
  types/
    trade.ts          # Zod schema, Trade type, ParseResult, ImportResponse
  parsers/
    registry.ts       # Broker registry + auto-detection
    csvUtils.ts       # CSV parsing utilities
    zerodha.ts        # Zerodha parser
    ibkr.ts           # IBKR parser
tests/
  fixtures.ts         # Sample CSVs
  zerodha.test.ts     # Zerodha parser unit tests
  ibkr.test.ts        # IBKR parser unit tests
  detection.test.ts   # Auto-detection unit tests
  api.test.ts         # End-to-end API integration tests
```
