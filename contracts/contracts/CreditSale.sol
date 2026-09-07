// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title xmail Credit Sale
/// @notice Takes payment for credits and binds it to an xmail account.
/// @dev The whole reason this is a contract rather than a plain transfer to a
///      treasury address: a bare transfer says only "someone paid". Credits have
///      to land in a specific mailbox, and the payer's EVM address is not the
///      buyer's xmail identity -- that is a Solana wallet. So the payment must
///      carry the account it is for.
///
///      `accountHash` is keccak256 over the buyer's Solana address as a UTF-8
///      string. A hash rather than the raw address because it is cheaper, and
///      because the chain has no need to publish who is topping up which
///      mailbox: the buyer knows their own address and can prove the match, and
///      nobody else learns anything from the hash alone.
///
///      Without this binding the flow would be "pay, then tell the server your
///      transaction hash", and anyone watching the chain could quote a stranger's
///      transaction and take their credits.
contract CreditSale {
    /// @notice Where funds go. Immutable: a sale contract that can redirect
    ///         payments after the fact is a rug waiting to happen.
    address public immutable treasury;

    /// @notice Minimum accepted payment, so dust cannot spam the event log.
    uint256 public constant MIN_PAYMENT = 1e12; // 0.000001 ETH

    event CreditsPurchased(
        address indexed payer,
        bytes32 indexed accountHash,
        uint256 amountWei,
        uint64 timestamp
    );

    error NoPayment();
    error BelowMinimum(uint256 sent, uint256 minimum);
    error EmptyAccount();
    error TreasuryTransferFailed();

    constructor(address treasury_) {
        require(treasury_ != address(0), "treasury required");
        treasury = treasury_;
    }

    /// @notice Pay for credits against an xmail account.
    /// @param accountHash keccak256(bytes(solanaAddress)) of the mailbox to credit.
    function buy(bytes32 accountHash) external payable {
        if (msg.value == 0) revert NoPayment();
        if (msg.value < MIN_PAYMENT) revert BelowMinimum(msg.value, MIN_PAYMENT);
        if (accountHash == bytes32(0)) revert EmptyAccount();

        // Event before transfer. The contract holds no balance and no mutable
        // state, so there is nothing for a malicious treasury to reenter into --
        // but emitting first keeps the ordering correct by construction rather
        // than by argument, and costs nothing.
        emit CreditsPurchased(msg.sender, accountHash, msg.value, uint64(block.timestamp));

        // Forwarded immediately rather than pooled. A contract that accumulates
        // funds is a contract that needs a withdrawal function, an owner, and an
        // access-control story; forwarding removes all three.
        (bool ok, ) = treasury.call{value: msg.value}("");
        if (!ok) revert TreasuryTransferFailed();
    }

    /// @notice Reject bare transfers, which carry no account and cannot be credited.
    receive() external payable {
        revert EmptyAccount();
    }
}
