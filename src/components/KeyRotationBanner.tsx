import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useKeyHealthMonitor } from '@/hooks/useKeyHealthMonitor';

export const KeyRotationBanner = () => {
  const { keyAge, shouldRotate } = useKeyHealthMonitor();
  
  if (!shouldRotate || keyAge < 90) return null;
  
  return (
    <div className="glass p-4 rounded-xl border-2 border-yellow-500/30 bg-yellow-500/5 mb-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0" />
          <div>
            <div className="font-bold text-yellow-500">Key Rotation Recommended</div>
            <div className="text-sm text-muted-foreground">
              Your encryption key is {keyAge} days old. Rotate for enhanced security.
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" className="flex-shrink-0">
          <RefreshCw className="w-4 h-4 mr-2" />
          Rotate Key
        </Button>
      </div>
    </div>
  );
};
