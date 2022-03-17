// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Types.sol";
import "./FantasyUtils.sol";
import "./modules/RaceModule.sol";
import "hardhat/console.sol";

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
    mapping(uint256 => PendingCharacter) pendingCharacterByRequestId;
    mapping(uint256 => uint256) public requestIdByTokenId;
    uint256 public tokenCounter;

    RaceModuleRegistry raceModuleRegistry;

    VRFCoordinatorV2Interface COORDINATOR;
    bytes32 keyHash;
    uint32 callbackGasLimit = 1000000;
    uint16 requestConfirmations = 3;
    uint64 subscriptionId;

    event RaceModuleAdded(address indexed module, address indexed addedBy);
    event RaceModuleRemoved(address indexed module, address indexed removedBy);
    event RaceModuleUpdated(address indexed module, address indexed updatedBy);
    event CharacterGenerationStarted(
        uint256 indexed tokenId,
        address indexed startedBy
    );

    error InexistentCharacter(uint256 tokenId);

    constructor(
        address payable _artist,
        uint256 _artistFee,
        address _vrfCoordinator,
        bytes32 _keyHash,
        uint64 _subscriptionId
    ) VRFConsumerBaseV2(_vrfCoordinator) ERC721("Fantasy", "FAY") {
        COORDINATOR = VRFCoordinatorV2Interface(_vrfCoordinator);
        artist = _artist;
        artistFee = _artistFee;
        keyHash = _keyHash;
        subscriptionId = _subscriptionId;
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

    function createCharacter() external payable {
        require(msg.value == artistFee, "incorrect artistFee");
        uint256 newTokenId = tokenCounter;
        tokenCounter++;
        uint256 requestId = COORDINATOR.requestRandomWords(
            keyHash,
            subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            10
        );
        requestIdByTokenId[newTokenId] = requestId;
        pendingCharacterByRequestId[requestId] = PendingCharacter({
            tokenId: newTokenId,
            owner: msg.sender,
            isPending: true
        });
        (bool sent, ) = artist.call{value: artistFee}("");
        require(sent, "failed to send fee to the artist");
        emit CharacterGenerationStarted(newTokenId, msg.sender);
    }

    function isPendingCharacter(uint256 tokenId) public view returns (bool) {
        uint256 requestId = requestIdByTokenId[tokenId];
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
        if (!_exists(tokenId)) {
            revert InexistentCharacter({tokenId: tokenId});
        }
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

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords)
        internal
        override
    {
        PendingCharacter storage pendingCharacter = pendingCharacterByRequestId[
            requestId
        ];
        // TODO Isnt it said by chainlink that this function must not fail ?
        require(
            pendingCharacter.owner != address(0),
            "Token is not being created"
        );

        RaceModule raceModule = raceModuleRegistry.choose(randomWords[0]);
        Gender gender = Gender(randomWords[1] % 2);

        Stats memory stats = Stats({
            strength: generateStat(
                randomWords[2],
                raceModule.getStrengthBonus()
            ),
            endurance: generateStat(
                randomWords[3],
                raceModule.getEnduranceBonus()
            ),
            dexterity: generateStat(
                randomWords[4],
                raceModule.getDexterityBonus()
            ),
            intellect: generateStat(
                randomWords[5],
                raceModule.getIntellectBonus()
            ),
            mind: generateStat(randomWords[6], raceModule.getMindBonus())
        });

        Character memory character = Character({
            firstName: raceModule.chooseFirstName(gender, randomWords[7]),
            lastName: raceModule.chooseLastName(randomWords[8]),
            race: raceModule.getRaceName(),
            level: 1,
            stats: stats,
            characterClass: CharacterClass(randomWords[9] % 2),
            gender: gender
        });

        characters[pendingCharacter.tokenId] = character;
        _safeMint(pendingCharacter.owner, pendingCharacter.tokenId);

        delete pendingCharacterByRequestId[requestId];
    }

        function generateStat(uint256 randomness, uint256 bonus)
        internal
        pure
        returns (uint256)
    {
        return (randomness % 16) + 3 + bonus;
    }

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
