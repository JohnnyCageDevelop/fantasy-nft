// SPDX-License-Identifier: MIT
// An example of a consumer contract that relies on a subscription for funding.
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import "./RaceModule.sol";
import "../Types.sol";
import "../FantasyUtils.sol";

contract HumanModule is RaceModule {
    function getRaceName() external pure override returns (string memory) {
        return "Human";
    }

    function getFirstNames(Gender gender)
        internal
        view
        override
        returns (string[] memory)
    {
        string[] memory arr = new string[](3);
        if (gender == Gender.Male) {
            arr[0] = "John";
            arr[1] = "Goerge";
            arr[2] = "Marcel";
        } else {
            arr[0] = "Sarah";
            arr[1] = "Laura";
            arr[2] = "Ana";
        }
        return arr;
    }

    function getLastNames() internal view override returns (string[] memory) {
        string[] memory arr = new string[](3);
        arr[0] = "Taylor";
        arr[1] = "Smith";
        arr[2] = "McSword";
        return arr;
    }

    function getStrengthBonus() public pure override returns (uint256) {
        return 1;
    }

    function getEnduranceBonus() public pure override returns (uint256) {
        return 1;
    }

    function getDexterityBonus() public pure override returns (uint256) {
        return 1;
    }

    function getIntellectBonus() public pure override returns (uint256) {
        return 1;
    }

    function getMindBonus() public pure override returns (uint256) {
        return 1;
    }
}
