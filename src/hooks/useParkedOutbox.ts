import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { callSecureEndpoint } from "@/lib/secureApi";
import { useEncryptionKeys } from "@/hooks/useEncryptionKeys";
import { useToast } from "@/hooks/use-toast";
import {
  decryptMessage,
  encryptMessage,
  importPrivateKey,
  importPublicKey,
} from "@/lib/encryption";

/**
 * Delivery of mail that was written before the recipient existed.
 *
 * A parked message is sealed to the sender, because at the moment it was written
 * there was no recipient key to seal it to. Completing delivery therefore means
 * opening it and re-sealing it, and this browser is the only place that can do
 * either -- the server holds ciphertext it cannot read, by design.
 *
 * So the flush runs here, on load, once the keys are unlocked. The honest
 * consequence is that a parked message is delivered the next time the sender
 * opens xmail, not the instant the recipient joins. Making it instant would
 * require the server to hold a key that opens your mail, which is the exact
 * thing the product promises it does not have.
 */
export function useParkedOutbox(onDelivered?: () => void) {
  const { address, signMessage } = useWallet();
  const { keysReady } = useEncryptionKeys();
  const { toast } = useToast();
  const [parkedCount, setParkedCount] = useState(0);
  const flushing = useRef(false);
  const flushedFor = useRef<string | null>(null);

  // Held in a ref, never in a dep array. Callers pass an inline arrow, which is
  // a new function on every render; depending on it gave `flush` a new identity
  // every render, so its effect re-fired every render -- and `flush` sets state,
  // which caused the next render. That loop hammered the server forever and,
  // because a failed call used to clear the session, asked for a signature each
  // time round.
  const onDeliveredRef = useRef(onDelivered);
  onDeliveredRef.current = onDelivered;

  const refreshCount = useCallback(async () => {
    if (!address || !signMessage) return;
    try {
      const res = await callSecureEndpoint("count_parked", {}, address, signMessage);
      setParkedCount(res.count ?? 0);
    } catch (err) {
      console.error("Could not count parked mail:", err);
    }
  }, [address, signMessage]);

  const flush = useCallback(async () => {
    if (!address || !signMessage || flushing.current) return;
    const privateKeyBase64 = localStorage.getItem("encryption_private_key");
    if (!privateKeyBase64) return;

    flushing.current = true;
    let delivered = 0;

    try {
      const res = await callSecureEndpoint(
        "get_deliverable_parked",
        {},
        address,
        signMessage,
      );
      const deliverable = res.parked ?? [];
      setParkedCount(res.total ?? deliverable.length);
      if (deliverable.length === 0) return;

      const privateKey = await importPrivateKey(privateKeyBase64);
      const ownPublicKeyBase64 = localStorage.getItem("encryption_public_key");
      if (!ownPublicKeyBase64) return;
      const ownPublicKey = await importPublicKey(ownPublicKeyBase64);

      for (const item of deliverable) {
        try {
          // Open our own copy, then re-seal to the key the recipient has now
          // registered. Both halves happen in this browser.
          const subject = item.sender_encrypted_subject
            ? await decryptMessage(item.sender_encrypted_subject, privateKey)
            : "";
          const body = item.sender_encrypted_body
            ? await decryptMessage(item.sender_encrypted_body, privateKey)
            : "";

          const recipientKey = await importPublicKey(item.recipient_public_key);
          const encryptedSubject = await encryptMessage(subject, recipientKey);
          const encryptedBody = await encryptMessage(body, recipientKey);
          const senderEncryptedSubject = await encryptMessage(subject, ownPublicKey);
          const senderEncryptedBody = await encryptMessage(body, ownPublicKey);

          const signatureBase64 = await signMessage(`${subject}${body}`);

          await callSecureEndpoint(
            "send_email",
            {
              from_wallet: address,
              to_wallet: item.to_wallet,
              encrypted_subject: encryptedSubject,
              encrypted_body: encryptedBody,
              sender_encrypted_subject: senderEncryptedSubject,
              sender_encrypted_body: senderEncryptedBody,
              sender_signature: signatureBase64,
              attachment_count: 0,
            },
            address,
            signMessage,
          );

          // Only after the send succeeds. Deleting first would lose the message
          // outright if the send failed, and a parked message is the only copy.
          await callSecureEndpoint(
            "delete_parked",
            { parkedId: item.id },
            address,
            signMessage,
          );
          delivered += 1;
        } catch (err) {
          // One undeliverable message must not strand the rest of the queue.
          console.error("Could not deliver parked message:", item.id, err);
        }
      }

      if (delivered > 0) {
        setParkedCount((n) => Math.max(0, n - delivered));
        toast({
          title: delivered === 1 ? "Parked message delivered" : `${delivered} parked messages delivered`,
          description: "The recipient registered a key, so it went out just now.",
        });
        onDeliveredRef.current?.();
      }
    } catch (err) {
      console.error("Parked outbox flush failed:", err);
    } finally {
      flushing.current = false;
    }
  }, [address, signMessage, toast]);

  useEffect(() => {
    if (!keysReady || !address) return;
    // Once per wallet per mount. Parked mail becomes deliverable when someone
    // else registers, which is not an event this tab can observe, so re-running
    // on every render bought nothing and cost everything.
    const key = address;
    if (flushedFor.current === key) return;
    flushedFor.current = key;
    void flush();
  }, [keysReady, address, flush]);

  return { parkedCount, flush, refreshCount };
}
