import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { keccak256, toHex, encodePacked } from "viem";

describe("MessageAnchor", async () => {
  const { viem } = await network.connect();

  let anchor: any;
  let alice: any;
  let bob: any;
  let mallory: any;

  const ciphertext = "encrypted-payload-v1";

  before(async () => {
    anchor = await viem.deployContract("MessageAnchor");
    const wallets = await viem.getWalletClients();
    [alice, bob, mallory] = wallets;
  });

  const hashFor = (payload: string, from: string, to: string) =>
    keccak256(
      encodePacked(["string", "address", "address"], [payload, from as `0x${string}`, to as `0x${string}`])
    );

  it("anchors a commitment and reports it verified for the right pair", async () => {
    const messageHash = hashFor(ciphertext, alice.account.address, bob.account.address);
    await anchor.write.anchor([messageHash, bob.account.address], { account: alice.account });

    const [verified, timestamp, blockNumber] = await anchor.read.verify([
      messageHash,
      alice.account.address,
      bob.account.address,
    ]);
    assert.equal(verified, true);
    assert.ok(timestamp > 0n, "timestamp recorded");
    assert.ok(blockNumber > 0n, "block number recorded");
  });

  // Tamper-evidence: change one byte of ciphertext and the recomputed hash no longer
  // matches anything on chain, which is the whole point of the anchor.
  it("does not verify a tampered payload", async () => {
    const tampered = hashFor(ciphertext + "!", alice.account.address, bob.account.address);
    assert.equal(await anchor.read.isAnchored([tampered]), false);
  });

  it("does not verify against the wrong sender or recipient", async () => {
    const messageHash = hashFor(ciphertext, alice.account.address, bob.account.address);
    const [wrongSender] = await anchor.read.verify([
      messageHash,
      mallory.account.address,
      bob.account.address,
    ]);
    const [wrongRecipient] = await anchor.read.verify([
      messageHash,
      alice.account.address,
      mallory.account.address,
    ]);
    assert.equal(wrongSender, false);
    assert.equal(wrongRecipient, false);
  });

  it("refuses to anchor the same hash twice", async () => {
    const messageHash = hashFor(ciphertext, alice.account.address, bob.account.address);
    await assert.rejects(() =>
      anchor.write.anchor([messageHash, bob.account.address], { account: alice.account })
    );
  });

  it("rejects a zero hash and a zero recipient", async () => {
    const zero = "0x" + "00".repeat(32);
    await assert.rejects(() =>
      anchor.write.anchor([zero, bob.account.address], { account: alice.account })
    );
    await assert.rejects(() =>
      anchor.write.anchor([hashFor("x", alice.account.address, bob.account.address), "0x" + "00".repeat(20)], {
        account: alice.account,
      })
    );
  });

  it("anchors a batch and tracks counts", async () => {
    const hashes = [1, 2, 3].map((n) =>
      hashFor(`batch-${n}`, alice.account.address, bob.account.address)
    );
    const recipients = [bob.account.address, bob.account.address, mallory.account.address];
    await anchor.write.anchorBatch([hashes, recipients], { account: alice.account });

    assert.equal(await anchor.read.totalAnchored(), 4n);
    assert.equal(await anchor.read.sentCount([alice.account.address]), 4n);
    assert.equal(await anchor.read.isAnchored([hashes[2]]), true);
  });
});
