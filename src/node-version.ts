// The CLI's dependencies need Node.js 20.12 or later (util.styleText). On older
// versions they fail while loading, with a SyntaxError that doesn't say why.
export function unsupportedNode(version: string): string | undefined {
  const [major = 0, minor = 0] = version.replace(/^v/, "").split(".").map(Number);
  if (major > 20 || (major === 20 && minor >= 12)) return undefined;
  return `Guesty CLI needs Node.js 20.12 or later, and this computer has ${version}. ` +
    "Install the LTS version from https://nodejs.org, then run the command again.";
}
