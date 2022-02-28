// SPDX-License-Identifier: MIT
// An example of a consumer contract that relies on a subscription for funding.
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import "../modules/RaceModule.sol";
import "../Types.sol";
import "../FantasyUtils.sol";

contract MockHumanModule is RaceModule {
    function getRaceName() external pure override returns (string memory) {
        return "Human";
    }

    function getFirstNames(Gender gender)
        internal
        view
        override
        returns (string[] memory)
    {
        string[] memory arr = new string[](1);
        arr[0] = "mock_first_name";
        return arr;
    }

    function getBodyPicturesUris(Gender gender)
        internal
        view
        override
        returns (string[] memory)
    {
        string[] memory arr = new string[](1);
        arr[0] = "mock_body_pic";
        return arr;
    }

    function getArmorPicturesUris(Gender gender, CharacterClass characterClass)
        internal
        view
        override
        returns (string[] memory)
    {
        string[] memory arr = new string[](1);
        arr[0] = "mock_armor_pic";
        return arr;
    }

    function getLastNames() internal view override returns (string[] memory) {
        string[] memory arr = new string[](1);
        arr[0] = "mock_last_name";
        return arr;
    }
}
