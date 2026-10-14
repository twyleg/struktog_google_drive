const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

async function setup({ secure = true, svg = true, denied = false } = {}) {
  const writes = [];
  class ClipboardItem {
    static supports(type) {
      return svg && type === "image/svg+xml";
    }
    constructor(data) {
      this.data = data;
    }
  }
  const context = vm.createContext({
    window: { isSecureContext: secure, ClipboardItem },
    navigator: {
      clipboard: {
        write(items) {
          writes.push(items);
          return denied
            ? Promise.reject(new Error("NotAllowedError"))
            : Promise.all(Object.values(items[0].data));
        },
      },
    },
    fetch,
    Blob,
  });
  const module = new vm.SourceTextModule(
    fs.readFileSync("src/helpers/imageClipboard.js", "utf8"),
    { context }
  );
  await module.link(() => {});
  await module.evaluate();
  return { ...module.namespace, writes };
}

test("PNG clipboard write starts during the gesture, before asynchronous image rendering", async () => {
  const { copyImage, writes } = await setup();
  let rendered = false;
  const copying = copyImage("png", () => {
    rendered = true;
    return "data:image/png;base64,aGVsbG8=";
  });
  assert.equal(writes.length, 1);
  assert.equal(rendered, false);
  await copying;
  const blob = await writes[0][0].data["image/png"];
  assert.equal(blob.type, "image/png");
  assert.equal(await blob.text(), "hello");
});

test("SVG is copied as an image with preserved SVG contents", async () => {
  const { copyImage, writes } = await setup();
  await copyImage(
    "svg",
    () => "data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C/svg%3E"
  );
  const blob = await writes[0][0].data["image/svg+xml"];
  assert.equal(blob.type, "image/svg+xml");
  assert.equal(await blob.text(), "<svg></svg>");
});

test("unsupported SVG and insecure contexts do not render or modify the clipboard", async () => {
  for (const options of [{ secure: false }, { svg: false }]) {
    const { copyImage, canCopyImage, writes } = await setup(options);
    assert.equal(canCopyImage("svg"), false);
    await assert.rejects(
      copyImage("svg", () => {
        throw new Error("must not render");
      }),
      /unavailable/
    );
    assert.equal(writes.length, 0);
    assert.equal(canCopyImage("png"), options.secure !== false);
  }
});

test("clipboard permission and rendering errors reach the caller for user feedback", async () => {
  const denied = await setup({ denied: true });
  await assert.rejects(
    denied.copyImage("png", () => "data:image/png;base64,aGVsbG8="),
    /NotAllowedError/
  );
  const normal = await setup();
  await assert.rejects(
    normal.copyImage("png", () => {
      throw new Error("render failed");
    }),
    /render failed/
  );
});
