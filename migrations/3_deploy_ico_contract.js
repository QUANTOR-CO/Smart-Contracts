var SafeMath = artifacts.require('./SafeMath.sol');
var QuantorToken = artifacts.require("./QuantorToken.sol");
var QuantorPreSale = artifacts.require("./QuantorPreSale.sol");
var EthPriceProvider = artifacts.require("./EthPriceProvider.sol");
var BtcPriceProvider = artifacts.require("./BtcPriceProvider.sol");
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
    const startBlock = web3.eth.blockNumber;
    const endBlock = web3.eth.blockNumber + 2000;
    await deployer.deploy(InvestorWhiteList);
    await deployer.deploy(QuantorPreSale, hardCap, softCap, token, beneficiary, InvestorWhiteList.address, 25500, 420000, startBlock, endBlock);
    await deployer.deploy(EthPriceProvider);
    await deployer.deploy(BtcPriceProvider);

    const icoInstance = web3.eth.contract(QuantorPreSale.abi).at(QuantorPreSale.address);
    const ethProvider = web3.eth.contract(EthPriceProvider.abi).at(EthPriceProvider.address);
    const btcProvider = web3.eth.contract(BtcPriceProvider.abi).at(BtcPriceProvider.address);

    icoInstance.setEthPriceProvider(EthPriceProvider.address, { from: web3.eth.accounts[0] });
    icoInstance.setBtcPriceProvider(BtcPriceProvider.address, { from: web3.eth.accounts[0] });
    ethProvider.setWatcher(QuantorPreSale.address, { from: web3.eth.accounts[0] });
    btcProvider.setWatcher(QuantorPreSale.address, { from: web3.eth.accounts[0] });

    //start update and send ETH to cover Oraclize fees
    ethProvider.startUpdate(30000, { value: web3.toWei(1000), from: web3.eth.accounts[0], gas: 200000 });
    btcProvider.startUpdate(650000, { value: web3.toWei(1000), from: web3.eth.accounts[0], gas: 200000 });
  });
};
