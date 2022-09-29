import * as dotenv from 'dotenv';
dotenv.config();
import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'hardhat-deploy';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.16',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      // outputSelection: {
      //   '*': {
      //     '*': ['storageLayout'],
      //   },
      // },
    },
  },
  networks: {
    hardhat: {
      forking: {
        url: process.env.ETH_MAINNET_URL ?? '',
        blockNumber: 15632915, // Latest as of 28.09.2022
      },
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    bob: {
      default: 1,
    },
    alice: {
      default: 2,
    },
    mat: {
      default: 3,
    },
  },
  mocha: {
    timeout: 0,
  },
};

export default config;
