# Audit Scorecard for Raj's Submission

## Verdict

**Result: Did not pass.**

Recommended score: **46 / 100**.

The submission shows a sincere attempt and includes several requested building blocks, but it misses multiple core deliverables and contains at least one major correctness issue in reward accounting.

## Rubric

### 1. Core staking contract functionality — 18 / 25

What is present:
- ERC-20 LP staking exists.
- Rewards are accrued using an oracle-fed rate.
- A 2-day cooldown withdrawal flow exists.
- A security multisig can reset a cooldown.
- ERC-1363 receiver flow is implemented.

Key deductions:
- Reward accounting does **not** correctly model a reward rate that changes every block unless `updatePool()` is called every block. The implementation reads the oracle once and applies that single rate across all elapsed blocks.
- `finalizeWithdraw()` can be called with no active withdrawal request, because `cooldownEnd[user]` defaults to `0` and `withdrawRequest[user]` defaults to `0`. This effectively creates a zero-amount harvest path outside the cooldown workflow.

### 2. Security / reentrancy design — 12 / 20

What is good:
- A custom mutex lock is implemented rather than relying only on OpenZeppelin.
- Sensitive external entrypoints `stake()` and `finalizeWithdraw()` use the custom lock.
- The withdrawal flow is split into request/finalize phases.

Key deductions:
- The contract does not use `SafeERC20`, so token transfer return values are ignored.
- The stated checks-effects-interactions discipline is not consistently followed: reward transfers happen before all accounting updates in `finalizeWithdraw()`.
- No test demonstrates resistance to reentrancy or malicious receiver/token behavior.

### 3. Anti-AI / assembly / ERC standard requirement — 11 / 15

What is present:
- Yul assembly is used for a subtraction in `finalizeWithdraw()`.
- ERC-1363 support is implemented via `onTransferReceived()` and the LP token inherits ERC-1363.

Key deductions:
- The assembly optimization is minimal and not benchmarked with a real gas report artifact.
- Overflow/underflow handling for the assembly block itself is okay, but the project does not demonstrate why this optimization matters beyond a short README table.

### 4. Tests, fuzzing, invariant coverage — 5 / 20

What is present:
- There is a Hardhat test file with unit-style tests.
- There are randomized loops labeled as fuzz tests.

Key deductions:
- There is no actual invariant test harness in the repository.
- There is no coverage artifact and no evidence of 100% coverage.
- The randomized tests use `Math.random()`, which is not proper property-based fuzzing and is not reproducible.
- Important edge cases are untested, including unauthorized cooldown reset, zero-amount finalize, reward-rate changes across elapsed blocks, and reentrancy resistance.

### 5. Gas report / tooling completeness — 0 / 10

Key deductions:
- No generated gas report artifact is included.
- The README explicitly states that automated gas reporting and coverage were not generated.
- `package.json` still contains a placeholder `npm test` script.

### 6. THOUGHTS.md quality and completeness — 10 / 10

What is good:
- The file explains the mapping-based design choice.
- It discusses reentrancy mitigation beyond just OpenZeppelin.
- It covers the cooldown flow, multisig reset, and ERC-1363 integration.

Minor caveat:
- It claims an invariant test exists, but the repository does not provide one.

## Most Important Findings

1. **Major correctness issue:** reward accrual does not truly support a reward rate that changes every block unless the pool is updated every block.
2. **Deliverables gap:** there is no proof of 100% coverage, no real invariant test implementation, and no generated gas report.
3. **Security/testing gap:** reentrancy mitigation is described, but not validated with adversarial tests.
4. **Workflow gap:** the repo's default `npm test` script is still the placeholder failure script.

## Pass/Fail Recommendation

**Fail**.

This submission would be closer to a partial-pass prototype than a fully passing take-home. It demonstrates familiarity with Solidity and common DeFi patterns, but it does not satisfy the strongest requirements in the prompt, especially around per-block dynamic rewards, 100% coverage with fuzzing/invariants, and a gas-report deliverable.
