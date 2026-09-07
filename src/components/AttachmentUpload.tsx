import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { X, File, FileText, Image, Loader2, Paperclip, FileSpreadsheet, Music, Video, FileArchive } from 'lucide-react';
import { ACCEPT_ATTRIBUTE, ACCEPTED_SUMMARY, isAllowedFile, extensionOf } from '@/lib/attachmentTypes';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { generateAESKey, encryptFile, encryptAESKey, importPublicKey } from '@/lib/encryption';
import { supabase } from '@/integrations/supabase/client';
import { callSecureEndpoint } from '@/lib/secureApi';

interface AttachmentUploadProps {
  draftId?: string | null;
  onAttachmentAdded?: (attachment: any) => void;
  walletPublicKey: any;
  signMessage: any;
  onDraftCreated?: (draftId: string) => void;
  autoSaveDraft?: () => Promise<string | null>;
  /** Attachments are billed per file, so the composer needs the running count. */
  onCountChange?: (count: number) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB

/** Lets the composer put the paperclip in its own footer, next to Send. */
export interface AttachmentUploadHandle {
  open: () => void;
  addFiles: (files: File[]) => void;
}

export const AttachmentUpload = forwardRef<AttachmentUploadHandle, AttachmentUploadProps>(({ draftId, onAttachmentAdded, walletPublicKey, signMessage, onDraftCreated, autoSaveDraft, onCountChange }, ref) => {
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    open: () => fileInputRef.current?.click(),
    addFiles: (files: File[]) => void ingest(files),
  }));

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await ingest(Array.from(e.target.files || []));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /** Shared by the picker and by drag-and-drop, so both enforce the same rules. */
  const ingest = async (incoming: File[]) => {
    let files = incoming;

    // The server never sees these unencrypted, so there is no scanner after
    // this point. Anything not on the allowlist is refused here or not at all.
    const rejected = files.filter((f) => !isAllowedFile(f.name));
    if (rejected.length > 0) {
      files = files.filter((f) => isAllowedFile(f.name));
      toast({
        title: rejected.length === 1 ? "File type not accepted" : "Some files were not accepted",
        description: `${rejected.map((f) => f.name).join(", ")} — xmail accepts ${ACCEPTED_SUMMARY}.`,
        variant: "destructive",
      });
    }
    if (files.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Check total size
    const totalSize = attachments.reduce((sum, att) => sum + att.file_size_bytes, 0);
    const newFilesSize = files.reduce((sum, file) => sum + file.size, 0);
    
    if (totalSize + newFilesSize > MAX_TOTAL_SIZE) {
      toast({
        title: "Size Limit Exceeded",
        description: "Total attachments cannot exceed 50MB",
        variant: "destructive",
      });
      return;
    }

    const withinLimit = files.filter((f) => {
      if (f.size > MAX_FILE_SIZE) {
        toast({
          title: "File Too Large",
          description: `${f.name} exceeds 10MB limit`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });
    if (withinLimit.length === 0) return;

    // The draft is created ONCE, before any upload starts. Each uploadFile call
    // used to create its own, and because the parent's draftId prop cannot
    // update mid-loop, attaching three files at once produced three drafts.
    let activeDraftId = draftId;
    if (!activeDraftId && autoSaveDraft) {
      activeDraftId = await autoSaveDraft();
      if (activeDraftId) onDraftCreated?.(activeDraftId);
    }
    if (!activeDraftId) {
      toast({
        title: "Upload Failed",
        description: "Could not create a draft to attach to.",
        variant: "destructive",
      });
      return;
    }

    // Encryption and upload are independent per file, so they run together
    // rather than one after another.
    setUploading(true);
    try {
      await Promise.all(withinLimit.map((f) => uploadFile(f, activeDraftId!)));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File, activeDraftId: string) => {
    if (!walletPublicKey) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get recipient's public key from localStorage
      const recipientPubKeyBase64 = localStorage.getItem('encryption_public_key');
      if (!recipientPubKeyBase64) throw new Error('Encryption key not found');

      // Generate AES key for file
      const aesKey = await generateAESKey();
      
      // Read file as ArrayBuffer
      const fileBuffer = await file.arrayBuffer();
      
      // Encrypt file with AES
      const { encrypted, iv } = await encryptFile(fileBuffer, aesKey);
      
      // Encrypt AES key with recipient's public key
      const recipientPubKey = await importPublicKey(recipientPubKeyBase64);
      const encryptedSymmetricKey = await encryptAESKey(aesKey, recipientPubKey);

      // Register attachment in database
      const response = await callSecureEndpoint(
        'upload_attachment',
        {
          draftId: activeDraftId,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          encryptedSymmetricKey,
          iv
        },
        walletPublicKey,
        signMessage
      );

      // Upload encrypted file to storage
      const { error: uploadError } = await supabase.storage
        .from('email-attachments')
        .upload(response.uploadPath, encrypted, {
          contentType: 'application/octet-stream',
        });

      if (uploadError) throw uploadError;

      const newAttachment = response.attachment;
      setAttachments(prev => {
        const next = [...prev, newAttachment];
        onCountChange?.(next.length);
        return next;
      });
      onAttachmentAdded?.(newAttachment);

      toast({
        title: "File Attached",
        description: `${file.name} uploaded successfully`,
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
    }
  };

  const removeAttachment = async (attachmentId: string) => {
    try {
      await callSecureEndpoint(
        'delete_attachment',
        { attachmentId },
        walletPublicKey,
        signMessage
      );

      setAttachments(prev => {
        const next = prev.filter(a => a.id !== attachmentId);
        onCountChange?.(next.length);
        return next;
      });

      toast({
        title: "Attachment Removed",
        description: "File removed successfully",
      });
    } catch (error) {
      console.error('Remove error:', error);
      toast({
        title: "Remove Failed",
        description: "Failed to remove attachment",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (mimeType: string, fileName = '') => {
    const ext = extensionOf(fileName);
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (mimeType.startsWith('audio/')) return <Music className="h-4 w-4" />;
    if (mimeType.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (mimeType.includes('pdf')) return <FileText className="h-4 w-4" />;
    if (['csv', 'tsv', 'xls', 'xlsx', 'ods'].includes(ext))
      return <FileSpreadsheet className="h-4 w-4" />;
    if (['zip', '7z', 'tar', 'gz', 'tgz', 'bz2', 'rar'].includes(ext))
      return <FileArchive className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatSize = (bytes: number) =>
    bytes >= 1024 * 1024
      ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
      : `${(bytes / 1024).toFixed(0)} KB`;

  // Gating on `draftId` disabled the button for every new message, and the only
  // code path that creates a draft is inside uploadFile -- so the button could
  // never be clicked to reach the code that would have enabled it. Attaching a
  // file to a fresh compose was impossible. A draft is only genuinely required
  // when the parent gives us no way to create one.
  const disabled = uploading || (!draftId && !autoSaveDraft);

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {/* Attached files read as chips above the send row, the way they do in
          Gmail -- a permanent empty dropzone is chrome that earns nothing. */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <span
              key={attachment.id}
              className="group inline-flex max-w-[260px] items-center gap-2 rounded-lg border border-border/70 bg-white/[0.04] py-1.5 pl-2.5 pr-1.5 text-xs"
            >
              <span className="shrink-0 text-muted-foreground">
                {getFileIcon(attachment.mime_type, attachment.file_name)}
              </span>
              <span className="min-w-0 flex-1 truncate">{attachment.file_name}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatSize(attachment.file_size_bytes)}
              </span>
              <button
                type="button"
                onClick={() => removeAttachment(attachment.id)}
                aria-label={`Remove ${attachment.file_name}`}
                className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {uploading && (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Encrypting and uploading…
        </span>
      )}
    </div>
  );
});

AttachmentUpload.displayName = 'AttachmentUpload';
