import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers } from 'hardhat';

const deadAddress = '0x000000000000000000000000000000000000dEaD';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get } = deployments;
  const { deployer, mat, alice } = await getNamedAccounts();

  const TestUniswapArgs = {
    rateMult: 2,
    rateDiv: 1,
  };

  const TestUniswapDeployment = await deploy('TestUniswap', {
    from: deployer,
    contract: 'TestUniswap',
    log: true,
    args: [TestUniswapArgs.rateMult, TestUniswapArgs.rateDiv],
    value: ethers.utils.parseEther('1'),
    skipIfAlreadyDeployed: false,
  });

  const stakeManagerArgs = {
    maxUnstakeDelay: 0,
    abandonmentDelay: 0,
    escheatmentDelay: 0,
    burnAddress: deadAddress,
    devAddress: mat,
  };

  const StakeManagerDeployment = await deploy('StakeManager', {
    from: deployer,
    contract: 'StakeManager',
    log: true,
    args: [
      stakeManagerArgs.maxUnstakeDelay,
      stakeManagerArgs.abandonmentDelay,
      stakeManagerArgs.escheatmentDelay,
      stakeManagerArgs.burnAddress,
      stakeManagerArgs.devAddress,
    ],
    skipIfAlreadyDeployed: false,
  });

  const StakeManager = await ethers.getContract('StakeManager');
  const TestUniswap = await ethers.getContract('TestUniswap');

  const relayManager = deployer;
  const unstakeDelay = '0';
  const amount = ethers.utils.parseEther('10');
  const TestToken = await ethers.getContractAt(
    'contracts/paymasters/helpers/TestToken.sol:TestToken',
    // '@opengsn/contracts/src/test/TestToken.sol:TestToken',
    await TestUniswap.tokenAddress()
  );
  await TestToken.mint(amount);
  await TestToken.approve(StakeManager.address, amount);
  await StakeManager.setRelayManagerOwner(relayManager);
  await StakeManager.stakeForRelayManager(
    await TestUniswap.tokenAddress(),
    relayManager,
    unstakeDelay,
    amount
  );

  const PenalizerArgs = {
    penalizeBlockDelay: 0,
    penalizeBlockExpiration: 0,
  };

  const PenalizerDeployment = await deploy('Penalizer', {
    from: deployer,
    contract: 'Penalizer',
    log: true,
    args: [
      PenalizerArgs.penalizeBlockDelay,
      PenalizerArgs.penalizeBlockExpiration,
    ],
    skipIfAlreadyDeployed: false,
  });

  const batchGatewayAddress = ethers.constants.AddressZero;

  const relayRegistrationMaxAge = 0;

  const RelayRegistrarDeployment = await deploy('RelayRegistrar', {
    from: deployer,
    contract: 'RelayRegistrar',
    log: true,
    args: [relayRegistrationMaxAge],
    skipIfAlreadyDeployed: false,
  });

  const RelayHubConfig = {
    maxWorkerCount: 1000,
    gasReserve: 1000,
    postOverhead: 1000,
    gasOverhead: 1000,
    minimumUnstakeDelay: 0,
    devAddress: mat,
    devFee: 1,
    baseRelayFee: 1000,
    pctRelayFee: 1000,
  };

  await deploy('RelayHub', {
    from: deployer,
    /**
     * Please replace RelayHub for one of these options wherever you are trying to read its artifact:
     * - @opengsn/contracts/src/RelayHub.sol:RelayHub
     * - contracts/relayHub/RelayHub.sol:RelayHub
     */
    contract: 'contracts/relayHub/RelayHub.sol:RelayHub',
    log: true,
    args: [
      StakeManagerDeployment.address,
      PenalizerDeployment.address,
      batchGatewayAddress,
      RelayRegistrarDeployment.address,
      RelayHubConfig,
    ],
    skipIfAlreadyDeployed: false,
  });

  const RelayHub = await ethers.getContract('RelayHub');

  await StakeManager.authorizeHubByOwner(relayManager, RelayHub.address);

  await RelayHub.setMinimumStakes(
    [TestToken.address],
    [ethers.utils.parseEther('1')]
  );
  await RelayHub.addRelayWorkers([alice]);
};

export default func;
func.tags = ['all', 'OG'];
func.dependencies = ['OF'];
