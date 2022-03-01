from brownie import DungeonManager, network, exceptions
from scripts.helpful_scripts import LOCAL_BLOCKAIN_ENVIRONMENTS, ZERO_ADDRESS, Gender, get_account, get_character, CharacterClass
from scripts.deploy import ARTIST_FEE, callback_with_randomness, deploy_dungeon_manager, deploy_fantasy
import pytest
from web3 import Web3

def test_create_dungeon_without_ether():
    if network.show_active() not in LOCAL_BLOCKAIN_ENVIRONMENTS:
        pytest.skip()
    fantasy = deploy_fantasy()
    dm = deploy_dungeon_manager(fantasy_address=fantasy.address)
    account = get_account()

    with pytest.raises(exceptions.VirtualMachineError):
        dm.createDungeon({"from": account, "value": 0})
    dungeon = dm.dungeons(account.address)
    assert_dungeon_doesnt_exists(dungeon)

def test_create_dungeon_with_ether():
    if network.show_active() not in LOCAL_BLOCKAIN_ENVIRONMENTS:
        pytest.skip()
    fantasy = deploy_fantasy()
    dm = deploy_dungeon_manager(fantasy_address=fantasy.address)
    account = get_account()
    treasure = Web3.toWei(1, "ether")

    tx = dm.createDungeon({"from": account, "value": treasure})

    assert tx.events["DungeonCreated"]["creator"] == account.address
    assert tx.events["DungeonCreated"]["treasure"] == treasure
    dungeon = dm.dungeons(account.address)
    assert dungeon[0] == account.address
    assert dungeon[1] == treasure

    assert_adventuring_party_is_empty(dungeon[2])

def test_create_dungeon_when_one_already_exists():
    if network.show_active() not in LOCAL_BLOCKAIN_ENVIRONMENTS:
        pytest.skip()
    fantasy = deploy_fantasy()
    dm = deploy_dungeon_manager(fantasy_address=fantasy.address)
    account = get_account()
    treasure = Web3.toWei(1, "ether")

    dm.createDungeon({"from": account, "value": treasure})

    with pytest.raises(exceptions.VirtualMachineError):
        dm.createDungeon({"from": account, "value": treasure})

    with pytest.raises(exceptions.VirtualMachineError):
        dm.createDungeon({"from": account, "value": 1})

def test_retire_dungeon_when_no_dungeon_active():
    if network.show_active() not in LOCAL_BLOCKAIN_ENVIRONMENTS:
        pytest.skip()
    fantasy = deploy_fantasy()
    dm = deploy_dungeon_manager(fantasy_address=fantasy.address)
    account = get_account()

    with pytest.raises(exceptions.VirtualMachineError):
        dm.retireDungeon({"from": account})

def test_retire_dungeon_when_dungeon_active():
    if network.show_active() not in LOCAL_BLOCKAIN_ENVIRONMENTS:
        pytest.skip()
    fantasy = deploy_fantasy()
    dm = deploy_dungeon_manager(fantasy_address=fantasy.address)
    account = get_account()
    treasure = Web3.toWei(1, "ether")
    dm.createDungeon({"from": account, "value": treasure})
    balance_before_retiring_dungeon = account.balance()
    
    tx = dm.retireDungeon({"from": account})

    assert tx.events["DungeonRetired"]["creator"] == account.address
    assert tx.events["DungeonRetired"]["treasure"] == treasure
    assert dm.balance() == 0
    assert account.balance() > balance_before_retiring_dungeon # TODO better check by computing tx fee ?

    assert_dungeon_doesnt_exists(dm.dungeons(account.address))
    

def assert_adventuring_party_is_empty(party):
    assert party[0] == ZERO_ADDRESS
    assert len(party[1]) == 0
    assert party[2] == 0

def assert_dungeon_doesnt_exists(dungeon):
    assert dungeon[0] == ZERO_ADDRESS
    assert dungeon[1] == 0
