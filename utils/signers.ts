import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers, getNamedAccounts } from 'hardhat';

interface IGetSigners {
  deployer: SignerWithAddress;
  bob: SignerWithAddress;
  alice: SignerWithAddress;
  mat: SignerWithAddress;
}

export const getSigners = async (): Promise<IGetSigners> => {
  const { deployer, bob, alice, mat } = await getNamedAccounts();

  return {
    deployer: await ethers.getSigner(deployer),
    bob: await ethers.getSigner(bob),
    alice: await ethers.getSigner(alice),
    mat: await ethers.getSigner(mat),
  };
};
