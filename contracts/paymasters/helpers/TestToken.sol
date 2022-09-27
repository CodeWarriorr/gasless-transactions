// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC20, ERC20Permit} from './ERC20Permit.sol';

contract TestToken is ERC20Permit {
  constructor(uint256 initialSupply) ERC20('Test Token', 'TOK') {
    _mint(msg.sender, initialSupply);
  }

  function mint(address account, uint256 amount) public {
    _mint(account, amount);
  }

  function burn(address account, uint256 amount) public {
    _burn(account, amount);
  }
}
