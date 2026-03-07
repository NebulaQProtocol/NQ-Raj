// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRewardOracle {
    function getRewardRate() external view returns (uint256);
}

contract MockRewardOracle is IRewardOracle {

    uint256 public rewardRate;

    function setRewardRate(uint256 _rate) external {
        rewardRate = _rate;
    }

    function getRewardRate() external view returns (uint256) {
        return rewardRate;
    }
}