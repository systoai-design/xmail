import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, Trash2 } from 'lucide-react';
import { PublicKey } from '@solana/web3.js';

interface Contact {
  id: string;
  wallet_address: string;
  nickname: string;
}

export const ContactBook = () => {
  const { publicKey } = useWallet();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [newWallet, setNewWallet] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (isOpen && publicKey) {
      loadContacts();
    }
  }, [isOpen, publicKey]);

  const loadContacts = async () => {
    if (!publicKey) return;

    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('owner_wallet', publicKey.toBase58())
      .order('nickname');

    if (error) {
      console.error('Error loading contacts:', error);
      return;
    }

    setContacts(data || []);
  };

  const addContact = async () => {
    if (!publicKey || !newNickname || !newWallet) {
      toast({
        title: 'Missing fields',
        description: 'Please enter both nickname and wallet address',
        variant: 'destructive',
      });
      return;
    }

    // Validate wallet address
    try {
      new PublicKey(newWallet.trim());
    } catch {
      toast({
        title: 'Invalid wallet address',
        description: 'Please enter a valid Solana wallet address',
        variant: 'destructive',
      });
      return;
    }

    setIsAdding(true);

    try {
      const { error } = await supabase.from('contacts').insert({
        owner_wallet: publicKey.toBase58(),
        wallet_address: newWallet.trim(),
        nickname: newNickname.trim(),
      });

      if (error) throw error;

      toast({
        title: 'Contact added',
        description: `${newNickname} added to your contacts`,
      });

      setNewNickname('');
      setNewWallet('');
      loadContacts();
    } catch (error) {
      console.error('Error adding contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to add contact',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const deleteContact = async (contactId: string, nickname: string) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      toast({
        title: 'Contact deleted',
        description: `${nickname} removed from contacts`,
      });

      loadContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete contact',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-3">
          <Users className="w-5 h-5" />
          <span>Contacts</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Address Book</DialogTitle>
        </DialogHeader>

        {/* Add new contact */}
        <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/20">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="nickname">Nickname</Label>
              <Input
                id="nickname"
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                placeholder="Alice"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wallet">Wallet Address</Label>
              <Input
                id="wallet"
                value={newWallet}
                onChange={(e) => setNewWallet(e.target.value)}
                placeholder="Solana address"
                className="font-mono text-xs"
              />
            </div>
          </div>
          <Button onClick={addContact} disabled={isAdding} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        </div>

        {/* Contact list */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {contacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No contacts yet. Add your first contact above.
            </div>
          ) : (
            contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{contact.nickname}</div>
                  <div className="text-xs text-muted-foreground font-mono truncate">
                    {contact.wallet_address}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteContact(contact.id, contact.nickname)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
