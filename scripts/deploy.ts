import "@nomiclabs/hardhat-waffle";
import { BigNumberish, Contract } from "ethers";
import { ethers } from "hardhat";
import { createFundedSubcription, getArtistFee, getKeyHash, getSubscriptionId } from "./utils";

//! TODO: non-local networks ??

async function deployVrfCoordinatorV2(): Promise<Contract> {
    const VrfCoordinatorV2 = await ethers.getContractFactory("VRFCoordinatorV2Mock");
    const vrfCoordinatorV2 = await VrfCoordinatorV2.deploy(1, 1);
    await vrfCoordinatorV2.deployed();
    return vrfCoordinatorV2;
}

function deployFantasyUtils(): Promise<Contract> {
    return deployContractWithoutArguments("FantasyUtils");
}

interface DeployFantasyParams {
    subscriptionId: BigNumberish,
    vrfCoordinatorV2Address: string,
    fantasyUtilsAddress: string,
    artistAddress: string,
    withModules: boolean
}

async function deployFantasy({
    subscriptionId,
    vrfCoordinatorV2Address,
    fantasyUtilsAddress,
    artistAddress,
    withModules
}: DeployFantasyParams): Promise<Contract> {

    const artistFee = getArtistFee();
    const keyHash = getKeyHash();

    const Fantasy = await ethers.getContractFactory("Fantasy",
        {
            libraries: {
                FantasyUtils: fantasyUtilsAddress
            }
        });
    const fantasy = await Fantasy.deploy(
        artistAddress,
        artistFee,
        vrfCoordinatorV2Address,
        keyHash,
        subscriptionId
    );
    await fantasy.deployed();

    if (withModules) {
        await deployAndAddRaceModule(fantasy, "HumanModule");
        await deployAndAddRaceModule(fantasy, "DwarfModule");
    }

    return fantasy;
}

export async function deployAndAddRaceModule(fantasyWithSigner: Contract, moduleName: string): Promise<Contract> {
    const module = await deployContractWithoutArguments(moduleName);
    await fantasyWithSigner.addRaceModule(module.address);
    return module;
}

async function deployContractWithoutArguments(contractName: string): Promise<Contract> {
    const Factory = await ethers.getContractFactory(contractName);
    const instance = await Factory.deploy();
    await instance.deployed();
    return instance;
}

interface FantasyDeployResult {
    vrfCoordinatorV2: Contract,
    fantasy: Contract,
    fantasyUtils: Contract
}

export async function deployFantasyWithDependencies(withModules: boolean): Promise<FantasyDeployResult> {
    const vrfCoordinatorV2 = await deployVrfCoordinatorV2();
    const fantasyUtils = await deployFantasyUtils();
    const accounts = await ethers.getSigners();
    const signer = accounts[0];
    const subscriptionId = await createFundedSubcription(vrfCoordinatorV2.connect(signer));
    const artistAddress = await signer.getAddress();
    const fantasy = await deployFantasy({
        subscriptionId,
        vrfCoordinatorV2Address: vrfCoordinatorV2.address,
        fantasyUtilsAddress: fantasyUtils.address,
        artistAddress: artistAddress,
        withModules
    });
    console.log(`Fantasy deployed at ${fantasy.address}`);

    return {
        vrfCoordinatorV2,
        fantasy,
        fantasyUtils
    }
}
interface DeployDungeonManagerParams {
    vrfCoordinatorV2Address: string,
    fantasyUtilsAddress: string,
    fantasyAddress: string
}

export async function deployDungeonManager({
    vrfCoordinatorV2Address,
    fantasyUtilsAddress,
    fantasyAddress
}: DeployDungeonManagerParams): Promise<Contract> {
    const keyHash = getKeyHash();
    const subscriptionId = getSubscriptionId();
    const DungeonManager = await ethers.getContractFactory("DungeonManager",
        {
            libraries: {
                FantasyUtils: fantasyUtilsAddress
            }
        });
    const dm = await DungeonManager.deploy(
        fantasyAddress,
        vrfCoordinatorV2Address,
        keyHash,
        subscriptionId
    );
    await dm.deployed();
    console.log(`DungeonManager deployed at ${dm.address}`);
    return dm;
}

async function main(): Promise<void> {
    const { fantasy, vrfCoordinatorV2, fantasyUtils } = await deployFantasyWithDependencies(true);
    await deployDungeonManager({
        fantasyAddress: fantasy.address,
        vrfCoordinatorV2Address: vrfCoordinatorV2.address,
        fantasyUtilsAddress: fantasyUtils.address
    });
}

main()
    .then(() => {
        console.log("Done");
    })
    .catch(console.error);