import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { RelayRequest } from '@opengsn/provider';
import { expect } from 'chai';
import { deployments, ethers } from 'hardhat';
import {
  MessageKeeper,
  Forwarder,
  RelayHub,
  PermitERC20UniswapV3Paymaster,
} from '../typechain-types';
import { USDC_CONTRACT_ADDRESS } from '../utils/config';
import { getSigners } from '../utils/signers';
import { getHelperContracts, swapETHToUSDC } from '../utils/uniswap';

const domainSeparatorName = 'GSN Relayed Transaction';
const domainVersion = '3';

export const GsnRequestType = {
  typeName: 'RelayRequest',
  typeSuffix:
    'RelayData relayData)RelayData(uint256 maxFeePerGas,uint256 maxPriorityFeePerGas,uint256 transactionCalldataGasUsed,address relayWorker,address paymaster,address forwarder,bytes paymasterData,uint256 clientId)',
};

interface MKRequest {
  from: string;
  to: string;
  value: string;
  gas: string;
  nonce: string;
  data: string;
  validUntilTime: string;
}

const prepareRequest = async (
  forwarder: Forwarder,
  contract: MessageKeeper,
  wallet: SignerWithAddress,
  message: string
): Promise<MKRequest> => {
  const [nonce, chainId] = await Promise.all([
    forwarder.getNonce(wallet.address),
    wallet.getChainId(),
  ]);

  const transaction = await contract.populateTransaction.saveMessage(message);

  const req = {
    from: wallet.address,
    to: contract.address,
    value: (0).toString(),
    gas: (100_000).toString(),
    nonce: nonce.toString(),
    data: transaction.data!,
    validUntilTime: ethers.constants.MaxUint256.toString(),
  };

  return req;
};

const permitSignature = async (
  wallet: SignerWithAddress,
  token: any,
  spender: string,
  value: any = ethers.constants.MaxUint256,
  deadline = ethers.constants.MaxUint256,
  permitConfig?: {
    nonce?: number;
    name?: string;
    chainId?: number;
    version?: string;
  }
): Promise<string> => {
  const [nonce, name, version, chainId] = await Promise.all([
    permitConfig?.nonce ?? token.nonces(wallet.address),
    permitConfig?.name ?? token.name(),
    permitConfig?.version ?? token.version(),
    permitConfig?.chainId ?? wallet.getChainId(),
  ]);

  const sig = await wallet._signTypedData(
    {
      name,
      version,
      chainId,
      verifyingContract: token.address,
    },
    {
      Permit: [
        {
          name: 'owner',
          type: 'address',
        },
        {
          name: 'spender',
          type: 'address',
        },
        {
          name: 'value',
          type: 'uint256',
        },
        {
          name: 'nonce',
          type: 'uint256',
        },
        {
          name: 'deadline',
          type: 'uint256',
        },
      ],
    },
    {
      owner: wallet.address,
      spender,
      value,
      nonce,
      deadline,
    }
  );

  return sig;
};

const signAndEncodePermitTransaction = async (
  wallet: SignerWithAddress,
  token: any,
  spender: string,
  value: any = ethers.constants.MaxUint256,
  deadline = ethers.constants.MaxUint256,
  permitConfig?: {
    nonce?: number;
    name?: string;
    chainId?: number;
    version?: string;
  }
): Promise<{ from: string; to: string; data: string }> => {
  const sig = await permitSignature(
    wallet,
    token,
    spender,
    value,
    deadline,
    permitConfig
  );

  const { v, r, s } = ethers.utils.splitSignature(sig);

  const encodedPermit = await token.populateTransaction.permit(
    wallet.address,
    spender,
    value,
    deadline,
    v,
    r,
    s
  );

  return encodedPermit;
};

const signMessage = async (
  req: RelayRequest,
  forwarder: Forwarder,
  wallet: SignerWithAddress
) => {
  const domain = {
    name: domainSeparatorName,
    version: domainVersion,
    chainId: await wallet.getChainId(),
    verifyingContract: forwarder.address,
  };

  const requestTypes = {
    RelayData: [
      { name: 'maxFeePerGas', type: 'uint256' },
      { name: 'maxPriorityFeePerGas', type: 'uint256' },
      { name: 'transactionCalldataGasUsed', type: 'uint256' },
      { name: 'relayWorker', type: 'address' },
      { name: 'paymaster', type: 'address' },
      { name: 'forwarder', type: 'address' },
      { name: 'paymasterData', type: 'bytes' },
      { name: 'clientId', type: 'uint256' },
    ],
    RelayRequest: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'gas', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'data', type: 'bytes' },
      { name: 'validUntilTime', type: 'uint256' },
      { name: 'relayData', type: 'RelayData' },
    ],
  };

  const reqToSign = {
    ...req.request,
    relayData: req.relayData,
  };

  const sig = await wallet._signTypedData(domain, requestTypes, reqToSign);

  return sig;
};

export function removeHexPrefix(hex: string): string {
  if (hex == null || typeof hex.replace !== 'function') {
    throw new Error('Cannot remove hex prefix');
  }
  return hex.replace(/^0x/, '');
}

describe('PermitERC20UniswapV3Paymaster', () => {
  let MessageKeeper: MessageKeeper;
  let RelayHub: RelayHub;
  let Forwarder: Forwarder;
  let PermitERC20UniswapV3Paymaster: PermitERC20UniswapV3Paymaster;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;

  beforeEach(async () => {
    await deployments.fixture('all');
    MessageKeeper = await ethers.getContract('MessageKeeper');
    RelayHub = await ethers.getContract('RelayHub');
    Forwarder = await ethers.getContract('Forwarder');
    PermitERC20UniswapV3Paymaster = await ethers.getContract(
      'PermitERC20UniswapV3Paymaster'
    );

    // Register OpenGsn Domain Separator
    await Forwarder.registerDomainSeparator(domainSeparatorName, domainVersion);

    // Register OpenGsn Request Type
    await Forwarder.registerRequestType(
      GsnRequestType.typeName,
      GsnRequestType.typeSuffix
    );

    ({ bob, alice } = await getSigners());
  });

  it('saves message', async () => {
    expect(await MessageKeeper.getMessage(bob.address)).to.eq('');

    const message = 'hello world from bob';

    const req = await prepareRequest(Forwarder, MessageKeeper, bob, message);

    const { USDC } = getHelperContracts();
    await swapETHToUSDC(bob, '1');

    const ethBalanceBefore = await bob.getBalance();
    const usdcBalanceBefore = await USDC.connect(bob).balanceOf(bob.address);

    const permitSig = await signAndEncodePermitTransaction(
      bob,
      USDC.connect(bob),
      PermitERC20UniswapV3Paymaster.address,
      ethers.constants.MaxUint256,
      ethers.constants.MaxUint256,
      {
        chainId: 1, // USDC has calculated domain separator, and we are using forked hardhat chain and its ID
      }
    );

    const paymasterData =
      '0x' +
      removeHexPrefix(USDC_CONTRACT_ADDRESS) +
      removeHexPrefix(permitSig.data);

    const maxAcceptanceBudget = ethers.utils.parseEther('1');

    const GAS_PRICE = (10_000_000_000).toString();

    const RelayRequest: RelayRequest = {
      request: req,
      relayData: {
        maxFeePerGas: GAS_PRICE,
        maxPriorityFeePerGas: GAS_PRICE,
        transactionCalldataGasUsed: '0',
        relayWorker: alice.address,
        paymaster: PermitERC20UniswapV3Paymaster.address,
        forwarder: Forwarder.address,
        paymasterData: paymasterData,
        clientId: '0',
      },
    };

    const sig = await signMessage(RelayRequest, Forwarder, bob);

    const tx = await RelayHub.connect(alice).relayCall(
      domainSeparatorName,
      maxAcceptanceBudget,
      RelayRequest,
      sig,
      '0x'
    );

    const receipt = await tx.wait(0);
    // console.log('receipt.events', receipt.events);

    const ethBalanceAfter = await bob.getBalance();
    expect(ethBalanceAfter).to.be.eq(ethBalanceBefore);
    expect(await MessageKeeper.getMessage(bob.address)).to.eq(message);

    const usdcBalanceAfter = await USDC.connect(bob).balanceOf(bob.address);
    console.log(
      'USDC balance before, after, diff',
      ethers.utils.formatUnits(usdcBalanceBefore, 6),
      ethers.utils.formatUnits(usdcBalanceAfter, 6),
      ethers.utils.formatUnits(usdcBalanceBefore - usdcBalanceAfter, 6)
    );
  });
});
