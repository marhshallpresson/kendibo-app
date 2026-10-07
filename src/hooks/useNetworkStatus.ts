import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { fileManager } from '../services/fileManager';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const currentlyConnected = state.isConnected;
      const currentlyReachable = state.isInternetReachable;

      setIsConnected(currentlyConnected);
      setIsInternetReachable(currentlyReachable);

      // If we just regained connection, try to process the outbox
      if (currentlyConnected && currentlyReachable) {
        fileManager.processOutbox().catch(console.error);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    isConnected,
    isInternetReachable,
    isOffline: isConnected === false || isInternetReachable === false,
  };
}
