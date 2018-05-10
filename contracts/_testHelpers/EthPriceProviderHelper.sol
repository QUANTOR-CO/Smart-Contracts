pragma solidity ^0.4.0;
import "../EthPriceProvider.sol";

contract EthPriceProviderHelper is EthPriceProvider {

  function emulateUpdate(bytes32 _queryId) external {
    validIds[_queryId] = true;
    oraclize_query(0, "URL", 'https://google.com');
  }

  function callCallback(bytes32 myid, string result, bytes proof) public {
    __callback(myid, result, proof);
  }


  function oraclize_cbAddress() internal returns (address){
    return msg.sender;
  }

  function oraclize_getPrice_public() public returns (uint){
    return oraclize_getPrice("URL");
  }
}
