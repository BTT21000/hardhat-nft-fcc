const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("RandomIpfsNft Unit Tests", async function () {
          let randomIpfsNft,
              vrfCoordinatorV2Mock,
              mintFee,
              deployer,
              vrfCoordinatorV2Address,
              dogTokenUris
          const chainId = network.config.chainId

          beforeEach(async function () {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              await deployments.fixture(["mocks", "randomipfs"])
              randomIpfsNft = await ethers.getContract("RandomIpfsNft")
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")

              //   vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
              //   const tx = await vrfCoordinatorV2Mock.createSubscription()
              //   const txReceipt = await tx.wait(1)
              //   subscriptionId = txReceipt.events[0].args.subId
              dogTokenUris = [
                  "ipfs://QmaVkBn2tKmjbhphU7eyztbvSQU5EXDdqRyXZtRhSGgJGo",
                  "ipfs://QmYQC5aGZu2PTH8XzbJrbDnvhj3gVs7ya33H9mqUNvST3d",
                  "ipfs://QmZYmH5iDbD6v3U2ixoVAjioSzvWJszDzYdbeCLquGSpVm",
              ]
          })

          describe("randomIpfsNft constructor", function () {
              it("initializes the randomIpfsNft correctly", async function () {
                  //   const args = [
                  //       vrfCoordinatorV2Address,
                  //       subscriptionId,
                  //       networkConfig[chainId].gasLane,
                  //       networkConfig[chainId].callbackGasLimit,
                  //       dogTokenUris,
                  //       networkConfig[chainId].mintFee,
                  //   ]
                  assert.equal(await randomIpfsNft.getMintFee(), networkConfig[chainId].mintFee)
                  assert.equal(await randomIpfsNft.s_tokenCounter(), 0)
                  assert.equal((await randomIpfsNft.getChanceArray())[0], 10)
                  assert.equal((await randomIpfsNft.getChanceArray())[1], 30)
                  assert.equal((await randomIpfsNft.getChanceArray())[2], 100)
                  assert.equal(await randomIpfsNft.getDogTokenUris(0), dogTokenUris[0])
                  assert.equal(await randomIpfsNft.getDogTokenUris(1), dogTokenUris[1])
                  assert.equal(await randomIpfsNft.getDogTokenUris(2), dogTokenUris[2])
                  assert.equal(await randomIpfsNft.getBreedFromModdedRng(1), 0)
                  assert.equal(await randomIpfsNft.getBreedFromModdedRng(25), 1)
                  assert.equal(await randomIpfsNft.getBreedFromModdedRng(60), 2)
              })
          })

          describe("requestNft", function () {
              it("mint a randomIpfsNft", async function () {
                  const mintFee1 = await randomIpfsNft.getMintFee()
                  const txResponse = await randomIpfsNft.requestNft({ value: mintFee1.toString() })
                  txResponse.wait(1)

                  const owner = await randomIpfsNft.s_requestIdToSender(1)
                  assert.equal(owner, deployer.address)
                  assert.equal(await randomIpfsNft.getMintFee(), networkConfig[chainId].mintFee)

                  it("fails if payment isn't sent with the request", async function () {
                      await expect(randomIpfsNft.requestNft()).to.be.revertedWith(
                          "RandomIpfsNft__NeedMoreETHSent"
                      )
                  })
                  it("reverts if payment amount is less than the mint fee", async function () {
                      const fee = await randomIpfsNft.getMintFee()
                      await expect(
                          randomIpfsNft.requestNft({
                              value: mintFee.sub(ethers.utils.parseEther("0.001")),
                          })
                      ).to.be.revertedWith("RandomIpfsNft__NeedMoreETHSent")
                  })
                  it("emits an event and kicks off a random word request", async function () {
                      const fee = await randomIpfsNft.getMintFee()
                      await expect(randomIpfsNft.requestNft({ value: fee.toString() })).to.emit(
                          randomIpfsNft,
                          "NftRequested"
                      )
                  })
              })
          })

          describe("fulfillRandomWords", () => {
              it("mints NFT after random number is returned", async function () {
                  await new Promise(async (resolve, reject) => {
                      randomIpfsNft.once("NftMinted", async () => {
                          try {
                              const tokenUri = await randomIpfsNft.tokenURI("0")
                              const tokenCounter = await randomIpfsNft.getTokenCounter()
                              assert.equal(tokenUri.toString().includes("ipfs://"), true)
                              assert.equal(tokenCounter.toString(), "1")
                              resolve()
                          } catch (e) {
                              console.log(e)
                              reject(e)
                          }
                      })
                      try {
                          const fee = await randomIpfsNft.getMintFee()
                          const requestNftResponse = await randomIpfsNft.requestNft({
                              value: fee.toString(),
                          })
                          const requestNftReceipt = await requestNftResponse.wait(1)
                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              requestNftReceipt.events[1].args.requestId,
                              randomIpfsNft.address
                          )
                      } catch (e) {
                          console.log(e)
                          reject(e)
                      }
                  })
              })
          })
          describe("getBreedFromModdedRng", () => {
              it("should return pug if moddedRng < 10", async function () {
                  const expectedValue = await randomIpfsNft.getBreedFromModdedRng(7)
                  assert.equal(0, expectedValue)
              })
              it("should return shiba-inu if moddedRng is between 10 - 39", async function () {
                  const expectedValue = await randomIpfsNft.getBreedFromModdedRng(21)
                  assert.equal(1, expectedValue)
              })
              it("should return st. bernard if moddedRng is between 40 - 99", async function () {
                  const expectedValue = await randomIpfsNft.getBreedFromModdedRng(77)
                  assert.equal(2, expectedValue)
              })
              it("should revert if moddedRng > 99", async function () {
                  await expect(randomIpfsNft.getBreedFromModdedRng(100)).to.be.revertedWith(
                      "RandomIpfsNft_RangeOutOfBounds"
                  )
              })
          })
      })
