// SPDX-License-Identifier: MIT
// An example of a consumer contract that relies on a subscription for funding.
pragma solidity ^0.6.0;

import "@chainlink/contracts/src/v0.6/VRFConsumerBase.sol";
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

contract Fantasy is VRFConsumerBase, ERC721, Ownable {
    using FantasyUtils for RaceModuleRegistry;
    using FantasyUtils for RaceModule;

    uint256 chainlinkFee;

    uint256 public artistFee;
    address payable public artist;

    Character[] characters;
    mapping(bytes32 => PendingCharacter) pendingCharacterByRequestId;
    mapping(uint256 => bytes32) public requestIdByTokenId;
    uint256 public tokenCounter;
    bytes32 keyHash;

    RaceModuleRegistry raceModuleRegistry;

    event RaceModuleSet(address indexed module, address indexed setBy);
    event CharacterGenerationStarted(
        uint256 indexed tokenId,
        address indexed startedBy
    );

    constructor(
        address payable _artist,
        uint256 _artistFee,
        uint256 _chainlinkFee,
        address _vrfCoordinator,
        address _link,
        bytes32 _keyHash
    ) public VRFConsumerBase(_vrfCoordinator, _link) ERC721("Fantasy", "FAY") {
        artist = _artist;
        artistFee = _artistFee;
        chainlinkFee = _chainlinkFee;
        keyHash = _keyHash;
    }

    function setRaceModule(address _module) public onlyOwner {
        RaceModule module = RaceModule(_module);
        raceModuleRegistry.set(module);
        emit RaceModuleSet(_module, owner());
    }

    function createCharacter() external payable returns (uint256 tokenId) {
        require(msg.value == artistFee, "incorrect artistFee");
        uint256 newTokenId = tokenCounter;
        tokenCounter++;
        bytes32 requestId = requestRandomness(keyHash, chainlinkFee);
        requestIdByTokenId[newTokenId] = requestId;
        pendingCharacterByRequestId[requestId] = PendingCharacter({
            tokenId: newTokenId,
            owner: msg.sender,
            isPending: true
        });
        // Send artistFee to owner
        artist.transfer(artistFee);
        emit CharacterGenerationStarted(newTokenId, msg.sender);
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

    function fulfillRandomness(bytes32 requestId, uint256 randomness)
        internal
        override
    {
        PendingCharacter storage pendingCharacter = pendingCharacterByRequestId[
            requestId
        ];
        require(
            pendingCharacter.owner != address(0),
            "Token is not being created"
        );

        RaceModule raceModule = raceModuleRegistry.choose(randomness);
        Gender gender = Gender(randomness % 2);

        Stats memory stats = Stats({
            strength: ((randomness / 2) % 16) +
                3 +
                raceModule.getStrengthBonus(),
            endurance: ((randomness / 3) % 16) +
                3 +
                raceModule.getEnduranceBonus(),
            dexterity: ((randomness / 4) % 16) +
                3 +
                raceModule.getDexterityBonus(),
            intellect: ((randomness / 5) % 16) +
                3 +
                raceModule.getIntellectBonus(),
            mind: ((randomness / 6) % 16) + 3 + raceModule.getMindBonus()
        });

        Character memory character = Character({
            firstName: raceModule.chooseFirstName(gender, randomness),
            lastName: raceModule.chooseLastName(randomness / 3),
            race: raceModule.getRaceName(),
            level: 1,
            stats: stats,
            characterClass: CharacterClass((randomness / 4) % 2),
            gender: gender
        });

        characters.push(character);
        pendingCharacter.isPending = false;
        _safeMint(pendingCharacter.owner, pendingCharacter.tokenId);
    }

    function getPicture(string memory race, Gender gender, CharacterClass characterClass, uint256 randomness)
        public
        view
        returns (string memory bodyUri, string memory armorUi)
    {
        RaceModule raceModule = raceModuleRegistry.get(race);
        uint256 bodyIndex = randomness % raceModule.getBodyPicturesUrisCount(gender);
        string memory body = raceModule.bodyPicturesUris(gender, bodyIndex);
        uint256 armorIndex = (randomness / 10) % raceModule.getArmorPicturesUrisCount(characterClass, gender);
        string memory armor = raceModule.armorPicturesUris(characterClass, gender, armorIndex);
        return (body, armor);
    }
}
