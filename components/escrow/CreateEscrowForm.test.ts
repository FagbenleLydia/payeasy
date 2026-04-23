import test from "node:test";
import assert from "node:assert/strict";

import { SUPPORTED_TOKENS } from "../../lib/stellar/config.ts";

import {
  assignSupportedToken,
  nextEscrowStep,
  previousEscrowStep,
  toLedgerTimestamp,
  validateEscrowStep,
  type EscrowFormDraft,
} from "./createEscrowForm.helpers.ts";

function baseDraft(): EscrowFormDraft {
  return {
    totalRent: "1200",
    tokenAddress: SUPPORTED_TOKENS[0].issuer,
    deadlineDate: "2026-04-01",
    roommates: [
      { id: "a", address: "GAAA", shareAmount: "700" },
      { id: "b", address: "GBBB", shareAmount: "500" },
    ],
  };
}

test("step navigation clamps within 1..4", () => {
  assert.equal(previousEscrowStep(1), 1);
  assert.equal(nextEscrowStep(4), 4);
  assert.equal(nextEscrowStep(2), 3);
  assert.equal(previousEscrowStep(3), 2);
});

test("deadline date converts to unix ledger timestamp", () => {
  assert.equal(toLedgerTimestamp("2026-04-01"), 1775001600);
  assert.equal(toLedgerTimestamp(""), null);
  assert.equal(toLedgerTimestamp("invalid-date"), null);
});

test("step 1 validation blocks empty token and non-positive rent", () => {
  const draft = baseDraft();
  draft.totalRent = "0";
  draft.tokenAddress = "";

  const result = validateEscrowStep(1, draft);
  assert.equal(result.isValid, false);
  assert.ok(result.errors.some((error) => error.includes("Total rent")));
  assert.ok(result.errors.some((error) => error.includes("payment token")));
});

test("step 3 validation blocks over/under allocation", () => {
  const draft = baseDraft();
  draft.roommates[1].shareAmount = "450";

  const result = validateEscrowStep(3, draft);
  assert.equal(result.isValid, false);
  assert.ok(result.errors.some((error) => error.includes("must equal total rent")));
});

test("step 3 validation passes with exact allocation", () => {
  const draft = baseDraft();

  const result = validateEscrowStep(3, draft);
  assert.equal(result.isValid, true);
  assert.equal(result.errors.length, 0);
});

test("selecting each supported token stores its issuer in form state", () => {
  for (const token of SUPPORTED_TOKENS) {
    const draft = assignSupportedToken(baseDraft(), token);
    assert.equal(draft.tokenAddress, token.issuer);
  }
});

test("selecting USDC stores the documented Stellar testnet issuer", () => {
  const usdc = SUPPORTED_TOKENS.find((token) => token.symbol === "USDC");
  assert.ok(usdc);

  const draft = assignSupportedToken(baseDraft(), usdc);
  assert.equal(
    draft.tokenAddress,
    "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
  );
});
