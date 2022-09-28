import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers } from 'hardhat';
import { fund } from '../utils/fund';
import { AcceptEverythingPaymaster } from '../typechain-types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();

  const Forwarder = await get('Forwarder');
  const RelayHub = await get('RelayHub');

  await deploy('AcceptEverythingPaymaster', {
    from: deployer,
    contract: 'AcceptEverythingPaymaster',
    log: true,
    args: [],
    skipIfAlreadyDeployed: false,
  });

  const AcceptEverythingPaymaster: AcceptEverythingPaymaster =
    await ethers.getContract('AcceptEverythingPaymaster');

  await AcceptEverythingPaymaster.setTrustedForwarder(Forwarder.address);
  await AcceptEverythingPaymaster.setRelayHub(RelayHub.address);

  await fund(
    AcceptEverythingPaymaster.address,
    ethers.utils.parseEther('1').toString()
  );
};

export default func;
func.tags = ['all', 'AEP'];
func.dependencies = ['OG'];
