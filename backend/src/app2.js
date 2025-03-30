const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const routes = require('./routes/index');
const cron = require('node-cron');
const { ethers, Wallet } = require("ethers");
const {
    prepareAttestationRequestBase,
    submitAttestationRequest,
    retrieveDataAndProofBase,
} = require("./Base");
  
dotenv.config();
const { JQ_VERIFIER_URL_TESTNET, JQ_VERIFIER_API_KEY, COSTON2_DA_LAYER_URL, PRIVATE_KEY } = process.env;

const db = admin.firestore();

const app = express();
const PORT = process.env.PORT || 3500;

// Middleware
app.use(cors());
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Routes
app.use('/api', routes);

const RPC_URL = process.env.FLARE_RPC_URL;
const provider = new ethers.JsonRpcProvider(RPC_URL);
const TOKENX_ABI = [
    "function validateTransfer(uint256 reqId, IJsonApi.Proof calldata data) external onlyValidator(reqId) returns(bool)",
    "function validateApproval(uint256 reqId, IJsonApi.Proof calldata data) external onlyValidator(reqId) returns(bool)"
];

const baseApiUrl = "http://localhost:3300";
const postprocessJq = `{owner: .owner, spender: .spender, receiver: .receiver, amount: .amount, status: .status, initiatedTime: .initiatedTime}`;
const abiSignature = `{\"components\": [{\"internalType\": \"address\", \"name\": \"owner\", \"type\": \"address\"},{\"internalType\": \"address\", \"name\": \"spender\", \"type\": \"address\"},{\"internalType\": \"address\", \"name\": \"receiver\", \"type\": \"address\"},{\"internalType\": \"uint256\", \"name\": \"amount\", \"type\": \"uint256\"},{\"internalType\": \"enum IERC20x.Status\", \"name\": \"status\", \"type\": \"uint8\"},{\"internalType\": \"uint256\", \"name\": \"initiatedTime\", \"type\": \"uint256\"}],\"name\": \"task\",\"type\": \"tuple\"}`;

const attestationTypeBase = "IJsonApi";
const sourceIdBase = "WEB2";
const verifierUrlBase = JQ_VERIFIER_URL_TESTNET;

// Schedule a cron job to run every 30 seconds
cron.schedule('*/3 * * * *', async () => {
    console.log('Running a task every 30 seconds');
    // You can perform additional tasks here if needed
    // get all updated reqId
    const wallet = new Wallet(PRIVATE_KEY);
    const signer = wallet.connect(provider);
    const validatorAddress = await signer.getAddress();
    const paramsUrl = `${baseApiUrl}/eventParams/${validatorAddress}`;
    const eventDataResponse = await fetch(paramsUrl);
    const eventData = await eventDataResponse.json();
    
    // Loop through each item in the eventData array and call validateTransaction
    for (const event of eventData) {
        await validateTransaction(event.reqId, event.tokenXAddress, event.txType);
    }
});

async function prepareAttestationRequest(
    apiUrl,
    postprocessJq,
    abiSignature
) {
    const requestBody = {
      url: apiUrl,
      postprocessJq: postprocessJq,
      abi_signature: abiSignature,
    };
  
    const url = `${verifierUrlBase}JsonApi/prepareRequest`;
    const apiKey = JQ_VERIFIER_API_KEY;
  
    return await prepareAttestationRequestBase(
      url,
      apiKey,
      attestationTypeBase,
      sourceIdBase,
      requestBody
    );
}
  
async function retrieveDataAndProof(
    abiEncodedRequest,
    roundId
) {
    const url = `${COSTON2_DA_LAYER_URL}api/v1/fdc/proof-by-request-round-raw`;
    console.log("Url:", url, "\n");
    return await retrieveDataAndProofBase(url, abiEncodedRequest, roundId);
}
  
async function interactWithContract(
    reqId,
    tokenXAddress,
    proof,
    txType
) {
    console.log("Proof hex:", proof.response_hex, "\n");

    const responseType =  {
        "components": [
          {
            "internalType": "bytes32",
            "name": "attestationType",
            "type": "bytes32"
          },
          {
            "internalType": "bytes32",
            "name": "sourceId",
            "type": "bytes32"
          },
          {
            "internalType": "uint64",
            "name": "votingRound",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "lowestUsedTimestamp",
            "type": "uint64"
          },
          {
            "components": [
              {
                "internalType": "string",
                "name": "url",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "postprocessJq",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "abi_signature",
                "type": "string"
              }
            ],
            "internalType": "struct IJsonApi.RequestBody",
            "name": "requestBody",
            "type": "tuple"
          },
          {
            "components": [
              {
                "internalType": "bytes",
                "name": "abi_encoded_data",
                "type": "bytes"
              }
            ],
            "internalType": "struct IJsonApi.ResponseBody",
            "name": "responseBody",
            "type": "tuple"
          }
        ],
        "internalType": "struct IJsonApi.Response",
        "name": "data",
        "type": "tuple"
    };
    console.log("Response type:", responseType, "\n");
  
    const decoder = ethers.AbiCoder.defaultAbiCoder();
    const decodedResponse = decoder.decode(
      responseType,
      proof.response_hex
    );
    console.log("Decoded proof:", decodedResponse, "\n");

    const wallet = new Wallet(PRIVATE_KEY);
    const signer = wallet.connect(provider);
    const tokenX = new ethers.Contract(tokenXAddress, TOKENX_ABI, signer)
    const proof = {
      merkleProof: proof.proof,
      data: decodedResponse,
    };
    let transaction;
    if (txType === "Approve") {
        transaction = await tokenX.validateApproval(reqId, proof);
    } else if (txType === "Transfer") {
        transaction = await tokenX.validateTransfer(reqId, proof);
    } else {
        throw new Error("Invalid transaction type");
    }
    console.log("Transaction:", transaction.tx, "\n");
}

async function validateTransaction(reqId, tokenXAddress, txType) {
  const apiUrl = `${baseApiUrl}/event/${reqId}`;
  const data = prepareAttestationRequest(
      apiUrl,
      postprocessJq,
      abiSignature
  );

  console.log("Data:", data, "\n");

  const abiEncodedRequest = data.abiEncodedRequest;
  const roundId = await submitAttestationRequest(abiEncodedRequest);
  
  const proof = await retrieveDataAndProof(abiEncodedRequest, roundId);
  
  await interactWithContract(reqId, tokenXAddress, proof, txType);
}

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


// instatiate contract registry - address and function abis
// instantiate other contracts
// define tokenx and nftx abis
// run cron job