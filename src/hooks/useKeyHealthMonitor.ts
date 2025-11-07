import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useKeyHealthMonitor = () => {
  const { publicKey, connected } = useWallet();
  const { toast } = useToast();
  const [keyAge, setKeyAge] = useState<number>(0);
  const [shouldRotate, setShouldRotate] = useState(false);
  
  useEffect(() => {
    if (!connected || !publicKey) {
      setKeyAge(0);
      setShouldRotate(false);
      return;
    }
    
    checkKeyAge();
    
    // Check every hour
    const interval = setInterval(checkKeyAge, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [connected, publicKey]);
  
  const checkKeyAge = async () => {
    if (!publicKey) return;
    
    try {
      const { data } = await supabase
        .from('encryption_keys')
        .select('key_created_at, created_at')
        .eq('wallet_address', publicKey.toBase58())
        .maybeSingle();
      
      if (!data) return;
      
      const createdAt = new Date(data.key_created_at || data.created_at);
      const now = new Date();
      const ageInDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      
      setKeyAge(ageInDays);
      
      // Recommend rotation after 90 days
      if (ageInDays >= 90 && !sessionStorage.getItem('key_rotation_reminded_90')) {
        setShouldRotate(true);
        sessionStorage.setItem('key_rotation_reminded_90', 'true');
        
        toast({
          title: '🔑 Key Rotation Recommended',
          description: `Your encryption key is ${ageInDays} days old. Consider rotating it for enhanced security.`,
          duration: 10000,
        });
      }
      
      // Warning after 180 days
      if (ageInDays >= 180 && !sessionStorage.getItem('key_rotation_reminded_180')) {
        setShouldRotate(true);
        sessionStorage.setItem('key_rotation_reminded_180', 'true');
        
        toast({
          title: '⚠️ Key Rotation Strongly Recommended',
          description: `Your encryption key is ${ageInDays} days old. Please rotate it soon for better security.`,
          duration: 15000,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error checking key age:', error);
    }
  };
  
  return { keyAge, shouldRotate };
};
