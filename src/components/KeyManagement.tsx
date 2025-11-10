import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Key, Download, Upload, Copy, AlertTriangle, Loader2, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { importPrivateKey, decryptMessage, generateKeyPair, exportPublicKey, exportPrivateKey } from '@/lib/encryption';
import { encryptKeyWithPassword, decryptKeyWithPassword } from '@/lib/keyProtection';
import { QRKeyTransfer } from '@/components/QRKeyTransfer';
import { onOpenKeyManagement, emitKeyImported } from '@/lib/events';

interface KeyManagementProps {
  compact?: boolean;
}

export const KeyManagement = ({ compact = false }: KeyManagementProps) => {
  const { publicKey } = useWallet();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [importKeyValue, setImportKeyValue] = useState('');
  const [importing, setImporting] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [hasPrivateKey, setHasPrivateKey] = useState(false);
  const [defaultTab, setDefaultTab] = useState<string>("export");

  // Listen for global "open key management" events
  useEffect(() => {
    return onOpenKeyManagement(() => {
      setOpen(true);
    });
  }, []);

  // Check for private key and auto-switch to Import tab if missing
  useEffect(() => {
    if (open) {
      const hasKey = !!localStorage.getItem('encryption_private_key');
      setHasPrivateKey(hasKey);
      if (!hasKey) {
        setDefaultTab('import');
      } else {
        setDefaultTab('export');
      }
    }
  }, [open]);

  const handleExportCopy = () => {
    const privateKey = localStorage.getItem('encryption_private_key');
    if (!privateKey) {
      toast({ title: 'No key found', variant: 'destructive' });
      return;
    }
    navigator.clipboard.writeText(privateKey);
    toast({ title: 'Copied to clipboard!' });
  };

  const handleExportDownload = async (withPassword: boolean = false) => {
    const privateKey = localStorage.getItem('encryption_private_key');
    if (!privateKey) {
      toast({ title: 'No key found', variant: 'destructive' });
      return;
    }

    let exportData = privateKey;
    let filename = `xmail-key-${Date.now()}.txt`;

    if (withPassword) {
      if (exportPassword.length < 8 || exportPassword !== confirmPassword) {
        toast({ title: 'Invalid password', variant: 'destructive' });
        return;
      }
      try {
        exportData = await encryptKeyWithPassword(privateKey, exportPassword);
        filename = `xmail-key-protected-${Date.now()}.txt`;
      } catch {
        toast({ title: 'Encryption failed', variant: 'destructive' });
        return;
      }
    }

    const blob = new Blob([exportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: withPassword ? '🔐 Protected key exported' : 'Key exported' });
    setExportPassword('');
    setConfirmPassword('');
  };

  const handleImport = async () => {
    let keyValue = importKeyValue.trim();
    if (!keyValue && !importFile) {
      toast({ title: 'No key provided', variant: 'destructive' });
      return;
    }

    setImporting(true);
    try {
      if (importFile) keyValue = await importFile.text();
      if (keyValue.length > 500 && importPassword) {
        keyValue = await decryptKeyWithPassword(keyValue, importPassword);
      }

      const privateKey = await importPrivateKey(keyValue);

      if (publicKey) {
        const { data: sentEmails } = await supabase
          .from('encrypted_emails')
          .select('encrypted_subject')
          .eq('from_wallet', publicKey.toBase58())
          .limit(1)
          .maybeSingle();

        if (sentEmails) {
          try {
            await decryptMessage(sentEmails.encrypted_subject, privateKey);
            toast({ title: '✓ Key verified!' });
          } catch {
            toast({ title: '⚠️ Key may not match wallet', variant: 'destructive' });
          }
        }
      }

      localStorage.setItem('encryption_private_key', keyValue);
      toast({ title: 'Key imported!' });
      setImportKeyValue('');
      setImportPassword('');
      setImportFile(null);
      setHasPrivateKey(true);
      setDefaultTab('export');
      setOpen(false);
      
      // Emit event so other components can react
      emitKeyImported();
    } catch {
      toast({ title: 'Invalid key', variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const handleGenerateNewKey = async () => {
    if (!confirm('⚠️ WARNING: Generating a new key will make ALL your existing messages unreadable. Only do this if you cannot access your original key. Continue?')) {
      return;
    }
    
    try {
      const keypair = await generateKeyPair();
      const publicKeyStr = await exportPublicKey(keypair.publicKey);
      const privateKeyStr = await exportPrivateKey(keypair.privateKey);
      
      localStorage.setItem('encryption_public_key', publicKeyStr);
      localStorage.setItem('encryption_private_key', privateKeyStr);
      
      // Update backend with new public key (encrypted private key will be updated by useEncryptionKeys hook)
      if (publicKey) {
        await supabase
          .from('encryption_keys')
          .update({
            public_key: publicKeyStr,
            encrypted_private_key: null, // Clear old encrypted key, will be regenerated
            iv: null
          })
          .eq('wallet_address', publicKey.toBase58());
      }
      
      toast({ 
        title: 'New key generated', 
        description: 'Keys will be backed up automatically. Old messages remain unreadable.' 
      });
      
      setHasPrivateKey(true);
      setDefaultTab('export');
      emitKeyImported();
    } catch (error) {
      toast({ title: 'Key generation failed', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Key className="w-4 h-4" />
          {!compact && <span className="ml-2">Key Management</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Encryption Key Management</DialogTitle>
        </DialogHeader>
        <Tabs value={defaultTab} onValueChange={setDefaultTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="export">Export</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="qr">QR Transfer</TabsTrigger>
          </TabsList>
          <TabsContent value="export" className="space-y-4">
            <div className="glass-strong p-6 rounded-xl space-y-4">
              {hasPrivateKey && (
                <div className="flex items-start gap-3 text-sm text-green-500 bg-green-500/10 p-4 rounded-lg mb-4">
                  <Shield className="w-5 h-5 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-2">✓ Keys Automatically Backed Up</p>
                    <p className="text-muted-foreground">
                      Your encryption keys are securely tied to your wallet and automatically synced across all devices. 
                      Simply connect your wallet on any device to access your messages.
                    </p>
                  </div>
                </div>
              )}
              {!hasPrivateKey ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 text-sm text-blue-500 bg-blue-500/10 p-4 rounded-lg">
                    <AlertTriangle className="w-5 h-5 mt-0.5" />
                    <div>
                      <p className="font-semibold mb-2">No private key found on this device</p>
                      <p className="text-muted-foreground">
                        Reconnect your wallet to automatically restore your keys, or import them manually if needed.
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Button 
                      onClick={() => setDefaultTab('import')} 
                      className="w-full"
                      variant="default"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Go to Import Tab
                    </Button>
                    
                    <div className="text-center text-sm text-muted-foreground">
                      OR
                    </div>
                    
                    <Button 
                      onClick={handleGenerateNewKey} 
                      variant="outline"
                      className="w-full"
                    >
                      <Key className="w-4 h-4 mr-2" />
                      Generate New Key (Lose Access to Old Messages)
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-3 text-sm text-yellow-500 bg-yellow-500/10 p-4 rounded-lg">
                    <AlertTriangle className="w-5 h-5 mt-0.5" />
                    <div>⚠️ Keep safe! Anyone with this key can decrypt your messages.</div>
                  </div>
                  <Textarea value={localStorage.getItem('encryption_private_key') || ''} readOnly className="font-mono text-sm h-32" />
                  <div className="space-y-3">
                    <Label>Password Protection (Optional)</Label>
                    <Input type="password" placeholder="Password (min 8 chars)" value={exportPassword} onChange={(e) => setExportPassword(e.target.value)} />
                    <Input type="password" placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button onClick={handleExportCopy} variant="outline"><Copy className="w-4 h-4 mr-2" />Copy</Button>
                    <Button onClick={() => handleExportDownload(false)} variant="secondary"><Download className="w-4 h-4 mr-2" />Download</Button>
                    <Button onClick={() => handleExportDownload(true)} disabled={!exportPassword || exportPassword !== confirmPassword}><Shield className="w-4 h-4 mr-2" />Protected</Button>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
          <TabsContent value="import" className="space-y-4">
            <div className="glass-strong p-6 rounded-xl space-y-4">
              <Textarea value={importKeyValue} onChange={(e) => setImportKeyValue(e.target.value)} placeholder="Paste key..." className="font-mono h-24" />
              <div className="text-center text-sm text-muted-foreground">OR</div>
              <Input type="file" accept=".txt" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
              <Input type="password" placeholder="Password (if protected)" value={importPassword} onChange={(e) => setImportPassword(e.target.value)} />
              <Button onClick={handleImport} disabled={importing} className="w-full">
                {importing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</> : <><Upload className="w-4 h-4 mr-2" />Restore Key</>}
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="qr" className="space-y-4">
            <div className="glass-strong p-6 rounded-xl"><QRKeyTransfer /></div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
