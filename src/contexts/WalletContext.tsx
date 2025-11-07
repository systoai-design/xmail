import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider, useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletContextType {
  connected: boolean;
  walletAddress: string | null;
}

const WalletContext = createContext<WalletContextType>({
  connected: false,
  walletAddress: null,
});

export const useWalletContext = () => useContext(WalletContext);

// Helper component to sync wallet state
const WalletStateSync: React.FC<{
  children: React.ReactNode;
  setWalletAddress: (addr: string | null) => void;
  setConnected: (conn: boolean) => void;
}> = ({ children, setWalletAddress, setConnected }) => {
  const { publicKey, connected: walletConnected } = useSolanaWallet();

  useEffect(() => {
    setConnected(walletConnected);
    setWalletAddress(publicKey ? publicKey.toBase58() : null);
  }, [publicKey, walletConnected, setWalletAddress, setConnected]);

  return <>{children}</>;
};

export const WalletContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider 
        wallets={wallets} 
        autoConnect
        onError={(error) => {
          console.error('Wallet error:', error);
        }}
      >
        <WalletModalProvider>
          <WalletStateSync 
            setWalletAddress={setWalletAddress}
            setConnected={setConnected}
          >
            <WalletContext.Provider value={{ connected, walletAddress }}>
              {children}
            </WalletContext.Provider>
          </WalletStateSync>
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
