// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface INFTRouter {
    function approvalTraker(uint256 reqId, address owner, address spender, uint256 tokenId, uint8 status, uint256 initiatedTime, address validator, address contractAddress) external;
    function transferTraker(uint256 reqId, address sender, address receiver, uint256 tokenId, uint8 status, uint256 initiatedTime, address validator, address contractAddress) external;
}