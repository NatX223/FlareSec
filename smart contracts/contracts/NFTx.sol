// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./interfaces/IERC721x.sol";
import "./interfaces/IControl.sol";

contract NFTx is IERC721x, ERC721 {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    // State variable
    address public controlContract;

    mapping(uint256 => Request) public requests;

    // Constructor
    constructor(string memory name, string memory symbol, address _controlContract) ERC721(name, symbol) {
        controlContract = _controlContract;
    }

    function mint(address to) public {
        uint256 tokenId = _tokenIdCounter.current();
        _mint(to, tokenId);
        _tokenIdCounter.increment();
    }

    function burn(uint256 tokenId) public {
        require(ownerOf(tokenId) == msg.sender, "NFTx: You do not own this token");
        _burn(tokenId);
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
        requests[_tokenIdCounter.current()] = newRequest;

        // Emit the ApprovalCreated event with the endpoint and validator
        emit ApprovalCreated(_tokenIdCounter.current(), msg.sender, spender, tokenId, Status.Pending, block.timestamp, endpoint, validator);
        
        // Increment the request count
        _tokenIdCounter.increment();
    }

    function transfer(address recipient, uint256 tokenId) public {
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
        requests[_tokenIdCounter.current()] = newRequest;

        // Emit the TransferCreated event with the endpoint and validator
        emit TransferCreated(_tokenIdCounter.current(), msg.sender, recipient, tokenId, Status.Pending, block.timestamp, endpoint, validator);
        
        // Increment the request count
        _tokenIdCounter.increment();

        // Perform the transfer
        _transfer(msg.sender, recipient, tokenId);
    }

    function transferFrom(address sender, address recipient, uint256 tokenId) public override {
        require(ownerOf(tokenId) == sender, "NFTx: Sender does not own this token");
        require(getApproved(tokenId) == msg.sender || isApprovedForAll(sender, msg.sender), "NFTx: Transfer not approved");

        // Call the getValidationParams function from the ControlContract
        (string memory endpoint, address validator) = IControl(controlContract).getValidationParams();

        // Create a new Request struct
        Request memory newRequest = Request({
            owner: sender,
            spender: msg.sender,
            receiver: recipient,
            tokenId: tokenId,
            status: Status.Pending,
            initiatedTime: block.timestamp
        });

        // Add the new request to the requests mapping
        requests[_tokenIdCounter.current()] = newRequest;

        // Emit the TransferFromCreated event with the endpoint and validator
        emit TransferFromCreated(_tokenIdCounter.current(), sender, msg.sender, recipient, tokenId, Status.Pending, block.timestamp, endpoint, validator);
        
        // Increment the request count
        _tokenIdCounter.increment();

        // Perform the transfer
        _transfer(sender, recipient, tokenId);
    }
}
