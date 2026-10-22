import assert from "node:assert/strict";
import test from "node:test";
import { HOSTED_TOKEN_SERVICE_URL, parseInvite } from "../dist/token-service.js";

test("invite: a code alone is for the hosted service, in any case and with misread letters", () => {
  assert.deepEqual(parseInvite("abcd-efgh-jkmn"), { kind: "code", url: HOSTED_TOKEN_SERVICE_URL, code: "ABCDEFGHJKMN" });
  assert.deepEqual(parseInvite(" 0O1I L2Z3 4567\n"), { kind: "code", url: HOSTED_TOKEN_SERVICE_URL, code: "001112Z34567" });
});

test("invite: a link carries its service's address", () => {
  assert.deepEqual(parseInvite("https://tokens.example.com/join/ABCD-EFGH-JKMN"), { kind: "code", url: "https://tokens.example.com", code: "ABCDEFGHJKMN" });
  assert.deepEqual(parseInvite("https://example.com/tokens/join/abcd-efgh-jkmn/"), { kind: "code", url: "https://example.com/tokens", code: "ABCDEFGHJKMN" });
  assert.equal(parseInvite("http://127.0.0.1:8787/join/ABCD-EFGH-JKMN").url, "http://127.0.0.1:8787");
});

test("invite: a CLI 1.4 code still carries its service and key", () => {
  const key = `gts_${"a".repeat(43)}`;
  const code = `gti_${Buffer.from(JSON.stringify({ url: "https://tokens.example.com", key })).toString("base64url")}`;
  assert.deepEqual(parseInvite(code), { kind: "key", settings: { url: "https://tokens.example.com", key } });
});

test("invite: anything else is refused with what an invite looks like", () => {
  assert.throws(() => parseInvite("ABCD-EFGH"), /Invite codes look like ABCD-EFGH-JKLM/);
  assert.throws(() => parseInvite("ABCD-EFGH-JKMU"), /Invite codes look like/);
  assert.throws(() => parseInvite("http://tokens.example.com/join/ABCD-EFGH-JKMN"), /must use https/);
  assert.throws(() => parseInvite("https://tokens.example.com/listings/ABCD-EFGH-JKMN"), /isn't a Guesty CLI invite link/);
  assert.throws(() => parseInvite("https://tokens.example.com/join/ABCD-EFGH-JKMN?ref=mail"), /isn't a Guesty CLI invite link/);
  assert.throws(() => parseInvite("gti_bm90LWpzb24"), /not a Guesty CLI invite code/);
});
