const fs = require('fs');
const { ethers } = require('hardhat');

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    const data = fs.readFileSync('testDeployements.json');
    const { controlAddress } = JSON.parse(data);

    // Deploy the flaresec ERC20 token
    const flareSecToken = await ethers.getContractFactory("FlareSecToken");
    const flaresectoken = await flareSecToken.deploy(ethers.parseEther("1000")); // Mint 1000 tokens
    const flaresectokenAddress = await flaresectoken.getAddress();
    console.log("flaresec token deployed to:", flaresectokenAddress);
    
    // Deploy the flaresec ERC721 NFT
    const flareSecNFT = await ethers.getContractFactory("FlareSecNFT");
    const flaresecNFT = await flareSecNFT.deploy("https://sapphire-cool-cod-578.mypinata.cloud/ipfs/bafkreifctueno2xle3ny2ntbim7lu23rrffgduanjkd7awhhek5mfwcgxe"); // Mint an NFT
    const flaresecNFTAddress = await flaresecNFT.getAddress();
    console.log("flaresec NFT deployed to:", flaresecNFTAddress);

    // Save deployed addresses to a JSON file
    const addresses = {
        controlContract: controlAddress,
        flaresectokenAddress: flaresectokenAddress,
        flaresecNFTAddress: flaresecNFTAddress
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