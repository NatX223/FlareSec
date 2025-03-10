// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {ContractRegistry} from "@flarenetwork/flare-periphery-contracts/coston2/ContractRegistry.sol";
import {IFdcVerification} from "@flarenetwork/flare-periphery-contracts/coston2/IFdcVerification.sol";
import {IJsonApi} from "@flarenetwork/flare-periphery-contracts/coston2/IJsonApi.sol";

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./interfaces/IERC721x.sol";
import "./interfaces/IControl.sol";

contract NFTx is IERC721x, ERC721 {
    using Counters for Counters.Counter;
    Counters.Counter public _reqCount;

    // State variable
    address public controlContract;

    mapping(uint256 => Request) public requests;
    mapping(uint256 => Validation) public validations;

    // Constructor
    constructor(string memory name, string memory symbol, address _originalContract, address _controlContract) ERC721(name, symbol) {
        controlContract = _controlContract;
    }

    function approve(address spender, uint256 tokenId) public override {
        require(ownerOf(tokenId) == msg.sender, "NFTx: You do not own this token");
        
        // Call the getValidationParams function from the ControlContract
        (string memory endpoint, address validator) = IControl(controlContract).getValidationParams();

        // Create a new Request struct
        Request memory newRequest = Request({
            owner: msg.sender,
            spender: spender,
            receiver: address(0), // Assuming receiver is not applicable here
            tokenId: tokenId,
            status: Status.Pending,
            initiatedTime: block.timestamp
        });

        // Add the new request to the requests mapping
        requests[_reqCount.current()] = newRequest;

        // Emit the ApprovalCreated event with the endpoint and validator
        emit ApprovalCreated(_reqCount.current(), msg.sender, spender, tokenId, Status.Pending, block.timestamp, endpoint, validator);
        
        // Increment the request count
        _reqCount.increment();
    }

    function transfer(address recipient, uint256 tokenId) public returns (bool) {
        require(ownerOf(tokenId) == msg.sender, "NFTx: You do not own this token");
        
        // Call the getValidationParams function from the ControlContract
        (string memory endpoint, address validator) = IControl(controlContract).getValidationParams();

        // Create a new Request struct
        Request memory newRequest = Request({
            owner: msg.sender,
            spender: address(0), // No spender in direct transfer
            receiver: recipient,
            tokenId: tokenId,
            status: Status.Pending,
            initiatedTime: block.timestamp
        });

        // Add the new request to the requests mapping
        requests[_reqCount.current()] = newRequest;

        // Emit the TransferCreated event with the endpoint and validator
        emit TransferCreated(_reqCount.current(), msg.sender, recipient, tokenId, Status.Pending, block.timestamp, endpoint, validator);
        
        // Increment the request count
        _reqCount.increment();

        return true;
    }

    function validateTransfer(uint256 reqId, IJsonApi.Proof calldata data) external onlyValidator(reqId) returns(bool) {
        require(isJsonApiProofValid(data), "Invalid proof");

        Request memory params = abi.decode(data.data.responseBody.abi_encoded_data, (Request));

        // Check the status of the request
        require(params.status == Status.Approved, "Transfer request is still pending or has been denied");

        if (params.status == Status.Denied) {
            requests[reqId].status = Status.Denied;
            revert("Transfer request has been denied");
        } else if (params.status == Status.Pending) {
            revert("Transfer request is still pending");
        }

        // Get the max approval time from the Control contract
        uint maxApprovalTime = IControl(controlContract).maxApprovalTime();

        // Check that the time difference is within the max approval time
        require(block.timestamp <= params.initiatedTime + maxApprovalTime, "Approval time exceeded");

        // Additional logic for validation can be added here
        _transfer(params.owner, params.receiver, params.tokenId);

        requests[reqId].status = Status.Approved;

        return true; // Return true if validation is successful
    }

    function validateApproval(uint256 reqId, IJsonApi.Proof calldata data) external onlyValidator(reqId) returns(bool) {
        require(isJsonApiProofValid(data), "Invalid proof");

        Request memory params = abi.decode(data.data.responseBody.abi_encoded_data, (Request));

        // Check the status of the request
        require(params.status == Status.Approved, "Approval request is still pending or has been denied");

        if (params.status == Status.Denied) {
            requests[reqId].status = Status.Denied;
            revert("Approval request has been denied");
        } else if (params.status == Status.Pending) {
            revert("Approval request is still pending");
        }

        // Get the max approval time from the Control contract
        uint maxApprovalTime = IControl(controlContract).maxApprovalTime();

        // Check that the time difference is within the max approval time
        require(block.timestamp <= params.initiatedTime + maxApprovalTime, "Approval time exceeded");

        _approve(params.spender, params.tokenId, params.owner);

        requests[reqId].status = Status.Approved;
        return true; // Return true if validation is successful
    }

    function isJsonApiProofValid(IJsonApi.Proof calldata _proof) private view returns (bool) {
        return ContractRegistry.auxiliaryGetIJsonApiVerification().verifyJsonApi(_proof);
    }

    modifier onlyValidator(uint256 reqId) {
        require(msg.sender == validations[reqId].validator, "Tokenx: Caller is not the validator for this request");
        _;
    }
}
