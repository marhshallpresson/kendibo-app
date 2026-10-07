import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'src/app/_layout.tsx');
let code = fs.readFileSync(file, 'utf8');

if (!code.includes("import WatchupErrorBoundary")) {
  code = code.replace("import { NetworkBanner }", "import { NetworkBanner } from '../components/ui/NetworkBanner';\nimport { WatchupErrorBoundary } from '../components/WatchupErrorBoundary';");
}

code = code.replace(
  "<ThemeProvider>\n          <View",
  "<ThemeProvider>\n          <WatchupErrorBoundary>\n          <View"
);

code = code.replace(
  "</Stack></View>\n        </ThemeProvider>",
  "</Stack></View>\n          </WatchupErrorBoundary>\n        </ThemeProvider>"
);

fs.writeFileSync(file, code, 'utf8');
console.log("Patched layout");
