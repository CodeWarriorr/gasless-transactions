/**
 * UniswapConfig
 */
export const UNI_SWAP_ROUTER_ADDRESS =
  '0xE592427A0AEce92De3Edee1F18E0157C05861564';
export const WETH_CONTRACT_ADDRESS =
  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
export const USDC_CONTRACT_ADDRESS =
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
export const CHAINLINK_USDC_ETH_FEED_CONTRACT_ADDRESS =
  '0x986b5E1e1755e3C2440e960477f25201B0a8bbD4';

export const USDC_ETH_POOL_FEE = 500;

export const PERMIT_SIGNATURE_DAI =
  'permit(address,address,uint256,uint256,bool,uint8,bytes32,bytes32)';
export const PERMIT_SIGNATURE_EIP2612 =
  'permit(address,address,uint256,uint256,uint8,bytes32,bytes32)';

export const MIN_SWAP_AMOUNT = (1e17).toString();
export const SLIPPAGE = 10;

/**
 * GasAndEthConfig
 */
export const GAS_USED_BY_POST = 230000;
export const MIN_HUB_BALANCE = (1e17).toString();
export const TARGET_HUB_BALANCE = (1e18).toString();
export const MIN_WITHDRAWAL_AMOUNT = (2e18).toString();

/**
 * MISC
 */
export const UNI_USDC_ETH_POOL = '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8';
