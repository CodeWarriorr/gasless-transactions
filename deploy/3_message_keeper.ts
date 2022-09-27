import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();

  const Forwarder = await get('Forwarder');
  const MinimalForwarder = await get('MinimalForwarder');

  await deploy('MessageKeeper', {
    from: deployer,
    contract: 'MessageKeeper',
    log: true,
    args: [[Forwarder.address, MinimalForwarder.address]],
    skipIfAlreadyDeployed: false,
  });
};

export default func;
func.tags = ['all', 'MK'];
func.dependencies = ['TF'];
