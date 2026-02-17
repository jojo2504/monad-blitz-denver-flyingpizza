// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GoldenSliceNFT
 * @dev NFT reward for race winners
 */
contract GoldenSliceNFT is ERC721, Ownable {
    
    uint256 private _tokenIdCounter;
    
    struct SliceMetadata {
        uint256 raceId;
        uint256 finalHeight;
        uint256 timestamp;
    }
    
    mapping(uint256 => SliceMetadata) public sliceData;
    
    event GoldenSliceMinted(address indexed winner, uint256 indexed tokenId, uint256 raceId);
    
    constructor() ERC721("Golden Slice", "SLICE") Ownable(msg.sender) {
        _tokenIdCounter = 0;
    }
    
    /**
     * @dev Mint Golden Slice NFT to winner
     */
    function mintToWinner(
        address winner,
        uint256 raceId,
        uint256 finalHeight
    ) external onlyOwner returns (uint256) {
        _tokenIdCounter++;
        uint256 newTokenId = _tokenIdCounter;
        
        _safeMint(winner, newTokenId);
        
        sliceData[newTokenId] = SliceMetadata({
            raceId: raceId,
            finalHeight: finalHeight,
            timestamp: block.timestamp
        });
        
        emit GoldenSliceMinted(winner, newTokenId, raceId);
        
        return newTokenId;
    }
    
    /**
     * @dev Get metadata for a Golden Slice
     */
    function getSliceMetadata(uint256 tokenId) external view returns (
        uint256 raceId,
        uint256 finalHeight,
        uint256 timestamp
    ) {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        
        SliceMetadata memory metadata = sliceData[tokenId];
        return (metadata.raceId, metadata.finalHeight, metadata.timestamp);
    }
    
    /**
     * @dev Override tokenURI to return metadata
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        
        // In production, this would return a proper IPFS or API URL
        return string(abi.encodePacked(
            "https://api.pizzaskyrace.com/metadata/",
            toString(tokenId)
        ));
    }
    
    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
