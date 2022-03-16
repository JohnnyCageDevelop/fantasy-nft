import { expect } from "chai";
import { ethers } from "hardhat";
import { pid } from "process";
import { deployAndAddRaceModule, deployFantasyWithDependencies } from "../scripts/deploy";
import { createCharacterAndFinishGeneration, getArtistFee, getEvent } from "../scripts/utils";

describe("Fantasy", () => {

    it("Starts the generation when calling createCharacter() with the correct artistFee", async () => {
        const { fantasy } = await deployFantasyWithDependencies(true);
        const artistFee = getArtistFee();
        const accounts = await ethers.getSigners();
        const account = accounts[0];
        const fantasyWithSigner = fantasy.connect(account);

        const tx = await fantasyWithSigner.createCharacter({ value: artistFee });
        const receipt = await tx.wait();

        expect(await fantasyWithSigner.isPendingCharacter(0)).to.be.true;
        const characterGenerationStartedEvent = getEvent(receipt.events, "CharacterGenerationStarted");
        expect(characterGenerationStartedEvent.args.tokenId).to.equal(0);
        expect(characterGenerationStartedEvent.args.startedBy).to.equal(account.address);
    });

    it("Mints the character once the random words are fulfilled", async () => {
        const { fantasy, vrfCoordinatorV2 } = await deployFantasyWithDependencies(true);
        const artistFee = getArtistFee();
        const accounts = await ethers.getSigners();
        const account = accounts[0];
        const fantasyWithSigner = fantasy.connect(account);
        const vrfCoordinatorV2WithSigner = vrfCoordinatorV2.connect(account);

        const createCharacterReceipt = await (await fantasyWithSigner.createCharacter({ value: artistFee })).wait();
        const tokenId = getEvent(createCharacterReceipt.events, "CharacterGenerationStarted").args.tokenId;
        const requestId = await fantasyWithSigner.requestIdByTokenId(tokenId);
        const tx = await vrfCoordinatorV2WithSigner.fulfillRandomWords(requestId, fantasyWithSigner.address);
        await tx.wait();

        expect(await fantasy.ownerOf(0)).to.equal(account.address);
        const characterOverview = await fantasy.getCharacterOverview(tokenId);
        expect(characterOverview[0]).to.equal("Ansa");
        expect(characterOverview[1]).to.equal("Thunderhammer");
        expect(characterOverview[2]).to.equal("Dwarf");
        expect(characterOverview[3]).to.equal(0);
        expect(characterOverview[4]).to.equal(1);
        expect(characterOverview[5]).to.equal(1);
        expect(await fantasy.isPendingCharacter(0)).to.be.false;
    });

    it("Can add a race module if it's not already added", async () => {
        const { fantasy } = await deployFantasyWithDependencies(false);
        expect(await fantasy.getRaceModulesCount()).to.equal(0); // sanity check
        const humanModule = await deployAndAddRaceModule(fantasy, "HumanModule");
        const dwarfModule = await deployAndAddRaceModule(fantasy, "DwarfModule");

        expect(await fantasy.getRaceModulesCount()).to.equal(2);
        
        const humanModuleAddress = await fantasy.getRaceModuleAddress(await humanModule.getRaceName());
        expect(humanModuleAddress).to.equal(humanModule.address);
        const dwarfModuleAddress = await fantasy.getRaceModuleAddress(await dwarfModule.getRaceName());
        expect(dwarfModuleAddress).to.equal(dwarfModule.address);
    });

    it("Reverts if trying to add a module that already exists", async () => {
        const { fantasy } = await deployFantasyWithDependencies(false);
        await deployAndAddRaceModule(fantasy, "HumanModule");
        const MockHumanModule = await ethers.getContractFactory("MockHumanModule");
        const mockHumanModule = await MockHumanModule.deploy();
        await mockHumanModule.deployed();
        
        await expect(fantasy.addRaceModule(mockHumanModule.address)).to.be.revertedWith("race already added");
    });

    it("Reverts if trying to remove a module that is not added", async () => {
        const { fantasy } = await deployFantasyWithDependencies(false);
        const HumanModule = await ethers.getContractFactory("HumanModule");
        const humanModule = await HumanModule.deploy();
        await humanModule.deployed();

        await expect(fantasy.removeRaceModule(humanModule.address)).to.be.revertedWith("unknown race");
    });

});     