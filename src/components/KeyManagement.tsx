import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Key, Download, Upload, Copy, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { importPrivateKey } from '@/lib/encryption';

export const KeyManagement = () => {
  const { toast } = useToast();
  const [importKeyValue, setImportKeyValue] = useState('');
  const [importing, setImporting] = useState(false);
  const [open, setOpen] = useState(false);

  const handleExportCopy = () => {
    const privateKey = sessionStorage.getItem('encryption_private_key');
    if (!privateKey) {
      toast({
        title: 'No key found',
        description: 'No encryption key available to export',
        variant: 'destructive',
      });
      return;
    }

    navigator.clipboard.writeText(privateKey);
    toast({
      title: 'Copied!',
      description: 'Private key copied to clipboard',
    });
  };

  const handleExportDownload = () => {
    const privateKey = sessionStorage.getItem('encryption_private_key');
    if (!privateKey) {
      toast({
        title: 'No key found',
        description: 'No encryption key available to export',
        variant: 'destructive',
      });
      return;
    }

    const blob = new Blob([privateKey], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xmail-private-key-${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Downloaded!',
      description: 'Private key saved to file',
    });
  };

  const handleImport = async () => {
    if (!importKeyValue.trim()) {
      toast({
        title: 'Empty key',
        description: 'Please paste your private key',
        variant: 'destructive',
      });
      return;
    }

    setImporting(true);

    try {
      // Validate key format by attempting to import it
      await importPrivateKey(importKeyValue.trim());
      
      // Store in session storage
      sessionStorage.setItem('encryption_private_key', importKeyValue.trim());
      
      toast({
        title: 'Key imported!',
        description: 'Your private key has been successfully restored',
      });
      
      setImportKeyValue('');
      setOpen(false);
    } catch (error) {
      console.error('Error importing key:', error);
      toast({
        title: 'Invalid key',
        description: 'The provided key is not valid',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const privateKey = sessionStorage.getItem('encryption_private_key');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg">
          <Key className="w-5 h-5 mr-2" />
          Key Management
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Encryption Key Management</DialogTitle>
          <DialogDescription>
            Export your private key for backup or import it on another device
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="export" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export">
              <Download className="w-4 h-4 mr-2" />
              Export / Backup
            </TabsTrigger>
            <TabsTrigger value="import">
              <Upload className="w-4 h-4 mr-2" />
              Import / Restore
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4">
            <div className="glass p-4 rounded-xl border-2 border-yellow-500/30 bg-yellow-500/5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-yellow-500 mb-1">Security Warning</div>
                  <div className="text-sm text-muted-foreground">
                    Keep this key safe and private! Anyone with this key can decrypt your messages. Never share it or store it in insecure locations.
                  </div>
                </div>
              </div>
            </div>

            {privateKey ? (
              <>
                <Textarea
                  value={privateKey}
                  readOnly
                  className="font-mono text-xs h-32"
                  placeholder="Your private key will appear here"
                />
                <div className="flex gap-3">
                  <Button onClick={handleExportCopy} className="flex-1">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy to Clipboard
                  </Button>
                  <Button onClick={handleExportDownload} variant="secondary" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Download as File
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No private key found in this session
              </div>
            )}
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            <div className="glass p-4 rounded-xl border-2 border-blue-500/30 bg-blue-500/5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-500 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-blue-500 mb-1">Import Key</div>
                  <div className="text-sm text-muted-foreground">
                    Paste your exported private key below to restore access to your encrypted messages on this device.
                  </div>
                </div>
              </div>
            </div>

            <Textarea
              value={importKeyValue}
              onChange={(e) => setImportKeyValue(e.target.value)}
              className="font-mono text-xs h-32"
              placeholder="Paste your private key here..."
            />
            
            <Button 
              onClick={handleImport} 
              disabled={importing || !importKeyValue.trim()}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              {importing ? 'Importing...' : 'Restore Private Key'}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
