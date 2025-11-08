import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/integrations/supabase/client';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Contact {
  id: string;
  wallet_address: string;
  nickname: string;
}

interface ContactAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const ContactAutocomplete = ({
  value,
  onChange,
  placeholder,
  className,
}: ContactAutocompleteProps) => {
  const { publicKey } = useWallet();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (publicKey && open) {
      loadContacts();
    }
  }, [publicKey, open]);

  const loadContacts = async () => {
    if (!publicKey) return;

    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('owner_wallet', publicKey.toBase58())
      .order('nickname');

    setContacts(data || []);
  };

  const handleSelect = (contact: Contact) => {
    onChange(contact.wallet_address);
    setInputValue(contact.wallet_address);
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.nickname.toLowerCase().includes(inputValue.toLowerCase()) ||
      contact.wallet_address.toLowerCase().includes(inputValue.toLowerCase())
  );

  const selectedContact = contacts.find((c) => c.wallet_address === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className={cn('font-mono text-sm', className)}
          />
          {selectedContact && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-primary/10 text-primary px-2 py-1 rounded">
              {selectedContact.nickname}
            </div>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search contacts..." />
          <CommandList>
            <CommandEmpty>No contacts found.</CommandEmpty>
            <CommandGroup heading="Contacts">
              {filteredContacts.map((contact) => (
                <CommandItem
                  key={contact.id}
                  onSelect={() => handleSelect(contact)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === contact.wallet_address ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex-1">
                    <div className="font-semibold">{contact.nickname}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">
                      {contact.wallet_address}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
