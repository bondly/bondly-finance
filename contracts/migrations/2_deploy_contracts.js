const Token1 = artifacts.require("DummyToken");
const Token2 = artifacts.require("GummyToken");
const P2pSwap = artifacts.require("P2pSwap");

module.exports = function(deployer) {
  deployer.deploy(Token1);
  deployer.deploy(Token2);
  deployer.deploy(P2pSwap);
};
