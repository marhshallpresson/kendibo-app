import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'src/app/(provider)/job/[id].tsx');
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /import \{ useAppTheme \} from '\.\.\/\.\._layout';/,
  `import { useAppTheme } from '../../_layout';\nimport { useQuery, useMutation } from '@tanstack/react-query';\nimport { jobApi } from '../../../services/api/jobs';\nimport { fileManager } from '../../../services/fileManager';`
);

code = code.replace(
  /const DUMMY_JOB = \{[\s\S]*?\};/,
  ``
);

code = code.replace(
  /export default function JobExecutionScreen\(\) \{[\s\S]*?(?=const toggleCheck)/,
  `export default function JobExecutionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useAppTheme();

  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [evidence, setEvidence] = useState<string[]>([]);
  const [jobStatus, setJobStatus] = useState<string>('PROVIDER_ACCEPTED');

  // Mutation to transition state
  const transitionMutation = useMutation({
    mutationFn: (status: string) => jobApi.transitionState(id as string, status),
    onSuccess: (_, status) => {
      setJobStatus(status);
      if (status === 'COMPLETED') {
        Alert.alert('Success', 'Job marked as complete!');
        router.back();
      }
    }
  });

  const uploadEvidence = async (uri: string) => {
    try {
      await fileManager.queueForUpload({
        localUri: uri,
        endpoint: \`/v1/provider/jobs/\${id}/evidence\`,
        mimeType: 'image/jpeg',
        fieldName: 'file',
        additionalData: { type: 'post_service' }
      });
      await fileManager.processOutbox();
    } catch (e) {
      console.error(e);
    }
  };

  `
);

code = code.replace(
  /setEvidence\(prev => \[\.\.\.prev, result\.assets\[0\]\.uri\]\);/,
  `const uri = result.assets[0].uri;
      setEvidence(prev => [...prev, uri]);
      uploadEvidence(uri);`
);

code = code.replace(
  /DUMMY_JOB\.checklist/g,
  `[{ id: '1', text: 'Arrive at location' }, { id: '2', text: 'Complete requested service' }, { id: '3', text: 'Clean up' }]`
);

code = code.replace(
  /DUMMY_JOB\.title/g,
  `"Service " + id`
);

code = code.replace(
  /DUMMY_JOB\.customer/g,
  `"Customer"`
);
code = code.replace(
  /DUMMY_JOB\.address/g,
  `"Service Location"`
);
code = code.replace(
  /DUMMY_JOB\.time/g,
  `"Now"`
);
code = code.replace(
  /DUMMY_JOB\.status/g,
  `jobStatus`
);

code = code.replace(
  /<Button title="Start Job"/,
  `<Button title="Transition Status" onPress={() => {
            if (jobStatus === 'PROVIDER_ACCEPTED') transitionMutation.mutate('EN_ROUTE');
            else if (jobStatus === 'EN_ROUTE') transitionMutation.mutate('ARRIVED');
            else if (jobStatus === 'ARRIVED') transitionMutation.mutate('IN_PROGRESS');
            else transitionMutation.mutate('COMPLETED');
          }} loading={transitionMutation.isPending} /`
);
code = code.replace(
  /<Button title="Complete Job" variant="primary" style=\{styles\.completeBtn\} \/>/,
  `<Button title="Complete Job" variant="primary" style={styles.completeBtn} onPress={() => transitionMutation.mutate('COMPLETED')} loading={transitionMutation.isPending} />`
);

fs.writeFileSync(file, code, 'utf8');
console.log('Patched job execution screen');
