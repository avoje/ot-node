pragma solidity ^0.4.24;

import './Hub.sol';

contract DictionaryStorage {
    Hub public hub;
    
    constructor(address hubAddress) public{
        hub = Hub(hubAddress);
    }

    modifier onlyContracts() {
        require(hub.isContract(msg.sender),
        "Function can only be called by contracts!");
        _;
    }

    uint256 public difficultyOverride;
    function getDifficultyOverride()
    public view returns (uint256) {
        return difficultyOverride;
    }
    function setDifficultyOverride(uint256 new_difficulty)
    public onlyContracts {
        difficultyOverride = new_difficulty;
    }

    mapping(bytes32 => bytes32) public fingerprint;

    function setFingerprint(bytes32 dataSetId, bytes32 dataRootHash)
    public onlyContracts {
        fingerprint[dataSetId] = dataRootHash;
    }

    struct OfferDefinition {
        address creator;
        bytes32 dataSetId;

        uint256 holdingTimeInMinutes;
        uint256 tokenAmountPerHolder;
        uint256 litigationIntervalInMinutes;

        bytes32 task;
        uint256 difficulty;

        bytes32 redLitigationHash;
        bytes32 greenLitigationHash;
        bytes32 blueLitigationHash;

        uint256 startTime;
    }
    mapping(bytes32 => mapping (bytes32 => bytes32)) public offer; // offer[offerId][parameterName];

    function getOfferParameter (bytes32 offerId, string parameterName) 
    public view returns(bytes32 result){
        return offer[offerId][keccak256(abi.encodePacked(parameterName))];
    }
    function setOfferParameter (bytes32 offerId, string parameterName, bytes32 value) 
    public onlyContracts {
        offer[offerId][keccak256(abi.encodePacked(parameterName))] = value;
    }

    struct HolderDefinition {
        uint256 stakedAmount;
        uint256 paidAmount;
        uint256 litigationEncryptionType;

        uint256 paymentTimestamp;
    }
    mapping(bytes32 => mapping (address => mapping(bytes32 => bytes32))) public holder; // offer[offerId][parameterName];

    function getHolderParameter (bytes32 offerId, address holderIdentity, string parameterName) 
    public view returns(bytes32 result){
        return holder[offerId][holderIdentity][keccak256(abi.encodePacked(parameterName))];
    }
    function setHolderParameter (bytes32 offerId, address holderIdentity, string parameterName, bytes32 value) 
    public onlyContracts {
        holder[offerId][holderIdentity][keccak256(abi.encodePacked(parameterName))] = value;
    }
}
