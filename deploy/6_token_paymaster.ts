import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers } from 'hardhat';
import { TokenPaymaster } from '../typechain-types';

// const Uniswap3Router = '0xe592427a0aece92de3edee1f18e0157c05861564';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();

  const Forwarder = await ethers.getContract('Forwarder');
  const RelayHub = await ethers.getContract('RelayHub');

  const TestUniswapDeployment = await get('TestUniswap');

  await deploy('TokenPaymaster', {
    from: deployer,
    contract: 'TokenPaymaster',
    log: true,
    // args: [[Uniswap3Router]],
    args: [[TestUniswapDeployment.address]],
    skipIfAlreadyDeployed: false,
  });

  const TokenPaymaster: TokenPaymaster = await ethers.getContract(
    'TokenPaymaster'
  );

  await TokenPaymaster.setTrustedForwarder(Forwarder.address);
  await TokenPaymaster.setRelayHub(RelayHub.address);

  // TokenPaymaster has no deposit for in receive()
  // This is probably because eth refund goes straight to depositFor
  // await fund(TokenPaymaster.address, ethers.utils.parseEther('1').toString());
  await RelayHub.depositFor(TokenPaymaster.address, {
    value: ethers.utils.parseEther('1'),
  });
};

export default func;
func.tags = ['all', 'TP'];
func.dependencies = ['OG'];
