// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "./modules/RaceModule.sol";

enum CharacterClass {
    Mage,
    Barbarian
}

enum Gender {
    Male,
    Female
}

struct Stats {
    uint256 strength;
    uint256 endurance;
    uint256 dexterity;
    uint256 intellect;
    uint256 mind;
}

struct Character {
    string firstName;
    string lastName;
    uint256 level;
    string race;
    CharacterClass characterClass;
    Stats stats;
    Gender gender;
}

struct IndexRef {
    uint256 value;
    bool present;
}

struct RaceModuleRegistry {
    RaceModule[] raceModules;
    mapping(string => IndexRef) indexByRace;
}

struct Dungeon {
    address creator;
    uint256 treasure;
    AdventuringParty adventuringParty;
}

struct AdventuringParty {
    address owner;
    uint256[] tokenIds;
    uint256 chanceToSucceed;
}

struct DungeonReward {
    uint256[] tokenIds;
    uint256 treasure;
}