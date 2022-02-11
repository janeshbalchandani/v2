const { expect, assert } = require("chai");
const { network } = require("hardhat");
const { 
    lotto,
    BigNumber,
    generateLottoNumbers
} = require("./settings.js");

describe("Lottery contract", function() {
    let SafeERC20;
    // Creating the instance and contract info for the lottery contract
    let lotteryInstance, lotteryContract;
    // Creating the instance and contract info for the lottery NFT contract
    let IPancakeSwapLottery;
    // Creating the instance and contract info for the cake token contract
    let cakeInstance;
    // Creating the instance and contract info for the timer contract
    let timerContract;
    // Creating the instance and contract info for the mock rand gen
    let randGenInstance, randGenContract;
    // the ChainLink contract ecosystem. 
    let linkInstance;
    
    
    // Creating the users
    let owner, buyer;

    beforeEach(async () => {
        // Getting the signers provided by ethers
        const signers = await ethers.getSigners();
        // Creating the active wallets for use
        owner = signers[0];
        buyer = signers[1];

        // Getting the lottery code 
        lotteryContract = await ethers.getContractFactory("YodaLottery");
        // Getting the lottery code 
        IPancakeSwapLottery = await ethers.getContractFactory("IPancakeSwapLottery");
        // Getting the lottery code 
        SafeERC20 = await ethers.getContractFactory("SafeERC20");
        // Getting the timer code 
        timerContract = await ethers.getContractFactory("IPancakeSwapLottery");
        // Getting the ChainLink contracts code 
        randGenContract = await ethers.getContractFactory("IRandomNumberGenerator");
        mock_vrfCoordContract = await ethers.getContractFactory("IERC20");

        
        // Making sure the lottery has some cake
        await cakeInstance.mint(
            lotteryInstance.address,
            lotto.newLotto.prize
        );
        // Sending link to lottery
        await linkInstance.transfer(
            randGenInstance.address,
            lotto.buy.cake
        );
    });

    describe("Creating a new lottery tests", function() {
        
        // Tests that in the nominal case nothing goes wrong
         
        it("Nominal case", async function() {
            let currentTime = await lotteryInstance.getCurrentTime(); 
            let timeStamp = new BigNumber(currentTime.toString());
            await expect(
                lotteryInstance.connect(owner).createNewLotto(
                    lotto.newLotto.distribution,
                    lotto.newLotto.prize,
                    lotto.newLotto.cost,
                    timeStamp.toString(),
                    timeStamp.plus(lotto.newLotto.closeIncrease).toString()
                )
            ).to.emit(lotteryInstance, lotto.events.new)
            .withArgs(
                1,
                0
            );
        });
        //  Testing that non-admins cannot create a lotto
         
          it("Invalid admin", async function() {
            let currentTime = await lotteryInstance.getCurrentTime();
            let timeStamp = new BigNumber(currentTime.toString());
            await expect(
                lotteryInstance.connect(buyer).createNewLotto(
                    lotto.newLotto.distribution,
                    lotto.newLotto.prize,
                    lotto.newLotto.cost,
                    timeStamp.toString(),
                    timeStamp.plus(lotto.newLotto.closeIncrease).toString()
                )
            ).to.be.revertedWith(lotto.errors.invalid_admin);
        });
        //  Creating a lotto for all buying tests to use. A new instance
        //  for each lotto. 
         
          beforeEach( async () => {
            let startTime = await lotteryInstance.getStartTime();
            let timeStamp = new BigNumber(startTime.toString());
            await lotteryInstance.connect(owner).createNewLotto(
                lotto.newLotto.distribution,
                lotto.newLotto.prize,
                lotto.newLotto.cost,
                timeStamp.toString(),
                timeStamp.plus(lotto.newLotto.closeIncrease).toString()
            );
        });
        
        //  Tests cost per ticket is as expected
         
         it("Cost per ticket", async function() {
            let totalPrice = await lotteryInstance.costToBuyTickets(
                1,
                10
            );
            let check = BigNumber(totalPrice.toString());
            let noOfTickets = new BigNumber(10);
            let oneCost = check.div(noOfTickets);
            assert.equal(
                totalPrice.toString(),
                lotto.buy.ten.cost,
                "Incorrect cost for batch buy of 10"
            );
            assert.equal(
                oneCost.toString(),
                lotto.newLotto.cost.toString(),
                "Incorrect cost for batch buy of 10"
            );
        });
        
        //  Testing that a claim cannot happen until the winning numbers are
        //  chosen. 
         
         it("Invalid claim (winning numbers not chosen)", async function() {
            let userTicketIds = await lotteryNftInstance.getUserTickets(1, buyer.address);
            let startTime = await lotteryInstance.getStartTime(); 
            let timeStamp = new BigNumber(startTime.toString());
            let endTime = timeStamp.plus(lotto.newLotto.closeIncrease);
            await lotteryInstance.setCurrentTime(endTime.toString()); 
            await expect(
                lotteryInstance.connect(buyer).claimReward(
                    1,
                    userTicketIds[25].toString()
                )
            ).to.be.revertedWith(lotto.errors.invalid_claim_draw);
        });
        // Testing that only the owner of a token can claim winnings
        
         it("Invalid claim (not owner)", async function() {
            let startTime = await lotteryInstance.getStartTime();
            let timeStamp = new BigNumber(startTime.toString());
            let endTime = timeStamp.plus(lotto.newLotto.closeIncrease);
            await lotteryInstance.setStartTime(endTime.toString());
            let userTicketIds = await lotteryNftInstance.getUserTickets(1, buyer.address);
            let tx = await (await lotteryInstance.connect(owner).drawWinningNumbers(
                1,
                1234
            )).wait();
            let requestId = tx.events[0].args.requestId.toString();
            await mock_vrfCoordInstance.connect(owner).callBackWithRandomness(
                requestId,
                lotto.draw.random,
                randGenInstance.address
            );
            startTime = await lotteryInstance.getStartTime();
            timeStamp = new BigNumber(startTime.toString());
            let endTime = timeStamp.plus(lotto.newLotto.closeIncrease);
            await lotteryInstance.setStartTime(endTime.toString());
            await expect(
                lotteryInstance.connect(owner).claimReward(
                    1,
                    userTicketIds[25].toString()
                )
            ).to.be.revertedWith(lotto.errors.invalid_claim_owner);
        });
        // Testing that an invalid distribution will fail
        
       it("Invalid price distribution total", async function() {
           let startTime = await lotteryInstance.getStartTime();
           let timeStamp = new BigNumber(startTime.toString());
           await expect(
               lotteryInstance.connect(owner).createNewLotto(
                   lotto.errorData.distribution_total,
                   lotto.newLotto.prize,
                   lotto.newLotto.cost,
                   timeStamp.toString(),
                   timeStamp.plus(lotto.newLotto.closeIncrease).toString()
               )
           ).to.be.revertedWith(lotto.errors.invalid_distribution_total);
       });
         
        //  Testing that an invalid prize and cost will fail
         
          it("Invalid price distribution", async function() {
            let startTime = await lotteryInstance.getStartTime();
            let timeStamp = new BigNumber(startTime.toString());
            await expect(
                lotteryInstance.connect(owner).createNewLotto(
                    lotto.newLotto.distribution,
                    lotto.errorData.prize,
                    lotto.newLotto.cost,
                    timeStamp.toString(),
                    timeStamp.plus(lotto.newLotto.closeIncrease).toString()
                )
            ).to.be.revertedWith(lotto.errors.invalid_price_or_cost);
            await expect(
                lotteryInstance.connect(owner).createNewLotto(
                    lotto.newLotto.distribution,
                    lotto.newLotto.prize,
                    lotto.errorData.cost,
                    timeStamp.toString(),
                    timeStamp.plus(lotto.newLotto.closeIncrease).toString()
                )
            ).to.be.revertedWith(lotto.errors.invalid_price_or_cost);
        });

        });
    });

