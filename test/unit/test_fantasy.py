from brownie import network, HumanModule, DwarfModule, exceptions, MockHumanModule
from scripts.helpful_scripts import LOCAL_BLOCKAIN_ENVIRONMENTS, Gender, get_account, get_character, CharacterClass
from scripts.deploy import ARTIST_FEE, fulfill_random_words_on_coordinator, deploy_fantasy
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
    fulfill_random_words_on_coordinator(contract_address=fantasy.address,
                                        request_id=fantasy.requestIdByTokenId(0))
    tx = fantasy.createCharacter({"from": second_account, "value": ARTIST_FEE})
    tx.wait(1)
    fulfill_random_words_on_coordinator(contract_address=fantasy.address, request_id=fantasy.requestIdByTokenId(
        1))

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
    assert character.gender == Gender.Male

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
    assert character.gender == Gender.Female

    assert fantasy.isPendingCharacter(0) == False
    assert fantasy.isPendingCharacter(1) == False


def test_add_module():
    if network.show_active() not in LOCAL_BLOCKAIN_ENVIRONMENTS:
        pytest.skip()
    fantasy = deploy_fantasy(with_modules=False)
    account = get_account()
    human_module = HumanModule.deploy({"from": account})
    dwarf_module = DwarfModule.deploy({"from": account})
    # sanity check
    assert fantasy.getRaceModulesCount() == 0

    fantasy.addRaceModule(human_module.address, {"from": account})
    fantasy.addRaceModule(dwarf_module.address, {"from": account})

    assert fantasy.getRaceModulesCount() == 2
    assert fantasy.getRaceModuleAddress(
        human_module.getRaceName()) == human_module.address
    assert fantasy.getRaceModuleAddress(
        dwarf_module.getRaceName()) == dwarf_module.address


def test_remove_module():
    if network.show_active() not in LOCAL_BLOCKAIN_ENVIRONMENTS:
        pytest.skip()
    fantasy = deploy_fantasy(with_modules=True)
    human_module = HumanModule[-1]
    dwarf_module = DwarfModule[-1]
    human_race_name = human_module.getRaceName()
    dwarf_race_name = dwarf_module.getRaceName()
    # sanity checks
    assert fantasy.getRaceModulesCount() == 2
    assert fantasy.getRaceModuleAddress(
        human_race_name) == human_module.address
    assert fantasy.getRaceModuleAddress(
        dwarf_race_name) == dwarf_module.address

    tx = fantasy.removeRaceModule(human_race_name)
    print(tx.events)
    assert fantasy.getRaceModulesCount() == 1
    with pytest.raises(exceptions.VirtualMachineError):
        fantasy.getRaceModuleAddress(human_race_name)

    fantasy.removeRaceModule(dwarf_race_name)
    assert fantasy.getRaceModulesCount() == 0
    with pytest.raises(exceptions.VirtualMachineError):
        fantasy.getRaceModuleAddress(dwarf_race_name)


def test_update_module():
    if network.show_active() not in LOCAL_BLOCKAIN_ENVIRONMENTS:
        pytest.skip()
    fantasy = deploy_fantasy(with_modules=True)
    account = get_account()
    human_module = HumanModule[-1]
    # sanity checks
    assert fantasy.getRaceModuleAddress(
        human_module.getRaceName()) == human_module.address

    new_human_module = MockHumanModule.deploy({"from": account})
    fantasy.updateRaceModule(new_human_module)

    assert fantasy.getRaceModuleAddress(
        human_module.getRaceName()) == new_human_module.address
    assert fantasy.getRaceModuleAddress(
        new_human_module.getRaceName()) == new_human_module.address