import hre, { ethers } from 'hardhat';

export const parseError = (errorData: string) => {
  if (errorData.startsWith('0x08c379a0')) {
    // decode Error(string)

    const content = `0x${errorData.substring(10)}`;
    const reason = ethers.utils.defaultAbiCoder.decode(['string'], content);

    return reason[0]; // reason: string; for standard revert error string
  }

  if (errorData.startsWith('0x4e487b71')) {
    // decode Panic(uint)
    const content = `0x${errorData.substring(10)}`;
    const code = ethers.utils.defaultAbiCoder.decode(['uint'], content);

    return code[0];
  }

  // try {
  //   const errDescription = iErrors.parseError(errorData);
  //   return errDescription;
  // } catch (e) {
  //   console.error(e);
  // }
};

const errorToDecode =
  '0x08c379a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002845524332303a207472616e7366657220616d6f756e74206578636565647320616c6c6f77616e6365000000000000000000000000000000000000000000000000';

async function main() {
  const error = await parseError(errorToDecode);
  console.log('ERROR', error);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
