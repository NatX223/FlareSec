const fs = require('fs');
const { ethers } = require("hardhat");

async function main() {
    // Read the control contract address from the testDeployements.json file
    const data = fs.readFileSync('testDeployements.json');
    const { controlAddress } = JSON.parse(data);

    const receiver = "0x6897d3A40Bf4f217f3F26cb4c31Baf490B5eC074";
    // Deploy the ERC20 token
    // const MyToken = await ethers.getContractFactory("MyToken");
    // const myToken = await MyToken.deploy(ethers.parseEther("1000")); // Mint 1000 tokens
    // const myTokenAddress = await myToken.getAddress();
    // console.log("MyToken deployed to:", myTokenAddress);

    // // Use the control contract address from the JSON file
    // console.log("Using ControlContract deployed at:", controlAddress);

    // const Tokenx = await ethers.getContractFactory("Tokenx");
    // const tokenx = await Tokenx.deploy("Tokenx", "TX", myTokenAddress, controlAddress);
    // const tokenXAddress = await tokenx.getAddress();
    // console.log("Tokenx deployed to:", tokenXAddress);

    // // Call the upgrade function on the Tokenx contract
    const amountToUpgrade = ethers.parseEther("100"); // Amount to upgrade
    // const initialApproveTx = await myToken.approve(tokenXAddress, amountToUpgrade, { gasLimit: 500000 }); // Approve Tokenx to spend tokens
    // await initialApproveTx.wait();
    // console.log("approved");
    // const upgradeTx = await tokenx.upgrade(amountToUpgrade, { gasLimit: 500000 }); // Set the gas limit to 500,000
    // await upgradeTx.wait();
    // console.log("Upgrade function called on Tokenx contract");
    const tokenx = await ethers.getContractAt("Tokenx", "0x471367B20F644E058F7092a34b2d2Ea90B26BB0d");
    const approveTx = await tokenx.approve(receiver, amountToUpgrade, { gasLimit: 500000 });
    await approveTx.wait();
    console.log("approve process started");

    // Write the addresses to the testDeployements.json file
    // const deployments = {
    //     controlAddress,
    //     myTokenAddress,
    //     tokenXAddress
    // };
    // fs.writeFileSync('testDeployements.json', JSON.stringify(deployments, null, 2));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });