var SafeMath = artifacts.require('./SafeMath.sol');
var QuantorToken = artifacts.require("./QuantorToken.sol");
var QuantorPreSale = artifacts.require("./QuantorPreSale.sol");
var EthPriceProvider = artifacts.require("./EthPriceProvider.sol");
var InvestorWhiteList = artifacts.require("./InvestorWhiteList.sol");

module.exports = function(deployer) {
  deployer.deploy(SafeMath);
  deployer.link(SafeMath, QuantorToken);
  deployer.link(SafeMath, QuantorPreSale);
  deployer.deploy(QuantorToken).then(async function() {
    const hardCap = 26600000; //in QNT
    const softCap = 2500000; //in QNT
    const token = QuantorToken.address;
    const beneficiary = web3.eth.accounts[0];
    const startTime = Math.floor(Date.now() / 1000);
    const endTime = startTime + 600; // 10 minutes
    await deployer.deploy(InvestorWhiteList);
    await deployer.deploy(QuantorPreSale, hardCap, softCap, token, beneficiary, InvestorWhiteList.address, 25500, startTime, endTime);
    await deployer.deploy(EthPriceProvider);

    const icoInstance = web3.eth.contract(QuantorPreSale.abi).at(QuantorPreSale.address);
    const ethProvider = web3.eth.contract(EthPriceProvider.abi).at(EthPriceProvider.address);

    icoInstance.setEthPriceProvider(EthPriceProvider.address, { from: web3.eth.accounts[0] });
    ethProvider.setWatcher(QuantorPreSale.address, { from: web3.eth.accounts[0] });

    //start update and send ETH to cover Oraclize fees
    ethProvider.startUpdate(30000, { value: web3.toWei(1000), from: web3.eth.accounts[0], gas: 200000 });
  });
};
