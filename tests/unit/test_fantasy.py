from brownie import Fantasy, network
from scripts.helpful_scripts import LOCAL_BLOCKAIN_ENVIRONMENTS, Gender, get_account, get_character, CharacterClass
from scripts.deploy import ARTIST_FEE, callback_with_randomness, deploy_fantasy
import pytest

def test_can_create_collectible():
    if network.show_active() not in LOCAL_BLOCKAIN_ENVIRONMENTS:
        pytest.skip()
    account = get_account()
    fantasy = deploy_fantasy()
    tx = fantasy.createCharacter({"from": account, "value": ARTIST_FEE})
    tx.wait(1)
    assert fantasy.isPendingCharacter(0)


def test_collectible_minted():
    if network.show_active() not in LOCAL_BLOCKAIN_ENVIRONMENTS:
        pytest.skip()
    account = get_account(index=0)
    second_account = get_account(index=1)
    fantasy = deploy_fantasy()

    tx = fantasy.createCharacter({"from": account, "value": ARTIST_FEE})
    tx.wait(1)
    callback_with_randomness(fantasy=fantasy, token_id=0, randomness=2222)
    tx = fantasy.createCharacter({"from": second_account, "value": ARTIST_FEE})
    tx.wait(1)
    callback_with_randomness(fantasy=fantasy, token_id=1, randomness=92136781236172380810232078612386123876312781)
    
    assert fantasy.ownerOf(0) == account.address
    character = get_character(dnd_contract=fantasy, token_id=0)
    assert character.first_name == "Marcel"
    assert character.last_name == "McSword"
    assert character.race == "Human"
    assert character.characterClass == CharacterClass.Barbarian
    assert character.level == 1
    assert character.strength == 11
    assert character.endurance == 8
    assert character.dexterity == 15
    assert character.intellect == 16
    assert character.mind == 6
    assert character.gender == Gender.Male;

    assert fantasy.ownerOf(1) == second_account.address
    character = get_character(dnd_contract=fantasy, token_id=1)
    assert character.first_name == "Annika"
    assert character.last_name == "Goldhorn"
    assert character.race == "Dwarf"
    assert character.characterClass == CharacterClass.Barbarian
    assert character.level == 1
    assert character.strength == 9
    assert character.endurance == 9
    assert character.dexterity == 6
    assert character.intellect == 15
    assert character.mind == 5
    assert character.gender == Gender.Female;

    assert fantasy.isPendingCharacter(0) == False
    assert fantasy.isPendingCharacter(1) == False
    
    
    