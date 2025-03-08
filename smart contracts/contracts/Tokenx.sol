// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {ContractRegistry} from "@flarenetwork/flare-periphery-contracts/coston2/ContractRegistry.sol";
import {IFdcVerification} from "@flarenetwork/flare-periphery-contracts/coston2/IFdcVerification.sol";
import {IJsonApi} from "@flarenetwork/flare-periphery-contracts/coston2/IJsonApi.sol";

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./interfaces/IERC20x.sol";
import "./interfaces/IControl.sol";

contract Tokenx is IERC20x, ERC20 {
    using Counters for Counters.Counter;
    Counters.Counter public _reqCount;

    // State variable
    address public originalContract;
    address public controlContract;

    mapping(uint256 => Request) public requests;
    mapping(uint256 => Validation) public validations;

    // Constructor
    constructor(string memory _name, string memory _symbol, address _originalContract, address _controlContract) ERC20(_name, _symbol) {
        originalContract = _originalContract;
        controlContract = _controlContract;
    }

    function upgrade(uint256 amount) public {
        require(ERC20(originalContract).balanceOf(_msgSender()) >= amount, "Tokenx: The owner does not have enough tokens");

        ERC20(originalContract).transferFrom(_msgSender(), address(this), amount);
        _mint(_msgSender(), amount);
    }

    function downgrade(uint256 amount) public {
        require(balanceOf(_msgSender()) >= amount, "Tokenx: The owner does not have enough tokens to downgrade");

        _burn(_msgSender(), amount);
        ERC20(originalContract).transfer(_msgSender(), amount);
    }

    // approve function
    // override the approve function
    // emit function for approval
    function approve(address spender, uint256 value) public override returns (bool) {
        require(balanceOf(_msgSender()) >= value, "Tokenx: Insufficient tokens to approve");

        // Call the getValidationParams function from the ControlContract
        (string memory endpoint, address validator) = IControl(controlContract).getValidationParams();

        // Create a new Request struct
        Request memory newRequest = Request({
            owner: _msgSender(),
            spender: spender,
            receiver: address(0), // Assuming receiver is not applicable here
            amount: value,
            status: Status.Pending,
            initiatedTime: block.timestamp
        });

        // Add the new request to the requests mapping
        requests[_reqCount.current()] = newRequest;

        // Add the new validation to the validations mapping
        validations[_reqCount.current()] = Validation({
            endpoint: endpoint,
            validator: validator
        });

        // Emit the RequestCreated event with the endpoint and validator
        emit ApprovalCreated(_reqCount.current(), _msgSender(), spender, value, Status.Pending, block.timestamp, endpoint, validator);
        
        // Increment the request count
        _reqCount.increment();

        return true;
    }

    function transfer(address recipient, uint256 amount) public override returns (bool) {
        require(balanceOf(_msgSender()) >= amount, "Tokenx: Insufficient tokens to transfer");

        // Call the getValidationParams function from the ControlContract
        (string memory endpoint, address validator) = IControl(controlContract).getValidationParams();

        // Create a new Request struct
        Request memory newRequest = Request({
            owner: _msgSender(),
            spender: address(0), // No spender in direct transfer
            receiver: recipient,
            amount: amount,
            status: Status.Pending,
            initiatedTime: block.timestamp
        });

        // Add the new request to the requests mapping
        requests[_reqCount.current()] = newRequest;

        // Add the new validation to the validations mapping
        validations[_reqCount.current()] = Validation({
            endpoint: endpoint,
            validator: validator
        });

        // Emit the TransferCreated event with the endpoint and validator
        emit TransferCreated(_reqCount.current(), _msgSender(), recipient, amount, Status.Pending, block.timestamp, endpoint, validator);
        
        // Increment the request count
        _reqCount.increment();

        // Perform the transfer
        _transfer(_msgSender(), recipient, amount);
        
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
        _burn(_msgSender(), params.amount);
        ERC20(originalContract).transfer(params.receiver, params.amount);

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

        ERC20(originalContract).approve(params.spender, params.amount);

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
