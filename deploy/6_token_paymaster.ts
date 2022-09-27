import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers } from 'hardhat';
import { fund } from '../utils/fund';

const Uniswap3Router = '0xe592427a0aece92de3edee1f18e0157c05861564';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();

  // const Forwarder = await get('Forwarder');
  // const RelayHub = await get('RelayHub');

  const TestUniswapDeployment = await get('TestUniswap');

  const TokenPaymasterDeployment = await deploy('TokenPaymaster', {
    from: deployer,
    contract: 'TokenPaymaster',
    log: true,
    // args: [[Uniswap3Router]],
    args: [[TestUniswapDeployment.address]],
    skipIfAlreadyDeployed: false,
  });

  // const TokenPaymaster = await ethers.getContract('TokenPaymaster');

  // await TokenPaymaster.setTrustedForwarder(Forwarder.address);
  // await TokenPaymaster.setRelayHub(RelayHub.address);

  // await fund(
  //   TokenPaymasterDeployment.address,
  //   ethers.utils.parseEther('1').toString()
  // );
};

export default func;
func.tags = ['all', 'TP'];
func.dependencies = ['OG'];
