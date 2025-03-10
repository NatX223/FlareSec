// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./NFTx.sol";

contract NFTxFactory {
    event NFTxCreated(address indexed nftxAddress, string name, string symbol, address originalContract, address controlContract);

    // State variable for the control contract
    address public controlContract;

    // Mappings to store deployed contracts
    mapping(address => address) public originalToNFTx;

    // Constructor to instantiate the control contract
    constructor(address _controlContract) {
        controlContract = _controlContract;
    }

    function createNFTx(string memory name, string memory symbol, address originalContract) public returns (address) {
        require(originalToNFTx[originalContract] == address(0), "NFTx contract already deployed for this original contract");
        
        NFTx newNFTx = new NFTx(name, symbol, originalContract, controlContract);
        originalToNFTx[originalContract] = address(newNFTx); // Map original contract to NFTx contract
        emit NFTxCreated(address(newNFTx), name, symbol, originalContract, controlContract);
        return address(newNFTx);
    }
} 