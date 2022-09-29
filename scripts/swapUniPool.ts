import hre, { ethers } from 'hardhat';
import { getSigners } from '../utils/signers';
import { swapETHToUSDC } from '../utils/uniswap';

async function main() {
  const { deployer } = await getSigners();

  await swapETHToUSDC(deployer, '1');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
