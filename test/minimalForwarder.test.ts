import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { deployments, ethers } from 'hardhat';
import { MessageKeeper, MinimalForwarder } from '../typechain-types';
import { getSigners } from '../utils/signers';

const signSaveMessage = async (
  forwarder: MinimalForwarder,
  contract: MessageKeeper,
  wallet: SignerWithAddress,
  message: string
) => {
  const name = 'MinimalForwarder';
  const version = '0.0.1';

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

  const ForwardRequestType = [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'gas', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'data', type: 'bytes' },
  ];

  const types = {
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
  };

  const sig = await wallet._signTypedData(domain, types, req);

  return { sig, req };
};

describe('MinimalForwarder', () => {
  let deployer: SignerWithAddress;
  let bob: SignerWithAddress;
  let alice: SignerWithAddress;
  let Forwarder: MinimalForwarder;
  let MessageKeeper: MessageKeeper;

  beforeEach(async () => {
    await deployments.fixture('all');

    Forwarder = await ethers.getContract('MinimalForwarder');
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

    const verify = await Forwarder.verify(req, sig);
    expect(verify).to.eq(true);

    await expect(Forwarder.execute(req, sig))
      .to.emit(MessageKeeper, 'MessageSaved')
      .withArgs(bob.address, message);

    expect(await MessageKeeper.getMessage(bob.address)).to.be.eq(message);
  });
});
