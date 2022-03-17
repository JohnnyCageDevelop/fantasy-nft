import { ethers } from "hardhat";
import { BigNumber, BigNumberish, Contract, ContractTransaction } from "ethers";

// TOOD best practices ??
export function getKeyHash(): string {
    return "0x2ed0feb3e7fd2022120aa84fab1945545a9f2ffc9076fd6156fa96eaff4c1311";
}

export function getSubscriptionId(): number {
    return 1;
}

export function getArtistFee(): BigNumberish {
    return ethers.utils.parseEther("0.0001");
}

export function createSequence(length: number): number[] {
    return Array(length).map((_, index) => index);
}

export async function createFundedSubcription(vrfCoordinatorV2WithSigner: Contract, amount: BigNumber = ethers.utils.parseEther("100")): Promise<BigNumber> {
    const tx = await vrfCoordinatorV2WithSigner.createSubscription();
    const receipt = await tx.wait();
    const event = getEvent(receipt.events, "SubscriptionCreated");
    const subId = event.args.subId;
    await vrfCoordinatorV2WithSigner.fundSubscription(subId, amount);
    return subId;
}

export function getEvent(events: any[], eventName: string): any | null {
    const matches = events.filter(e => e.event == eventName);
    if (matches.length > 1) {
        throw new Error(`Multiple events with the name: ${eventName}`);
    } else if (matches.length > 0) {
        return matches[0];
    } else {
        return null;
    }
}

export interface CreateTokensParams {
    fantasyWithSigner: Contract,
    vrfCoordinatorV2WithSigner: Contract,
    tokensCount: number
}

export async function createTokens({
    fantasyWithSigner: fantasyWithSigner,
    vrfCoordinatorV2WithSigner,
    tokensCount }: CreateTokensParams): Promise<BigNumberish[]> {
    const tokenIds = [];
    for (let i = 0; i < tokensCount; i++) {
        const tokenId = await createCharacterAndFinishGeneration(fantasyWithSigner, vrfCoordinatorV2WithSigner);
        tokenIds.push(tokenId);
    }
    return tokenIds;
}

export async function createCharacterAndFinishGeneration(fantasyWithSigner: Contract, vrfCoordinatorV2WithSigner: Contract): Promise<BigNumberish> {
    const tokenId = await createCharacter(fantasyWithSigner);
    const requestId = await fantasyWithSigner.requestIdByTokenId(tokenId);
    const tx = await vrfCoordinatorV2WithSigner.fulfillRandomWords(requestId, fantasyWithSigner.address);
    await tx.wait();
    return tokenId;
}

export async function createCharacter(fantasyWithSigner: Contract) {
    const tx = await fantasyWithSigner.createCharacter({ value: getArtistFee() });
    const receipt = await tx.wait();
    const tokenId = getEvent(receipt.events, "CharacterGenerationStarted").args.tokenId;
    console.log("tokenId: " + tokenId);
    return tokenId;
}

export async function waitForTx(tx: Promise<ContractTransaction>) {
    await (await tx).wait();
}