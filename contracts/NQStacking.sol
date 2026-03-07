// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC1363Receiver.sol";
import "./MockRewardOracle.sol";

contract NQStaking is IERC1363Receiver {

    IERC20 public lpToken;
    IERC20 public rewardToken;
    IRewardOracle public oracle;

    address public securityMultisig;

    uint256 public totalStaked;
    uint256 public accRewardPerShare;
    uint256 public lastRewardBlock;

    uint256 constant COOLDOWN = 2 days;

    mapping(address => uint256) public stakeBalance;
    mapping(address => uint256) public rewardDebt;

    mapping(address => uint256) public withdrawRequest;
    mapping(address => uint256) public cooldownEnd;

    uint256 private unlocked = 1;

    modifier lock() {
        require(unlocked == 1, "LOCKED");
        unlocked = 2;
        _;
        unlocked = 1;
    }

    constructor(
        address _lp,
        address _reward,
        address _oracle,
        address _multisig
    ) {
        lpToken = IERC20(_lp);
        rewardToken = IERC20(_reward);
        oracle = IRewardOracle(_oracle);
        securityMultisig = _multisig;

        lastRewardBlock = block.number;
    }

    function updatePool() public {

        if (block.number <= lastRewardBlock) return;

        if (totalStaked == 0) {
            lastRewardBlock = block.number;
            return;
        }

        uint256 blocks = block.number - lastRewardBlock;

        uint256 rewardRate = oracle.getRewardRate();

        uint256 reward = blocks * rewardRate;

        accRewardPerShare += reward * 1e12 / totalStaked;

        lastRewardBlock = block.number;
    }

    function _stake(address user, uint256 amount) internal {

        updatePool();

        if (stakeBalance[user] > 0) {

            uint256 pending =
                stakeBalance[user] * accRewardPerShare / 1e12
                - rewardDebt[user];

            if (pending > 0) {
                rewardToken.transfer(user, pending);
            }
        }

        stakeBalance[user] += amount;
        totalStaked += amount;

        rewardDebt[user] =
            stakeBalance[user] * accRewardPerShare / 1e12;
    }

    function stake(uint256 amount) external lock {

        lpToken.transferFrom(msg.sender, address(this), amount);

        _stake(msg.sender, amount);
    }

    function requestWithdraw(uint256 amount) external {

        require(stakeBalance[msg.sender] >= amount, "Insufficient stake");

        withdrawRequest[msg.sender] = amount;

        cooldownEnd[msg.sender] = block.timestamp + COOLDOWN;
    }

    function flagWithdrawal(address user) external {

        require(msg.sender == securityMultisig, "Not authorized");

        cooldownEnd[user] = block.timestamp + COOLDOWN;
    }

    function finalizeWithdraw() external lock {

        require(block.timestamp >= cooldownEnd[msg.sender], "Cooldown active");

        uint256 amount = withdrawRequest[msg.sender];

        updatePool();

        uint256 pending =
            stakeBalance[msg.sender] * accRewardPerShare / 1e12
            - rewardDebt[msg.sender];

        if (pending > 0) {
            rewardToken.transfer(msg.sender, pending);
        }

        uint256 userBal = stakeBalance[msg.sender];

        assembly {
            if lt(userBal, amount) { revert(0,0) }
            userBal := sub(userBal, amount)
        }

        stakeBalance[msg.sender] = userBal;

        totalStaked -= amount;

        lpToken.transfer(msg.sender, amount);

        rewardDebt[msg.sender] =
            stakeBalance[msg.sender] * accRewardPerShare / 1e12;

        withdrawRequest[msg.sender] = 0;
    }

    function onTransferReceived(
        address,
        address from,
        uint256 value,
        bytes calldata
    ) external override returns (bytes4) {

        require(msg.sender == address(lpToken), "Invalid token");

        _stake(from, value);

        return IERC1363Receiver.onTransferReceived.selector;
    }
}