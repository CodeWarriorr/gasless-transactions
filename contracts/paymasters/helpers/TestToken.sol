// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";

import { ERC20, ERC20Permit } from "./ERC20Permit.sol";

contract TestToken is ERC20Permit {
    constructor(uint256 initialSupply) ERC20("Test Token", "TOK") {
        _mint(msg.sender, initialSupply);
    }

    function mint(uint256 amount) public {
        _mint(msg.sender, amount);
    }

    function mintTo(address account, uint256 amount) public {
        _mint(account, amount);
    }

    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }

    function burnFrom(address account, uint256 amount) public {
        _burn(account, amount);
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        address spender = _msgSender();
        console.log("transferFrom spender", spender);
        console.log("transferFrom from", from);
        console.log("transferFrom amount", amount);
        _spendAllowance(from, spender, amount);
        console.log("transferFrom after _spendAllowance");
        _transfer(from, to, amount);
        console.log("transferFrom after _transfer");
        return true;
    }
}
