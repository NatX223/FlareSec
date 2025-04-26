import { ethers } from "ethers";
import { Addresses } from "./Contract-Artifacts/Addresses";
import { flareProvider } from "./provider";
import { erc20ABI } from "./Contract-Artifacts/ERC20";
import { erc721ABI } from "./Contract-Artifacts/ERC721";
import { mintTokens, mintNFT } from "./app";

const baseURL = "https://flaresec-production.up.railway.app/";

export const fetchUserTokens = async (userAddress) => {
    const tokenContract = new ethers.Contract(Addresses.flaresectokenAddress, erc20ABI, flareProvider);
    
    // Get the balance of the user
    const balance = await tokenContract.balanceOf(userAddress);
    const formattedBalance = Number(ethers.formatEther(balance));

    const upgradedBalance = await fetchUpgradedTokens(userAddress);

    // If balance is 0, call the mintTokens function
    if (formattedBalance === 0) {
        await mintTokens(userAddress); // Ensure mintTokens is defined and accessible
    }

    // Return the token information
    return [
        {
            name: "FlareSec", // Token name
            symbol: "FSC",    // Token symbol
            balance: formattedBalance,
            upgradedBalance: upgradedBalance,
            address: Addresses.flaresectokenAddress,
            image: ""
        }
    ];
};

export const fetchUpgradedTokens = async (userAddress) => {
    const tokenContract = new ethers.Contract(Addresses.flaresectokenXAddress, erc20ABI, flareProvider);
    
    // Get the balance of the user
    const balance = await tokenContract.balanceOf(userAddress);
    const formattedBalance = Number(ethers.formatEther(balance));

    // If balance is 0, call the mintTokens function
    if (formattedBalance === 0) {
        await mintTokens(userAddress); // Ensure mintTokens is defined and accessible
    }

    // Return the token information
    return formattedBalance;
};

export const fetchUserNFTs = async (userAddress) => {
    const nftContract = new ethers.Contract(Addresses.flaresecNFTAddress, erc721ABI, flareProvider);
    console.log(nftContract);
    
    // Get the total supply of NFTs (or the tokenId counter)
    const totalSupply = await nftContract._tokenIdCounter(); 

    // Check if the user has any NFTs
    let userNFTs = [];
    for (let tokenId = 0; tokenId < totalSupply; tokenId++) {
        const owner = await nftContract.ownerOf(tokenId);
        if (owner.toLowerCase() === userAddress.toLowerCase()) {
            // Call tokenURI to get the image URL
            const imageUrl = await nftContract.tokenURI(tokenId);
            userNFTs.push({
                name: "FlareSec NFT", // Replace with actual NFT name if available
                tokenId: tokenId,
                address: Addresses.flaresecNFTAddress,
                image: imageUrl // Set the image URL from tokenURI
            });
        }
    }

    // If the user has no NFTs, mint one
    if (userNFTs.length === 0) {
        await mintNFT(userAddress); // Mint an NFT to the user
        const newTokenId = totalSupply; // The new tokenId will be the current totalSupply
        const imageUrl = await nftContract.tokenURI(newTokenId); // Call tokenURI to get the image URL
        userNFTs.push({
            name: "FlareSec NFT", // Replace with actual NFT name if available
            tokenId: newTokenId,
            address: Addresses.flaresecNFTAddress,
            image: imageUrl // Set the image URL from tokenURI
        });
    }

    return userNFTs;
};

export const fetchUserTransactions = async (userAddress) => {
    try {
        const response = await fetch(`${baseURL}senderEvents/${userAddress}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        return data.events.concat(data.updatedEvents); // Combine both events and updated events
    } catch (error) {
        console.error("Error fetching user transactions: ", error);
        return [];
    }
};

