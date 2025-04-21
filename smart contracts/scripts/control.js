const { log } = require('console');
const fs = require('fs'); 
const { ethers } = require('hardhat');

async function main() {
    const [signer, validator] = await ethers.getSigners();
    const controllerAddress = await signer.getAddress();
    const validatorAddress = await validator.getAddress();
    console.log(validatorAddress);

    console.log(controllerAddress);

    const Control = await ethers.getContractFactory('ControlContract', signer);

    const control = await Control.deploy(3600, controllerAddress);
    const controlAddress = await control.getAddress();

    console.log(`controlAddress: ${controlAddress}`);

    // Write the addresses to a file
    const addresses = {
        controlAddress: controlAddress
    };

    fs.writeFileSync('deployedAddresses.json', JSON.stringify(addresses, null, 2));
    console.log('Addresses saved');

    await addValidator(controlAddress, signer, validator);
}

async function addValidator(contractAddress, signer, validator) {
    const validatorAddress = await validator.getAddress();
    const controlContract = await ethers.getContractAt("ControlContract", contractAddress, signer);
    
    const addValidatorTx = await controlContract.addValidator(validatorAddress, {
        gasLimit: 500000 // Set your desired gas limit here
    });

    await addValidatorTx.wait();
    console.log(`Validator added`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});