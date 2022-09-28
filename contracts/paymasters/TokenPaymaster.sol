// SPDX-License-Identifier:MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "hardhat/console.sol";

import "./BasePaymaster.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./interfaces/IUniswapV3.sol";

/**
 * A Token-based paymaster.
 * - each request is paid for by the caller.
 * - acceptRelayedCall - verify the caller can pay for the request in tokens.
 * - preRelayedCall - pre-pay the maximum possible price for the tx
 * - postRelayedCall - refund the caller for the unused gas
 */
contract TokenPaymaster is BasePaymaster {

    function versionPaymaster() external override virtual view returns (string memory){
        return "3.0.0-beta.0+opengsn.token.ipaymaster";
    }


    IUniswapV3[] public uniswaps;
    IERC20[] public tokens;

    mapping (IUniswapV3=>bool ) private supportedUniswaps;

    uint256 public gasUsedByPost;

    constructor(IUniswapV3[] memory _uniswaps) {
        uniswaps = _uniswaps;

        for (uint256 i = 0; i < _uniswaps.length; i++){
            supportedUniswaps[_uniswaps[i]] = true;
            tokens.push(IERC20(_uniswaps[i].tokenAddress()));
            tokens[i].approve(address(_uniswaps[i]), type(uint256).max);
        }
    }

    /**
     * set gas used by postRelayedCall, for proper gas calculation.
     * You can use TokenGasCalculator to calculate these values (they depend on actual code of postRelayedCall,
     * but also the gas usage of the token and of Uniswap)
     */
    function setPostGasUsage(uint256 _gasUsedByPost) external onlyOwner {
        gasUsedByPost = _gasUsedByPost;
    }

    // return the payer of this request.
    // for account-based target, this is the target account.
    function getPayer(GsnTypes.RelayRequest calldata relayRequest) public virtual view returns (address) {
        (this);
        return relayRequest.request.to;
    }

    event Received(uint256 eth);
    receive() external override payable {
        // TODO: why this is overriden ?!
        
        // require(address(relayHub) != address(0), "relay hub address not set");
        // relayHub.depositFor{value:msg.value}(address(this));

        emit Received(msg.value);
    }

    function _getToken(bytes memory paymasterData) internal view returns (IERC20 token, IUniswapV3 uniswap) {
        uniswap = abi.decode(paymasterData, (IUniswapV3));
        require(supportedUniswaps[uniswap], "unsupported token uniswap");
        token = IERC20(uniswap.tokenAddress());
    }

    function _calculatePreCharge(
        IERC20 token,
        IUniswapV3 uniswap,
        GsnTypes.RelayRequest calldata relayRequest,
        uint256 maxPossibleGas)
    internal
    view
    returns (address payer, uint256 tokenPreCharge) {
        (token);
        payer = this.getPayer(relayRequest);
        uint256 ethMaxCharge = relayHub.calculateCharge(maxPossibleGas, relayRequest.relayData);
        ethMaxCharge += relayRequest.request.value;
        tokenPreCharge = uniswap.getTokenToEthOutputPrice(ethMaxCharge);
    }

    function _verifyPaymasterData(GsnTypes.RelayRequest calldata relayRequest) internal virtual override view {
        // solhint-disable-next-line reason-string
        require(relayRequest.relayData.paymasterData.length == 32, "paymasterData: invalid length for Uniswap v1 exchange address");
    }

    function _preRelayedCall(
        GsnTypes.RelayRequest calldata relayRequest,
        bytes calldata signature,
        bytes calldata approvalData,
        uint256 maxPossibleGas
    )
    internal
    override
    virtual
    returns (bytes memory context, bool revertOnRecipientRevert) {
        (signature, approvalData);

        (IERC20 token, IUniswapV3 uniswap) = _getToken(relayRequest.relayData.paymasterData);
        console.log("_preRelayedCall token address", address(token));

        (address payer, uint256 tokenPrecharge) = _calculatePreCharge(token, uniswap, relayRequest, maxPossibleGas);

        console.log("_preRelayedCall payer tokenPrecharge", payer, tokenPrecharge);

        console.log("_preRelayedCall balance of payer", token.balanceOf(payer));

        token.transferFrom(payer, address(this), tokenPrecharge);

        console.log("_preRelayedCall after token.transferFrom");

        return (abi.encode(payer, tokenPrecharge, token, uniswap), false);
    }

    function _postRelayedCall(
        bytes calldata context,
        bool,
        uint256 gasUseWithoutPost,
        GsnTypes.RelayData calldata relayData
    )
    internal
    override
    virtual
    {
        (address payer, uint256 tokenPrecharge, IERC20 token, IUniswapV3 uniswap) = abi.decode(context, (address, uint256, IERC20, IUniswapV3));

        console.log("_postRelayedCall payer", payer);
        console.log("_postRelayedCall tokenPrecharge", tokenPrecharge);

        _postRelayedCallInternal(payer, tokenPrecharge, 0, gasUseWithoutPost, relayData, token, uniswap);
    }

    function _postRelayedCallInternal(
        address payer,
        uint256 tokenPrecharge,
        uint256 valueRequested,
        uint256 gasUseWithoutPost,
        GsnTypes.RelayData calldata relayData,
        IERC20 token,
        IUniswapV3 uniswap
    ) internal {
        console.log("_postRelayedCallInternal");

        uint256 ethActualCharge = relayHub.calculateCharge(gasUseWithoutPost + gasUsedByPost, relayData);
        console.log("_postRelayedCallInternal ethActualCharge", ethActualCharge);
        uint256 tokenActualCharge = uniswap.getTokenToEthOutputPrice(valueRequested + ethActualCharge);
        console.log("_postRelayedCallInternal tokenActualCharge", tokenActualCharge);
        uint256 tokenRefund = tokenPrecharge - tokenActualCharge;
        console.log("_postRelayedCallInternal tokenRefund", tokenRefund);
        _refundPayer(payer, token, tokenRefund);
        console.log("_postRelayedCallInternal after _refundPayer");
        _depositProceedsToHub(ethActualCharge, uniswap);
        console.log("_postRelayedCallInternal after _depositProceedsToHub");
        emit TokensCharged(gasUseWithoutPost, gasUsedByPost, ethActualCharge, tokenActualCharge);
    }

    function _refundPayer(
        address payer,
        IERC20 token,
        uint256 tokenRefund
    ) private {
        require(token.transfer(payer, tokenRefund), "failed refund");
    }

    function _depositProceedsToHub(uint256 ethActualCharge, IUniswapV3 uniswap) private {
        //solhint-disable-next-line
        uniswap.tokenToEthSwapOutput(ethActualCharge, type(uint256).max, block.timestamp+60*15);
        console.log("_depositProceedsToHub after tokenToEthSwapOut");
        console.log("_depositProceedsToHub before relayHub.depositFor", ethActualCharge, address(this));
        console.log("_depositProceedsToHub before relayHub.depositFor balance", address(this).balance);

        relayHub.depositFor{value:ethActualCharge}(address(this));
        console.log("_depositProceedsToHub after relayHub.depositFor");
    }

    event TokensCharged(uint256 gasUseWithoutPost, uint256 gasJustPost, uint256 ethActualCharge, uint256 tokenActualCharge);
}
