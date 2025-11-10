import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, Camera, AlertTriangle } from 'lucide-react';
import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { importPrivateKey } from '@/lib/encryption';

export const QRKeyTransfer = () => {
  const { toast } = useToast();
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  
  const generateQRCode = async () => {
    const privateKey = localStorage.getItem('encryption_private_key');
    if (!privateKey) {
      toast({ 
        title: 'No key found', 
        description: 'Please connect your wallet first',
        variant: 'destructive' 
      });
      return;
    }
    
    // Add prefix to identify xMail keys
    const data = `xmail:key:${privateKey}`;
    
    try {
      const url = await QRCode.toDataURL(data, {
        errorCorrectionLevel: 'M',
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error('QR generation error:', error);
      toast({ 
        title: 'QR generation failed', 
        variant: 'destructive' 
      });
    }
  };
  
  const startScanning = async () => {
    setScanning(true);
    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;
      
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          if (decodedText.startsWith('xmail:key:')) {
            const key = decodedText.replace('xmail:key:', '');
            
            try {
              await importPrivateKey(key);
              localStorage.setItem('encryption_private_key', key);
              
              toast({ 
                title: '✓ Key imported!', 
                description: 'Successfully scanned and imported key' 
              });
              stopScanning();
              setShowImportDialog(false);
            } catch {
              toast({ 
                title: 'Invalid key in QR', 
                variant: 'destructive' 
              });
            }
          }
        },
        () => {
          // Ignore scan errors (no QR code in frame)
        }
      );
    } catch (err) {
      console.error('Scanner error:', err);
      toast({ 
        title: 'Camera access denied', 
        description: 'Please allow camera access to scan QR codes',
        variant: 'destructive' 
      });
      setScanning(false);
    }
  };
  
  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        console.error('Error stopping scanner:', e);
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Export via QR */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            onClick={generateQRCode} 
            className="w-full"
          >
            <QrCode className="w-4 h-4 mr-2" />
            Show QR Code
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan to Import Key</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 p-4">
            {qrCodeUrl && (
              <div className="p-4 bg-white rounded-lg">
                <img src={qrCodeUrl} alt="Private Key QR Code" className="w-80 h-80" />
              </div>
            )}
            <div className="flex items-start gap-2 text-sm text-muted-foreground bg-destructive/10 p-3 rounded-lg border border-destructive/30">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p>
                <strong className="text-destructive">Security Warning:</strong> Only scan this with your own trusted device! Anyone with this QR code can decrypt your messages.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Import via QR Scanner */}
      <Dialog open={showImportDialog} onOpenChange={(open) => {
        setShowImportDialog(open);
        if (!open && scanning) {
          stopScanning();
        }
      }}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Camera className="w-4 h-4 mr-2" />
            Scan QR Code
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan Key QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <div id="qr-reader" className="w-full max-w-md rounded-lg overflow-hidden"></div>
            {!scanning ? (
              <Button onClick={startScanning} className="w-full">
                <Camera className="w-4 h-4 mr-2" />
                Start Camera
              </Button>
            ) : (
              <Button onClick={stopScanning} variant="destructive" className="w-full">
                Stop Scanning
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
