// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import {ContractRegistry} from "@flarenetwork/flare-periphery-contracts/coston2/ContractRegistry.sol";
import {RandomNumberV2Interface} from "@flarenetwork/flare-periphery-contracts/coston2/RandomNumberV2Interface.sol";

contract ControlContract is Ownable {
    RandomNumberV2Interface internal randomV2;
    using Counters for Counters.Counter;
    
    Counters.Counter public endpointCount;
    Counters.Counter public validatorCount;
    uint public maxApprovalTime;

    mapping(uint256 => string) public endpoints;
    mapping(address => bool) public validators;
    mapping(uint256 => address) public validatorAddresses;

    event EndpointAdded(uint256 key, string value);
    event ValidatorAdded(address validator);
    event MaxApprovalTimeChanged(uint newMaxApprovalTime);

    constructor(uint _maxApprovalTime, address initialOwner) Ownable(initialOwner) {
        maxApprovalTime = _maxApprovalTime;
        randomV2 = ContractRegistry.getRandomNumberV2();
    }

    function changeEndpoint(uint256 key, string memory value) public onlyOwner {
        endpoints[key] = value;
        emit EndpointAdded(key, value);
    }

    function addEndpoint(string memory value) public onlyOwner {
        uint256 currentCount = endpointCount.current();
        endpoints[currentCount] = value;
        emit EndpointAdded(currentCount, value);
        endpointCount.increment();        
    }

    function addValidator(address validator) public onlyOwner {
        require(!validators[validator], "Validator already exists");
        validators[validator] = true;
        validatorAddresses[validatorCount.current()] = validator;
        validatorCount.increment();
        emit ValidatorAdded(validator);
    }

    function changeMaxApprovalTime(uint newMaxApprovalTime) public onlyOwner {
        maxApprovalTime = newMaxApprovalTime;
        emit MaxApprovalTimeChanged(newMaxApprovalTime);
    }

    function getValidationParams() public returns (string memory endpoint, address validator) {
        // get validator and endpoint count
        endpointCount.current();
        validatorCount.current();
        // generate random number within that range
        (uint256 randomNumber, , ) = getSecureRandomNumber();
        uint256 endpointIndex = randomNumber % endpointCount.current();
        uint256 validatorIndex = randomNumber % validatorCount.current();

        endpoint = endpoints[endpointIndex];
        validator = validatorAddresses[validatorIndex];

        return (endpoint, validator);
    }

    function getSecureRandomNumber()
        internal
        view
        returns (uint256 randomNumber, bool isSecure, uint256 timestamp)
    {
        (randomNumber, isSecure, timestamp) = randomV2.getRandomNumber();
        require(isSecure, "Random number is not secure");
        return (randomNumber, isSecure, timestamp);
    }
}
