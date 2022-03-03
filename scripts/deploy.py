from scripts.helpful_scripts import LOCAL_BLOCKAIN_ENVIRONMENTS, fund_with_link, get_account, get_character, get_contract
from brownie import config, network, Fantasy, network, FantasyUtils, HumanModule, DwarfModule, DungeonManager
from web3 import Web3
import time

sample_token_uri = "https://ipfs.io/ipfs/QmbvhhJC1KbQti3VvjARd5VRrpfPnVED5XaGrACxU66E8a?filename=antha_metadata.json"
open_sea_url = "https://testnets.opensea.io/assets/{}/{}"

ARTIST_FEE = Web3.toWei(0.0001, "ether")


def deploy_fantasy(with_modules: bool = True):
    account = get_account()
    artist = account
    chainlink_fee = config["networks"][network.show_active()]["chainlink_fee"]
    vrf_coordinator = get_contract("vrf_coordinator")
    link = get_contract("link_token")
    key_hash = config["networks"][network.show_active()]["keyHash"]

    FantasyUtils.deploy({"from": account})
    fantasy = Fantasy.deploy(artist, ARTIST_FEE, chainlink_fee, vrf_coordinator.address, link.address, key_hash, {
        "from": account}, publish_source=config["networks"][network.show_active()].get("verify"))
    if with_modules:
        human_module = HumanModule.deploy({"from": account})
        dwarf_module = DwarfModule.deploy({"from": account})
        fantasy.addRaceModule(human_module.address, {"from": account})
        fantasy.addRaceModule(dwarf_module.address, {"from": account})

    fund_with_link(contract_address=fantasy.address,
                   link_token=link, amount=Web3.toWei(1, "ether"))

    return fantasy


def deploy_dungeon_manager(fantasy_address):
    account = get_account()
    chainlink_fee = config["networks"][network.show_active()]["chainlink_fee"]
    vrf_coordinator = get_contract("vrf_coordinator")
    link = get_contract("link_token")
    # TODO: Same keyHash for different contracts ?
    key_hash = config["networks"][network.show_active()]["keyHash"]
    dm = DungeonManager.deploy(
        fantasy_address,
        chainlink_fee,
        vrf_coordinator.address,
        link.address,
        key_hash,
        {"from": account},
        publish_source=config["networks"][network.show_active()].get("verify"))
    fund_with_link(contract_address=dm.address, account=account.address)
    return dm
    

def callback_with_randomness(contract_address, request_id, randomness: int):
    account = get_account()
    vrf_coordinator = get_contract("vrf_coordinator")
    if network.show_active() in LOCAL_BLOCKAIN_ENVIRONMENTS:
        tx = vrf_coordinator.callBackWithRandomness(
            request_id, randomness, contract_address, {"from": account.address})
        tx.wait(1)
        return tx
    else:
        raise Exception(
            f"Can only be called in local blockchains! Active network: {network.show_active()}")


def wait_for_randomness_callback(fantasy):
    if network.show_active() in LOCAL_BLOCKAIN_ENVIRONMENTS:
        callback_with_randomness(contract_address=fantasy.address, request_id=fantasy.requestIdByTokenId(0), randomness=378128313)
    else:
        time.sleep(60)


def deploy_and_create_advanced():
    account = get_account()
    fantasy = deploy_fantasy()
    tx = fantasy.createCharacter({"from": account, "value": ARTIST_FEE})
    tx.wait(1)
    wait_for_randomness_callback(fantasy)
    print(fantasy.isPendingCharacter(0))
    print(get_character(fantasy, 0))
    print(fantasy.ownerOf(0))
    dm = deploy_dungeon_manager(fantasy.address)
    tx = dm.createDungeon({"from": account, "value": Web3.toWei(1, "ether")})
    tx.wait(1)
    print(f"Dungeon: {dm.dungeons(account.address)}")

def main():
    deploy_and_create_advanced()
