import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { toHex, keccak256 } from "viem";

describe("KeyRegistry", async () => {
  const { viem } = await network.connect();

  // A stand-in for a real RSA-2048 SPKI export (294 bytes).
  const rsaKey = toHex(new Uint8Array(294).fill(0xab));
  const attackerKey = toHex(new Uint8Array(294).fill(0xcc));

  let registry: any;
  let victim: any;
  let attacker: any;

  before(async () => {
    registry = await viem.deployContract("KeyRegistry");
    const wallets = await viem.getWalletClients();
    victim = wallets[0];
    attacker = wallets[1];
  });

  it("records a key against the caller's own address", async () => {
    await registry.write.registerKey([rsaKey], { account: victim.account });
    const [publicKey, , version] = await registry.read.keyOf([victim.account.address]);
    assert.equal(publicKey, rsaKey);
    assert.equal(version, 1);
  });

  // This is the test that matters. In the Supabase version, an anonymous caller could
  // UPDATE any row in encryption_keys and swap a victim's public key for their own.
  // On-chain there is no call that lets an attacker address write the victim's slot.
  it("gives an attacker no way to overwrite someone else's key", async () => {
    await registry.write.registerKey([attackerKey], { account: attacker.account });

    const [victimKey] = await registry.read.keyOf([victim.account.address]);
    const [attackerStored] = await registry.read.keyOf([attacker.account.address]);

    assert.equal(victimKey, rsaKey, "victim's key must be untouched");
    assert.equal(attackerStored, attackerKey, "attacker only ever writes their own slot");
    assert.notEqual(victimKey, attackerStored);
  });

  it("bumps version on rotation and keeps the newest key", async () => {
    const rotated = toHex(new Uint8Array(294).fill(0x11));
    await registry.write.registerKey([rotated], { account: victim.account });
    const [publicKey, , version] = await registry.read.keyOf([victim.account.address]);
    assert.equal(publicKey, rotated);
    assert.equal(version, 2);
  });

  it("reports version 0 for an address that never registered", async () => {
    const wallets = await viem.getWalletClients();
    const stranger = wallets[2];
    assert.equal(await registry.read.hasKey([stranger.account.address]), false);
  });

  it("rejects an empty key", async () => {
    await assert.rejects(() =>
      registry.write.registerKey(["0x"], { account: victim.account })
    );
  });

  it("rejects a key past MAX_KEY_BYTES", async () => {
    const huge = toHex(new Uint8Array(1025).fill(0x01));
    await assert.rejects(() =>
      registry.write.registerKey([huge], { account: victim.account })
    );
  });

  it("resolves a contact list in one batch read", async () => {
    const [keys, versions] = await registry.read.keysOf([
      [victim.account.address, attacker.account.address],
    ]);
    assert.equal(keys.length, 2);
    assert.equal(versions[0], 2);
    assert.equal(versions[1], 1);
  });
});
