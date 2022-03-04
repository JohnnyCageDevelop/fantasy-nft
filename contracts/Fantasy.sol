// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Types.sol";
import "./FantasyUtils.sol";
import "./modules/RaceModule.sol";

struct PendingCharacter {
    uint256 tokenId;
    address owner;
    bool isPending;
}

contract Fantasy is VRFConsumerBaseV2, ERC721, Ownable {
    using FantasyUtils for RaceModuleRegistry;
    using FantasyUtils for RaceModule;

    uint256 public artistFee;
    address payable public artist;

    mapping(uint256 => Character) characters;
    mapping(bytes32 => PendingCharacter) pendingCharacterByRequestId;
    mapping(uint256 => bytes32) public requestIdByTokenId;
    uint256 public tokenCounter;

    RaceModuleRegistry raceModuleRegistry;

    VRFCoordinatorV2Interface COORDINATOR;
    bytes32 keyHash;
    uint32 callbackGasLimit = 100000;
    uint16 requestConfirmations = 3;

    event RaceModuleAdded(address indexed module, address indexed addedBy);
    event RaceModuleRemoved(address indexed module, address indexed removedBy);
    event RaceModuleUpdated(address indexed module, address indexed updatedBy);
    event CharacterGenerationStarted(
        uint256 indexed tokenId,
        address indexed startedBy
    );

    constructor(
        address payable _artist,
        uint256 _artistFee,
        address _vrfCoordinator,
        bytes32 _keyHash
    ) VRFConsumerBaseV2(_vrfCoordinator) ERC721("Fantasy", "FAY") {
        artist = _artist;
        artistFee = _artistFee;
        keyHash = _keyHash;
    }

    function addRaceModule(address _module) public onlyOwner {
        RaceModule module = RaceModule(_module);
        raceModuleRegistry.add(module);
        emit RaceModuleAdded(_module, msg.sender);
    }

    function removeRaceModule(string memory race) public onlyOwner {
        RaceModule module = raceModuleRegistry.remove(race);
        emit RaceModuleRemoved(address(module), msg.sender);
    }

    function updateRaceModule(address _module) public onlyOwner {
        RaceModule module = RaceModule(_module);
        raceModuleRegistry.update(module);
        emit RaceModuleUpdated(address(module), msg.sender);
    }

    function getRaceModulesCount() public view returns (uint256) {
        return raceModuleRegistry.raceModules.length;
    }

    function getRaceModuleAddress(string memory race)
        public
        view
        returns (address)
    {
        return address(raceModuleRegistry.get(race));
    }

    function createCharacter() external payable returns (uint256 tokenId) {
        require(msg.value == artistFee, "incorrect artistFee");
        uint256 newTokenId = tokenCounter;
        tokenCounter++;
        // TODO: Update to vrfv2
        // bytes32 requestId = requestRandomness(keyHash, chainlinkFee);
        // requestIdByTokenId[newTokenId] = requestId;
        // pendingCharacterByRequestId[requestId] = PendingCharacter({
        //     tokenId: newTokenId,
        //     owner: msg.sender,
        //     isPending: true
        // });
        // (bool sent, ) = artist.call{value: artistFee}("");
        // require(sent, "failed to send fee to the artist");
        // emit CharacterGenerationStarted(newTokenId, msg.sender);
        return newTokenId;
    }

    function isPendingCharacter(uint256 tokenId) public view returns (bool) {
        bytes32 requestId = requestIdByTokenId[tokenId];
        return pendingCharacterByRequestId[requestId].isPending;
    }

    function getCharacterOverview(uint256 tokenId)
        public
        view
        returns (
            string memory firstName,
            string memory lastName,
            string memory race,
            CharacterClass characterClass,
            uint256 level,
            Gender gender
        )
    {
        require(_exists(tokenId), "Character does not exist");
        Character memory character = characters[tokenId];
        return (
            character.firstName,
            character.lastName,
            character.race,
            character.characterClass,
            character.level,
            character.gender
        );
    }

    function getCharacterStats(uint256 tokenId)
        public
        view
        returns (
            uint256 strength,
            uint256 endurance,
            uint256 dexterity,
            uint256 intellect,
            uint256 mind
        )
    {
        require(_exists(tokenId), "Character does not exist");
        Character memory character = characters[tokenId];
        return (
            character.stats.strength,
            character.stats.endurance,
            character.stats.dexterity,
            character.stats.intellect,
            character.stats.mind
        );
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override
    {
        // TODO: See below
    }

    // function fulfillRandomness(bytes32 requestId, uint256 randomness)
    //     internal
    //     override
    // {
    //     PendingCharacter storage pendingCharacter = pendingCharacterByRequestId[
    //         requestId
    //     ];
    //     // TODO Isnt it said by chainlink that this function must not fail ?
    //     require(
    //         pendingCharacter.owner != address(0),
    //         "Token is not being created"
    //     );

    //     RaceModule raceModule = raceModuleRegistry.choose(randomness);
    //     Gender gender = Gender(randomness % 2);

    //     Stats memory stats = Stats({
    //         strength: ((randomness / 2) % 16) +
    //             3 +
    //             raceModule.getStrengthBonus(),
    //         endurance: ((randomness / 3) % 16) +
    //             3 +
    //             raceModule.getEnduranceBonus(),
    //         dexterity: ((randomness / 4) % 16) +
    //             3 +
    //             raceModule.getDexterityBonus(),
    //         intellect: ((randomness / 5) % 16) +
    //             3 +
    //             raceModule.getIntellectBonus(),
    //         mind: ((randomness / 6) % 16) + 3 + raceModule.getMindBonus()
    //     });

    //     Character memory character = Character({
    //         firstName: raceModule.chooseFirstName(gender, randomness),
    //         lastName: raceModule.chooseLastName(randomness / 3),
    //         race: raceModule.getRaceName(),
    //         level: 1,
    //         stats: stats,
    //         characterClass: CharacterClass((randomness / 4) % 2),
    //         gender: gender
    //     });

    //     characters[pendingCharacter.tokenId] = character;
    //     _safeMint(pendingCharacter.owner, pendingCharacter.tokenId);
    //     delete pendingCharacterByRequestId[requestId];
    // }

    function getPicture(
        string memory race,
        Gender gender,
        CharacterClass characterClass,
        uint256 randomness
    ) public view returns (string memory bodyUri, string memory armorUi) {
        RaceModule raceModule = raceModuleRegistry.get(race);
        uint256 bodyIndex = randomness %
            raceModule.getBodyPicturesUrisCount(gender);
        string memory body = raceModule.bodyPicturesUris(gender, bodyIndex);
        uint256 armorIndex = (randomness / 10) %
            raceModule.getArmorPicturesUrisCount(characterClass, gender);
        string memory armor = raceModule.armorPicturesUris(
            characterClass,
            gender,
            armorIndex
        );
        return (body, armor);
    }
}
