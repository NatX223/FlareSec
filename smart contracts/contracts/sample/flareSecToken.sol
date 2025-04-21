// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FlareSecToken is ERC20, Ownable {
    constructor(uint256 amount) ERC20("FlareSec", "FSC") Ownable(msg.sender) {
        mint(msg.sender, amount);
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
