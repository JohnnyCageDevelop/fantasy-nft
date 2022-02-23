// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "./Types.sol";
import "./modules/RaceModule.sol";

library FantasyUtils {

    function chooseFirstName(RaceModule module, Gender gender, uint256 randomness) external view returns(string memory) {
        return module.firstNames(gender, randomness % module.getFirstNamesCount(gender));
    }

    function chooseLastName(RaceModule module, uint256 randomness) external view returns(string memory) {
        return module.lastNames(randomness % module.getLastNamesCount());
    }

    function get(mapping(uint8 => string[]) storage dict, Gender gender) external view returns(string[] storage) {
        return dict[uint8(gender)];
    }

    function set(RaceModuleRegistry storage registry, RaceModule module) external {
        IndexRef memory index = registry.indexByRace[module.getRaceName()];
        if (index.present) {
            registry.raceModules[index.value] = module;
        } else {
            registry.raceModules.push(module);
            registry.indexByRace[module.getRaceName()] = IndexRef({value:  registry.raceModules.length - 1, present: true});
        }
    }

    function get(RaceModuleRegistry storage registry, string calldata race) external view returns (RaceModule) {
        IndexRef memory index = registry.indexByRace[race];
        require(index.present, "unknown race");
        return registry.raceModules[index.value];
    }

    function choose(RaceModuleRegistry storage registry, uint256 randomness) external view returns(RaceModule module) {
        return registry.raceModules[randomness % registry.raceModules.length];
    }
}