import { network } from "hardhat";
import { formatEther } from "viem";

/**
 * Deploys CreditSale. Treasury defaults to the deployer, which is also the
 * anchoring relayer -- deliberately the same wallet for now so gas and revenue
 * share an account on testnet. Pass TREASURY_ADDRESS to separate them.
 */
async function main() {
  const { viem } = await network.connect();
  const pub = await viem.getPublicClient();
  const [deployer] = await viem.getWalletClients();

  const treasury = (process.env.TREASURY_ADDRESS ?? deployer.account.address) as `0x${string}`;
  console.log("deployer:", deployer.account.address);
  console.log("treasury:", treasury);
  console.log("balance :", formatEther(await pub.getBalance({ address: deployer.account.address })), "ETH");

  const sale = await viem.deployContract("CreditSale", [treasury]);
  console.log("\nCreditSale deployed:", sale.address);

  const onChainTreasury = await sale.read.treasury();
  console.log("treasury on-chain  :", onChainTreasury);
  if (onChainTreasury.toLowerCase() !== treasury.toLowerCase()) {
    throw new Error("treasury mismatch after deploy");
  }

  console.log("\nexplorer: https://explorer.testnet.chain.robinhood.com/address/" + sale.address);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
