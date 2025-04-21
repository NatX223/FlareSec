// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract FlareSecNFT is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter public _tokenIdCounter; // Counter for token IDs
    string public imageUrl;

    constructor(string memory _imageUrl) ERC721("FlareSecNFT", "FSCNFT") Ownable(msg.sender) {
        imageUrl = _imageUrl;
        mint(msg.sender);
    }

    function mint(address receiver) public {
        uint256 tokenId = _tokenIdCounter.current(); // Get the current token ID
        _mint(receiver, tokenId); // Mint a new token with the specified tokenId
        _tokenIdCounter.increment(); // Increment the token ID counter
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return imageUrl;
    }
}
