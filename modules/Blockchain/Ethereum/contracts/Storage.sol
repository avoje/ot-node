pragma solidity ^0.4.25;

import {ERC20} from './TracToken.sol';
import {Hub} from "./Hub.sol";

contract Storage {
	Hub public hub;
	
	constructor(address hubAddress) public{
        require(hubAddress != address(0));
		hub = Hub(hubAddress);
	}

	function setHubAddress(address newHubAddress) public onlyContracts {
        require(newHubAddress != address(0));
		hub = Hub(newHubAddress);
	}

	modifier onlyContracts() {
		require(hub.isContract(msg.sender),
		"Function can only be called by contracts!");
		_;
	}

	mapping(bytes32 => mapping (bytes32 => mapping (bytes32 => bytes32))) public data; // storage[category][identifier][field];
	
	function getParameter(bytes32 categoryKey, bytes32 identifierKey, bytes32 parameterKey)
	public view returns (bytes32) {
		return data[keccak256(abi.encodePacked(categoryKey))][identifierKey][keccak256(abi.encodePacked(parameterKey))];
	}

	function getParameterArray(bytes32 categoryKey, bytes32 identifierKey, bytes32[] parameterKeyArray)
	public view returns (bytes32[]) {
		bytes32[] memory parameterValueArray = new bytes32[](parameterKeyArray.length);

		for(uint256 i = 0; i < parameterKeyArray.length; i += 1) {
			parameterValueArray[i] = data[categoryKey][identifierKey][parameterKeyArray[i]];
		}
	}
	
	
    function setParameter(bytes32 categoryKey, bytes32 identifierKey, bytes32 parameterKey, bytes32 parameterValue)
	public {
		data[keccak256(abi.encodePacked(categoryKey))][identifierKey][keccak256(abi.encodePacked(parameterKey))] = parameterValue;
	}

    function transferTokens(address wallet, uint256 amount)
    public onlyContracts {
        ERC20 token = ERC20(hub.tokenAddress());
        token.transfer(wallet, amount);
    }
}


