import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { deployments, ethers } from 'hardhat';
import type * as ethersTypes from 'ethers';
import { Forwarder, MessageKeeper } from '../typechain-types';
import { getSigners } from '../utils/signers';

const message = 'hello world from bob';

// see https://eips.ethereum.org/EIPS/eip-712 for more info
const EIP712Domain = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
];

const ForwardRequest = [
  { name: 'from', type: 'address' },
  { name: 'to', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'gas', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'data', type: 'bytes' },
  { name: 'validUntilTime', type: 'uint256' },
  // { name: 'something', type: 'bytes' },
];

function getMetaTxTypeData(chainId: number, verifyingContract: string) {
  return {
    types: {
      EIP712Domain,
      ForwardRequest,
    },
    domain: {
      name: 'Forwarder',
      version: '1',
      chainId,
      verifyingContract,
    },
    primaryType: 'ForwardRequest',
  };
}

interface MessageKeeperData {
  from: string;
  to: string;
  data: string;
  validUntilTime: any;
}

interface DataToSign {
  message: object;
  types: {
    EIP712Domain: {
      name: string;
      type: string;
    }[];
    ForwardRequest: {
      name: string;
      type: string;
    }[];
  };
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  primaryType: string;
}

async function signTypedData(
  signer: ethersTypes.providers.JsonRpcProvider,
  from: string,
  data: DataToSign
) {
  // Send the signTypedData RPC call
  const [method, argData] = ['eth_signTypedData_v4', JSON.stringify(data)];

  return await signer.send(method, [from, argData]);
}

async function buildRequest(forwarder: Forwarder, input: MessageKeeperData) {
  const nonce = await forwarder
    .getNonce(input.from)
    .then((nonce) => nonce.toString());
  return { value: 0, gas: 1e6, nonce, ...input };
}

async function buildTypedData(
  forwarder: Forwarder,
  request: object
): Promise<DataToSign> {
  const chainId = await forwarder.provider.getNetwork().then((n) => n.chainId);
  const typeData = getMetaTxTypeData(chainId, forwarder.address);
  return { ...typeData, message: request };
}

async function signMetaTxRequest(
  signer: ethersTypes.providers.JsonRpcProvider,
  forwarder: Forwarder,
  input: MessageKeeperData
) {
  const request = await buildRequest(forwarder, input);
  const toSign = await buildTypedData(forwarder, request);
  const signature = await signTypedData(signer, input.from, toSign);
  return { signature, request };
}

// ----------------------------------------------------------------------------------------
// Unit tests start here
// ----------------------------------------------------------------------------------------
describe('OpenGSNForwarder V2', () => {
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
    // construct the signed payload for the relayer to accept on the end user's behalf
    const { request, signature } = await signMetaTxRequest(
      ethers.provider,
      Forwarder,
      {
        from: bob.address,
        to: MessageKeeper.address,
        data: MessageKeeper.interface.encodeFunctionData('saveMessage', [
          message,
        ]),
        validUntilTime: 1674698894,
      }
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

    expect(await MessageKeeper.getMessage(bob.address)).to.be.eq('');

    await expect(
      Forwarder.execute(request, domainHash, typeHash, '0x', signature)
    )
      .to.emit(MessageKeeper, 'MessageSaved')
      .withArgs(bob.address, message);

    expect(await MessageKeeper.getMessage(bob.address)).to.be.eq(message);
  });
});
