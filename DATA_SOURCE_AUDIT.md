# Data Source Interface Audit
**Files reviewed:** `SerialDataSource.js`, `SimulationDataSource.js`, `WiFiDataSource.js`, `DataSourceManager.js`

---

## 1. `'data'` Event — Payload Shape

This is the most critical interface since `DataSourceManager` pipelines it directly to `db.saveTelemetry()` and then to Socket.IO → `DashboardPage.tsx`.

| Field | SerialDataSource | SimulationDataSource | WiFiDataSource |
|---|---|---|---|
| `temperature` | ✅ Number | ✅ Number | ✅ Number |
| `humidity` | ✅ Number | ✅ Number | ✅ Number |
| `light` | ✅ Number | ✅ Number | ✅ Number |
| `gas` | ✅ Number | ✅ Number | ✅ Number |
| `moisture` | ✅ Number | ✅ Number | ✅ Number |
| `fan` | ✅ Boolean | ✅ Boolean | ✅ Boolean |
| `led` | ✅ Boolean | ✅ Boolean | ✅ Boolean |
| `status` | ✅ String | ✅ String | ✅ String |
| `timestamp` | ✅ ISO string | ✅ ISO string | ✅ ISO string |
| `riskScore` | ❌ **ABSENT** | ✅ Number (calculated internally) | ❌ **ABSENT** |

### 🚩 Inconsistency #1 — `riskScore` in the `'data'` event

`SimulationDataSource.tick()` injects `riskScore` into its `'data'` payload before emitting:
```js
// SimulationDataSource.js line 175-178
const packet = { ...this.state, riskScore, timestamp: ... };
this.emit('data', packet);
```

`SerialDataSource` and `WiFiDataSource` do **not** include `riskScore` in their `'data'` emit. Instead, `DataSourceManager.setupListeners()` calls `calculateRiskScore()` and adds it afterward:
```js
// DataSourceManager.js (setupListeners)
const riskScore = this.calculateRiskScore(data);
const fullPayload = { ...data, riskScore, mode: this.mode };
```

**Net effect:** When `SimulationDataSource` fires, `fullPayload.riskScore` is the value DataSourceManager recalculated **overwriting** the one Simulation already put in. So it works, but Simulation's internal risk calculation (`SimulationDataSource.calculateRiskScore()`) and DataSourceManager's (`DataSourceManager.calculateRiskScore()`) are **duplicate logic that must be kept in sync manually.**

The two implementations are currently close but not identical:

```js
// SimulationDataSource.js line 88 — humidity weight
const hWeight = Math.min(100, Math.max(0, (this.state.humidity / 100) * 100));
risk += hWeight * 0.35;
// = Math.min(100, humidity) * 0.35  ✓ same

// DataSourceManager.js line 162-169
risk += Math.min(100, h) * 0.35;                           // same
if (m < 400) risk += ((400 - m) / 400) * 100 * 0.25;      // ← DIFFERENT
// Simulation: const mRisk = m < 400 ? (1 - m/400) * 100 : 0;  → same value, different expression ✓
risk += Math.min(100, (g / 1023) * 100) * 0.25;           // same
risk += Math.min(100, (t / 50) * 100) * 0.15;             // same
```

The algorithms produce the same numbers, but they're maintained separately. Decision needed: **should `riskScore` be calculated only in DataSourceManager and removed from SimulationDataSource entirely, or should all three sources always include it?**

---

## 2. `'status'` Event — Payload Shape

| Field | SerialDataSource | SimulationDataSource | WiFiDataSource |
|---|---|---|---|
| `connected` | ✅ Boolean | ✅ Boolean | ✅ Boolean |
| `port` | ✅ String (COM3 etc.) | ✅ `'SIMULATOR_PORT_0'` | ✅ `'WIFI_HTTP'` |
| `message` | ✅ String | ✅ String | ✅ String |
| `baudRate` | ✅ (on connect success) | ❌ **ABSENT** | ❌ **ABSENT** |
| `error` | ✅ (on open failure) | ❌ **ABSENT** | ❌ **ABSENT** |
| `remoteIp` | ❌ **ABSENT** | ❌ **ABSENT** | ✅ (on first packet) |

### 🚩 Inconsistency #2 — `baudRate` and `error` in `'status'`

SerialDataSource emits `baudRate` on successful connect and `error` on failure. Neither SimulationDataSource nor WiFiDataSource emit those fields. `SocketContext.tsx` receives `'connection_status'` (DataSourceManager re-emits it) and only reads `.connected` and `.port`, so this does not crash anything currently — but `Header.tsx` has a check:
```tsx
mode === 'LIVE' ? 'Connect COM Port' : 'Disconnected'
```
That is mode-gated already. Not a runtime bug, but it means the type definition for `ConnectionStatus` in `iot.ts` has `baudRate?: number` that only ever gets populated from Serial.

### 🚩 Inconsistency #3 — `remoteIp` in WiFiDataSource `'status'`

WiFiDataSource emits `remoteIp` in its status event (line ~104 of WiFiDataSource.js). DataSourceManager's `setupListeners()` spreads the status event directly into what it re-emits to the frontend:
```js
this.emit('connection_status', { mode: this.mode, ...status });
```
So `remoteIp` **does** reach `SocketContext` and `ConnectionStatus` — but the `ConnectionStatus` TypeScript type in `iot.ts` has no `remoteIp` field. TypeScript doesn't catch this because the event comes in as a raw object from Socket.IO (untyped), so it silently passes through.

---

## 3. `'alert'` Event — Payload Shape

| Field | SerialDataSource | SimulationDataSource | WiFiDataSource | DataSourceManager |
|---|---|---|---|---|
| `type` | ✅ String | ✅ String | ✅ String | ✅ String |
| `message` | ✅ String | ✅ String | ✅ String | ✅ String |
| `severity` | ✅ String | ✅ String | ✅ String | ✅ String |
| `sensor` | ❌ **ABSENT** | ❌ **ABSENT** | ✅ (WIFI_TIMEOUT only) | ✅ (evaluateAlerts only) |

### 🚩 Inconsistency #4 — `sensor` field presence is uneven

`DataSourceManager.evaluateAlerts()` adds a `sensor` field (e.g. `"DHT11"`, `"MQ135"`). WiFiDataSource's watchdog alert adds `sensor` (implicitly absent — the WIFI_TIMEOUT alert has no sensor field). SimulationDataSource and SerialDataSource alerts never include `sensor`. The `Alert` TypeScript type marks it `sensor?: string` so it won't crash, but the Alert Event Log in `DashboardPage.tsx` may render nothing for `sensor` on those alerts.

---

## 4. Lifecycle Methods

| Method | BaseDataSource | SerialDataSource | SimulationDataSource | WiFiDataSource |
|---|---|---|---|---|
| `connect()` | abstract | ✅ | ✅ | ✅ |
| `disconnect()` | abstract | ✅ | ✅ | ✅ |
| `sendCommand(obj)` | abstract | ✅ writes to serial | ✅ updates state + ticks | ✅ queues to pending[] |
| `getStatus()` | base impl | ✅ overridden | ✅ overridden | ✅ overridden |
| `listAvailablePorts()` | ❌ absent | ✅ present | ❌ absent | ❌ absent |
| `handleIncomingData(line)` | ❌ absent | ✅ present (internal) | ❌ absent | ❌ absent |
| `handleIncoming(payload, ip)` | ❌ absent | ❌ absent | ❌ absent | ✅ present (public API) |
| `getPendingCommands()` | ❌ absent | ❌ absent | ❌ absent | ✅ present |
| `clearPendingCommands()` | ❌ absent | ❌ absent | ❌ absent | ✅ present |
| `updateSettings(obj)` | ❌ absent | ❌ absent | ✅ present | ❌ absent |
| `updateValues(obj)` | ❌ absent | ❌ absent | ✅ present | ❌ absent |
| `scheduleReconnect()` | ❌ absent | ✅ present (internal) | ❌ absent | ❌ absent |

### 🚩 Inconsistency #5 — `handleIncoming()` is WiFiDataSource-only, not on BaseDataSource

`DataSourceManager` calls `this.wifiSource.handleIncoming()` directly (not via the common `activeSource` interface). This is the correct design for a push/pull inversion, but it means `DataSourceManager` has **a typed coupling to `WiFiDataSource` specifically**, breaking the open/closed principle for future data sources. If you add a 4th source that also receives data via HTTP, you'd need to add another special-case branch.

### 🚩 Inconsistency #6 — `getStatus()` returns different shapes

```js
// SerialDataSource.getStatus()
{ name, connected, port, baudRate, lastPacketTime }

// SimulationDataSource.getStatus()
{ name, connected, port, state }          // ← includes full state snapshot

// WiFiDataSource.getStatus()
{ name, connected, port, remoteIp, lastPacketTime, packetCount, pendingCommands }
```

`DataSourceManager.getStatus()` returns `activeSourceStatus` which is whichever `getStatus()` was called. `SocketContext` spreads this into `connectionStatus` state. `DashboardPage.tsx` uses only `connectionStatus.connected` and `connectionStatus.port`, so the extra fields are ignored — but they make the response shape from `/api/status` inconsistent depending on active mode.

---

## 5. DataSourceManager — Active Source Guard Logic

### 🚩 Inconsistency #7 — CLOUD mode guard differs between `setupListeners` and `handleCloudTelemetry`

In `setupListeners`, the guard for whether to process an event is:
```js
if (source !== this.activeSource && !(this.mode === 'CLOUD' && source === this.wifiSource)) return;
```

But `handleCloudTelemetry` calls `this.wifiSource.handleIncoming()` directly, which bypasses this guard entirely — it fires the `'data'` event from `wifiSource`, which `setupListeners` then checks with the guard above. This **does work correctly** (the guard allows it through), but the flow is indirect and the guard condition is non-obvious.

### 🚩 Inconsistency #8 — `evaluateAlerts()` runs for ALL sources but ONLY for Simulation do similar checks exist in the source itself

`SimulationDataSource.reevaluate()` generates its own threshold alerts (HIGH_HUMIDITY, HIGH_TEMP, HIGH_GAS, LOW_MOISTURE). `DataSourceManager.evaluateAlerts()` generates a different but overlapping set (CLIMATE_CRITICAL, GAS_ALERT, MOISTURE_ALERT). When Simulation is active, both run — meaning **Simulation mode can produce double alerts for the same threshold breach**: one from `SimulationDataSource` (e.g. `HIGH_HUMIDITY`) and one from `DataSourceManager` (e.g. `CLIMATE_CRITICAL` if temp is also high).

---

## Summary Table

| # | What | Severity | Crash risk? |
|---|---|---|---|
| 1 | `riskScore` duplicated: computed in both Simulation and DataSourceManager (overwrites) | Low | No — DataSourceManager always wins |
| 2 | `baudRate`/`error` in `'status'` only from Serial | Low | No — fields are optional in type |
| 3 | `remoteIp` in WiFi `'status'` not in `ConnectionStatus` TypeScript type | Low | No — arrives as untyped Socket.IO event |
| 4 | `sensor` field on alerts is inconsistent across sources | Low | No — field is `sensor?: string` |
| 5 | `handleIncoming()` not on BaseDataSource — couples DataSourceManager to WiFiDataSource type specifically | Medium | No — but adds friction for a 4th source |
| 6 | `getStatus()` return shape diverges (Serial has `baudRate`, Sim has `state`, WiFi has `remoteIp`/`packetCount`) | Low | No — only `.connected` and `.port` are consumed |
| 7 | CLOUD mode guard in `setupListeners` is implicit/indirect — works but non-obvious | Low | No |
| 8 | **Double alerts in Simulation**: `SimulationDataSource.reevaluate()` AND `DataSourceManager.evaluateAlerts()` both check thresholds | **Medium** | No — but inflates alert count in Simulation mode |
