import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

// Isolated temp DB per test run.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bb-test-"));
process.env.DATABASE_PATH = path.join(dir, "test.db");
process.env.DELIVERY_POSTCODES = "2000,2010,2780";
process.env.DELIVERY_SUBURBS = "";
process.env.DELIVERY_FEE_CENTS = "700";
process.env.FREE_DELIVERY_THRESHOLD_CENTS = "5000";
process.env.DELIVERY_MIN_ORDER_CENTS = "2000";
process.env.PICKUP_ENABLED = "true";
process.env.DELIVERY_ENABLED = "true";

// Silence migration logs in test output.
console.log = (() => {}) as typeof console.log;
