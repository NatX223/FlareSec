// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import {ContractRegistry} from "@flarenetwork/flare-periphery-contracts/coston2/ContractRegistry.sol";
import {RandomNumberV2Interface} from "@flarenetwork/flare-periphery-contracts/coston2/RandomNumberV2Interface.sol";

contract ControlContract is Ownable {
    RandomNumberV2Interface internal randomV2;
    using Counters for Counters.Counter;
    
    Counters.Counter public validatorCount;
    uint public maxApprovalTime;

    mapping(address => bool) public validators;
    mapping(uint256 => address) public validatorAddresses;

    address public latestValidator;

    event ValidatorAdded(address validator);
    event MaxApprovalTimeChanged(uint newMaxApprovalTime);

    constructor(uint _maxApprovalTime, address initialOwner) Ownable(initialOwner) {
        maxApprovalTime = _maxApprovalTime;
        randomV2 = ContractRegistry.getRandomNumberV2();
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

    function getValidationParams(address contractAddress) public returns (address validator, uint256 reqId) {
        // get validator count
        validatorCount.current();
        // generate random number within that range
        (uint256 randomNumber, , ) = getSecureRandomNumber();
        uint256 validatorIndex = randomNumber % validatorCount.current();

        validator = validatorAddresses[validatorIndex];
        reqId = uint256(keccak256(abi.encodePacked(randomNumber, block.timestamp, contractAddress)));

        // Set the latest chosen validator
        latestValidator = validator;

        return (validator, reqId);
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
