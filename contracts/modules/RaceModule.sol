// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


import "../Types.sol";

abstract contract RaceModule {
    mapping(Gender => string[]) public firstNames;
    string[] public lastNames;
    mapping(Gender => string[]) public bodyPicturesUris;
    mapping(CharacterClass => mapping(Gender => string[])) public armorPicturesUris;

    constructor() {
        firstNames[Gender.Male] = getFirstNames(Gender.Male);
        firstNames[Gender.Female] = getFirstNames(Gender.Female);
        lastNames = getLastNames();
    }

    function getFirstNamesCount(Gender gender) public view returns (uint256) {
        return firstNames[gender].length;
    }

    function getLastNamesCount() public view returns (uint256) {
        return lastNames.length;
    }

    function getBodyPicturesUrisCount(Gender gender) public view returns(uint256) {
        return bodyPicturesUris[gender].length;
    }

    function getArmorPicturesUrisCount(CharacterClass characterClass, Gender gender) public view returns(uint256) {
        return armorPicturesUris[characterClass][gender].length;
    }

    function getRaceName() external pure virtual returns (string memory);

    function getFirstNames(Gender gender)
        internal
        view
        virtual
        returns (string[] memory);

    function getBodyPicturesUris(Gender gender)
        internal
        view
        virtual
        returns (string[] memory);

    function getArmorPicturesUris(Gender gender, CharacterClass characterClass)
        internal
        view
        virtual
        returns (string[] memory);

    function getLastNames() internal pure virtual returns (string[] memory);

    function getStrengthBonus() public pure virtual returns(uint256) {
        return 0;
    }
    function getEnduranceBonus() public pure virtual returns(uint256) {
        return 0;
    }
    function getDexterityBonus() public pure virtual returns(uint256) {
        return 0;
    }
    function getIntellectBonus() public pure virtual returns(uint256) {
        return 0;
    }
    function getMindBonus() public pure virtual returns(uint256) {
        return 0;
    }
}
