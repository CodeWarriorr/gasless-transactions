import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { deployments, ethers } from 'hardhat';
import { MessageKeeper } from '../typechain-types';
import { getSigners } from '../utils/signers';

describe('MessageKeeper', () => {
  let MessageKeeper: MessageKeeper;
  let bob: SignerWithAddress;

  beforeEach(async () => {
    await deployments.fixture('all');
    MessageKeeper = await ethers.getContract('MessageKeeper');

    ({ bob } = await getSigners());
  });

  it('saves message', async () => {
    const message = 'hello world from bob';

    expect(await MessageKeeper.getMessage(bob.address)).to.be.eq('');

    await expect(MessageKeeper.connect(bob).saveMessage(message))
      .to.emit(MessageKeeper, 'MessageSaved')
      .withArgs(bob.address, message);

    expect(await MessageKeeper.getMessage(bob.address)).to.be.eq(message);
  });
});
