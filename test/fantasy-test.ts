import { ethers } from "hardhat";
import { expect } from "chai";
import { deployDungeonManager, deployFantasyWithDependencies } from "../scripts/deploy";

// TODO: Only run unit tests in local blockchain
describe("Fantasy", () => {
    it("Should not be able to create a dungeon without ether", async () => {
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
});

function expectDungeonDoesntExist(dungeon: any): void {
    expect(dungeon[0] == ethers.constants.AddressZero);
    expect(dungeon[1] == 0);
    expect(dungeon[2] == ethers.constants.HashZero);
}