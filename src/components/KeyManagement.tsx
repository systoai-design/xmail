import { useState } from 'react';
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
import { importPrivateKey, decryptMessage } from '@/lib/encryption';
import { encryptKeyWithPassword, decryptKeyWithPassword } from '@/lib/keyProtection';
import { QRKeyTransfer } from '@/components/QRKeyTransfer';

export const KeyManagement = () => {
  const { publicKey } = useWallet();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [importKeyValue, setImportKeyValue] = useState('');
  const [importing, setImporting] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);

  const handleExportCopy = () => {
    const privateKey = sessionStorage.getItem('encryption_private_key');
    if (!privateKey) {
      toast({ title: 'No key found', variant: 'destructive' });
      return;
    }
    navigator.clipboard.writeText(privateKey);
    toast({ title: 'Copied to clipboard!' });
  };

  const handleExportDownload = async (withPassword: boolean = false) => {
    const privateKey = sessionStorage.getItem('encryption_private_key');
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

      sessionStorage.setItem('encryption_private_key', keyValue);
      toast({ title: 'Key imported!' });
      setImportKeyValue('');
      setImportPassword('');
      setImportFile(null);
      setOpen(false);
    } catch {
      toast({ title: 'Invalid key', variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

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
        </DialogHeader>
        <Tabs defaultValue="export">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="export">Export</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="qr">QR Transfer</TabsTrigger>
          </TabsList>
          <TabsContent value="export" className="space-y-4">
            <div className="glass-strong p-6 rounded-xl space-y-4">
              <div className="flex items-start gap-3 text-sm text-yellow-500 bg-yellow-500/10 p-4 rounded-lg">
                <AlertTriangle className="w-5 h-5 mt-0.5" />
                <div>⚠️ Keep safe! Anyone with this key can decrypt your messages.</div>
              </div>
              <Textarea value={sessionStorage.getItem('encryption_private_key') || ''} readOnly className="font-mono text-sm h-32" />
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
