import { expect } from "chai";
import { ethers } from "hardhat";

describe("MockUSDC", function () {
  it("should have 6 decimals", async function () {
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    expect(await usdc.decimals()).to.equal(6);
  });

  it("should mint tokens", async function () {
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    const [owner] = await ethers.getSigners();
    await usdc.mint(owner.address, 1000_000000n);
    expect(await usdc.balanceOf(owner.address)).to.equal(1000_000000n);
  });

  it("should have correct name and symbol", async function () {
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    expect(await usdc.name()).to.equal("Mock USDC");
    expect(await usdc.symbol()).to.equal("USDC");
  });

  it("should allow transfers", async function () {
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    const [owner, other] = await ethers.getSigners();
    await usdc.mint(owner.address, 1000_000000n);
    await usdc.transfer(other.address, 500_000000n);
    expect(await usdc.balanceOf(owner.address)).to.equal(500_000000n);
    expect(await usdc.balanceOf(other.address)).to.equal(500_000000n);
  });

  it("should allow approve and transferFrom", async function () {
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    const [owner, spender] = await ethers.getSigners();
    await usdc.mint(owner.address, 1000_000000n);
    await usdc.approve(spender.address, 500_000000n);
    await usdc.connect(spender).transferFrom(owner.address, spender.address, 500_000000n);
    expect(await usdc.balanceOf(owner.address)).to.equal(500_000000n);
    expect(await usdc.balanceOf(spender.address)).to.equal(500_000000n);
  });
});
