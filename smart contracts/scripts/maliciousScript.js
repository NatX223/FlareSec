const fs = require('fs');
const { ethers } = require("hardhat");

async function main() {
    const [signer] = await ethers.getSigners();

    const receiver = "0x6897d3A40Bf4f217f3F26cb4c31Baf490B5eC074";

    // Call the transfer function on the Tokenx contract
    const amountToTransfer = ethers.parseEther("100"); // Amount to transfer
    const tokenx = await ethers.getContractAt("Tokenx", "0xB85097b6bA237FC3F6377229e9465ba05b65c5ec", signer);
    const transferTx = await tokenx.transfer(receiver, amountToTransfer, { gasLimit: 500000 });
    await transferTx.wait();
    console.log("Transfer process started");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });