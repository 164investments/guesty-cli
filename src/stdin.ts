export function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (process.stdin.isTTY) {
      reject(new Error("No data on stdin. Use --data or pipe JSON."));
      return;
    }
    if (process.stdin.readableEnded) {
      resolve("");
      return;
    }
    if (process.stdin.destroyed) {
      reject(new Error("Stdin is closed. Use --data or pipe JSON."));
      return;
    }
    let data = "";
    function cleanup(): void {
      process.stdin.off("data", onData);
      process.stdin.off("end", onEnd);
      process.stdin.off("error", onError);
      process.stdin.off("close", onClose);
    }
    function onData(chunk: string): void { data += chunk; }
    function onEnd(): void { cleanup(); resolve(data); }
    function onError(error: Error): void { cleanup(); reject(error); }
    function onClose(): void { onError(new Error("Stdin closed before its body was fully read.")); }
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", onData);
    process.stdin.once("end", onEnd);
    process.stdin.once("error", onError);
    process.stdin.once("close", onClose);
  });
}
