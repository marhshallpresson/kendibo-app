import fs from 'node:fs';
import path from 'node:path';

function addScreenTrace(file, screenName) {
  const fullPath = path.join(process.cwd(), file);
  if (!fs.existsSync(fullPath)) return;
  let code = fs.readFileSync(fullPath, 'utf8');
  
  if (code.includes('useWatchupScreen')) return;
  
  code = code.replace(/import .*? from 'react';\n/, (m) => `${m}import { useWatchupScreen } from '../../hooks/useWatchupScreen';\n`);
  if (!code.includes("../../hooks/useWatchupScreen")) { // maybe it's in a different folder depth
    code = code.replace(/import .*? from 'react';\n/, (m) => `${m}import { useWatchupScreen } from '../hooks/useWatchupScreen';\n`);
  }
  
  code = code.replace(/(export default function .*?\(\) \{)/, `$1\n  useWatchupScreen('${screenName}');\n`);
  
  fs.writeFileSync(fullPath, code, 'utf8');
  console.log(`Patched trace ${file}`);
}

addScreenTrace('src/app/booking/cart.tsx', 'BookingCart');
addScreenTrace('src/app/payment/checkout.tsx', 'PaymentCheckout');
addScreenTrace('src/app/(auth)/login.tsx', 'AuthLogin');
addScreenTrace('src/app/(auth)/register.tsx', 'AuthRegister');
