import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'src/app/(tabs)/bookings.tsx');
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /import \{ Header \} from '\.\.\/\.\.\/components\/ui';/,
  `import { Header } from '../../components/ui';\nimport { useQuery } from '@tanstack/react-query';\nimport { bookingApi } from '../../services/api/bookings';`
);

code = code.replace(
  /export default function BookingsScreen\(\) \{[\s\S]*?(?=const renderBooking =)/,
  `export default function BookingsScreen() {
  const { colors } = useAppTheme();
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: bookingApi.getMyBookings,
    refetchInterval: 5000,
  });

  const filteredBookings = bookings.map(b => ({
    id: b.id,
    title: b.serviceId || 'Service',
    date: new Date(b.createdAt).toLocaleDateString(),
    time: new Date(b.createdAt).toLocaleTimeString(),
    status: b.status,
    price: '0'
  })).filter(b => filter === 'upcoming' ? !['COMPLETED', 'CANCELLED'].includes(b.status) : ['COMPLETED', 'CANCELLED'].includes(b.status));

  `
);

code = code.replace(
  /data=\{filteredBookings\}/,
  `data={filteredBookings.length > 0 ? filteredBookings : []}`
);

fs.writeFileSync(file, code, 'utf8');
console.log('Patched user bookings screen');
