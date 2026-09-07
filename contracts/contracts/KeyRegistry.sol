// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title xmail Key Registry
/// @notice Binds an RSA-OAEP public key (SPKI DER) to the address that registered it.
/// @dev The security property that matters: `msg.sender` is the only key that can ever
///      write `_keys[msg.sender]`. There is no owner, no admin, no privileged writer.
///      This makes the key-substitution attack structurally impossible rather than
///      merely disallowed by policy -- which is what a database ACL can only ever be.
contract KeyRegistry {
    struct KeyRecord {
        bytes publicKey; // SPKI DER, as produced by WebCrypto exportKey("spki", ...)
        uint64 updatedAt;
        uint32 version; // increments on every rotation; 0 means never registered
    }

    mapping(address => KeyRecord) private _keys;

    /// @notice Emitted on first registration and on every rotation.
    event KeyRegistered(
        address indexed owner,
        bytes32 indexed publicKeyHash,
        uint32 version,
        uint64 timestamp,
        bytes publicKey
    );

    error EmptyKey();
    error KeyTooLarge(uint256 length);

    /// @dev RSA-2048 SPKI is 294 bytes. The ceiling leaves room for RSA-4096
    ///      without allowing unbounded storage growth.
    uint256 public constant MAX_KEY_BYTES = 1024;

    /// @notice Register or rotate the caller's public key.
    function registerKey(bytes calldata publicKey) external {
        if (publicKey.length == 0) revert EmptyKey();
        if (publicKey.length > MAX_KEY_BYTES) revert KeyTooLarge(publicKey.length);

        KeyRecord storage record = _keys[msg.sender];
        record.publicKey = publicKey;
        record.updatedAt = uint64(block.timestamp);
        unchecked {
            record.version += 1;
        }

        emit KeyRegistered(
            msg.sender,
            keccak256(publicKey),
            record.version,
            record.updatedAt,
            publicKey
        );
    }

    /// @notice Read a registered key. `version == 0` means the address never registered.
    function keyOf(address owner)
        external
        view
        returns (bytes memory publicKey, uint64 updatedAt, uint32 version)
    {
        KeyRecord storage record = _keys[owner];
        return (record.publicKey, record.updatedAt, record.version);
    }

    function hasKey(address owner) external view returns (bool) {
        return _keys[owner].version != 0;
    }

    /// @notice Batch read, so a client can resolve a whole contact list in one eth_call.
    function keysOf(address[] calldata owners)
        external
        view
        returns (bytes[] memory publicKeys, uint32[] memory versions)
    {
        publicKeys = new bytes[](owners.length);
        versions = new uint32[](owners.length);
        for (uint256 i = 0; i < owners.length; ++i) {
            KeyRecord storage record = _keys[owners[i]];
            publicKeys[i] = record.publicKey;
            versions[i] = record.version;
        }
    }
}
