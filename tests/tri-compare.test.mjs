import test from "node:test";
import assert from "node:assert/strict";
import { SPLIT_GAP, pickSplit, moveSplit } from "../assets/js/tri-compare.js";

test("a pointer grabs the nearer line, and the line on its side when they overlap", () => {
  const split = { a: 30, b: 70 };
  assert.equal(pickSplit(split, 10), "a");
  assert.equal(pickSplit(split, 45), "a");
  assert.equal(pickSplit(split, 55), "b");
  assert.equal(pickSplit(split, 95), "b");
  const together = { a: 50, b: 50 + SPLIT_GAP };
  assert.equal(pickSplit(together, 40), "a");
  assert.equal(pickSplit(together, 60), "b");
});

test("lines stay inside the image and in order", () => {
  const split = { a: 30, b: 70 };
  assert.deepEqual(moveSplit(split, "a", 20), { a: 20, b: 70 });
  assert.deepEqual(moveSplit(split, "a", -5), { a: 0, b: 70 });
  assert.deepEqual(moveSplit(split, "a", 90), { a: 70 - SPLIT_GAP, b: 70 });
  assert.deepEqual(moveSplit(split, "b", 120), { a: 30, b: 100 });
  assert.deepEqual(moveSplit(split, "b", 10), { a: 30, b: 30 + SPLIT_GAP });
  assert.deepEqual(moveSplit(split, "b", NaN), split);
});
