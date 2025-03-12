const fs = require('fs'); 
const { ethers } = require('hardhat');

async function main() {
    const [signer] = await ethers.getSigners();
    const controllerAddress = await signer.getAddress();

    console.log(controllerAddress);

    const Control = await ethers.getContractFactory('ControlContract', signer);

    const control = await Control.deploy(3600, controllerAddress);
    const controlAddress = await control.getAddress();

    console.log(`controlAddress: ${controlAddress}`);

    // Write the addresses to a file
    const addresses = {
        controlAddress: controlAddress
    };

    fs.writeFileSync('testDeployements.json', JSON.stringify(addresses, null, 2));
    console.log('Addresses saved to testDeployements.json');

    // await getOwner(controlAddress, signer);
    await addEndpoint(controlAddress, signer);
    await addValidator(controlAddress, signer);
    await setValidationParams(controlAddress, signer);

    await getValidationParams(controlAddress, signer);
}

async function getOwner(contractAddress, signer) {
    const controlContract = await ethers.getContractAt("ControlContract", contractAddress, signer);
    const owner = await controlContract.owner();

    console.log(owner);
}

async function addEndpoint(contractAddress, signer) {
    const controlContract = await ethers.getContractAt("ControlContract", contractAddress, signer);
    const addEndpointTx = await controlContract.addEndpoint("localhost:300");

    await addEndpointTx.wait();
    console.log(`Endpoint added`);
}

async function addValidator(contractAddress, signer) {
    const controllerAddress = await signer.getAddress();
    const controlContract = await ethers.getContractAt("ControlContract", contractAddress, signer);
    const addValidatorTx = await controlContract.addValidator(controllerAddress);

    await addValidatorTx.wait();
    console.log(`Validator added`);
}

async function setValidationParams(contractAddress, signer) {
    const controlContract = await ethers.getContractAt("ControlContract", contractAddress, signer);
    await controlContract.getValidationParams();
    console.log(`validator params generated`);
}

async function getValidationParams(contractAddress, signer) {
    const controlContract = await ethers.getContractAt("ControlContract", contractAddress, signer);
    const endpoint = await controlContract.latestEndpoint();
    const validator = await controlContract.latestValidator();
    console.log(endpoint, validator);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});