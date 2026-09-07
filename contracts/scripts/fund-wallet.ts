import { network } from "hardhat";
import { formatEther, parseEther, isAddress } from "viem";

/**
 * Sends testnet ETH from the deployer to another wallet.
 *
 * Usage:
 *   TO=0x... AMOUNT=0.003 npx hardhat run scripts/fund-wallet.ts --network robinhoodTestnet
 *
 * Deliberately noisy about what it is about to do, and it refuses rather than
 * guesses: a transfer is irreversible, and the two failure modes that actually
 * happen are a mistyped address and an amount that leaves the sender unable to
 * pay for its own gas.
 */
async function main() {
  const to = process.env.TO;
  const amount = process.env.AMOUNT ?? "0.003";

  if (!to || !isAddress(to)) {
    throw new Error("Set TO to a valid 0x address. Example: TO=0x88a2... AMOUNT=0.003");
  }

  const { viem } = await network.connect();
  const pub = await viem.getPublicClient();
  const [deployer] = await viem.getWalletClients();

  const from = deployer.account.address;
  const balance = await pub.getBalance({ address: from });
  const value = parseEther(amount);

  console.log("from   :", from);
  console.log("to     :", to);
  console.log("amount :", amount, "ETH");
  console.log("balance:", formatEther(balance), "ETH");

  if (from.toLowerCase() === to.toLowerCase()) {
    throw new Error("Sending to itself. Check the TO address.");
  }

  // Leave enough behind to keep anchoring messages. An anchor costs roughly
  // 0.00000087 ETH, so this reserve is thousands of them.
  const reserve = parseEther("0.002");
  if (balance < value + reserve) {
    throw new Error(
      `Not enough left over. Sending ${amount} would leave under ${formatEther(reserve)} ETH ` +
        `for gas, and this wallet pays for every message anchor.`,
    );
  }

  const hash = await deployer.sendTransaction({ to: to as `0x${string}`, value });
  console.log("\nsent:", hash);

  const receipt = await pub.waitForTransactionReceipt({ hash });
  console.log("status:", receipt.status, "| block:", receipt.blockNumber);

  console.log("\nfrom balance:", formatEther(await pub.getBalance({ address: from })), "ETH");
  console.log("to   balance:", formatEther(await pub.getBalance({ address: to as `0x${string}` })), "ETH");
  console.log("explorer: https://explorer.testnet.chain.robinhood.com/tx/" + hash);
}

main().catch((e) => {
  console.error("\n" + (e instanceof Error ? e.message : String(e)));
  process.exitCode = 1;
});
