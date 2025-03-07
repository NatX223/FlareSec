// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

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

        // Emit the TransferCreated event with the endpoint and validator
        emit TransferCreated(_reqCount.current(), _msgSender(), recipient, amount, Status.Pending, block.timestamp, endpoint, validator);
        
        // Increment the request count
        _reqCount.increment();

        // Perform the transfer
        _transfer(_msgSender(), recipient, amount);
        
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
        require(balanceOf(sender) >= amount, "Tokenx: Insufficient tokens to transfer");
        require(allowance(sender, _msgSender()) >= amount, "Tokenx: Transfer amount exceeds allowance");

        // Call the getValidationParams function from the ControlContract
        (string memory endpoint, address validator) = IControl(controlContract).getValidationParams();

        // Create a new Request struct
        Request memory newRequest = Request({
            owner: sender,
            spender: _msgSender(),
            receiver: recipient,
            amount: amount,
            status: Status.Pending,
            initiatedTime: block.timestamp
        });

        // Add the new request to the requests mapping
        requests[_reqCount.current()] = newRequest;

        // Emit the TransferFromCreated event with the endpoint and validator
        emit TransferFromCreated(_reqCount.current(), sender, _msgSender(), recipient, amount, Status.Pending, block.timestamp, endpoint, validator);
        
        // Increment the request count
        _reqCount.increment();

        // Perform the transfer
        _transfer(sender, recipient, amount);
        _approve(sender, _msgSender(), allowance(sender, _msgSender()) - amount);
        
        return true;
    }
}
