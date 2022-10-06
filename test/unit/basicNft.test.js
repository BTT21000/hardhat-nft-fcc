const { assert, expect } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", async function () {
          let basicNft, deployer /*, vrfCoordinatorV2Mock, raffleEntranceFee, deployer, interval*/

          const chainId = network.config.chainId

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              basicNft = await ethers.getContract("BasicNft", deployer)
          })

          describe("constructor", function () {
              it("initializes the rnft collection", async function () {
                  let name = await basicNft.name()
                  let symbol = await basicNft.symbol()
                  assert.equal(name, "Dogie")
                  assert.equal(symbol, "DOG")
              })
          })

          describe("mintNft", function () {
              it("check the owner and the counter increment", async function () {
                  const txResponse = await basicNft.mintNft()
                  txResponse.wait(1)
                  const tokenURI = await basicNft.tokenURI(0)
                  const TOKEN_URI = await basicNft.TOKEN_URI()
                  let counter = await basicNft.getTokenCounter()
                  assert.equal(counter, 1)
                  assert.equal(tokenURI, TOKEN_URI)
              })
          })
      })
