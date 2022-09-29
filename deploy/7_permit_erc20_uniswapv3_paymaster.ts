import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers } from 'hardhat';
import {
  UNI_SWAP_ROUTER_ADDRESS,
  WETH_CONTRACT_ADDRESS,
  USDC_CONTRACT_ADDRESS,
  CHAINLINK_USDC_ETH_FEED_CONTRACT_ADDRESS,
  PERMIT_SIGNATURE_EIP2612,
  SLIPPAGE,
  USDC_ETH_POOL_FEE,
  GAS_USED_BY_POST,
  MIN_HUB_BALANCE,
  MIN_WITHDRAWAL_AMOUNT,
  TARGET_HUB_BALANCE,
  MIN_SWAP_AMOUNT,
} from '../utils/config';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();

  const Forwarder = await ethers.getContract('Forwarder');
  const RelayHub = await ethers.getContract('RelayHub');

  const UniswapConfig = {
    uniswap: UNI_SWAP_ROUTER_ADDRESS,
    weth: WETH_CONTRACT_ADDRESS,
    minSwapAmount: MIN_SWAP_AMOUNT,
    tokens: [USDC_CONTRACT_ADDRESS],
    priceFeeds: [CHAINLINK_USDC_ETH_FEED_CONTRACT_ADDRESS],
    uniswapPoolFees: [USDC_ETH_POOL_FEE],
    permitMethodSignatures: [PERMIT_SIGNATURE_EIP2612],
    slippages: [SLIPPAGE],
  };

  const GasAndEthConfig = {
    gasUsedByPost: GAS_USED_BY_POST,
    minHubBalance: MIN_HUB_BALANCE,
    targetHubBalance: TARGET_HUB_BALANCE,
    minWithdrawalAmount: MIN_WITHDRAWAL_AMOUNT,
    paymasterFee: 5,
  };

  await deploy('PermitERC20UniswapV3Paymaster', {
    from: deployer,
    contract: 'PermitERC20UniswapV3Paymaster',
    log: true,
    args: [UniswapConfig, GasAndEthConfig, Forwarder.address, RelayHub.address],
    skipIfAlreadyDeployed: false,
  });

  const PermitERC20UniswapV3Paymaster = await ethers.getContract(
    'PermitERC20UniswapV3Paymaster'
  );

  await RelayHub.depositFor(PermitERC20UniswapV3Paymaster.address, {
    value: ethers.utils.parseEther('1'),
  });
};

export default func;
func.tags = ['all', 'PEUP'];
func.dependencies = ['OG'];
