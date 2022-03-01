from brownie import DungeonManager, network
from scripts.helpful_scripts import LOCAL_BLOCKAIN_ENVIRONMENTS, Gender, get_account, get_character, CharacterClass
from scripts.deploy import ARTIST_FEE, callback_with_randomness, deploy_dungeon_manager, deploy_fantasy
import pytest


# def test_create_dungeon():
#     if network.show_active() not in LOCAL_BLOCKAIN_ENVIRONMENTS:
#         pytest.skip()
#     fantasy = deploy_fantasy()
#     dm = deploy_dungeon_manager(fantasy_address=fantasy.address)
#     account = get_account()

#     dm.createDungeon({"from": account, "value": Web3.toWei(1, "ether")})
