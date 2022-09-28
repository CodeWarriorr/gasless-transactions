import { ethers } from 'hardhat';
import { TestUniswap, TestToken } from '../typechain-types';
import { getSigners } from './signers';

export const fund = async (address: string, value: string) => {
  const { deployer } = await getSigners();

  await deployer.sendTransaction({
    to: address,
    value: value,
  });
};

export const fundTestUniswapToken = async (
  TestUniswap: TestUniswap,
  address: string,
  value: string
) => {
  const { deployer } = await getSigners();

  const TestToken: TestToken = await ethers.getContractAt(
    'contracts/paymasters/helpers/TestToken.sol:TestToken',
    // '@opengsn/contracts/src/test/TestToken.sol:TestToken',
    await TestUniswap.tokenAddress()
  );

  await TestToken.connect(deployer).mint(value);
  await TestToken.connect(deployer).transfer(address, value);
};
