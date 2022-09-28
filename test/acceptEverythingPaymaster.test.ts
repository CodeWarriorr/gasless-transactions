import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { RelayRequest } from '@opengsn/provider';
import { expect } from 'chai';
import { deployments, ethers } from 'hardhat';
import {
  MessageKeeper,
  Forwarder,
  RelayHub,
  AcceptEverythingPaymaster,
} from '../typechain-types';
import { getSigners } from '../utils/signers';

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

describe('saves message', () => {
  let MessageKeeper: MessageKeeper;
  let RelayHub: RelayHub;
  let Forwarder: Forwarder;
  let AcceptEverythingPaymaster: AcceptEverythingPaymaster;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;

  beforeEach(async () => {
    await deployments.fixture('all');
    MessageKeeper = await ethers.getContract('MessageKeeper');
    RelayHub = await ethers.getContract('RelayHub');
    Forwarder = await ethers.getContract('Forwarder');
    AcceptEverythingPaymaster = await ethers.getContract(
      'AcceptEverythingPaymaster'
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

  it('test', async () => {
    expect(await MessageKeeper.getMessage(bob.address)).to.eq('');

    const message = 'hello world from bob';

    const req = await prepareRequest(Forwarder, MessageKeeper, bob, message);

    const maxAcceptanceBudget = ethers.utils.parseEther('1');
    const RelayRequest: RelayRequest = {
      request: req,
      relayData: {
        maxFeePerGas: '0',
        maxPriorityFeePerGas: '0',
        transactionCalldataGasUsed: '0',
        relayWorker: alice.address,
        paymaster: AcceptEverythingPaymaster.address,
        forwarder: Forwarder.address,
        paymasterData: '0x',
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

    expect(await MessageKeeper.getMessage(bob.address)).to.eq(message);
  });
});
