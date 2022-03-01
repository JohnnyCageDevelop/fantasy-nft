from enum import Enum
import json
from brownie import accounts, network, config, VRFCoordinatorMock, LinkToken, Contract

LOCAL_BLOCKAIN_ENVIRONMENTS = ["development", "ganache-local"]
ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"


def get_account(index=None, id=None):
    if (index):
        return accounts[index]
    if (id):
        return accounts.load(id)
    if (network.show_active() in LOCAL_BLOCKAIN_ENVIRONMENTS):
        return accounts[0]
    return accounts.add(config["wallets"]["from_key"])


contract_to_mock = {
    "vrf_coordinator": VRFCoordinatorMock,
    "link_token": LinkToken
}


def get_contract(contract_name):
    """
    Grabs the contract addresses from the config if defined,
    otherwise it will deploy a mock version of that contrct
    and return that mock contract.
        Args:
            contract_name (string)

        Returns:
            brownie.network.ProjectContract: the most recently
            deployed version of this contract.
    """
    contract_type = contract_to_mock[contract_name]
    if network.show_active() in LOCAL_BLOCKAIN_ENVIRONMENTS:
        if len(contract_type) <= 0:
            deploy_mocks()
        contract = contract_type[-1]
    else:
        contract_address = config["networks"][network.show_active(
        )][contract_name]
        contract = Contract.from_abi(
            contract_type._name, contract_address, contract_type.abi)
    return contract


def deploy_mocks():
    account = get_account()
    link_token = LinkToken.deploy({"from": account})
    VRFCoordinatorMock.deploy(link_token.address, {"from": account})


def fund_with_link(
        contract_address,
        account=None,
        link_token=None,
        amount=100000000000000000):
    account = account if account else get_account()
    link_token = link_token if link_token else get_contract("link_token")
    tx = link_token.transfer(contract_address, amount, {"from": account})
    tx.wait(1)
    print("Funded contract!")
    return tx


class CharacterClass(Enum):
    Mage = 0
    Barbarian = 1


class Gender(Enum):
    Male = 0
    Female = 1


class Character:
    def __init__(self,
                 first_name: str,
                 last_name: str,
                 race: str,
                 characterClass: CharacterClass,
                 level: int,
                 strength: int,
                 endurance: int,
                 dexterity: int,
                 intellect: int,
                 mind: int,
                 gender: Gender) -> None:
        self.first_name = first_name
        self.last_name = last_name
        self.race = race
        self.characterClass = characterClass
        self.level = level
        self.strength = strength
        self.endurance = endurance
        self.dexterity = dexterity
        self.intellect = intellect
        self.mind = mind
        self.gender = gender

    def __repr__(self):
        from pprint import pformat
        return pformat(vars(self), indent=4, width=1)


def get_character(dnd_contract, token_id: int) -> Character:
    (first_name, last_name, race, characterClass, level,
     gender) = dnd_contract.getCharacterOverview(token_id)
    (strength, consitution, dexterity, intellect, mind) = dnd_contract.getCharacterStats(token_id)
    return Character(
        first_name=first_name,
        last_name=last_name,
        race=race,
        characterClass=CharacterClass(characterClass),
        level=level,
        strength=strength, endurance=consitution,
        dexterity=dexterity,
        intellect=intellect,
        mind=mind,
        gender=Gender(gender))

        
