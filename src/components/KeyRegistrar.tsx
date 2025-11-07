import { useEncryptionKeys } from '@/hooks/useEncryptionKeys';

/**
 * Global component that ensures encryption keys are registered
 * whenever a wallet is connected. Mounted at the app level.
 */
export const KeyRegistrar = () => {
  useEncryptionKeys();
  return null;
};
