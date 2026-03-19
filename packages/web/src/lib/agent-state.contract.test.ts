import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStateKey,
  generateConversationTitle,
  parseStateData,
  validateChatPayload,
} from "./agent-state.contract";

test("validateChatPayload rejects missing conversationId", () => {
  const result = validateChatPayload("hello", "u1", "");
  assert.equal(result.ok, false);
  assert.equal(result.code, "INVALID_ARGUMENT");
  assert.equal(result.error, "conversationId is required");
});

test("validateChatPayload accepts valid payload", () => {
  const result = validateChatPayload("hello", "u1", "c1");
  assert.deepEqual(result, { ok: true });
});

test("buildStateKey uses unified user_conversation format", () => {
  assert.equal(buildStateKey("userA", "convB"), "userA_convB");
});

test("generateConversationTitle truncates long input", () => {
  const title = generateConversationTitle("abcdefghijklmnopqrstuvwxyz1234567890");
  assert.equal(title.endsWith("..."), true);
  assert.equal(title.length <= 23, true);
});

test("parseStateData returns null for invalid json", () => {
  assert.equal(parseStateData("{invalid"), null);
});

test("parseStateData parses valid json", () => {
  const state = parseStateData("{\"stateVersion\":2}");
  assert.deepEqual(state, { stateVersion: 2 });
});
