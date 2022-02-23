// SPDX-License-Identifier: MIT
// An example of a consumer contract that relies on a subscription for funding.
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import "./RaceModule.sol";
import "../Types.sol";
import "../FantasyUtils.sol";

contract DwarfModule is RaceModule {
    function getRaceName() external pure override returns (string memory) {
        return "Dwarf";
    }

    function getFirstNames(Gender gender)
        internal
        view
        override
        returns (string[] memory)
    {
        string[] memory arr = new string[](3);
        if (gender == Gender.Male) {
            arr[0] = "Stephalim";
            arr[1] = "Zal'Zahreb";
            arr[2] = "Orbog";
        } else {
            arr[0] = "Hilde";
            arr[1] = "Annika";
            arr[2] = "Ansa";
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
            arr[0] = "muscular_dwarf_male";
            arr[1] = "slim_dwarf_male";
        } else {
            arr[0] = "muscular_dwarf_female";
            arr[1] = "slim_dwarf_female";
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
                arr[0] = "fur_dwarf_male";
                arr[1] = "leather_dwarf_male";
            } else if (characterClass == CharacterClass.Mage) {
                arr[0] = "robe_dwarf_male";
                arr[1] = "cloth_dwarf_male";
            }
        } else {
            if (characterClass == CharacterClass.Barbarian) {
                arr[0] = "fur_dwarf_female";
                arr[1] = "leather_dwarf_female";
            } else if (characterClass == CharacterClass.Mage) {
                arr[0] = "robe_dwarf_female";
                arr[1] = "cloth_dwarf_female";
            }
        }
    }

    function getLastNames() internal view override returns (string[] memory) {
        string[] memory arr = new string[](3);
        arr[0] = "Thunderhammer";
        arr[1] = "Goldhorn";
        arr[2] = "Ironfire";
        return arr;
    }

    function getEnduranceBonus() public pure override returns (uint256) {
        return 2;
    }
}
