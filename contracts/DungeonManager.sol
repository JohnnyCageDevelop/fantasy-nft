// SPDX-License-Identifier: MIT
// An example of a consumer contract that relies on a subscription for funding.
pragma solidity ^0.6.0;

import "@chainlink/contracts/src/v0.6/VRFConsumerBase.sol";
import "./Fantasy.sol";
import "./Types.sol";
import "./FantasyUtils.sol";

// TODO: safeguard mechanism so that if VRF coord doesnt respond after x time (e.g 1 day), everyone can get their tokens and eth back
contract DungeonManager is VRFConsumerBase {
    using FantasyUtils for Dungeon;
    using FantasyUtils for DungeonReward[];
    using FantasyUtils for int256;

    mapping(address => Dungeon) dungeons;
    mapping(bytes32 => Dungeon) requestIdToDungeon;
    mapping(address => DungeonReward[]) claimableRewards;

    Fantasy fantasy;
    uint256 chainlinkFee;
    bytes32 keyHash;

    uint256 constant maxSuccessChancePerc = 99;
    int256 constant baseSuccessChancePerc = 50;

    event DungeonCreated(address indexed creator, uint256 treasure);
    event DungeonRetired(address indexed creator, uint256 treasure);
    event DungeonEntered(
        address indexed dungeonCreator,
        address indexed partyOwner,
        uint256[] tokenIds
    );
    event DungeonRaidSuccess(
        address indexed dungeonCreator,
        address indexed partyOwner,
        uint256[] tokenIds,
        uint256 roll
    );
    event DungeonRaidFailure(
        address indexed dungeonCreator,
        address indexed partyOwner,
        uint256[] tokenIds,
        uint256 roll
    );

    constructor(
        address _fantasy,
        uint256 _chainlinkFee,
        address _vrfCoordinator,
        address _link,
        bytes32 _keyHash
    ) public VRFConsumerBase(_vrfCoordinator, _link) {
        fantasy = Fantasy(_fantasy);
        chainlinkFee = _chainlinkFee;
        keyHash = _keyHash;
    }

    function createDungeon() public payable {
        require(
            dungeons[msg.sender].creator == address(0),
            "dungeon already exists"
        );
        require(msg.value > 0, "at least 1 WEI must be sent as treasure");

        dungeons[msg.sender] = Dungeon({
            creator: msg.sender,
            treasure: msg.value,
            partyInTheDungeon: getEmptyAdventuringParty()
        });

        emit DungeonCreated(msg.sender, msg.value);
    }

    function getEmptyAdventuringParty()
        internal
        pure
        returns (AdventuringParty memory)
    {
        uint256[] memory tokenIds = new uint256[](0);
        return
            AdventuringParty({
                owner: address(0),
                tokenIds: tokenIds,
                chanceToSucceed: 0
            });
    }

    function retireDungeon() public {
        require(
            dungeons[msg.sender].creator == msg.sender,
            "there is no dungeon belonging to this address"
        );
        require(
            !dungeons[msg.sender].isPartyInside(),
            "there is currently a party inside this dungeon"
        );

        uint256 treasure = dungeons[msg.sender].treasure;
        delete dungeons[msg.sender];

        (bool sent, ) = msg.sender.call{value: treasure}("");
        require(sent, "failed to send treasure to creator");

        emit DungeonRetired(msg.sender, treasure);
    }

    // TODO method for cancelling a dungeon and get back the staked ETH
    function enterDungeon(address dungeonCreator, uint256[] memory tokenIds)
        public
    {
        // TODO need to check that a smart contract cannot create a dungeon unless it implements IERC721Receiver, same for an address entering a dungeon
        // else, it cannot receive the tokens if the dungeon wins.
        // TODO: Can someone do an attack by sending huge array or something ? I remember something about gas attacks. Wouldnt the transaction just
        // fail by running out of gas ?
        require(
            fantasy.isApprovedForAll(msg.sender, address(this)),
            "approval needed"
        );
        Dungeon storage dungeon = dungeons[dungeonCreator];
        require(
            !dungeon.isPartyInside(),
            "some adventurers are already in this dungeon"
        );

        // Calculate upfront to avoid dungeon potentially being locked by out of gas when the randomness resolves;
        uint256 chanceToSucceed = getAventurersChanceToSucceed(
            tokenIds,
            dungeon.treasure
        );
        require(chanceToSucceed > 0, "your party has no chance to succeed");

        dungeon.partyInTheDungeon = AdventuringParty({
            owner: msg.sender,
            tokenIds: tokenIds,
            chanceToSucceed: chanceToSucceed
        });

        for (uint256 i = 0; i < tokenIds.length; i++) {
            fantasy.safeTransferFrom(msg.sender, address(this), tokenIds[i]);
        }
        bytes32 requestId = requestRandomness(keyHash, chainlinkFee);
        requestIdToDungeon[requestId] = dungeon;

        emit DungeonEntered(dungeonCreator, msg.sender, tokenIds);
    }

    function fulfillRandomness(bytes32 requestId, uint256 randomness)
        internal
        override
    {
        Dungeon storage dungeon = requestIdToDungeon[requestId];
        // TODO Isnt it said by chainlink that this function must not fail ?
        require(
            dungeon.isPartyInside(),
            "dungeon does not have a party inside"
        );

        uint256 roll = (randomness % 100) + 1;
        if (roll <= dungeon.partyInTheDungeon.chanceToSucceed) {
            // success, transfer ETH to party owner and send back his/her tokens and remove dungeon
            claimableRewards[dungeon.partyInTheDungeon.owner].push(
                DungeonReward({
                    tokenIds: dungeon.partyInTheDungeon.tokenIds,
                    treasure: dungeon.treasure
                })
            );
            // TODO: increase tokens exp based on how their chance of success
            delete dungeons[dungeon.creator];
            delete requestIdToDungeon[requestId];

            // TODO: Are values still good after the delete ?
            emit DungeonRaidSuccess(
                dungeon.creator,
                dungeon.partyInTheDungeon.owner,
                dungeon.partyInTheDungeon.tokenIds,
                roll
            );
        } else {
            claimableRewards[dungeon.creator].push(
                DungeonReward({
                    tokenIds: dungeon.partyInTheDungeon.tokenIds,
                    treasure: 0 // treasure stays in the dungeon
                })
            );
            delete dungeon.partyInTheDungeon;

            // TODO: Are values still good after the delete ?
            emit DungeonRaidFailure(
                dungeon.creator,
                dungeon.partyInTheDungeon.owner,
                dungeon.partyInTheDungeon.tokenIds,
                roll
            );
        }
    }

    function withdrawReward(uint256 rewardsIndex) public {
        DungeonReward memory reward = claimableRewards[msg.sender][
            rewardsIndex
        ];
        claimableRewards[msg.sender].remove(rewardsIndex);
        // TODO: Can this be locked by an out of gas ?
        for (uint256 i = 0; i < reward.tokenIds.length; i++) {
            fantasy.safeTransferFrom(
                address(this),
                msg.sender,
                reward.tokenIds[i]
            );
        }
        (bool sent, ) = msg.sender.call{value: reward.treasure}("");
        require(sent, "failed to send eth");
    }

    /// @dev this function can run out gas. Always call it upfront to avoid dungeons being locked by an out of gas.
    function getAventurersChanceToSucceed(
        uint256[] memory tokenIds,
        uint256 treasure
    ) public view returns (uint256) {
        // TODO: Take stats into account ?
        int256 totalLevels = 0;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            // TODO use smaller value to ensure that it cannot have overflow or account for it somehow
            (, , , , uint256 level, ) = fantasy.getCharacterOverview(
                tokenIds[i]
            );
            totalLevels += int256(level);
        }
        // TODO: Test for math operations safety, especially conversions!
        int256 treasureDifficulty = int256(treasure / 1 ether);
        uint256 successChance = uint256(
            (baseSuccessChancePerc - treasureDifficulty + totalLevels)
                .zeroIfNegative()
        );
        return
            successChance <= maxSuccessChancePerc
                ? successChance
                : maxSuccessChancePerc;
    }
}
