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

const signSaveMessage = async (
  forwarder: Forwarder,
  contract: MessageKeeper,
  wallet: SignerWithAddress,
  message: string
) => {
  const name = 'Forwarder';
  const version = '1';

  const [nonce, chainId] = await Promise.all([
    forwarder.getNonce(wallet.address),
    wallet.getChainId(),
  ]);

  const domain = {
    name,
    version,
    chainId,
    verifyingContract: forwarder.address,
  };

  const EIP712DomainType = [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ];

  const ForwardRequestType = [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'gas', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'data', type: 'bytes' },
    { name: 'validUntilTime', type: 'uint256' },
  ];

  const requestTypes = {
    ForwardRequest: ForwardRequestType,
  };

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

  const sig = await wallet._signTypedData(domain, requestTypes, req);

  return { sig, req };
};

describe('AcceptEverythingPaymaster', () => {
  let MessageKeeper: MessageKeeper;
  let RelayHub: RelayHub;
  let Forwarder: Forwarder;
  let AcceptEverythingPaymaster: AcceptEverythingPaymaster;
  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;

  /**
   * TODO:
   *
   * Deploy relay hub
   */
  beforeEach(async () => {
    await deployments.fixture('all');
    MessageKeeper = await ethers.getContract('MessageKeeper');
    RelayHub = await ethers.getContract('RelayHub');
    Forwarder = await ethers.getContract('Forwarder');
    AcceptEverythingPaymaster = await ethers.getContract(
      'AcceptEverythingPaymaster'
    );

    ({ deployer, bob, alice } = await getSigners());
  });

  // /// @inheritdoc IRelayHub
  // function relayCall(
  //     string calldata domainSeparatorName,
  //     uint256 maxAcceptanceBudget,
  //     GsnTypes.RelayRequest calldata relayRequest,
  //     bytes calldata signature,
  //     bytes calldata approvalData
  // )

  it('test', async () => {
    const message = 'hello world from bob';
    const { sig, req } = await signSaveMessage(
      Forwarder,
      MessageKeeper,
      bob,
      message
    );

    const abiCoder = new ethers.utils.AbiCoder();
    const domainEncoded = abiCoder.encode(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
      [
        ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes(
            'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'
          )
        ),
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes('Forwarder')),
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes('1')),
        await bob.getChainId(),
        Forwarder.address,
      ]
    );
    const domainHash = ethers.utils.keccak256(domainEncoded);
    const typeHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(
        'ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data,uint256 validUntilTime)'
      )
    );

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
        //   struct RelayData {
        //     uint256 maxFeePerGas;
        //     uint256 maxPriorityFeePerGas;
        //     uint256 transactionCalldataGasUsed;
        //     address relayWorker;
        //     address paymaster;
        //     address forwarder;
        //     bytes paymasterData;
        //     uint256 clientId;
        // }
      },
    };

    const tx = await RelayHub.connect(alice).relayCall(
      domainHash,
      maxAcceptanceBudget,
      RelayRequest,
      sig,
      '0x'
    );

    const receipt = await tx.wait(0);

    console.log('receipt', receipt);
    console.log('receipt.logs', receipt.logs);
    console.log('receipt.events', receipt.events);
  });

  // it('saves message', async () => {
  //   const message = 'hello world from bob';

  //   expect(await MessageKeeper.getMessage(bob.address)).to.be.eq('');

  //   await expect(MessageKeeper.connect(bob).saveMessage(message))
  //     .to.emit(MessageKeeper, 'MessageSaved')
  //     .withArgs(bob.address, message);

  //   expect(await MessageKeeper.getMessage(bob.address)).to.be.eq(message);
  // });
});
