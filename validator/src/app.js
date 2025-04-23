const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const routes = require('./routes/index');
const cron = require('node-cron');
const web3 = require('web3');
const fetch = require('node-fetch');
const { ethers, Wallet, Network } = require("ethers");
const {
    prepareAttestationRequestBase,
    submitAttestationRequest,
    retrieveDataAndProofBase,
} = require("./Base");
  
dotenv.config();
const { JQ_VERIFIER_URL_TESTNET, JQ_VERIFIER_API_KEY, COSTON2_DA_LAYER_URL, PRIVATE_KEY } = process.env;

const app = express();
const PORT = process.env.PORT || 3500;

// Middleware
app.use(cors());
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Routes
app.use('/api', routes);


const RPC_URL = process.env.FLARE_RPC_URL;
const coston2Network = new Network("flare-testnet-coston2", 114);
const provider = new ethers.JsonRpcProvider("https://coston2-api.flare.network/ext/C/rpc", coston2Network);
const TOKENX_ABI = [
    {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "reqId",
            "type": "uint256"
          },
          {
            "components": [
              {
                "internalType": "bytes32[]",
                "name": "merkleProof",
                "type": "bytes32[]"
              },
              {
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
              }
            ],
            "internalType": "struct IJsonApi.Proof",
            "name": "data",
            "type": "tuple"
          }
        ],
        "name": "validateApproval",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "reqId",
            "type": "uint256"
          },
          {
            "components": [
              {
                "internalType": "bytes32[]",
                "name": "merkleProof",
                "type": "bytes32[]"
              },
              {
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
              }
            ],
            "internalType": "struct IJsonApi.Proof",
            "name": "data",
            "type": "tuple"
          }
        ],
        "name": "validateTransfer",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

const baseApiUrl = "flaresec-production.up.railway.app";
const postprocessJq = `{owner: .owner, spender: .spender, receiver: .receiver, amount: .amount, status: .status, initiatedTime: .initiatedTime}`;
const abiSignature = `{\"components\": [{\"internalType\": \"address\", \"name\": \"owner\", \"type\": \"address\"},{\"internalType\": \"address\", \"name\": \"spender\", \"type\": \"address\"},{\"internalType\": \"address\", \"name\": \"receiver\", \"type\": \"address\"},{\"internalType\": \"uint256\", \"name\": \"amount\", \"type\": \"uint256\"},{\"internalType\": \"enum IERC20x.Status\", \"name\": \"status\", \"type\": \"uint8\"},{\"internalType\": \"uint256\", \"name\": \"initiatedTime\", \"type\": \"uint256\"}],\"name\": \"task\",\"type\": \"tuple\"}`;

const attestationTypeBase = "IJsonApi";
const sourceIdBase = "WEB2";
const verifierUrlBase = JQ_VERIFIER_URL_TESTNET;

// Schedule a cron job to run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
    console.log('Running a task every 5 minutes');
    // You can perform additional tasks here if needed
    // get all updated reqId
    const wallet = new Wallet(PRIVATE_KEY);
    const signer = wallet.connect(provider);
    const validatorAddress = await signer.getAddress();
    console.log(validatorAddress);
    const paramsUrl = `${baseApiUrl}/eventParams/${validatorAddress}`;
    const eventDataResponse = await fetch(paramsUrl);
    const eventData = await eventDataResponse.json();
    console.log(eventData);
    
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

    const responseType = {
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
  
    const decodedResponse = web3.eth.abi.decodeParameter(
        responseType,
        proof.response_hex
    );
    console.log("Decoded proof:", decodedResponse, "\n");

    const _wallet = new Wallet(PRIVATE_KEY);
    const _coston2Network = new Network("flare-testnet-coston2", 114);
    const _provider = new ethers.JsonRpcProvider("https://coston2-api.flare.network/ext/C/rpc", _coston2Network);
    const _signer = _wallet.connect(_provider);
    const tokenX = new ethers.Contract(tokenXAddress, TOKENX_ABI, _signer);
    console.log(tokenX);
    
    const _proof = {
      merkleProof: proof.proof,
      data: decodedResponse,
    };

    console.log("txType", txType, "proof:", _proof);
    
    if (txType === "Approve") {
        const _reqId = BigInt(reqId);
        const transaction = await tokenX.validateApproval(_reqId, _proof);
        console.log(transaction);

        const receipt = await transaction.wait();
        console.log(receipt);
    } else if (txType === "Transfer") {
        const _reqId = BigInt(reqId);
        const transaction = await tokenX.validateTransfer(_reqId, _proof);
        console.log(transaction);
        
        const receipt = await transaction.wait();
        console.log(receipt);
    } else {
        throw new Error("Invalid transaction type");
    }
}

async function validateTransaction(reqId, tokenXAddress, txType) {
    try {
        const apiUrl = `${baseApiUrl}/event/${reqId}`;
        const data = await prepareAttestationRequest(
            apiUrl,
            postprocessJq,
            abiSignature
        );

        console.log("Data:", data, "\n");

        const abiEncodedRequest = data.abiEncodedRequest;
        console.log(abiEncodedRequest);

        const roundId = await submitAttestationRequest(abiEncodedRequest);
        console.log(roundId);

        const proof = await retrieveDataAndProof(abiEncodedRequest, roundId);
        console.log(proof);

        await interactWithContract(reqId, tokenXAddress, proof, txType);
        console.log("Transaction completed");

        // Call the /txCompletion endpoint
        try {
            const response = await fetch(`${baseApiUrl}/txCompletion`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reqId }),
            });

            const resultText = await response.text();
            console.log("txCompletion response:", resultText);
        } catch (error) {
            console.error("Error calling /txCompletion:", error.message);
        }
    } catch (error) {
        console.error("Error in validateTransaction:", error.message);
    }
}  

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});