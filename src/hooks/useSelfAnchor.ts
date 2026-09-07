import { useCallback } from "react";
import { useWriteContract, usePublicClient } from "wagmi";
import { useWallet } from "@/hooks/useWallet";
import { robinhoodChain } from "@/lib/wagmi";
import {
  messageAnchorAddress,
  MESSAGE_ANCHOR_ABI,
  messageCommitment,
} from "@/lib/chainClient";
import { callSecureEndpoint } from "@/lib/secureApi";
import { isDeployed } from "@/config/chain";

/**
 * Anchoring a message from the sender's own wallet.
 *
 * The contract records `msg.sender`. When xmail relayed the transaction, that
 * was xmail -- so an anchor could prove a message had not changed, but not that
 * any particular person sent it, and verification had to ask about the relayer
 * rather than the sender. Signing it here is what closes that gap: the chain
 * now attests that THIS address committed to THIS ciphertext.
 *
 * It also removes a griefing vector. With one shared relayer, anyone watching
 * the mempool could front-run an anchor, take the `from` slot for themselves,
 * and leave the real message permanently unverifiable. There is nothing to
 * front-run when the sender's own address is the one that has to appear.
 *
 * Deliberately best-effort and never fatal. A message that sends but fails to
 * anchor has no integrity proof; a message that fails to send because the chain
 * was busy is lost mail. The first is strictly better, so a rejected signature
 * or an empty wallet leaves the mail delivered and simply unanchored.
 */
export function useSelfAnchor() {
  const { address, signMessage, wrongChain, switchToChain } = useWallet();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const anchorMessage = useCallback(
    async (emailId: string, ciphertext: string, toWallet: string): Promise<boolean> => {
      if (!isDeployed || !address) return false;

      try {
        if (wrongChain && !(await switchToChain())) return false;

        const from = address as `0x${string}`;
        const to = toWallet.toLowerCase() as `0x${string}`;
        const messageHash = messageCommitment(ciphertext, from, to);

        const txHash = await writeContractAsync({
          address: messageAnchorAddress,
          abi: MESSAGE_ANCHOR_ABI,
          functionName: "anchor",
          args: [messageHash, to],
          chain: robinhoodChain,
          account: from,
        });

        const receipt = await publicClient?.waitForTransactionReceipt({
          hash: txHash,
          timeout: 90_000,
        });

        // The server re-reads the transaction rather than taking our word for
        // it, so a client cannot mark its own mail as anchored.
        await callSecureEndpoint(
          "record_anchor",
          {
            emailId,
            txHash,
            messageHash,
            blockNumber: receipt ? Number(receipt.blockNumber) : null,
          },
          address,
          signMessage,
        );

        return true;
      } catch (err) {
        // Includes the user simply declining. The mail is already sent.
        console.warn("Message not anchored:", err);
        return false;
      }
    },
    [address, wrongChain, switchToChain, writeContractAsync, publicClient, signMessage],
  );

  return { anchorMessage };
}
