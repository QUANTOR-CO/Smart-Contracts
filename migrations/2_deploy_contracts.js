var SafeMath = artifacts.require('./SafeMath.sol');
var QuantorToken = artifacts.require("./QuantorToken.sol");

module.exports = function(deployer) {
  deployer.deploy(SafeMath);
  deployer.link(SafeMath, QuantorToken);
  deployer.deploy(QuantorToken);
};
