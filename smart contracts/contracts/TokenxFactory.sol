// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./Tokenx.sol";

contract TokenxFactory {
    event TokenxCreated(address indexed tokenxAddress, string name, string symbol, address originalContract, address controlContract);

    // State variable for the control contract
    address public controlContract;

    // Mappings to store deployed contracts
    mapping(address => address) public originalToTokenx;

    // Constructor to instantiate the control contract
    constructor(address _controlContract) {
        controlContract = _controlContract;
    }

    function createTokenx(string memory name, string memory symbol, address originalContract) public returns (address) {
        require(originalToTokenx[originalContract] == address(0), "Tokenx contract already deployed for this original contract");
        
        Tokenx newTokenx = new Tokenx(name, symbol, originalContract, controlContract);
        originalToTokenx[originalContract] = address(newTokenx); // Map original contract to Tokenx contract
        emit TokenxCreated(address(newTokenx), name, symbol, originalContract, controlContract);
        return address(newTokenx);
    }
} 