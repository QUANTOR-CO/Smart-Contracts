pragma solidity ^0.4.0;
import "../abstract/PriceReceiver.sol";

contract PriceReceiverHelper is PriceReceiver {

  uint public receivedEthPrice;

  function receiveEthPrice(uint ethUsdPrice) external {
    receivedEthPrice = ethUsdPrice;
  }

  function setEthPriceProvider(address provider) external {
    ethPriceProvider = provider;
  }


  function receiveBtcPrice(uint /*btcUsdPrice*/) external {}
  function setBtcPriceProvider(address /*provider*/) external {}
}
