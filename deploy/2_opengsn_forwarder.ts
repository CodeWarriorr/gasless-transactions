import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers } from 'hardhat';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy('Forwarder', {
    from: deployer,
    contract: 'Forwarder',
    log: true,
    skipIfAlreadyDeployed: false,
  });

  const Forwarder = await ethers.getContract('Forwarder');

  await Forwarder.registerDomainSeparator('Forwarder', '1');
};

export default func;
func.tags = ['all', 'OF'];
