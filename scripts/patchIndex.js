import fs from 'node:fs';
import path from 'node:path';

const target = path.join(process.cwd(), 'src/app/index.tsx');
let code = fs.readFileSync(target, 'utf8');

if (!code.includes('useEffect')) {
  code = code.replace(/import React from 'react';/, "import React, { useEffect } from 'react';\nimport { API_BASE_URL } from '../constants/config';\nimport { watchup } from '../services/watchup';");
}

code = code.replace(
  /export default function EntryRedirect\(\) \{/,
  `export default function EntryRedirect() {
  useEffect(() => {
    fetch(\`\${API_BASE_URL}/v1/config/flags\`)
      .then(res => res.json())
      .then(flags => {
        try { watchup.setContext({ live_flags: flags }); } catch {}
      })
      .catch(() => {});
  }, []);`
);

fs.writeFileSync(target, code, 'utf8');
console.log('Patched index.tsx with live flag check');
