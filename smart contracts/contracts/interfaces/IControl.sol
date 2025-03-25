// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface IControl {
    function getValidationParams(address contractAddress) external returns (address validatorIndex, uint256 reqId);
    function maxApprovalTime() external returns (uint);
}
