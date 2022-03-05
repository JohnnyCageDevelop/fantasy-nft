TODO:


# hardhat migration todo
- Migrate tests to ts

Character class module ?

1. Finish Todos in DungeonManager.sol
2. Remove levels and use stats for dungeon (leveling up can be built as aseperate funcionnality later)
3. Finish unit tests
4. Upgrade to 0.8 (esp for built-in SafeMath and new VRF sub model!!!)
5. Allow people to change race modules based on votes (DAO). built in solution from open zeppelin for DAO race module changes ?
6. Fuzzy testing
7. Make sure math is safe (SafeMath if necessary, from 0.8 I believe no longer needed)
8.  Use Address lib from open zeppelin for eth transfer
9. Check Open Zeppelin docs for anything that we can reuse
10. CI/CD before deployment that runs all tests
11. Cleanup code
12. Once with chainlink vrf v2 and 0.8 and if needed then, somethign to automatically refill the subscription ? Is there a generic solution for this ?
My idea is a system that automtically uses the eth fees or a possible own customt token to pay for the LINK, that way that is abstracted away from users
and the system can be made to always be able to provide the necessary LINk. For example, adjusting the fee cost based on LINK price. This system could be its
own project that can be used by other projects...
1.   Picture generation (basic). Image parts hosted on IPFS and assembling done in smart contract, but picture generation done by third party for convenience should be ok. Any way to make also decentralized, with for ex chainlink ?
2.  More unit tests ?