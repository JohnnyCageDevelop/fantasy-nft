import "@nomiclabs/hardhat-waffle";
import { Contract } from "ethers";
import { ethers } from "hardhat";

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
    vrfCoordinatorV2Address: string,
    fantasyUtilsAddress: string,
    artistAddress: string,
    withModules: boolean
}

async function deployFantasy({
    vrfCoordinatorV2Address,
    fantasyUtilsAddress,
    artistAddress,
    withModules
}: DeployFantasyParams): Promise<Contract> {

    // TOOD best practices ??
    const keyHash = "0x2ed0feb3e7fd2022120aa84fab1945545a9f2ffc9076fd6156fa96eaff4c1311";
    const subscriptionId = 1;
    const artistFee = ethers.utils.parseEther("0.0001");

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

async function deployAndAddRaceModule(fantasy: Contract, moduleName: string): Promise<Contract> {
    const module = await deployContractWithoutArguments(moduleName);
    await fantasy.addRaceModule(module.address);
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
    const artistAddress = await fantasyUtils.signer.getAddress();
    const fantasy = await deployFantasy({
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

async function main(): Promise<void> {
    await deployFantasyWithDependencies(true);
}

main()
    .then(() => {
        console.log("Done");
    })
    .catch(console.error);