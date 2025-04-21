const { log } = require('console');
const fs = require('fs'); 
const { ethers } = require('hardhat');

async function main() {
    const [signer, validator] = await ethers.getSigners();

    // const _proof = {
    //   merkleProof: [
    //     '0x689f6aca4e92f0e8f6c822ea4ae254cb610dae9d225c4278ffb327e9b65fbd15',
    //     '0x3d49381ba54e78c33378d13c9d0bed942c0088195c9bfec918152788cce9e3fc',
    //     '0x02530e20f4440871ef15bd664ca10cda55fa59735a6c1cd9199f71522dc64db1'
    //   ],
    //   data: {
    //     attestationType: '0x494a736f6e417069000000000000000000000000000000000000000000000000',
    //     sourceId: '0x5745423200000000000000000000000000000000000000000000000000000000',
    //     votingRound: 962546n,
    //     lowestUsedTimestamp: 0n,
    //     requestBody: {
    //       url: 'https://a1bb-102-90-101-44.ngrok-free.app/event/53725120667373311161609531295784661010771007742855949183223319724806793017191',
    //       postprocessJq: '{owner: .owner, spender: .spender, receiver: .receiver, amount: .amount, status: .status, initiatedTime: .initiatedTime}',
    //       abi_signature: '{"components": [{"internalType": "address", "name": "owner", "type": "address"},{"internalType": "address", "name": "spender", "type": "address"},{"internalType": "address", "name": "receiver", "type": "address"},{"internalType": "uint256", "name": "amount", "type": "uint256"},{"internalType": "enum IERC20x.Status", "name": "status", "type": "uint8"},{"internalType": "uint256", "name": "initiatedTime", "type": "uint256"}],"name": "task","type": "tuple"}'
    //     },
    //     responseBody: {
    //       abi_encoded_data: '0x0000000000000000000000002ae67a159fc288db6ba4407c014f20147130b54a0000000000000000000000006897d3a40bf4f217f3f26cb4c31baf490b5ec0740000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000067fd151c'
    //     }
    //   }
    // }
    const _proof = {
      merkleProof: [
        '0xec769e4b0dcaf1efa635afec0a6f459a48f1dece3f746a375fa6af71586210a5',
        '0x0803d0a94057c32b9bf289e86e5cede9b1da4d52a49f165370653cae307104d8'
      ],
      data: {
        '0': '0x494a736f6e417069000000000000000000000000000000000000000000000000',
        '1': '0x5745423200000000000000000000000000000000000000000000000000000000',
        '2': 962926n,
        '3': 0n,
        '4': {
          '0': 'https://3790-102-90-102-26.ngrok-free.app/event/53725120667373311161609531295784661010771007742855949183223319724806793017191',
          '1': '{owner: .owner, spender: .spender, receiver: .receiver, amount: .amount, status: .status, initiatedTime: .initiatedTime}',
          '2': '{"components": [{"internalType": "address", "name": "owner", "type": "address"},{"internalType": "address", "name": "spender", "type": "address"},{"internalType": "address", "name": "receiver", "type": "address"},{"internalType": "uint256", "name": "amount", "type": "uint256"},{"internalType": "enum IERC20x.Status", "name": "status", "type": "uint8"},{"internalType": "uint256", "name": "initiatedTime", "type": "uint256"}],"name": "task","type": "tuple"}',
          __length__: 3,
          url: 'https://3790-102-90-102-26.ngrok-free.app/event/53725120667373311161609531295784661010771007742855949183223319724806793017191',
          postprocessJq: '{owner: .owner, spender: .spender, receiver: .receiver, amount: .amount, status: .status, initiatedTime: .initiatedTime}',
          abi_signature: '{"components": [{"internalType": "address", "name": "owner", "type": "address"},{"internalType": "address", "name": "spender", "type": "address"},{"internalType": "address", "name": "receiver", "type": "address"},{"internalType": "uint256", "name": "amount", "type": "uint256"},{"internalType": "enum IERC20x.Status", "name": "status", "type": "uint8"},{"internalType": "uint256", "name": "initiatedTime", "type": "uint256"}],"name": "task","type": "tuple"}'
        },
        '5': {
          '0': '0x0000000000000000000000002ae67a159fc288db6ba4407c014f20147130b54a0000000000000000000000006897d3a40bf4f217f3f26cb4c31baf490b5ec0740000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000067fd151c',
          __length__: 1,
          abi_encoded_data: '0x0000000000000000000000002ae67a159fc288db6ba4407c014f20147130b54a0000000000000000000000006897d3a40bf4f217f3f26cb4c31baf490b5ec0740000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000067fd151c'
        },
        __length__: 6,
        attestationType: '0x494a736f6e417069000000000000000000000000000000000000000000000000',
        sourceId: '0x5745423200000000000000000000000000000000000000000000000000000000',
        votingRound: 962926n,
        lowestUsedTimestamp: 0n,
        requestBody: {
          '0': 'https://3790-102-90-102-26.ngrok-free.app/event/53725120667373311161609531295784661010771007742855949183223319724806793017191',
          '1': '{owner: .owner, spender: .spender, receiver: .receiver, amount: .amount, status: .status, initiatedTime: .initiatedTime}',
          '2': '{"components": [{"internalType": "address", "name": "owner", "type": "address"},{"internalType": "address", "name": "spender", "type": "address"},{"internalType": "address", "name": "receiver", "type": "address"},{"internalType": "uint256", "name": "amount", "type": "uint256"},{"internalType": "enum IERC20x.Status", "name": "status", "type": "uint8"},{"internalType": "uint256", "name": "initiatedTime", "type": "uint256"}],"name": "task","type": "tuple"}',
          __length__: 3,
          url: 'https://3790-102-90-102-26.ngrok-free.app/event/53725120667373311161609531295784661010771007742855949183223319724806793017191',
          postprocessJq: '{owner: .owner, spender: .spender, receiver: .receiver, amount: .amount, status: .status, initiatedTime: .initiatedTime}',
          abi_signature: '{"components": [{"internalType": "address", "name": "owner", "type": "address"},{"internalType": "address", "name": "spender", "type": "address"},{"internalType": "address", "name": "receiver", "type": "address"},{"internalType": "uint256", "name": "amount", "type": "uint256"},{"internalType": "enum IERC20x.Status", "name": "status", "type": "uint8"},{"internalType": "uint256", "name": "initiatedTime", "type": "uint256"}],"name": "task","type": "tuple"}'
        },
        responseBody: {
          '0': '0x0000000000000000000000002ae67a159fc288db6ba4407c014f20147130b54a0000000000000000000000006897d3a40bf4f217f3f26cb4c31baf490b5ec0740000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000067fd151c',
          __length__: 1,
          abi_encoded_data: '0x0000000000000000000000002ae67a159fc288db6ba4407c014f20147130b54a0000000000000000000000006897d3a40bf4f217f3f26cb4c31baf490b5ec0740000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000067fd151c'
        }
      }
    }
    const reqId = 53725120667373311161609531295784661010771007742855949183223319724806793017191n;
    const tokenXAddress = "0xB85097b6bA237FC3F6377229e9465ba05b65c5ec"

    const TokenX = await ethers.getContractAt("Tokenx", tokenXAddress, validator);
    console.log("33", TokenX);
    
    const TX = await TokenX.validateApproval(reqId, _proof);
    console.log("35", TX);
    
    const receipt = await TX.wait();
    console.log(receipt);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});