# THOUGHTS.md

## Overview

This project implements a decentralized staking contract for liquidity mining.

Users stake LP tokens and receive reward tokens over time. The reward emission rate is controlled by an oracle contract, enabling flexible reward adjustment.

Security mechanisms such as cooldown withdrawals and multisig monitoring were added to mitigate common DeFi attack vectors.

---

## Data Structure Design

Mappings were used instead of arrays for storing user balances and reward accounting.

mapping(address => uint256) stakeBalance
mapping(address => uint256) rewardDebt

Reasons:

- O(1) lookup time
- avoids iteration over large datasets
- prevents gas-limit related DoS scenarios

Arrays would require looping over all users to distribute rewards, which is not feasible on-chain.

---

## Reward Accounting Model

The contract uses a reward-per-share model similar to the MasterChef architecture used by many DeFi protocols.

Key variables:

- accRewardPerShare
- rewardDebt

Rewards are calculated as:

pendingReward =
(userStake * accRewardPerShare) - rewardDebt

This allows rewards to be distributed efficiently without iterating through users.

---

## Reentrancy Mitigation

Instead of relying solely on external libraries, a custom mutex lock was implemented.

modifier lock()

This prevents reentrant calls to sensitive functions such as:

- stake()
- finalizeWithdraw()

The contract also follows the checks-effects-interactions pattern.

---

## Cooldown Withdrawal Mechanism

Withdrawals require a 2-day cooldown period.

requestWithdraw() → start cooldown  
finalizeWithdraw() → withdraw after delay

This prevents flash-loan attacks where attackers stake and withdraw within a single block.

---

## Security Multisig Monitoring

A designated multisig address can reset the cooldown period.

flagWithdrawal(address user)

This allows suspicious withdrawals to be delayed for further investigation.

---

## Gas Optimization

A subtraction operation in withdrawal logic was implemented using Yul assembly:

assembly {
    if lt(userBal, amount) { revert(0,0) }
    userBal := sub(userBal, amount)
}

This avoids unnecessary Solidity overflow checks while maintaining safety.

Additional optimizations:

- rewardPerShare accounting
- minimized storage reads
- mapping-based data structures

---

## ERC1363 Integration

The contract supports ERC1363 tokens via onTransferReceived().

This allows users to stake using transferAndCall() instead of the traditional approve + stake flow.

Benefits:

- improved user experience
- fewer transactions
- compatibility with advanced token standards

---

## Testing Strategy

The project includes multiple testing strategies.

Unit tests  
Test core staking and withdrawal flows.

Fuzz tests  
Randomized stake and withdrawal inputs ensure robustness.

Invariant test  
Ensures protocol accounting consistency.

Invariant:

totalStaked == Σ stakeBalance[user]

This guarantees that the contract never loses track of deposited tokens.

---

## Future Improvements

Potential improvements include:

- automated monitoring of suspicious withdrawals
- governance-controlled reward rate adjustments
- dynamic cooldown periods
- integration with on-chain auditing tools