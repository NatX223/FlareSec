// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract NFTRouter is Ownable {
    using Counters for Counters.Counter;

    Counters.Counter public transactionCount;

    enum Status { Pending, Approved, Denied }

    event ApprovalCreated(uint256 indexed reqId, address indexed owner, address indexed spender, uint256 tokenId, uint8 status, uint256 initiatedTime, address validator, address contractAddress);
    event TransferCreated(uint256 indexed reqId, address indexed sender, address indexed receiver, uint256 tokenId, uint8 status, uint256 initiatedTime, address validator, address contractAddress);
    constructor(address initialOwner) Ownable(initialOwner) {}

    function approvalTraker(uint256 reqId, address owner, address spender, uint256 tokenId, uint8 status, uint256 initiatedTime, address validator, address contractAddress) public {
        transactionCount.increment();
        emit ApprovalCreated(reqId, owner, spender, tokenId, status, initiatedTime, validator, contractAddress);
    }

    function transferTraker(uint256 reqId, address sender, address receiver, uint256 tokenId, uint8 status, uint256 initiatedTime, address validator, address contractAddress) public {
        transactionCount.increment();
        emit TransferCreated(reqId, sender, receiver, tokenId, status, initiatedTime, validator, contractAddress);
    }
}