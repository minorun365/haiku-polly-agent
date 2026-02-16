import { Authenticator, ThemeProvider, type Theme } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Chat } from './components/Chat/index.tsx';

const theme: Theme = {
  name: 'voice-agent-theme',
  tokens: {
    colors: {
      brand: {
        primary: {
          10: { value: '#ecfdf5' },
          20: { value: '#d1fae5' },
          40: { value: '#6ee7b7' },
          60: { value: '#34d399' },
          80: { value: '#059669' },
          90: { value: '#047857' },
          100: { value: '#064e3b' },
        },
      },
    },
  },
};

const authComponents = {
  Header() {
    return (
      <div className="text-center py-4">
        <h1 className="text-2xl font-bold text-white">
          Voice Agent
        </h1>
        <p className="text-sm text-white/80 mt-1">
          Claude Haiku + Amazon Polly
        </p>
      </div>
    );
  },
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Authenticator components={authComponents}>
        {({ signOut }) => <MainApp signOut={signOut} />}
      </Authenticator>
    </ThemeProvider>
  );
}

function MainApp({ signOut }: { signOut?: () => void }) {
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-gradient-to-r from-emerald-800 to-teal-500 text-white py-3 md:py-4 shadow-md">
        <div className="w-[60%] mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-lg md:text-2xl font-bold">Voice Agent</h1>
            <p className="text-xs md:text-sm text-white/50">Claude Haiku + Polly TTS</p>
          </div>
          <button
            onClick={signOut}
            className="bg-white/20 text-white px-3 py-1 rounded hover:bg-white/30 transition-colors text-xs"
          >
            ログアウト
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <Chat />
      </main>
    </div>
  );
}

export default App;
