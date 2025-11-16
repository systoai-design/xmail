# XMail Project Knowledge

## Project Overview
XMail is a decentralized, end-to-end encrypted email platform built on Solana blockchain. It provides wallet-to-wallet encrypted messaging with zero-knowledge privacy, blockchain verification, and spam protection through micropayments.

## Core Technologies
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom design system
- **Backend**: Supabase (Lovable Cloud)
- **Blockchain**: Solana Web3.js
- **Wallet**: Solana Wallet Adapter
- **Encryption**: Web Crypto API (AES-256-GCM + RSA-OAEP)
- **UI Components**: Shadcn/ui + Radix UI
- **Rich Text**: React Quill
- **State Management**: React hooks + Context API

## Architecture

### Authentication Flow
1. Users connect Solana wallet (Phantom, Solflare, etc.)
2. Wallet signature authenticates identity
3. No traditional login required
4. Session managed via wallet connection state

### Encryption System

#### Key Management
- **RSA-OAEP 2048-bit** keypairs for asymmetric encryption
- **AES-256-GCM** for symmetric encryption of message content
- **Key Storage**: Private keys encrypted and stored in localStorage
- **Key Derivation**: Keys can be derived from wallet signature
- **Key Rotation**: Automatic rotation warnings and manual rotation support
- **Key Backup**: QR code export and manual backup options

#### Message Encryption Flow
1. Sender encrypts message with AES-256-GCM (symmetric key)
2. Symmetric key encrypted with recipient's RSA public key
3. Both encrypted message and encrypted key stored on-chain
4. Recipient decrypts key with their RSA private key
5. Decrypted key used to decrypt message content

#### File Attachment Encryption
1. Generate unique AES key per file
2. Encrypt file with AES-256-GCM
3. Encrypt AES key with recipient's public key
4. Store encrypted file in Supabase Storage
5. Store encrypted key in database

### Database Schema

#### Core Tables

**encrypted_emails**
- Stores all sent/received emails
- Fields: id, from_wallet, to_wallet, encrypted_subject, encrypted_body, sender_encrypted_subject, sender_encrypted_body, timestamp, read, starred, sender_signature, payment_tx_signature
- RLS policies: Users can only read emails where they are sender or recipient

**email_drafts**
- Auto-saved drafts
- Fields: id, wallet_address, to_wallet, encrypted_subject, encrypted_body, auto_saved, created_at, updated_at
- RLS policies: Users can only access their own drafts

**email_attachments**
- Encrypted file metadata
- Fields: id, email_id, draft_id, wallet_address, file_name, encrypted_file_name, file_size_bytes, mime_type, encrypted_symmetric_key, iv
- Storage: Encrypted files in Supabase Storage bucket 'email-attachments'

**contacts**
- User's contact book
- Fields: id, owner_wallet, wallet_address, nickname, created_at, updated_at
- RLS policies: Users can only manage their own contacts

**encryption_keys**
- Public key registry
- Fields: wallet_address (PK), public_key, encrypted_private_key, iv, key_created_at
- Note: Private keys stored encrypted, only decryptable by key owner

**scheduled_emails**
- Emails scheduled for future sending
- Fields: id, wallet_address, to_wallet, encrypted_subject, encrypted_body, scheduled_for, timezone, status, sent_at, error_message, sender_signature
- Status values: 'pending', 'sent', 'failed'

**email_templates**
- Reusable message templates
- Fields: id, wallet_address, name, description, encrypted_subject, encrypted_body, variables, is_favorite, use_count, last_used_at

**email_labels**
- Custom email labels/folders
- Fields: id, wallet_address, name, color, icon, is_system

**email_label_assignments**
- Many-to-many relationship between emails and labels
- Fields: id, email_id, label_id, wallet_address, assigned_at

**user_roles**
- Role-based access control
- Roles: 'admin', 'tester', 'user'
- Fields: id, wallet_address, role

### Edge Functions

**secure-email**
- Handles email sending with signature verification
- Validates sender signature
- Checks encryption keys exist
- Inserts encrypted email into database
- Returns transaction confirmation

**process-scheduled-emails**
- Cron job to process scheduled emails
- Runs periodically to check for emails due to be sent
- Validates timing and timezone
- Sends emails and updates status

**toggle-star**
- Toggles starred status on emails
- Validates user ownership

### Security Features

#### Row-Level Security (RLS)
- All tables have RLS enabled
- Users can only access their own data
- Email access limited to sender/recipient
- Wallet address used for all authorization

#### Zero-Knowledge Architecture
- No plaintext messages stored
- Server never has access to decryption keys
- All decryption happens client-side
- No user tracking or analytics

#### Spam Protection
- Micropayment required per message (< $0.0001)
- Prevents mass spam attacks
- Solana blockchain verification
- Optional: Admin role bypasses fees

### UI Components

#### Landing Page Features
- **HeroSection**: Animated hero with particle effects, floating security badges
- **Shield3D**: Interactive 3D shield showing encryption layers
- **ParticleEncryption**: Canvas-based particle animation showing data flow
- **ComparisonTable**: Animated comparison with traditional email providers
- **EncryptionPlayground**: Live encryption demo
- **FloatingSecurityBadges**: Live stats (TPS, messages sent, security metrics)
- **Scroll Animations**: Intersection observer-based fade-in effects

#### Email Interface
- **GmailSidebar**: Collapsible sidebar with navigation
  - Desktop: Expandable/collapsible with mini mode
  - Mobile: Slide-out drawer with overlay
  - Navigation: Inbox, Starred, Sent, Drafts, Contacts
  - Wallet info and key management
  
- **InlineEmailViewer**: Full-screen email view
  - Gmail-style layout
  - Back button to return to list
  - Action toolbar (archive, delete, star)
  - Attachment download/preview
  - Security badges

- **ComposeModal**: Email composition
  - Rich text editor with formatting
  - Contact autocomplete
  - File attachments (drag & drop)
  - Auto-save drafts
  - Recipient validation
  - Schedule sending
  - Multiple compose windows support

- **EmailRow**: Email list item
  - Checkbox for bulk actions
  - Star toggle
  - Read/unread status
  - Sender avatar
  - Subject preview
  - Timestamp
  - Attachment indicator

#### Key Management
- **KeyManagement**: Key lifecycle management
  - Generate new keypair
  - Import existing key
  - Export key (QR code)
  - Key rotation
  - Health monitoring

- **KeyRotationBanner**: Alerts for key health
  - Age warnings
  - Compromised key detection
  - Rotation recommendations

#### Contact Management
- **ContactBook**: Address book
  - Add/edit contacts
  - Nickname assignment
  - Quick select for compose
  - Search/filter

- **ContactAutocomplete**: Smart recipient input
  - Searches contacts
  - Validates wallet addresses
  - Shows registration status

### Design System

#### Colors (HSL)
- **Primary**: `220 90% 56%` (Electric Blue)
- **Secondary**: `190 100% 55%` (Cyan)
- **Success**: `160 85% 45%` (Green)
- **Accent**: `280 75% 65%` (Purple)
- **Background**: `220 35% 8%` (Deep Navy)
- **Foreground**: `0 0% 100%` (White)

#### Components
- Glass morphism effects
- Smooth transitions and animations
- Responsive typography
- Dark theme optimized
- Custom cursor with magnetic effects

#### Animations
- **fade-in**: Entrance animations
- **scale-in**: Pop-in effects
- **float**: Floating badges
- **encrypt-reveal**: Staggered reveals
- **checkmark**: Animated checkmarks
- **lock-pulse**: Security icons

### Key Workflows

#### Sending an Email
1. User clicks Compose
2. Enters recipient wallet address (autocomplete from contacts)
3. Validates recipient has registered public key
4. Composes message with rich text editor
5. Optionally adds attachments
6. Draft auto-saves every 10 seconds
7. Click Send
8. Message encrypted with recipient's public key
9. Sender copy encrypted with own key
10. Attachments encrypted individually
11. Wallet signature required
12. Transaction sent to blockchain
13. Email stored in database
14. Confirmation toast

#### Reading an Email
1. User navigates to Inbox
2. Unread emails marked with indicator
3. Click email to open full view
4. Private key retrieved from localStorage
5. Encrypted message decrypted client-side
6. Attachments decrypted on demand
7. Mark as read in database
8. Display decrypted content

#### Key Rotation
1. System monitors key age
2. Banner appears when key > 90 days old
3. User initiates rotation
4. Generate new keypair
5. Encrypt new private key
6. Update public key in database
7. Old key retained for decrypting old messages
8. New key used for all new messages

### Mobile Optimization

#### Responsive Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

#### Mobile-Specific Features
- Slide-out sidebar drawer
- Bottom navigation
- Touch-optimized buttons (44px minimum)
- Simplified header
- Full-screen email view
- Swipe gestures ready

#### Performance Optimizations
- Lazy loading
- Virtual scrolling for long email lists
- Image optimization
- Code splitting
- Debounced search

### API Integration Points

#### Supabase Edge Functions
- `/secure-email`: Send encrypted email
- `/toggle-star`: Toggle starred status
- `/process-scheduled-emails`: Cron for scheduled sends
- `/upload_attachment`: Upload encrypted file
- `/get_draft`: Retrieve draft
- `/save_draft`: Save/update draft

#### External Services
- Solana RPC: Blockchain interactions
- Wallet adapters: Multi-wallet support

### Error Handling

#### Common Error Scenarios
1. **Wallet Not Connected**: Redirect to landing page
2. **Missing Keys**: Show key import banner
3. **Recipient Not Registered**: Display error, suggest inviting
4. **Decryption Failed**: Show encrypted content warning
5. **Network Error**: Retry with exponential backoff
6. **Storage Full**: File size limit warnings

### Development Guidelines

#### Code Organization
```
src/
├── components/         # React components
│   ├── ui/            # Shadcn/ui components
│   ├── landing/       # Landing page sections
│   └── [feature]/     # Feature-specific components
├── pages/             # Route pages
├── hooks/             # Custom hooks
├── lib/               # Utilities
│   ├── encryption.ts  # Crypto functions
│   ├── secureApi.ts   # API wrapper with signing
│   ├── events.ts      # Custom event system
│   └── utils.ts       # General utilities
├── contexts/          # React contexts
├── integrations/      # Third-party integrations
│   └── supabase/      # Supabase client
└── index.css          # Design system
```

#### Best Practices
- Use TypeScript for type safety
- Implement proper error boundaries
- Handle loading states
- Provide user feedback (toasts)
- Validate all inputs
- Never expose private keys
- Always encrypt sensitive data
- Test on multiple wallets
- Optimize for mobile

### Future Enhancements

#### Planned Features
- [ ] Email threading/conversations
- [ ] Read receipts
- [ ] Email forwarding
- [ ] Bulk operations
- [ ] Advanced search filters
- [ ] Custom themes
- [ ] Multi-language support
- [ ] Browser notifications
- [ ] PWA support
- [ ] Email templates with variables
- [ ] Scheduled sending UI
- [ ] Label management UI
- [ ] Import from Gmail
- [ ] Export to PDF
- [ ] Two-factor authentication

### Testing Checklist

#### Critical Paths
- [ ] Wallet connection/disconnection
- [ ] Send email to registered user
- [ ] Send email to unregistered user (error)
- [ ] Read received email
- [ ] Decrypt attachments
- [ ] Save and load drafts
- [ ] Star/unstar emails
- [ ] Delete emails
- [ ] Search functionality
- [ ] Key generation
- [ ] Key import/export
- [ ] Key rotation
- [ ] Contact management
- [ ] Mobile sidebar toggle
- [ ] Compose window management

#### Browser Compatibility
- Chrome/Edge (Chromium)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile)

### Performance Targets
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **Lighthouse Score**: > 90

### Security Audit Points
1. RLS policies on all tables
2. No plaintext storage
3. Signature verification on all mutations
4. Input sanitization
5. XSS prevention
6. CSRF protection
7. Rate limiting
8. Secure key storage
9. No logging of sensitive data
10. Regular dependency updates

## Deployment

### Environment Variables (Already Configured)
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Supabase anon key
- `VITE_SUPABASE_PROJECT_ID`: Project identifier

### Build Process
```bash
npm run build    # Vite build
```

### Publish
- Frontend auto-deploys via Lovable
- Edge functions auto-deploy on save
- Database migrations require approval

---

## Quick Reference

### Important Files
- `src/lib/encryption.ts`: All encryption logic
- `src/hooks/useEncryptionKeys.ts`: Key management hook
- `src/pages/Inbox.tsx`: Main email interface
- `src/components/ComposeModal.tsx`: Email composition
- `src/components/GmailSidebar.tsx`: Navigation sidebar
- `src/index.css`: Design system variables
- `supabase/functions/secure-email/index.ts`: Email sending API

### Common Commands
```typescript
// Get public key for wallet
const { data } = await supabase
  .from('encryption_keys')
  .select('public_key')
  .eq('wallet_address', walletAddress)
  .single();

// Call secure API with signature
const result = await callSecureEndpoint(
  'endpoint_name',
  { data },
  publicKey,
  signMessage
);

// Encrypt message
const encrypted = await encryptMessage(plaintext, recipientPublicKey);

// Decrypt message
const decrypted = await decryptMessage(encrypted, privateKey);
```

### Support Resources
- [Supabase Docs](https://supabase.com/docs)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [Wallet Adapter](https://github.com/solana-labs/wallet-adapter)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Shadcn UI](https://ui.shadcn.com/)
