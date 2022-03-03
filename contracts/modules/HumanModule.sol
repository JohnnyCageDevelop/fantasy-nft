// SPDX-License-Identifier: MIT

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

    function getBodyPicturesUris(Gender gender)
        internal
        view
        override
        returns (string[] memory)
    {
        string[] memory arr = new string[](2);
        if (gender == Gender.Male) {
            arr[0] = "muscular_human_male";
            arr[1] = "slim_human_male";
        } else {
            arr[0] = "muscular_human_female";
            arr[1] = "slim_human_female";
        }
    }

    function getArmorPicturesUris(Gender gender, CharacterClass characterClass)
        internal
        view
        override
        returns (string[] memory)
    {
        string[] memory arr = new string[](2);
        if (gender == Gender.Male) {
            if (characterClass == CharacterClass.Barbarian) {
                arr[0] = "fur_human_male";
                arr[1] = "leather_human_male";
            } else if (characterClass == CharacterClass.Mage) {
                arr[0] = "robe_human_male";
                arr[1] = "cloth_human_male";
            }
        } else {
            if (characterClass == CharacterClass.Barbarian) {
                arr[0] = "fur_human_female";
                arr[1] = "leather_human_female";
            } else if (characterClass == CharacterClass.Mage) {
                arr[0] = "robe_human_female";
                arr[1] = "cloth_human_female";
            }
        }
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
