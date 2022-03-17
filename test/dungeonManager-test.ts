import { expect } from "chai";
import { BigNumber, BigNumberish, Contract } from "ethers";
import { ethers, waffle } from "hardhat";
import { deployDungeonManager, deployFantasyWithDependencies } from "../scripts/deploy";
import { createTokens, getArtistFee, getEvent, waitForTx } from "../scripts/utils";

// TODO: Only run unit tests in local blockchain
describe("Fantasy", () => {

    it("Attempting to create a dungeon without sending ether should revert", async () => {
        const { fantasy, vrfCoordinatorV2, fantasyUtils } = await deployFantasyWithDependencies(true);
        const dm = await deployDungeonManager({
            fantasyAddress: fantasy.address,
            vrfCoordinatorV2Address: vrfCoordinatorV2.address,
            fantasyUtilsAddress: fantasyUtils.address
        });
        const accounts = await ethers.getSigners();
        const account = accounts[0];
        const dmWithSigner = dm.connect(account);

        await expect(dmWithSigner.createDungeon({ value: 0 })).to.be.revertedWith("at least 1 WEI must be sent as treasure");
        const dungeon = await dm.dungeons(account.address);
        expectDungeonDoesntExist(dungeon);
    });

    it("Should be able to create a dungeon with ether", async () => {
        const { fantasy, vrfCoordinatorV2, fantasyUtils } = await deployFantasyWithDependencies(true);
        const dm = await deployDungeonManager({
            fantasyAddress: fantasy.address,
            vrfCoordinatorV2Address: vrfCoordinatorV2.address,
            fantasyUtilsAddress: fantasyUtils.address
        });
        const accounts = await ethers.getSigners();
        const account = accounts[0];
        const dmWithSigner = dm.connect(account);
        const treasure = ethers.utils.parseEther("1");

        const tx = await dmWithSigner.createDungeon({ value: treasure });
        const receipt = await tx.wait();
        const dungeonCreated = getEvent(receipt.events, "DungeonCreated");

        expect(dungeonCreated.args.creator).to.equal(account.address);
        expect(dungeonCreated.args.treasure).to.equal(treasure);
    });

    it("Reverts if trying to create a dungeon when one already exists", async () => {
        const { fantasy, vrfCoordinatorV2, fantasyUtils } = await deployFantasyWithDependencies(true);
        const dm = await deployDungeonManager({
            fantasyAddress: fantasy.address,
            vrfCoordinatorV2Address: vrfCoordinatorV2.address,
            fantasyUtilsAddress: fantasyUtils.address
        });
        const accounts = await ethers.getSigners();
        const account = accounts[0];
        const dmWithSigner = dm.connect(account);
        const treasure = ethers.utils.parseEther("1");

        const tx = await dmWithSigner.createDungeon({ value: treasure });

        await expect(dmWithSigner.createDungeon({ value: treasure })).to.be.revertedWith("dungeon already exists");
    });

    it("Attempting to retire an inactive dungeon", async () => {
        const { fantasy, vrfCoordinatorV2, fantasyUtils } = await deployFantasyWithDependencies(true);
        const dm = await deployDungeonManager({
            fantasyAddress: fantasy.address,
            vrfCoordinatorV2Address: vrfCoordinatorV2.address,
            fantasyUtilsAddress: fantasyUtils.address
        });
        const accounts = await ethers.getSigners();
        const account = accounts[0];
        const dmWithSigner = dm.connect(account);

        await expect(dmWithSigner.retireDungeon()).to.be.revertedWith("there is no dungeon belonging to this address");
    });

    it("Retiring an active dungeon should retire it", async () => {
        const { fantasy, vrfCoordinatorV2, fantasyUtils } = await deployFantasyWithDependencies(true);
        const dm = await deployDungeonManager({
            fantasyAddress: fantasy.address,
            vrfCoordinatorV2Address: vrfCoordinatorV2.address,
            fantasyUtilsAddress: fantasyUtils.address
        });
        const accounts = await ethers.getSigners();
        const account = accounts[0];
        const dmWithSigner = dm.connect(account);
        const treasure = ethers.utils.parseEther("1");
        (await dmWithSigner.createDungeon({ value: treasure })).wait();
        const balanceBeforeRetiringDungeon = await waffle.provider.getBalance(account.address);

        const tx = await dmWithSigner.retireDungeon();
        const receipt = await tx.wait();

        const dungeonRetired = getEvent(receipt.events, "DungeonRetired");
        expect(dungeonRetired.args.creator).to.equal(account.address);
        expect(dungeonRetired.args.treasure).to.equal(treasure);
        const dmBalance = await waffle.provider.getBalance(dmWithSigner.address);
        expect(dmBalance).to.equal(0);
        const accountBalance = await waffle.provider.getBalance(account.address);
        // TODO better check by computing tx fee ?
        expect(accountBalance.gt(balanceBeforeRetiringDungeon)).to.be.true;

        expectDungeonDoesntExist(dm.dungeons(account.address));
    });

    it("Reverts when attempting to raid a dungeon without tokens", async () => {
        const { fantasy, vrfCoordinatorV2, fantasyUtils } = await deployFantasyWithDependencies(true);
        const dm = await deployDungeonManager({
            fantasyAddress: fantasy.address,
            vrfCoordinatorV2Address: vrfCoordinatorV2.address,
            fantasyUtilsAddress: fantasyUtils.address
        });
        const accounts = await ethers.getSigners();
        const dungeonCreator = accounts[0];
        const partyOwner = accounts[1];
        const dmWithDungeonCreatorSigner = dm.connect(dungeonCreator);
        const treasure = ethers.utils.parseEther("1");
        (await dmWithDungeonCreatorSigner.createDungeon({ value: treasure })).wait();
        const dmWithPartyOwnerSigner = dm.connect(partyOwner);
        const fantasyWithPartyOwnerSigner = fantasy.connect(partyOwner);
        await fantasyWithPartyOwnerSigner.setApprovalForAll(dm.address, true);

        await expect(dmWithPartyOwnerSigner.startDungeonRaid(dungeonCreator.address, [])).to.be.revertedWith("At least 1 token needs to be sent to the dungeon");
    });

    it("Reverts when attempting to raid a dungeon with no chance to succeed", async () => {
        // TODO: Parametize for for tokens_count [1,2]
        const tokensCount = 1;
        const { fantasy, vrfCoordinatorV2, fantasyUtils } = await deployFantasyWithDependencies(true);
        const dm = await deployDungeonManager({
            fantasyAddress: fantasy.address,
            vrfCoordinatorV2Address: vrfCoordinatorV2.address,
            fantasyUtilsAddress: fantasyUtils.address
        });
        const accounts = await ethers.getSigners();
        const dungeonCreator = accounts[0];
        const partyOwner = accounts[1];
        const dmWithDungeonCreatorSigner = dm.connect(dungeonCreator);
        const treasure = ethers.utils.parseEther((50 + tokensCount).toString());
        (await dmWithDungeonCreatorSigner.createDungeon({ value: treasure })).wait();
        const dmWithPartyOwnerSigner = dm.connect(partyOwner);
        const fantasyWithPartyOwnerSigner = fantasy.connect(partyOwner);
        const tokenIds = await createTokens({
            fantasyWithSigner: fantasyWithPartyOwnerSigner,
            vrfCoordinatorV2WithSigner: vrfCoordinatorV2.connect(dungeonCreator),
            tokensCount
        });
        await fantasyWithPartyOwnerSigner.setApprovalForAll(dm.address, true);
        await expect(dmWithPartyOwnerSigner.startDungeonRaid(dungeonCreator.address, tokenIds)).to.be.revertedWith("your party has no chance to succeed");
    });

    it("Emits a DungeonRaidStarted event with the correct data and registers the raiding party to the correct dungeon when starting a raid with chance to succeed", async () => {
        // TODO: Parametize for for tokens_count [1,2,10]
        const tokensCount = 1;
        const { fantasy, vrfCoordinatorV2, fantasyUtils } = await deployFantasyWithDependencies(true);
        const dm = await deployDungeonManager({
            fantasyAddress: fantasy.address,
            vrfCoordinatorV2Address: vrfCoordinatorV2.address,
            fantasyUtilsAddress: fantasyUtils.address
        });
        const accounts = await ethers.getSigners();
        const dungeonCreator = accounts[0];
        const partyOwner = accounts[1];
        const dmWithDungeonCreatorSigner = dm.connect(dungeonCreator);
        const treasure = ethers.utils.parseEther("1");
        (await dmWithDungeonCreatorSigner.createDungeon({ value: treasure })).wait();
        const dmWithPartyOwnerSigner = dm.connect(partyOwner);
        const fantasyWithPartyOwnerSigner = fantasy.connect(partyOwner);
        const tokenIds = await createTokens({
            fantasyWithSigner: fantasyWithPartyOwnerSigner,
            vrfCoordinatorV2WithSigner: vrfCoordinatorV2.connect(dungeonCreator),
            tokensCount
        });
        await fantasyWithPartyOwnerSigner.setApprovalForAll(dm.address, true);

        const tx = await dmWithPartyOwnerSigner.startDungeonRaid(dungeonCreator.address, tokenIds);
        const receipt = await tx.wait();

        const dungeonRaidStarted = getEvent(receipt.events, "DungeonRaidStarted");
        expect(dungeonRaidStarted.args.dungeonCreator).to.equal(dungeonCreator.address);
        expect(dungeonRaidStarted.args.partyOwner).to.equal(partyOwner.address);
        expect(dungeonRaidStarted.args.tokenIds).to.deep.equal(tokenIds);
        const dungeon = await dm.dungeons(dungeonCreator.address);
        const party = dungeon[2];
        expect(party[0]).to.equal(partyOwner.address);
        expect(party[1]).to.deep.equal(tokenIds);
        const chanceToSucceed = await dm.getAventurersChanceToSucceed(tokenIds, treasure);
        expect(party[2]).to.equal(chanceToSucceed);
    });

    it("Reverts if trying to raid a dungeon that is already being raided", async () => {
        // TODO: Parametize for for tokens_count [1,2]
        const tokensCount = 1;
        const { fantasy, vrfCoordinatorV2, fantasyUtils } = await deployFantasyWithDependencies(true);
        const dm = await deployDungeonManager({
            fantasyAddress: fantasy.address,
            vrfCoordinatorV2Address: vrfCoordinatorV2.address,
            fantasyUtilsAddress: fantasyUtils.address
        });
        const accounts = await ethers.getSigners();
        const dungeonCreator = accounts[0];
        const partyOwner = accounts[1];
        const secondPartyOwner = accounts[2];
        const dmWithDungeonCreatorSigner = dm.connect(dungeonCreator);
        const treasure = ethers.utils.parseEther("1");
        (await dmWithDungeonCreatorSigner.createDungeon({ value: treasure })).wait();
        const dmWithPartyOwnerSigner = dm.connect(partyOwner);
        const dmWithSecondPartyOwnerSigner = dm.connect(secondPartyOwner);
        const fantasyWithPartyOwnerSigner = fantasy.connect(partyOwner);
        const fantasyWithSecondPartyOwnerSigner = fantasy.connect(secondPartyOwner);
        const tokenIds = await createTokens({
            fantasyWithSigner: fantasyWithPartyOwnerSigner,
            vrfCoordinatorV2WithSigner: vrfCoordinatorV2.connect(dungeonCreator),
            tokensCount
        });
        const secondTokenIds = await createTokens({
            fantasyWithSigner: fantasyWithSecondPartyOwnerSigner,
            vrfCoordinatorV2WithSigner: vrfCoordinatorV2.connect(dungeonCreator),
            tokensCount
        });
        await fantasyWithPartyOwnerSigner.setApprovalForAll(dm.address, true);
        await fantasyWithSecondPartyOwnerSigner.setApprovalForAll(dm.address, true);
        await dmWithPartyOwnerSigner.startDungeonRaid(dungeonCreator.address, tokenIds);

        await expect(dmWithSecondPartyOwnerSigner.startDungeonRaid(dungeonCreator.address, secondTokenIds)).to.be.revertedWith("some adventurers are already in this dungeon");
    });

    it("Computes the correct chance to succeed", async () => {
        // TODO: Parametize for for treasure in eth [0.1, 1, 52, 100] and tokensCount [1,2]
        const tokensCount = 1;
        const treasureInEth = 1;
        const treasure = ethers.utils.parseEther(treasureInEth.toString());
        const { fantasy, vrfCoordinatorV2, fantasyUtils } = await deployFantasyWithDependencies(true);
        const dm = await deployDungeonManager({
            fantasyAddress: fantasy.address,
            vrfCoordinatorV2Address: vrfCoordinatorV2.address,
            fantasyUtilsAddress: fantasyUtils.address
        });
        const accounts = await ethers.getSigners();
        const dungeonCreator = accounts[0];
        const partyOwner = accounts[1];
        const dmWithDungeonCreatorSigner = dm.connect(dungeonCreator);
        (await dmWithDungeonCreatorSigner.createDungeon({ value: treasure })).wait();
        const fantasyWithPartyOwnerSigner = fantasy.connect(partyOwner);
        const tokenIds = await createTokens({
            fantasyWithSigner: fantasyWithPartyOwnerSigner,
            vrfCoordinatorV2WithSigner: vrfCoordinatorV2.connect(dungeonCreator),
            tokensCount
        });

        const chance: BigNumber = await dm.getAventurersChanceToSucceed(tokenIds, treasure);

        const baseChance: BigNumber = await dm.baseSuccessChancePerc();
        const chanceWithoutTreasure = baseChance.add(tokensCount);
        const expected = chanceWithoutTreasure.gt(treasureInEth) ? chanceWithoutTreasure.sub(treasureInEth) : ethers.constants.Zero;
        expect(chance).to.equal(expected);
    });

    it("Emits a DungeonRaidOutcome event and makes gives the correct rewards when the dungeon raid is successfull", async () => {
        // TODO: Parametize for for tokens_count [1,2,10]
        const tokensCount = 1;
        const { fantasy, vrfCoordinatorV2, fantasyUtils } = await deployFantasyWithDependencies(true);
        const dm = await deployDungeonManager({
            fantasyAddress: fantasy.address,
            vrfCoordinatorV2Address: vrfCoordinatorV2.address,
            fantasyUtilsAddress: fantasyUtils.address
        });
        const accounts = await ethers.getSigners();
        const dungeonCreator = accounts[0];
        const partyOwner = accounts[1];
        const dmWithDungeonCreatorSigner = dm.connect(dungeonCreator);
        const treasure = ethers.utils.parseEther("1");
        (await dmWithDungeonCreatorSigner.createDungeon({ value: treasure })).wait();
        const dmWithPartyOwnerSigner = dm.connect(partyOwner);
        const fantasyWithPartyOwnerSigner = fantasy.connect(partyOwner);
        const tokenIds = await createTokens({
            fantasyWithSigner: fantasyWithPartyOwnerSigner,
            vrfCoordinatorV2WithSigner: vrfCoordinatorV2.connect(dungeonCreator),
            tokensCount
        });
        await fantasyWithPartyOwnerSigner.setApprovalForAll(dm.address, true);

        await waitForTx(dmWithPartyOwnerSigner.startDungeonRaid(dungeonCreator.address, tokenIds));
        const randomWord = 1;
        const expectedRoll = randomWord + 1;
        const dungeon = await dm.dungeons(dungeonCreator.address);
        const tx = await vrfCoordinatorV2.fulfillRandomWords(dungeon[3], dm.address);
        const receipt = await tx.wait();
        console.log(receipt);

        const dungeonRaidOutcomeEvent = getEvent(receipt.events, "DungeonRaidOutcome");
        expect(dungeonRaidOutcomeEvent.args.dungeonCreator).to.equal(dungeonCreator.address);
        expect(dungeonRaidOutcomeEvent.args.partyOwner).to.equal(partyOwner.address);
        expect(dungeonRaidOutcomeEvent.args.tokenIds).to.equal(tokenIds);
        expect(dungeonRaidOutcomeEvent.args.roll).to.equal(expectedRoll);
        expectDungeonDoesntExist(await dm.dungeons(dungeonCreator.address));
        const reward = await dm.claimableRewards(partyOwner.address, 0);
        expect(reward[0]).to.eql(tokenIds);
        expect(reward[1]).to.eql(treasure);
        await expect(dm.claimableRewards(partyOwner.address, 1)).to.be.reverted;
    });
});



function expectDungeonDoesntExist(dungeon: any): void {
    expect(dungeon[0] == ethers.constants.AddressZero);
    expect(dungeon[1] == 0);
    expect(dungeon[2] == ethers.constants.HashZero);
}

