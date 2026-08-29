import assert from "node:assert/strict";
import test from "node:test";
import { hasWebGL } from "./mix-vessel";

function withCanvasContext(
  getContext: (kind: string) => unknown,
  run: () => void,
) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { createElement: () => ({ getContext }) },
  });

  try {
    run();
  } finally {
    if (original) Object.defineProperty(globalThis, "document", original);
    else Reflect.deleteProperty(globalThis, "document");
  }
}

test("hasWebGL rejects WebGL 1-only browsers", () => {
  const requested: string[] = [];
  withCanvasContext((kind) => {
    requested.push(kind);
    return kind === "webgl" ? {} : null;
  }, () => {
    assert.equal(hasWebGL(), false);
  });

  assert.deepEqual(requested, ["webgl2"]);
});

test("hasWebGL accepts WebGL 2 and releases the probe context", () => {
  let released = false;
  withCanvasContext(() => ({
    getExtension: () => ({ loseContext: () => { released = true; } }),
  }), () => {
    assert.equal(hasWebGL(), true);
  });

  assert.equal(released, true);
});

test("hasWebGL safely rejects context creation failures", () => {
  withCanvasContext(() => {
    throw new Error("context creation failed");
  }, () => {
    assert.equal(hasWebGL(), false);
  });
});
