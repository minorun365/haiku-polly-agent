import { vi } from 'vitest';

// Amplify モック
vi.mock('aws-amplify', () => ({
  Amplify: {
    configure: vi.fn(),
    getConfig: vi.fn(() => ({})),
  },
}));

vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn(() =>
    Promise.resolve({
      tokens: {
        accessToken: { toString: () => 'mock-access-token' },
      },
      credentials: {
        accessKeyId: 'mock-access-key',
        secretAccessKey: 'mock-secret-key',
        sessionToken: 'mock-session-token',
      },
    })
  ),
}));

vi.mock('aws-amplify/utils', () => ({
  I18n: {
    putVocabularies: vi.fn(),
    setLanguage: vi.fn(),
  },
}));

vi.mock('@aws-amplify/ui-react', () => ({
  Authenticator: ({ children }: { children: (props: { signOut: () => void }) => React.ReactNode }) =>
    children({ signOut: vi.fn() }),
  translations: {},
}));

// amplify_outputs.json モック
vi.mock('../../amplify_outputs.json', () => ({
  default: {
    auth: {
      user_pool_id: 'us-east-1_test',
      aws_region: 'us-east-1',
      user_pool_client_id: 'test-client-id',
      identity_pool_id: 'us-east-1:test-pool',
    },
    version: '1.4',
    custom: {
      agentRuntimeArn: 'arn:aws:bedrock-agentcore:us-east-1:123456789:runtime/test_agent',
      environment: 'sandbox',
    },
  },
}));
