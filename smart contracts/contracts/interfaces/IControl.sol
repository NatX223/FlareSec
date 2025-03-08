// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface IControl {
    function getValidationParams() external returns (string memory endpoint, address validatorIndex);
    function maxApprovalTime() external returns (uint);
}
