const { ethers } = require("ethers");
const dotenv = require('dotenv');
const { Network, Wallet } = require("ethers");

dotenv.config();
const { PRIVATE_KEY } = process.env;

const FDC_HUB_ADDRESS = "0x48aC463d7975828989331F4De43341627b9c5f1D";
const FDC_HUB_ABI = [
    "function requestAttestation(bytes calldata _data) external payable"
]

const FDC_REQUEST_FEE_CONFIGURATIONS_ADDRESS = "0x191a1282Ac700edE65c5B0AaF313BAcC3eA7fC7e";
const FDC_REQUEST_FEE_CONFIGURATIONS_ABI = [
    "function getRequestFee(bytes calldata _data) external view returns (uint256)"
]

const FLARE_SYSTEMS_MANAGER_ADDRESS = "0xA90Db6D10F856799b10ef2A77EBCbF460aC71e52";
const FLARE_SYSTEMS_MANAGER_ABI = [
    {
        "inputs": [],
        "name": "firstVotingRoundStartTs",
        "outputs": [
          {
            "internalType": "uint64",
            "name": "",
            "type": "uint64"
          }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "votingEpochDurationSeconds",
        "outputs": [
          {
            "internalType": "uint64",
            "name": "",
            "type": "uint64"
          }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getCurrentVotingEpochId",
        "outputs": [
          {
            "internalType": "uint32",
            "name": "",
            "type": "uint32"
          }
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

const RELAY_ADDRESS = "0x97702e350CaEda540935d92aAf213307e9069784";
const RELAY_ABI = [
    {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "_protocolId",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "_votingRoundId",
            "type": "uint256"
          }
        ],
        "name": "isFinalized",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

const RPC_URL = process.env.FLARE_RPC_URL;
const coston2Network = new Network("flare-testnet-coston2", 114);
const provider = new ethers.JsonRpcProvider("https://coston2-api.flare.network/ext/C/rpc", coston2Network);

function toHex(data) {
  var result = "";
  for (var i = 0; i < data.length; i++) {
    result += data.charCodeAt(i).toString(16);
  }
  return result.padEnd(64, "0");
}

function toUtf8HexString(data) {
  return "0x" + toHex(data);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getFdcHub() {
  // Create and return an ethers.js contract instance
  const wallet = new Wallet(PRIVATE_KEY);
  const signer = wallet.connect(provider);
  return new ethers.Contract(FDC_HUB_ADDRESS, FDC_HUB_ABI, signer);
}

async function getFlareSystemsManager() {
    return new ethers.Contract(FLARE_SYSTEMS_MANAGER_ADDRESS, FLARE_SYSTEMS_MANAGER_ABI, provider);
}

async function getFdcRequestFee(abiEncodedRequest) {
    const fdcRequestFeeConfigurations = new ethers.Contract(FDC_REQUEST_FEE_CONFIGURATIONS_ADDRESS, FDC_REQUEST_FEE_CONFIGURATIONS_ABI, provider);
    return await fdcRequestFeeConfigurations.getRequestFee(abiEncodedRequest);
}

async function getRelay() {
    return new ethers.Contract(RELAY_ADDRESS, RELAY_ABI, provider);
}

async function prepareAttestationRequestBase(
  url,
  apiKey,
  attestationTypeBase,
  sourceIdBase,
  requestBody
) {
  console.log("Url:", url, "\n");
  const attestationType = toUtf8HexString(attestationTypeBase);
  const sourceId = toUtf8HexString(sourceIdBase);

  const request = {
    attestationType: attestationType,
    sourceId: sourceId,
    requestBody: requestBody,
  };
  console.log("Prepared request:\n", request, "\n");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
  if (response.status != 200) {
    throw new Error(
      `Response status is not OK, status ${response.status} ${response.statusText}\n`
    );
  }
  console.log("Response status is OK\n");

  const _response = await response.json();
  console.log(response);
  return _response
}

async function calculateRoundId(blockHash) {
  // const blockNumber = transaction.receipt.blockNumber;
  // const blockHash = "0xc7f0c7f5e4fbf5e8400b205a21bf3129dfd1e45e164dc3058e84953b41e9b33f";
  const block = await provider.getBlock(blockHash);
  const blockTimestamp = BigInt(block?.timestamp);

  const _coston2Network = new Network("flare-testnet-coston2", 114);
  const _provider = new ethers.JsonRpcProvider("https://coston2-api.flare.network/ext/C/rpc", _coston2Network);
  const flareSystemsManager = new ethers.Contract(FLARE_SYSTEMS_MANAGER_ADDRESS, FLARE_SYSTEMS_MANAGER_ABI, _provider);
  const firsVotingRoundStartTs = BigInt(
    await flareSystemsManager.firstVotingRoundStartTs()
  );
  const votingEpochDurationSeconds = BigInt(
    await flareSystemsManager.votingEpochDurationSeconds()
  );

  console.log("Block timestamp:", blockTimestamp, "\n");
  console.log("First voting round start ts:", firsVotingRoundStartTs, "\n");
  console.log(
    "Voting epoch duration seconds:",
    votingEpochDurationSeconds,
    "\n"
  );

  const roundId = Number(
    (blockTimestamp - firsVotingRoundStartTs) / votingEpochDurationSeconds
  );
  console.log("Calculated round id:", roundId, "\n");
  console.log(
    "Received round id:",
    Number(await flareSystemsManager.getCurrentVotingEpochId()),
    "\n"
  );
  return roundId;
}

async function submitAttestationRequest(abiEncodedRequest) {
  const wallet = new Wallet(PRIVATE_KEY);
  const _coston2Network = new Network("flare-testnet-coston2", 114);
  const _provider = new ethers.JsonRpcProvider("https://coston2-api.flare.network/ext/C/rpc", _coston2Network);
  const signer = wallet.connect(_provider);
  const fdcHub = new ethers.Contract(FDC_HUB_ADDRESS, FDC_HUB_ABI, signer);

  const requestFee = await getFdcRequestFee(abiEncodedRequest);
  console.log(requestFee);
  
  const transaction = await fdcHub.requestAttestation(abiEncodedRequest, {
    value: requestFee,
  });

  console.log("transaction:", transaction, "provider:", provider);
  
  console.log("transaction provider", transaction.provider, "transaction hash", transaction.blockHash);
  
  const receipt = await transaction.wait();

  // console.log("Submitted request:", transaction.tx, "\n");
  console.log("receipt:", receipt);

  const roundId = await calculateRoundId(receipt.blockHash);
  // console.log(
  //   `Check round progress at: https://${hre.network.name}-systems-explorer.flare.rocks/voting-epoch/${roundId}?tab=fdc\n`
  // );
  return roundId;
}

async function postRequestToDALayer(
  url,
  request,
  watchStatus = false
) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      //   "X-API-KEY": "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
  if (watchStatus && response.status != 200) {
    throw new Error(
      `Response status is not OK, status ${response.status} ${response.statusText}\n`
    );
  } else if (watchStatus) {
    console.log("Response status is OK\n");
  }
  return await response.json();
}

async function retrieveDataAndProofBase(
  url,
  abiEncodedRequest,
  roundId
) {
  console.log("Waiting for the round to finalize...");
  // We check every 10 seconds if the round is finalized
  const relay = await getRelay();
  while (!(await relay.isFinalized(200, roundId))) {
    await sleep(10000);
  }
  console.log("Round finalized!\n");

  const request = {
    votingRoundId: roundId,
    requestBytes: abiEncodedRequest,
  };
  console.log("Prepared request:\n", request, "\n");

  await sleep(10000);
  var proof = await postRequestToDALayer(url, request, true);
  console.log("Waiting for the DA Layer to generate the proof...");
  while (proof.response_hex == undefined) {
    await sleep(5000);
    proof = await postRequestToDALayer(url, request, false);
  }
  console.log("Proof generated!\n");

  console.log("Proof:", proof, "\n");
  return proof;
}

module.exports = {
  toUtf8HexString,
  sleep,
  prepareAttestationRequestBase,
  submitAttestationRequest,
  retrieveDataAndProofBase,
  getFdcHub,
  getFdcRequestFee,
  getRelay,
  calculateRoundId,
  postRequestToDALayer,
};
