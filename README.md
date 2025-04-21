# FlareSec
Native Multi-Factor Authentication for Flare Blockchain

---  

## Live Link - 

## Table of Contents  

1. [Overview](#overview)  
2. [Problem Statement](#problem-statement)  
3. [Solution](#solution)  
4. [How It Works](#how-it-works)  
5. [Technologies Used](#technologies-used)  
6. [Setup and Deployment](#setup-and-deployment)  
7. [Future Improvements](#future-improvements)  
8. [Acknowledgments](#acknowledgments)  

---  

## Overview  

FlareSec is a native multi-factor authentication (MFA) service for the Flare blockchain, designed to enhance asset security by adding an extra verification 
step for sensitive smart contract functions such as transfer and approve.

It introduces email-based authentication alongside standard wallet signatures to help prevent unauthorized transactions and give users greater control over 
their assets. Fully integrated with Flare’s infrastructure, FlareSec offers a seamless, decentralized way to secure on-chain interactions.

---  

## Problem Statement  

Non-custodial wallets give users full control over their assets but are vulnerable to key theft, which can happen without the user’s knowledge. Once a 
private key is compromised, attackers can initiate unauthorized transactions with no additional checks. There’s a lack of native, flexible security layers in 
Web3 that can prevent such events, highlighting the need for off-chain verification mechanisms to enhance transaction security.  

---  

## Solution  

FlareSec adds a native multi-factor authentication layer to the Flare blockchain by requiring email-based verification for sensitive actions like transfer and 
approve. Leveraging the Flare Data Connector, it fetches verifiable Web2 data to act as an extra security checkpoint before executing on-chain operations. It 
also proposes new token and NFT standards with built-in MFA support, offering developers a seamless way to integrate enhanced security into their smart contracts. 

---  

## How It Works  

The working mechanism of the dapp can be broken down into 8 steps

1. **User Registration**:
   - The user signs up by linking their wallet address to their email address.
   - This association enables off-chain email confirmations tied to on-chain activity.
2. **Token Wrapping**:  
   - If the asset is not based on the new proposed secure token standard, the user must “upgrade” their tokens.  
   - This involves sending the original tokens to a smart contract, which then mints a new version of the token with the same name and symbol.
   - These "secure tokens" are equipped with email-auth gated transfer and approve logic.
3. **Triggering a Secure Action**:  
   - The asset smart  emits an event containing important metadata such as the sender addreess, token address, receiver's address, amount etc
4. **Request Initialization**:  
   - A validator address is chosen at random using Flare's native random number generator (RNG).
   - A unique request ID (reqId) is also generated using a hash function seeded with randomness from Flare's RNG.
   - The event emitted includes the reqId and the assigned validator address.
5. **Email Confirmation**: 
   - A backend server listens for these emitted events.
   - Upon detecting a transaction request event, the server retrieves the sender's email address and sends an email prompting the user to approve or 
     reject the transaction.
6. **Storing User Response**: 
   - The user's response (approve/reject) is collected through a secure link in the email.
   - The server stores this response, associated with the reqId.
7. **Validation & Execution**: 
   - A validator server, responsible for processing assigned requests, retrieves the user’s response and generates a proof using Flare Data Connector (FDC).
   - The validator then calls validateTransfer() or validateApprove() on the 
     smart contract with:
        The FDC proof
        The reqId
8. **Final Transaction Execution**: 
   - The smart contract verifies the authenticity of the user’s response using FDC.
   - If the response is approved and the proof is valid, the transaction is executed—either transferring or approving the tokens as requested. 

---  

## Technologies Used  

| **Technology**    | **Purpose**                                              |  
|-------------------|----------------------------------------------------------|
| **Flare**         | Use of Flare's RNG and FDC, Smarr contract deployments.  |  
| **Node.js**       | Backend server and validators                            |
| **MailerSend**    | Sending Email notifications.                             | 
| **Next.js**       | Frontend framework for building the user interface.      |  

### Flare

In order to build FlareSec, native Flare technologies were utilized. Because these technologies are built in, It was easier to properly utilize them.
The Secure Random Number and Flare Data Connector features were used, Below is a description of how each of these technologies were used in building the project.

- Secure Random Number - The Secure Random Number feature is used in randomly selecting which validator will be responsible for carrying out a transaction 
once it has been approved or rejected. It was also used in a hashing function for determining the unique Id for each transaction.
Below is a code snippet showing how SRN was generated and used in the project
```solidity
    function getValidationParams(address contractAddress) public returns (address validator, uint256 reqId) {
        // get validator count
        validatorCount.current();
        // generate random number within that range
        (uint256 randomNumber, , ) = getSecureRandomNumber();
        uint256 validatorIndex = randomNumber % validatorCount.current();

        validator = validatorAddresses[validatorIndex];
        reqId = uint256(keccak256(abi.encodePacked(randomNumber, block.timestamp, contractAddress)));

        // Set the latest chosen validator
        latestValidator = validator;

        return (validator, reqId);
    }

    function getSecureRandomNumber()
        internal
        view
        returns (uint256 randomNumber, bool isSecure, uint256 timestamp)
    {
        (randomNumber, isSecure, timestamp) = randomV2.getRandomNumber();
        require(isSecure, "Random number is not secure");
        return (randomNumber, isSecure, timestamp);
    }
```
The full code for the contract the Secure Random Number was used can be found [here](https://github.com/NatX223/FlareSec/blob/main/smart%20contracts/contracts/Control.sol).

- Flare Data Connector - Another key component that is integral to the project is the use Flare Data Connector. FDC eneabled the passing of verified 
external data to asset smart contracts. This was absolutely neccesary because the service requires valid proofs as it handles user assets and that is 
what FDC provides - verifiable proof that a user has approved or rejected a transaction through their email. The proof is first generated off-chain then 
passed on on-chain by a validator calling a validation function on an asset contract.  
Below is a code snippet showing some of the specs and how proofs are generated 
```javascript
const postprocessJq = `{owner: .owner, spender: .spender, receiver: .receiver, amount: .amount, status: .status, initiatedTime: .initiatedTime}`;
const abiSignature = `{\"components\": [{\"internalType\": \"address\", \"name\": \"owner\", \"type\": \"address\"},{\"internalType\": \"address\", \"name\": \"spender\", \"type\": \"address\"},{\"internalType\": \"address\", \"name\": \"receiver\", \"type\": \"address\"},{\"internalType\": \"uint256\", \"name\": \"amount\", \"type\": \"uint256\"},{\"internalType\": \"enum IERC20x.Status\", \"name\": \"status\", \"type\": \"uint8\"},{\"internalType\": \"uint256\", \"name\": \"initiatedTime\", \"type\": \"uint256\"}],\"name\": \"task\",\"type\": \"tuple\"}`;

const attestationTypeBase = "IJsonApi";
const sourceIdBase = "WEB2";
``` 

Proof generation
```javascript
async function retrieveDataAndProof(
    abiEncodedRequest,
    roundId
) {
    const url = `${COSTON2_DA_LAYER_URL}api/v1/fdc/proof-by-request-round-raw`;
    console.log("Url:", url, "\n");
    return await retrieveDataAndProofBase(url, abiEncodedRequest, roundId);
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
```
In the smart cntracts the use of the external data gotten from the validation API is highlighted below
```solidity
    function validateTransfer(uint256 reqId, IJsonApi.Proof calldata data) external onlyValidator(reqId) returns(bool) {
        require(isJsonApiProofValid(data), "Invalid proof");
        require(requests[reqId].status != Status.Approved, "Transaction already approved");
        
        Request memory params = abi.decode(data.data.responseBody.abi_encoded_data, (Request));

        // Check the status of the request
        require(params.status == Status.Approved, "Transfer request is still pending or has been denied");

        if (params.status == Status.Denied) {
            requests[reqId].status = Status.Denied;
            revert("Transfer request has been denied");
        } else if (params.status == Status.Pending) {
            revert("Transfer request is still pending");
        }

        // Get the max approval time from the Control contract
        uint maxApprovalTime = IControl(controlContract).maxApprovalTime();

        // Check that the time difference is within the max approval time
        require(block.timestamp <= requests[reqId].initiatedTime + maxApprovalTime, "Approval time exceeded");

        // Additional logic for validation can be added here
        _burn(_msgSender(), requests[reqId].amount);
        ERC20(originalContract).transfer(requests[reqId].receiver, requests[reqId].amount);

        requests[reqId].status = Status.Approved;

        return true; // Return true if validation is successful
    }
``` 

The full code to contracts that utilize FDC can be found [here](https://github.com/NatX223/FlareSec/blob/main/smart%20contracts/contracts/Tokenx.sol) and [here](https://github.com/NatX223/FlareSec/blob/main/smart%20contracts/contracts/NFTx.sol).

- The smart contracts were deployed on the Coston2 testnet, below is a table showing the contracts deployed and their addreess

| **Contract**        | **Addres**                                 | **Function**                                                             |
|---------------------|--------------------------------------------|--------------------------------------------------------------------------|
| **Control**         | 0x8c54cbb9e358888B902725593a5006A96a8C9551 | Setting protocol params and generating transaction validator and id      |
| **TokenXFactory**   | 0x8B8b617Ce5FF505C04723107221F2757154Dc25A | TokenX contract creation/deployment                                      |
| **NFTXFactory**     | 0x4E82f9A00C76a6c966e8A4a9A1382CEeD37FFC17 | NFTX contract creation/deployment                                        |
| **TokenXRouter**    | 0x4798963E50accCc36781C3F0cf12b38A93777EbA | Broadcasting TokenX transactions - emitting trackable transaction events | 
| **NFTXRouter**      | 0x5E5EcA08e8978BE3D52e7874B6B8080154E55E53 | Broadcasting NFTX transactions - emitting trackable transaction events   |


### Node.js

The project utilizes off-chain data to verify on-chain transactions, as such there was need for a external data source and this came in form of a server.
The server is responsible for tracking events from the router contracts, alerting the user through their emails and then notifying the assigned validator
to get the users response, generating a proof for it and finally executing the function on-chain. The full code for the general backend and validator can 
be found [here](https://github.com/NatX223/FlareSec/tree/main/backend/src) and [here](https://github.com/NatX223/FlareSec/tree/main/validator/src) respectively. 

### MailerSend

MailerSend was used for relaying email alerts to users, it was chosen because of its speed and ease of use.

## Setup and Deployment  

### Prerequisites  

- Node.js v16+  
- Solidity development environment(Hardhat recommended)
- Blockchain wallets (e.g., MetaMask)  

### Local Setup  

The repository has to be cloned first

```bash  
  git clone https://github.com/NatX223/FlareSec  
```
- Smart contracts

1. Navigate to the smart contracts directory:  
  ```bash  
  cd smart contracts  
  ```  
2. Install dependencies:  
  ```bash  
  npm install  
  ```  
3. Set up environment variables:
  ```  
  CONTROL_OWNER=<Controller private key>
  VALIDATOR=<Validator private key>
  FLARE_RPC_URL=https://coston2-api.flare.network/ext/C/rpc
  COSTON2_FLARESCAN_API=https://api.routescan.io/v2/network/testnet/evm/114/etherscan/api
  FLARE_FLARESCAN_API=https://api.routescan.io/v2/network/mainnet/evm/14/etherscan/api 
  ```  
4. Compile smart contracts:  
  ```bash  
  npx hardhat compile  
  ```  
5. Run some tests:
  ```bash
  npx hardhat run scripts/test/control.test.js --network flare
  ```
  ```bash
  npx hardhat run scripts/test/tokenx.test.js --network flare
  ```
6. Run deployment scripts:
  ```bash
  npx hardhat run scripts/control.js --network flare
  ```
  ```bash
  npx hardhat run scripts/assets.js --network flare
  ```
  ```bash
  npx hardhat run scripts/factory.js --network flare
  ```

---  

## Future Improvements

1. Provide support for SMS notification and Auntentication apps.
2. Extensive audits on the protocol's smart contracts.
3. Mainnet deployment.
3. Building a wallet mobile app.

---  

## Acknowledgments  

Special thanks to **Flare x Encode Hackathon 2025** organizers: Flare and Encode. The Flare products played a pivotal role in building FlareSec functionality and impact.
