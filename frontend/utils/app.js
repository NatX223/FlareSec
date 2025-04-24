const { ethers, Wallet, Network } = require("ethers");
import dotenv from 'dotenv';

dotenv.config();

import { Addresses } from "./Contract-Artifacts/Addresses";
import { erc20ABI } from "./Contract-Artifacts/ERC20";
import { erc721ABI } from "./Contract-Artifacts/ERC721";
import { nftFactoryABI, tokenFactoryABI } from "./Contract-Artifacts/Factory";
import { tokenXABI } from "./Contract-Artifacts/TokenX";

const baseURL = "https://flaresec-production.up.railway.app/";

export const mintTokens = async (receiver) => {
    try {
        const MINTER_KEY = process.env.NEXT_PUBLIC_MINTER_KEY;
        const wallet = new Wallet(MINTER_KEY);
        const coston2Network = new Network("flare-testnet-coston2", 114);
        const provider = new ethers.JsonRpcProvider("https://coston2-api.flare.network/ext/C/rpc", coston2Network);
        const signer = wallet.connect(provider);

        const tokenContract = new ethers.Contract(Addresses.flaresectokenAddress, erc20ABI, signer);
        console.log(tokenContract, signer);
        
        const amount = ethers.parseEther("1000");

        const mintTx = await tokenContract.mint(receiver, amount);
        const receipt = await mintTx.wait();

        if (receipt.status === 1) {
            console.log('1000 tokens minted successfully');
            return true;
        } else {
            console.error("Minting failed!");
            return false;
        }
    } catch (error) {
        console.error("Error minting tokens:", error);
        return false;
    }
}

export const mintNFT = async (receiver) => {
    try {
        const MINTER_KEY = process.env.NEXT_PUBLIC_MINTER_KEY;
        const wallet = new Wallet(MINTER_KEY);
        const coston2Network = new Network("flare-testnet-coston2", 114);
        const provider = new ethers.JsonRpcProvider("https://coston2-api.flare.network/ext/C/rpc", coston2Network);
        const signer = wallet.connect(provider);
        const nftContract = new ethers.Contract(Addresses.flaresecNFTAddress, erc721ABI, signer); // Replace with the actual ABI and address
        const mintTx = await nftContract.mint(receiver); // Call the mint function
        const receipt = await mintTx.wait();

        if (receipt.status === 1) {
            console.log('NFT minted successfully');
            return true;
        } else {
            console.error("Minting failed!");
            return false;
        }
    } catch (error) {
        console.error("Error minting NFT:", error);
        return false;
    }
}

export const tokenUpgrade = async (signer, tokenAddress, _amount) => {
    try {
      const tokenContract = new ethers.Contract(tokenAddress, erc20ABI, signer);
      const factoryContract = new ethers.Contract(Addresses.tokenxfactoryAddress, tokenFactoryABI, signer);
      const tokenXAddress = await factoryContract.originalToTokenx(tokenAddress);
      console.log(_amount);
      
      const amount = ethers.parseEther(_amount);

      if (tokenXAddress === ethers.ZeroAddress){
        const name = await tokenContract.name();
        const symbol = await tokenContract.symbol();

        const portTx = await factoryContract.createTokenx(name, symbol, tokenAddress);
        await portTx.wait();

        const portedTokenAddress = await factoryContract.originalToTokenx(tokenAddress);
        
        const approveTx = await tokenContract.approve(portedTokenAddress, amount);
        await approveTx.wait();

        const tokenXContract = new ethers.Contract(portedTokenAddress, tokenXABI, signer);
        const upgradeTx = await tokenXContract.upgrade(amount);
        await upgradeTx.wait();

      } else {

        const approveTx = await tokenContract.approve(tokenXAddress, amount);
        await approveTx.wait();

        const tokenXContract = new ethers.Contract(tokenXAddress, tokenXABI, signer);
        const upgradeTx = await tokenXContract.upgrade(amount);
        await upgradeTx.wait();
      }
      return true;
    } catch (error) {
        console.log(error);  
        return false;      
    }
}

export const NFTUpgrade = async (signer, nftAddress, id) => {
    try {
        const nftContract = new ethers.Contract(nftAddress, erc721ABI, signer); // Use the appropriate ABI for NFTs
        const factoryContract = new ethers.Contract(Addresses.nftxfactoryAddress, nftFactoryABI, signer);
        const nftXAddress = await factoryContract.originalToNFTx();

        if (nftXAddress === ethers.ZeroAddress) {
            const name = await nftContract.name();
            const symbol = await nftContract.symbol();

            const portTx = await factoryContract.createNFTx(name, symbol, nftAddress);
            await portTx.wait();

            const portedNftAddress = await factoryContract.originalToNftx();
            
            const approveTx = await nftContract.approve(portedNftAddress, id);
            await approveTx.wait();

            const nftXContract = new ethers.Contract(portedNftAddress, tokenXABI, signer); 
            const upgradeTx = await nftXContract.upgrade(id);
            await upgradeTx.wait();

        } else {
            const approveTx = await nftContract.approve(nftXAddress, id);
            await approveTx.wait();

            const nftXContract = new ethers.Contract(nftXAddress, tokenXABI, signer);
            const upgradeTx = await nftXContract.upgrade(id);
            await upgradeTx.wait();
        }
        return true;
    } catch (error) {
        console.log(error);  
        return false;      
    }
}

export const signupUser = async (address, email) => {
    const response = await fetch(`${baseURL}signup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address, email }),
    });

    if (!response.ok) {
        throw new Error('Failed to sign up user');
    }

    const data = await response.json();
    return data;
};

// Function to check if a user has signed up
export async function checkUserSignUp(address) {
    try {
        const response = await fetch(`${baseURL}checkUser/${address}`);
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        return data.signedUp; // Returns true or false based on the response
    } catch (error) {
        console.error("Error checking user signup: ", error);
        return false; // Return false in case of an error
    }
}