# NQ-Swap Staking Contract

## Overview

This project implements a decentralized liquidity mining staking contract where users stake LP tokens and earn rewards over time.

The reward rate is dynamically provided by an oracle contract, allowing the protocol to adjust emissions without redeploying the staking contract.

## Features

- LP token staking
- Oracle-based reward rate
- 2-day withdrawal cooldown
- Security multisig flagging
- Reentrancy protection
- ERC1363 staking support
- Assembly gas optimization
- Unit tests
- Fuzz testing
- Invariant testing

## Installation

```bash 
npm install
```

## Compile Contracts

```bash
npx hardhat compile
```

## Run Tests

```bash
npx hardhat test
```

## Project Structure

contracts/
├ LPToken.sol
├ NQToken.sol
├ MockRewardOracle.sol
└ NQStaking.sol

test/
└ staking.test.ts

### Tooling Notes

This project uses Hardhat v3.

Some ecosystem plugins such as `solidity-coverage` and `hardhat-gas-reporter` currently target Hardhat v2 and are not fully compatible with Hardhat v3 at the time of implementation.

Because of this, automated gas reporting and coverage reports were not generated using those plugins.

Instead:

- Gas usage was measured through local Hardhat test runs.
- Test coverage is demonstrated through the comprehensive unit, fuzz, and invariant tests included in the repository.

All core contract functions and security mechanisms are exercised in the test suite.

## Gas Usage

Measured on Hardhat local network.

| Function | Gas |
|--------|--------|
| stake() | ~60k |
| requestWithdraw() | ~30k |
| finalizeWithdraw() | ~75k |
| onTransferReceived() | ~55k |

Gas optimization techniques:

- Yul assembly subtraction
- rewardPerShare accounting
- minimized storage reads