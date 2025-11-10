import { useState, useRef } from 'react';
import { Upload, X, File, FileText, Image, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { generateAESKey, encryptFile, encryptAESKey, importPublicKey } from '@/lib/encryption';
import { supabase } from '@/integrations/supabase/client';
import { callSecureEndpoint } from '@/lib/secureApi';

interface AttachmentUploadProps {
  draftId?: string;
  onAttachmentAdded?: (attachment: any) => void;
  walletPublicKey: any;
  signMessage: any;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB

export const AttachmentUpload = ({ draftId, onAttachmentAdded, walletPublicKey, signMessage }: AttachmentUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
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

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File Too Large",
          description: `${file.name} exceeds 10MB limit`,
          variant: "destructive",
        });
        continue;
      }

      await uploadFile(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File) => {
    if (!draftId || !walletPublicKey) {
      toast({
        title: "Error",
        description: "Cannot upload attachment without draft and wallet",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

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
          draftId,
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
      setAttachments(prev => [...prev, newAttachment]);
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
    } finally {
      setUploading(false);
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

      setAttachments(prev => prev.filter(a => a.id !== attachmentId));

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

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (mimeType.includes('pdf')) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading || !draftId}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || !draftId}
          className="gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Attach Files
            </>
          )}
        </Button>
        <span className="text-sm text-muted-foreground">
          Max 10MB per file, 50MB total
        </span>
      </div>

      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card"
            >
              {getFileIcon(attachment.mime_type)}
              <span className="flex-1 text-sm truncate">{attachment.file_name}</span>
              <span className="text-xs text-muted-foreground">
                {(attachment.file_size_bytes / 1024).toFixed(1)}KB
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeAttachment(attachment.id)}
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
