import { expect } from "chai";
import { ethers } from "hardhat";
import { deployFantasyWithDependencies } from "../scripts/deploy";
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
        const receipt = await tx.wait();

        expect(await fantasy.ownerOf(0)).to.equal(account);
        const characterOverview = await fantasy.getCharacterOverview(tokenId);
        expect(characterOverview[0]).to.equal("Marcel");
        expect(characterOverview[1]).to.equal("McSword");
        expect(characterOverview[2]).to.equal("Human");
        expect(characterOverview[3]).to.equal(1);
        expect(characterOverview[4]).to.equal(1);
        expect(characterOverview[5]).to.equal(0);
        expect(await fantasy.isPendingCharacter(0)).to.be.false;
        const transferEvent = getEvent(receipt.events, "Transfer");
        expect(transferEvent.args.tokenId).to.equal(tokenId);
    });
});