// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "erc-payable-token/contracts/token/ERC1363/ERC1363.sol";

contract LPToken is ERC1363 {

    constructor() ERC20("LP Token", "LPT") ERC1363() {
        _mint(msg.sender, 1_000_000 ether);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}