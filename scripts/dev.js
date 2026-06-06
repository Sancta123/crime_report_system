const { spawn } = require("child_process");

const isRenderBuild =
  Boolean(process.env.RENDER) ||
  Boolean(process.env.RENDER_SERVICE_ID) ||
  Boolean(process.env.CI) ||
  !process.stdout.isTTY ||
  !process.stdin.isTTY;

if (isRenderBuild) {
  console.log("Render build detected; skipping the long-running local dev server.");
  process.exit(0);
}

const child = spawn(process.execPath, ["server.js"], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
