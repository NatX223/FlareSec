// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

contract MyContract is Ownable {
    mapping(uint256 => string) public endpoints;
    mapping(address => bool) public validators;
    uint256 public endpointCount;
    uint public maxApprovalTime;

    event EndpointAdded(uint256 key, string value);
    event ValidatorAdded(address validator);
    event MaxApprovalTimeChanged(uint newMaxApprovalTime);

    constructor(uint _maxApprovalTime, address initialOwner) Ownable(initialOwner) {
        maxApprovalTime = _maxApprovalTime;
    }

    function changeEndpoint(uint256 key, string memory value) public onlyOwner {
        endpoints[key] = value;
        emit EndpointAdded(key, value);
    }

    function addEndpoint(string memory value) public onlyOwner {
        endpoints[endpointCount] = value;
        endpointCount = endpointCount + 1;
        emit EndpointAdded(key, value);
    }

    function addValidator(address validator) public onlyOwner {
        validators[validator] = true;
        emit ValidatorAdded(validator);
    }

    function changeMaxApprovalTime(uint newMaxApprovalTime) public onlyOwner {
        maxApprovalTime = newMaxApprovalTime;
        emit MaxApprovalTimeChanged(newMaxApprovalTime);
    }
}
