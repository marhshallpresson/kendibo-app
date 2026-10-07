import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'src/app/(provider)/dashboard.tsx');
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /import { Header } from '\.\.\/\.\.\/components\/ui';/,
  `import { Header } from '../../components/ui';\nimport { useQuery } from '@tanstack/react-query';\nimport { jobApi } from '../../services/api/jobs';\nimport { useAuthStore } from '../../stores';`
);

code = code.replace(
  /export default function ProviderDashboardScreen\(\) \{/,
  `export default function ProviderDashboardScreen() {
  const user = useAuthStore(state => state.user);
  // Using a mocked providerId if not stored in user object for the pilot
  const providerId = user?.id || 'mock-provider-id';
  
  const { data: offers = [], isLoading } = useQuery({
    queryKey: ['provider-jobs', providerId],
    queryFn: () => jobApi.getOffers(providerId),
    refetchInterval: 5000,
  });
  
  const activeJobs = offers.filter(o => o.status === 'accepted');
  const pendingJobs = offers.filter(o => o.status === 'offered');
  const activeJob = activeJobs[0];
`
);

code = code.replace(/<Text style=\{styles.statValue\}>' 25,000<\/Text>/, `<Text style={styles.statValue}>' 0</Text>`);
code = code.replace(/<Text style=\{\[styles.statValue, \{ color: colors.textPrimary \}\]\}>3<\/Text>/, `<Text style={[styles.statValue, { color: colors.textPrimary }]}>{pendingJobs.length}</Text>`);

code = code.replace(
  /\{\/\* Up Next \/ Active Job \*\/\}.*?(?=\{\/\* Setup Prompt)/s,
  `{/* Up Next / Active Job */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Up Next</Text>
        {activeJob ? (
          <Pressable 
            style={[styles.jobCard, { backgroundColor: colors.surface }]}
            onPress={() => router.push(\`/(provider)/job/\${activeJob.jobId}\`)}
          >
            <View style={styles.jobHeader}>
              <View style={[styles.statusBadge, { backgroundColor: colors.warning + '20' }]}>
                <Text style={[styles.statusText, { color: colors.warning }]}>Active Job</Text>
              </View>
              <Text style={[styles.jobTime, { color: colors.textSecondary }]}>Now</Text>
            </View>
            <Text style={[styles.jobTitle, { color: colors.textPrimary }]}>Service \${activeJob.jobId.slice(0, 8)}</Text>
            <View style={styles.jobFooter}>
              <Text style={[styles.jobPrice, { color: colors.primary }]}>Tap to view</Text>
              <ChevronRight size={20} color={colors.textSecondary} />
            </View>
          </Pressable>
        ) : (
          <Text style={{ color: colors.textSecondary, marginBottom: 20 }}>No active jobs. Waiting for dispatch...</Text>
        )}
        `
);

fs.writeFileSync(file, code, 'utf8');
console.log('Patched provider dashboard');
