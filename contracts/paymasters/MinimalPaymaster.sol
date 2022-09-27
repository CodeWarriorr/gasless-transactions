// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@opengsn/contracts/src/BasePaymaster.sol";

contract MinimalPaymaster is BasePaymaster {
    /**
     * @notice internal logic the paymasters need to provide to select which transactions they are willing to pay for
     * @notice see the documentation for `IPaymaster::preRelayedCall` for details
     */
    function _preRelayedCall(
        GsnTypes.RelayRequest calldata,
        bytes calldata,
        bytes calldata,
        uint256
    ) internal virtual override returns (bytes memory, bool) {
        bytes memory something;
        bool something2;
        return (something, something2);
    }

    /**
     * @notice internal logic the paymasters need to provide if they need to take some action after the transaction
     * @notice see the documentation for `IPaymaster::postRelayedCall` for details
     */
    function _postRelayedCall(
        bytes calldata,
        bool,
        uint256,
        GsnTypes.RelayData calldata
    ) internal virtual override {}

    /**
     * @return version The SemVer string of this Paymaster's version.
     */
    function versionPaymaster() external pure override returns (string memory) {
      return '0.0.1';
    }
}