import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'src/app/_layout.tsx');
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "<WatchupErrorBoundary>",
  "<WatchupErrorBoundary screen=\"RootLayout\">"
);

fs.writeFileSync(file, code, 'utf8');
console.log("Patched layout boundary");
