import { ethers } from "hardhat";
import { BigNumber, Contract } from "ethers";

// TOOD best practices ??
export function getKeyHash(): string {
    return "0x2ed0feb3e7fd2022120aa84fab1945545a9f2ffc9076fd6156fa96eaff4c1311";
}

export function getSubscriptionId(): number {
    return 1;
}

export function getArtistFee(): BigNumber {
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
