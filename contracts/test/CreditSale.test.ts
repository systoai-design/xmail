import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { keccak256, toHex, parseEther } from "viem";

/**
 * The properties that matter: money reaches the treasury, the payment is bound
 * to an account nobody else can claim, and no payment can arrive in a shape
 * that produces credits without a matching event.
 */
describe("CreditSale", async () => {
  const { viem } = await network.connect();

  let sale: any;
  let pub: any;
  let payer: any;
  let treasury: any;

  const accountHash = keccak256(toHex("DitkqVYcr7yZHvWkP42NtrGRTNNNNPu2zadY83sXMam2"));
  const ZERO = `0x${"0".repeat(64)}` as `0x${string}`;

  before(async () => {
    const wallets = await viem.getWalletClients();
    [payer, treasury] = wallets;
    sale = await viem.deployContract("CreditSale", [treasury.account.address]);
    pub = await viem.getPublicClient();
  });

  it("forwards the whole payment to the treasury", async () => {
    const before = await pub.getBalance({ address: treasury.account.address });
    await sale.write.buy([accountHash], { value: parseEther("0.01"), account: payer.account });
    const after = await pub.getBalance({ address: treasury.account.address });
    assert.equal(after - before, parseEther("0.01"));
  });

  it("keeps no balance of its own, so there is nothing to withdraw or steal", async () => {
    await sale.write.buy([accountHash], { value: parseEther("0.05"), account: payer.account });
    assert.equal(await pub.getBalance({ address: sale.address }), 0n);
  });

  it("records which account the payment is for", async () => {
    await sale.write.buy([accountHash], { value: parseEther("0.02"), account: payer.account });
    const logs = await pub.getContractEvents({
      address: sale.address,
      abi: sale.abi,
      eventName: "CreditsPurchased",
    });
    const last = logs[logs.length - 1];
    assert.equal(last.args.accountHash, accountHash);
    assert.equal(last.args.amountWei, parseEther("0.02"));
    assert.equal(last.args.payer.toLowerCase(), payer.account.address.toLowerCase());
  });

  it("rejects a payment with no account, which could not be credited to anyone", async () => {
    await assert.rejects(() =>
      sale.write.buy([ZERO], { value: parseEther("0.01"), account: payer.account }),
    );
  });

  it("rejects a zero payment", async () => {
    await assert.rejects(() =>
      sale.write.buy([accountHash], { value: 0n, account: payer.account }),
    );
  });

  it("rejects dust below the minimum", async () => {
    await assert.rejects(() =>
      sale.write.buy([accountHash], { value: 1n, account: payer.account }),
    );
  });

  it("rejects a bare transfer, which carries no account", async () => {
    await assert.rejects(() =>
      payer.sendTransaction({ to: sale.address, value: parseEther("0.01") }),
    );
  });

  it("exposes no owner, withdrawal, or treasury-change function", async () => {
    const names = sale.abi.filter((e: any) => e.type === "function").map((e: any) => e.name);
    for (const forbidden of ["setTreasury", "withdraw", "transferOwnership", "owner", "renounceOwnership"]) {
      assert.equal(names.includes(forbidden), false, `${forbidden} must not exist`);
    }
  });
});
