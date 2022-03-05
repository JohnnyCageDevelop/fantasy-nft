import { ethers } from "hardhat";
import { BigNumber } from "ethers";

// TOOD best practices ??
export function getKeyHash(): string {
    return "0x2ed0feb3e7fd2022120aa84fab1945545a9f2ffc9076fd6156fa96eaff4c1311";
}

export function getSubscriptionId(): Number {
    return 1;
}

export function getArtistFee(): BigNumber {
    return ethers.utils.parseEther("0.0001");
}