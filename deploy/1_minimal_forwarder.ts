import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers } from 'hardhat';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy('MinimalForwarder', {
    from: deployer,
    contract: 'MinimalForwarder',
    log: true,
    skipIfAlreadyDeployed: false,
  });
};

export default func;
func.tags = ['all', 'MF'];
