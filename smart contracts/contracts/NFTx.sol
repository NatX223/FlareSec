// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {ContractRegistry} from "@flarenetwork/flare-periphery-contracts/coston2/ContractRegistry.sol";
import {IFdcVerification} from "@flarenetwork/flare-periphery-contracts/coston2/IFdcVerification.sol";
import {IJsonApi} from "@flarenetwork/flare-periphery-contracts/coston2/IJsonApi.sol";

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./interfaces/IERC721x.sol";
import "./interfaces/IControl.sol";
import "./interfaces/INFTRouter.sol";

contract NFTx is IERC721x, ERC721 {
    using Counters for Counters.Counter;
    Counters.Counter public _reqCount;

    // State variable
    address public originalContract;
    address public controlContract;
    address public routerAddress;

    mapping(uint256 => Request) public requests;
    mapping(uint256 => address) public validations;

    // Constructor
    constructor(string memory name, string memory symbol, address _originalContract, address _controlContract, address _routerAddress) ERC721(name, symbol) {
        originalContract = _originalContract;
        controlContract = _controlContract;
        routerAddress = _routerAddress;
    }

    function upgrade(uint256 tokenId) public {
        require(ownerOf(tokenId) == _msgSender(), "NFTx: You do not own this token");

        // Transfer the NFT to this contract
        ERC721(originalContract).transferFrom(_msgSender(), address(this), tokenId);
        
        // Mint a new NFT (or handle the logic for upgrading)
        _mint(_msgSender(), tokenId);
    }

    function downgrade(uint256 tokenId) public {
        require(ownerOf(tokenId) == _msgSender(), "NFTx: You do not own this token");

        _burn(tokenId);
        ERC721(originalContract).transferFrom(address(this), _msgSender(), tokenId);
    }

    function approve(address spender, uint256 tokenId) public override {
        require(ownerOf(tokenId) == msg.sender, "NFTx: You do not own this token");
        
        // Call the getValidationParams function from the ControlContract
        (address validator, uint256 reqId) = IControl(controlContract).getValidationParams(address(this));
        validations[reqId] = validator;

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
        requests[reqId] = newRequest;

        // Emit the ApprovalCreated event with the validator
        INFTRouter(routerAddress).approvalTraker(reqId, _msgSender(), spender, tokenId, 0, block.timestamp, validator, address(this));
        emit ApprovalCreated(reqId, msg.sender, spender, tokenId, Status.Pending, block.timestamp, validator);
        
        // Increment the request count
        _reqCount.increment();
    }

    function transfer(address recipient, uint256 tokenId) public returns (bool) {
        require(ownerOf(tokenId) == msg.sender, "NFTx: You do not own this token");
        
        // Call the getValidationParams function from the ControlContract
        (address validator, uint256 reqId) = IControl(controlContract).getValidationParams(address(this));
        validations[reqId] = validator;
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
        INFTRouter(routerAddress).transferTraker(reqId, _msgSender(), recipient, tokenId, 0, block.timestamp, validator, address(this));
        emit TransferCreated(_reqCount.current(), msg.sender, recipient, tokenId, Status.Pending, block.timestamp, validator);
        
        // Increment the request count
        _reqCount.increment();

        return true;
    }

    function validateTransfer(uint256 reqId, IJsonApi.Proof calldata data) external onlyValidator(reqId) returns(bool) {
        require(isJsonApiProofValid(data), "Invalid proof");
        require(requests[reqId].status != Status.Approved, "Transaction already approved");

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
        _burn(params.tokenId); // Burn the NFT or handle it as per your logic
        ERC721(originalContract).transferFrom(address(this), params.receiver, params.tokenId);

        requests[reqId].status = Status.Approved;

        return true; // Return true if validation is successful
    }

    function validateApproval(uint256 reqId, IJsonApi.Proof calldata data) external onlyValidator(reqId) returns(bool) {
        require(isJsonApiProofValid(data), "Invalid proof");
        require(requests[reqId].status != Status.Approved, "Transaction already approved");
        
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

        ERC721(originalContract).approve(params.spender, params.tokenId); // Approve the spender for the NFT

        requests[reqId].status = Status.Approved;
        return true; // Return true if validation is successful
    }

    function isJsonApiProofValid(IJsonApi.Proof calldata _proof) private view returns (bool) {
        return ContractRegistry.auxiliaryGetIJsonApiVerification().verifyJsonApi(_proof);
    }

    modifier onlyValidator(uint256 reqId) {
        require(msg.sender == validations[reqId], "Tokenx: Caller is not the validator for this request");
        _;
    }
}
