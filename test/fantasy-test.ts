import { expect } from "chai";
import { ethers } from "hardhat";
import { deployFantasyWithDependencies } from "../scripts/deploy";
import { getArtistFee, getEvent } from "../scripts/utils";

describe("Fantasy", () => {

    it("Starts the generation when calling createCharacter() with the correct artistFee", async () => {
        const {fantasy} = await deployFantasyWithDependencies(true);
        const artistFee = getArtistFee();
        const accounts = await ethers.getSigners();
        const account = accounts[0];
        const fantasyWithSigner = fantasy.connect(account);
        
        const tx = await fantasyWithSigner.createCharacter({value: artistFee});
        const receipt = await tx.wait();

        expect(await fantasyWithSigner.isPendingCharacter(0)).to.be.true;
        const characterGenerationStartedEvent = getEvent(receipt.events, "CharacterGenerationStarted");
        expect(characterGenerationStartedEvent.args.tokenId).to.equal(0);
        expect(characterGenerationStartedEvent.args.startedBy).to.equal(account.address);
    });
});