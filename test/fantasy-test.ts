import { ethers, waffle } from "hardhat";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { deployDungeonManager, deployFantasyWithDependencies } from "../scripts/deploy";

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

        expect(dmWithSigner.createDungeon({ value: 0 })).to.be.revertedWith("at least 1 WEI must be sent as treasure");
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

        expect(dmWithSigner.retireDungeon()).to.be.revertedWith("there is no dungeon belonging to this address");
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
        expect(accountBalance.gt(balanceBeforeRetiringDungeon)).to.be.true;

        expectDungeonDoesntExist(dm.dungeons(account.address));
    });
});

function expectDungeonDoesntExist(dungeon: any): void {
    expect(dungeon[0] == ethers.constants.AddressZero);
    expect(dungeon[1] == 0);
    expect(dungeon[2] == ethers.constants.HashZero);
}

function getEvent(events: any[], eventName: string): any | null {
    const matches = events.filter(e => e.event == eventName);
    if (matches.length > 1) {
        throw new Error(`Multiple events with the name: ${eventName}`);
    } else if (matches.length > 0) {
        return matches[0];
    } else {
        return null;
    }
}
