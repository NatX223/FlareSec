const fs = require('fs');
const { ethers } = require('hardhat');

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    const data = fs.readFileSync('testDeployements.json');
    const { controlAddress, flaresectokenAddress, flaresecNFTAddress } = JSON.parse(data);


    // Deploy the tokenx factory

    const TokenXRouter = await ethers.getContractFactory("TokenRouter");
    const tokenxrouter = await TokenXRouter.deploy(deployer.address);
    const tokenxrouterAddress = await tokenxrouter.getAddress();
    console.log("tokenx router deployed to:", tokenxrouterAddress);

    const TokenXFactory = await ethers.getContractFactory("TokenxFactory");
    const tokenxfactory = await TokenXFactory.deploy(controlAddress, tokenxrouterAddress);
    const tokenxfactoryAddress = await tokenxfactory.getAddress();
    console.log("tokenx factory deployed to:", tokenxfactoryAddress);
    
    // Deploy NFTx factory
    const NFTXRouter = await ethers.getContractFactory("NFTRouter");
    const nftxrouter = await NFTXRouter.deploy(deployer.address);
    const nftxrouterAddress = await nftxrouter.getAddress();
    console.log("nftx router deployed to:", nftxrouterAddress);

    const nftFactory = await ethers.getContractFactory("NFTxFactory");
    const nftxFactory = await nftFactory.deploy(controlAddress, nftxrouterAddress);
    const nftxfactoryAddress = await nftxFactory.getAddress();
    console.log("NFTx Factory deployed to:", nftxfactoryAddress);

    // Save deployed addresses to a JSON file
    const addresses = {
        controlAddress: controlAddress,
        flaresectokenAddress: flaresectokenAddress,
        flaresecNFTAddress: flaresecNFTAddress,
        nftxfactoryAddress: nftxfactoryAddress,
        tokenxfactoryAddress: tokenxfactoryAddress,
        tokenxrouterAddress: tokenxrouterAddress,
        nftxrouterAddress: nftxrouterAddress
    };
    fs.writeFileSync('deployedAddresses.json', JSON.stringify(addresses, null, 2));
    console.log('Deployed addresses saved to deployedAddresses.json');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }
);