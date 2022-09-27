import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { deployments, ethers } from 'hardhat';
import { Forwarder, MessageKeeper } from '../typechain-types';
import { getSigners } from '../utils/signers';
import { blob } from 'stream/consumers';

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
    value: 0,
    gas: 100_000,
    nonce,
    data: transaction.data!,
    validUntilTime: ethers.constants.MaxUint256,
  };

  const sig = await wallet._signTypedData(domain, requestTypes, req);

  return { sig, req };
};

describe('OpngsnForwarder', () => {
  let deployer: SignerWithAddress;
  let bob: SignerWithAddress;
  let alice: SignerWithAddress;
  let Forwarder: Forwarder;
  let MessageKeeper: MessageKeeper;

  beforeEach(async () => {
    await deployments.fixture('all');

    Forwarder = await ethers.getContract('Forwarder');
    MessageKeeper = await ethers.getContract('MessageKeeper');

    ({ deployer, bob, alice } = await getSigners());
  });

  it('saves message', async () => {
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

    await Forwarder.verify(req, domainHash, typeHash, '0x', sig);

    expect(await MessageKeeper.getMessage(bob.address)).to.be.eq('');

    await expect(Forwarder.execute(req, domainHash, typeHash, '0x', sig))
      .to.emit(MessageKeeper, 'MessageSaved')
      .withArgs(bob.address, message);

    // await Forwarder.execute(req, domainHash, typeHash, '0x', sig);

    expect(await MessageKeeper.getMessage(bob.address)).to.be.eq(message);
  });
});
