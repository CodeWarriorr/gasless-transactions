// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";

import "./ERC2771Recipient.sol";

contract MessageKeeper is ERC2771Recipient {
  mapping(address => string) private _messages;

  event MessageSaved(address owner, string message);

  constructor(address[] memory trustedForwarders) {
    // _setTrustedForwarder(trustedForwarder);
    for(uint i=0; i<trustedForwarders.length; i++) {
      _setTrustedForwarder(trustedForwarders[i]);
    }
  } 

  function saveMessage(string memory message) external {
    _messages[_msgSender()] = message;  

    emit MessageSaved(_msgSender(), message);
  }

  function getMessage(address owner) external view returns(string memory) {
    return _messages[owner];
  }
}