import { ethers } from 'hardhat';
import SwapRouterAbi from '../abis/SwaoRouter.json';
import WETHAbi from '../abis/WEth.json';
import USDCAbi from '../abis/USDC.json';
import {
  UNI_SWAP_ROUTER_ADDRESS,
  USDC_CONTRACT_ADDRESS,
  WETH_CONTRACT_ADDRESS,
} from './config';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

export enum FeeAmount {
  LOW = 500,
  MEDIUM = 3000,
  HIGH = 10000,
}

export const getHelperContracts = () => {
  const WETHInterface = new ethers.utils.Interface(WETHAbi);
  const WETH = new ethers.Contract(WETH_CONTRACT_ADDRESS, WETHInterface);

  const USDCInterface = new ethers.utils.Interface(USDCAbi);
  const USDC = new ethers.Contract(USDC_CONTRACT_ADDRESS, USDCInterface);

  const SwapRouterInterface = new ethers.utils.Interface(SwapRouterAbi);
  const SwapRouter = new ethers.Contract(
    UNI_SWAP_ROUTER_ADDRESS,
    SwapRouterInterface
  );

  return {
    WETH,
    USDC,
    SwapRouter,
  };
};

export const swapETHToUSDC = async (wallet: SignerWithAddress, eth: string) => {
  const { WETH, USDC, SwapRouter } = getHelperContracts();

  const ethInWei = ethers.utils.parseEther(eth);

  // Convert ETH to QETH
  await WETH.connect(wallet).deposit({
    from: wallet.address,
    value: ethInWei,
  });

  const amountIn = ethInWei;
  const amountOutMin = 0;

  // Approve WETH to Uniswap Router
  await WETH.connect(wallet).approve(SwapRouter.address, amountIn);

  // Swap WETH to USDC
  await SwapRouter.connect(wallet).exactInputSingle(
    {
      tokenIn: WETH_CONTRACT_ADDRESS,
      tokenOut: USDC_CONTRACT_ADDRESS,
      fee: FeeAmount.MEDIUM,
      recipient: wallet.address,
      deadline: ethers.constants.MaxUint256,
      amountIn: amountIn,
      amountOutMinimum: amountOutMin,
      sqrtPriceLimitX96: 0,
    },
    {
      gasLimit: 30_000_000, // Should not be required, 30_000_000 -> block limit
    }
  );
};
