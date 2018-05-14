pragma solidity ^0.4.18;

import "./Haltable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./QuantorToken.sol";
import "./InvestorWhiteList.sol";
import "./abstract/PriceReceiver.sol";

contract QuantorPreSale is Haltable, PriceReceiver {

  using SafeMath for uint;

  string public constant name = "Quantor Token ICO";

  QuantorToken public token;

  address public beneficiary;

  InvestorWhiteList public investorWhiteList;

  uint public constant QNTUsdRate = 1; //0.01 cents fot one token

  uint public ethUsdRate;

  uint public btcUsdRate;

  uint public hardCap;

  uint public softCap;

  uint public collected = 0;

  uint public tokensSold = 0;

  uint public weiRefunded = 0;

  uint public startTime;

  uint public endTime;

  bool public softCapReached = false;

  bool public crowdsaleFinished = false;

  mapping (address => uint) public deposited;

  uint public constant PRICE_BEFORE_SOFTCAP = 65; // in cents * 100
  uint public constant PRICE_AFTER_SOFTCAP = 80; // in cents * 100

  event SoftCapReached(uint softCap);

  event Log(uint number);

  event NewContribution(address indexed holder, uint tokenAmount, uint etherAmount);

  event NewReferralTransfer(address indexed investor, address indexed referral, uint tokenAmount);

  event Refunded(address indexed holder, uint amount);

  modifier icoActive() {
    require(now >= startTime && now < endTime);
    _;
  }

  modifier icoEnded() {
    require(now >= endTime);
    _;
  }

  modifier minInvestment() {
    require(msg.value.mul(ethUsdRate).div(QNTUsdRate) >= 50000 * 1 ether);
    _;
  }

  modifier inWhiteList() {
    require(investorWhiteList.isAllowed(msg.sender));
    _;
  }

  function QuantorPreSale(
    uint _hardCapQNT,
    uint _softCapQNT,
    address _token,
    address _beneficiary,
    address _investorWhiteList,
    uint _baseEthUsdPrice,

    uint _startTime,
    uint _endTime
  ) {
    hardCap = _hardCapQNT.mul(1 ether);
    softCap = _softCapQNT.mul(1 ether);

    token = QuantorToken(_token);
    beneficiary = _beneficiary;
    investorWhiteList = InvestorWhiteList(_investorWhiteList);

    startTime = _startTime;
    endTime = _endTime;

    ethUsdRate = _baseEthUsdPrice;
  }

  function() payable minInvestment inWhiteList {
    doPurchase();
  }

  function refund() external icoEnded {
    require(softCapReached == false);
    require(deposited[msg.sender] > 0);

    uint refund = deposited[msg.sender];

    deposited[msg.sender] = 0;
    msg.sender.transfer(refund);

    weiRefunded = weiRefunded.add(refund);
    Refunded(msg.sender, refund);
  }

  function withdraw() external icoEnded onlyOwner {
    require(softCapReached);
    beneficiary.transfer(collected);
    token.transfer(beneficiary, token.balanceOf(this));
    crowdsaleFinished = true;
  }

  function calculateTokens(uint ethReceived) internal view returns (uint) {
    if (!softCapReached) {
      uint tokens = ethReceived.mul(ethUsdRate.mul(100)).div(PRICE_BEFORE_SOFTCAP);
      if (softCap >= tokensSold.add(tokens)) return tokens;
      uint firstPart = softCap.sub(tokensSold);
      uint  firstPartInWei = firstPart.mul(PRICE_BEFORE_SOFTCAP).div(ethUsdRate.mul(100));
      uint secondPartInWei = ethReceived.sub(firstPart.mul(PRICE_BEFORE_SOFTCAP).div(ethUsdRate.mul(100)));
      return firstPart.add(secondPartInWei.mul(ethUsdRate.mul(100)).div(PRICE_AFTER_SOFTCAP));
    }
    return ethReceived.mul(ethUsdRate.mul(100)).div(PRICE_AFTER_SOFTCAP);
  }

  function receiveEthPrice(uint ethUsdPrice) external onlyEthPriceProvider {
    require(ethUsdPrice > 0);
    ethUsdRate = ethUsdPrice;
  }

  function setEthPriceProvider(address provider) external onlyOwner {
    require(provider != 0x0);
    ethPriceProvider = provider;
  }

  function setNewWhiteList(address newWhiteList) external onlyOwner {
    require(newWhiteList != 0x0);
    investorWhiteList = InvestorWhiteList(newWhiteList);
  }

  function doPurchase() private icoActive inNormalState {
    require(!crowdsaleFinished);

    uint tokens = calculateTokens(msg.value);

    uint newTokensSold = tokensSold.add(tokens);

    require(newTokensSold <= hardCap);

    if (!softCapReached && newTokensSold >= softCap) {
      softCapReached = true;
      SoftCapReached(softCap);
    }

    collected = collected.add(msg.value);

    tokensSold = newTokensSold;

    deposited[msg.sender] = deposited[msg.sender].add(msg.value);

    token.transfer(msg.sender, tokens);
    NewContribution(msg.sender, tokens, msg.value);
  }

  function transferOwnership(address newOwner) onlyOwner icoEnded {
    super.transferOwnership(newOwner);
  }
}
