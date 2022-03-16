import { expect } from "chai";
import { ethers } from "hardhat";
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
        const humanModule = await deployAndAddRaceModule(fantasy, "HumanModule");

        expect(await fantasy.getRaceModulesCount()).to.equal(1);
        
        const moduleAddress = await fantasy.getRaceModuleAddress(await humanModule.getRaceName());
        expect(moduleAddress).to.equal(humanModule.address);
    });

    it("Reverts if trying to add a module that already exists", async () => {
        const { fantasy } = await deployFantasyWithDependencies(false);
        await deployAndAddRaceModule(fantasy, "HumanModule");
        const MockHumanModule = await ethers.getContractFactory("MockHumanModule");
        const mockHumanModule = await MockHumanModule.deploy();
        await mockHumanModule.deployed();
        
        await expect(fantasy.addRaceModule(mockHumanModule.address)).to.be.revertedWith("race already added");
    });
});     