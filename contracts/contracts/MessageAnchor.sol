// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title xmail Message Anchor
/// @notice Records a tamper-evident commitment to an encrypted message.
/// @dev Ciphertext stays off-chain. What lands here is keccak256 over the ciphertext
///      plus its participants, so a recipient can recompute the hash locally and prove
///      the stored message is byte-identical to the one the sender committed to, and
///      that it existed no later than the anchoring block.
///
///      Deliberately NOT stored: subject, body, attachments, or anything that would
///      leak content. An anchor reveals only that some message passed between two
///      addresses at a given time -- and even that is the minimum a chain can attest to.
contract MessageAnchor {
    struct Anchor {
        address from;
        uint64 timestamp;
        address to;
        uint64 blockNumber;
    }

    /// @notice messageHash => anchor record.
    mapping(bytes32 => Anchor) private _anchors;

    /// @notice Per-sender count, cheap enough to read for a profile or a stat tile.
    mapping(address => uint256) public sentCount;

    uint256 public totalAnchored;

    event Anchored(
        address indexed from,
        address indexed to,
        bytes32 indexed messageHash,
        uint64 timestamp,
        uint64 blockNumber
    );

    error AlreadyAnchored(bytes32 messageHash);
    error InvalidRecipient();
    error EmptyHash();

    /// @notice Anchor one message commitment.
    /// @param messageHash keccak256(ciphertext || from || to || nonce), computed client-side.
    /// @param to The intended recipient.
    function anchor(bytes32 messageHash, address to) external {
        if (messageHash == bytes32(0)) revert EmptyHash();
        if (to == address(0)) revert InvalidRecipient();
        if (_anchors[messageHash].timestamp != 0) revert AlreadyAnchored(messageHash);

        _anchors[messageHash] = Anchor({
            from: msg.sender,
            timestamp: uint64(block.timestamp),
            to: to,
            blockNumber: uint64(block.number)
        });

        unchecked {
            sentCount[msg.sender] += 1;
            totalAnchored += 1;
        }

        emit Anchored(msg.sender, to, messageHash, uint64(block.timestamp), uint64(block.number));
    }

    /// @notice Anchor several messages in one transaction (e.g. a message to many recipients).
    function anchorBatch(bytes32[] calldata messageHashes, address[] calldata recipients) external {
        uint256 length = messageHashes.length;
        require(length == recipients.length, "length mismatch");
        for (uint256 i = 0; i < length; ++i) {
            bytes32 messageHash = messageHashes[i];
            address to = recipients[i];
            if (messageHash == bytes32(0)) revert EmptyHash();
            if (to == address(0)) revert InvalidRecipient();
            if (_anchors[messageHash].timestamp != 0) revert AlreadyAnchored(messageHash);

            _anchors[messageHash] = Anchor({
                from: msg.sender,
                timestamp: uint64(block.timestamp),
                to: to,
                blockNumber: uint64(block.number)
            });

            emit Anchored(msg.sender, to, messageHash, uint64(block.timestamp), uint64(block.number));
        }
        unchecked {
            sentCount[msg.sender] += length;
            totalAnchored += length;
        }
    }

    /// @notice The verification call the UI makes when a user clicks "verify".
    /// @return verified True if this exact hash was anchored by `expectedFrom` to `expectedTo`.
    function verify(bytes32 messageHash, address expectedFrom, address expectedTo)
        external
        view
        returns (bool verified, uint64 timestamp, uint64 blockNumber)
    {
        Anchor storage record = _anchors[messageHash];
        verified =
            record.timestamp != 0 &&
            record.from == expectedFrom &&
            record.to == expectedTo;
        return (verified, record.timestamp, record.blockNumber);
    }

    function anchorOf(bytes32 messageHash)
        external
        view
        returns (address from, address to, uint64 timestamp, uint64 blockNumber)
    {
        Anchor storage record = _anchors[messageHash];
        return (record.from, record.to, record.timestamp, record.blockNumber);
    }

    function isAnchored(bytes32 messageHash) external view returns (bool) {
        return _anchors[messageHash].timestamp != 0;
    }
}
