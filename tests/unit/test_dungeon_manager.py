from brownie import DungeonManager, network
from scripts.helpful_scripts import LOCAL_BLOCKAIN_ENVIRONMENTS, Gender, get_account, get_character, CharacterClass
from scripts.deploy import ARTIST_FEE, callback_with_randomness, deploy_dungeon_manager, deploy_fantasy
import pytest
from web3 import Web3

def test_create_dungeon():
    if network.show_active() not in LOCAL_BLOCKAIN_ENVIRONMENTS:
        pytest.skip()
    fantasy = deploy_fantasy()
    dm = deploy_dungeon_manager(fantasy_address=fantasy.address)
    account = get_account()
    treasure = Web3.toWei(1, "ether")

    dm.createDungeon({"from": account, "value": treasure})

    dungeon = dm.dungeons(account.address)
    assert dungeon[0] == account.address
    assert dungeon[1] == treasure

    assert_adventuring_party_is_empty(dungeon[2])

def assert_adventuring_party_is_empty(party):
    assert party[0] == "0x0000000000000000000000000000000000000000"
    assert len(party[1]) == 0
    assert party[2] == 0

