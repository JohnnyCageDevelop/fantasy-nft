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
