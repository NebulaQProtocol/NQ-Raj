import { expect } from "chai";
import "@nomicfoundation/hardhat-ethers-chai-matchers";
import hre from "hardhat";

describe("NQStaking", function () {

  let ethers: any;  
  let lpToken: any;
  let rewardToken: any;
  let oracle: any;
  let staking: any;

  let owner: any;
  let user1: any;
  let user2: any;
  let multisig: any;

  beforeEach(async function () {

    const { ethers: ethersInstance } = await hre.network.connect();
    ethers = ethersInstance;
    const signers = await ethers.getSigners();

    owner = signers[0];
    user1 = signers[1];
    user2 = signers[2];
    multisig = signers[3];

    const LPToken = await ethers.getContractFactory("LPToken");
    lpToken = await LPToken.deploy();

    const NQToken = await ethers.getContractFactory("NQToken");
    rewardToken = await NQToken.deploy();

    const Oracle = await ethers.getContractFactory("MockRewardOracle");
    oracle = await Oracle.deploy();

    const Staking = await ethers.getContractFactory("NQStaking");

    staking = await Staking.deploy(
      lpToken.target,
      rewardToken.target,
      oracle.target,
      multisig.address
    );

    await lpToken.mint(user1.address, ethers.parseEther("100"));
    await lpToken.mint(user2.address, ethers.parseEther("100"));
    await rewardToken.mint(staking.target, ethers.parseEther("100000"));

  });

  it("User can stake LP tokens", async function () {

    await lpToken.connect(user1).approve(staking.target, ethers.parseEther("10"));

    await staking.connect(user1).stake(ethers.parseEther("10"));

    const balance = await staking.stakeBalance(user1.address);

    expect(balance).to.equal(ethers.parseEther("10"));
  });

  it("Rewards accumulate over blocks", async function () {

    await oracle.setRewardRate(ethers.parseEther("1"));

    await lpToken.connect(user1).approve(staking.target, ethers.parseEther("10"));

    await staking.connect(user1).stake(ethers.parseEther("10"));

    await ethers.provider.send("evm_mine", []);
    await ethers.provider.send("evm_mine", []);

    await staking.updatePool();

    const acc = await staking.accRewardPerShare();

    expect(acc).to.be.gt(0);
  });

  it("Multiple users staking works", async function () {

    await lpToken.connect(user1).approve(staking.target, ethers.parseEther("10"));
    await lpToken.connect(user2).approve(staking.target, ethers.parseEther("20"));

    await staking.connect(user1).stake(ethers.parseEther("10"));
    await staking.connect(user2).stake(ethers.parseEther("20"));

    const balance1 = await staking.stakeBalance(user1.address);
    const balance2 = await staking.stakeBalance(user2.address);

    expect(balance1).to.equal(ethers.parseEther("10"));
    expect(balance2).to.equal(ethers.parseEther("20"));
  });

  it("User can request withdraw", async function () {

    await lpToken.connect(user1).approve(staking.target, ethers.parseEther("10"));

    await staking.connect(user1).stake(ethers.parseEther("10"));

    await staking.connect(user1).requestWithdraw(ethers.parseEther("5"));

    const request = await staking.withdrawRequest(user1.address);

    expect(request).to.equal(ethers.parseEther("5"));
  });

  it("Withdraw fails before cooldown", async function () {

    await lpToken.connect(user1).approve(staking.target, ethers.parseEther("10"));
    await staking.connect(user1).stake(ethers.parseEther("10"));

    await staking.connect(user1).requestWithdraw(ethers.parseEther("5"));

    await expect(
      staking.connect(user1).finalizeWithdraw()
    ).to.be.revertedWith("Cooldown active");
  });

  it("Withdraw works after cooldown", async function () {

    await lpToken.connect(user1).approve(staking.target, ethers.parseEther("10"));
    await staking.connect(user1).stake(ethers.parseEther("10"));

    await staking.connect(user1).requestWithdraw(ethers.parseEther("5"));

    await ethers.provider.send("evm_increaseTime", [2 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    await staking.connect(user1).finalizeWithdraw();

    const balance = await staking.stakeBalance(user1.address);

    expect(balance).to.equal(ethers.parseEther("5"));
  });

  it("Security multisig can reset cooldown", async function () {

    await lpToken.connect(user1).approve(staking.target, ethers.parseEther("10"));
    await staking.connect(user1).stake(ethers.parseEther("10"));

    await staking.connect(user1).requestWithdraw(ethers.parseEther("5"));

    await staking.connect(multisig).flagWithdrawal(user1.address);

    const cooldown = await staking.cooldownEnd(user1.address);

    expect(cooldown).to.be.gt(0);
  });

  it("Cannot withdraw more than staked", async function () {

    await lpToken.connect(user1).approve(staking.target, ethers.parseEther("10"));
    await staking.connect(user1).stake(ethers.parseEther("10"));

    await expect(
      staking.connect(user1).requestWithdraw(ethers.parseEther("20"))
    ).to.be.revertedWith("Insufficient stake");
  });

  it("ERC1363 staking works", async function () {

    await lpToken
    .connect(user1)
    .transferAndCall(staking.target, ethers.parseEther("10"));

    const balance = await staking.stakeBalance(user1.address);

    expect(balance).to.equal(ethers.parseEther("10"));
   });

  it("Fuzz: random staking amounts", async function () {

   let remaining = ethers.parseEther("100");

   for (let i = 0; i < 15; i++) {

    if (remaining <= 0n) break;

    const max = Number(remaining / ethers.parseEther("1"));

    const randomAmount = Math.floor(Math.random() * max) + 1;

    const amount = ethers.parseEther(randomAmount.toString());

    await lpToken.connect(user1).approve(staking.target, amount);

    await staking.connect(user1).stake(amount);

    remaining -= amount;

    const balance = await staking.stakeBalance(user1.address);

    expect(balance).to.be.gt(0);

   }

  });

  it("Fuzz: random withdrawal requests", async function () {

   await lpToken.connect(user1).approve(staking.target, ethers.parseEther("100"));

   await staking.connect(user1).stake(ethers.parseEther("100"));

   for (let i = 0; i < 15; i++) {

        const randomAmount = Math.floor(Math.random() * 5) + 1;

        const amount = ethers.parseEther(randomAmount.toString());

        await staking.connect(user1).requestWithdraw(amount);

        const request = await staking.withdrawRequest(user1.address);

        expect(request).to.equal(amount);

    }

  });

  it("Fuzz: random stake and withdraw cycle", async function () {

   await lpToken.connect(user1).approve(staking.target, ethers.parseEther("100"));

   for (let i = 0; i < 10; i++) {

        const randomStake = Math.floor(Math.random() * 10) + 1;

        const amount = ethers.parseEther(randomStake.toString());

        await staking.connect(user1).stake(amount);

        const withdrawAmount = ethers.parseEther("1");

        await staking.connect(user1).requestWithdraw(withdrawAmount);

    }

  const balance = await staking.stakeBalance(user1.address);

  expect(balance).to.be.gt(0);

  });

});