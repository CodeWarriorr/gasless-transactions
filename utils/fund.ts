import { getSigners } from './signers';

export const fund = async (address: string, value: string) => {
  const { deployer } = await getSigners();

  await deployer.sendTransaction({
    to: address,
    value: value,
  });
};
