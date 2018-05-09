const EthPriceProvider = artifacts.require("EthPriceProvider");
const BtcPriceProvider = artifacts.require("BtcPriceProvider");

const EthPriceProviderHelper = artifacts.require("EthPriceProviderHelper");
const PriceReceiverHelper = artifacts.require("PriceReceiverHelper");

const assertJump = function(error) {
  assert.isAbove(error.message.search('VM Exception while processing transaction: revert'), -1, 'Invalid opcode error must be returned');
};

contract('EthPriceProvider', function (accounts) {
  beforeEach(async function () {
    this.ethPriceProvider = await EthPriceProvider.new();
    this.btcPriceProvider = await BtcPriceProvider.new();
  });

  afterEach(async function () {
    try {
      await this.ethPriceProvider.stopUpdate();
    } catch (e) {

    }

    try {
      await this.btcPriceProvider.stopUpdate();
    } catch (e) {

    }
  });

  it('should set correct URL', async function () {
    const ethUrl = await this.ethPriceProvider.url();
    assert.equal("json(https://api.kraken.com/0/public/Ticker?pair=ETHUSD).result.XETHZUSD.c.0", ethUrl);

    const btcUrl = await this.btcPriceProvider.url();
    assert.equal("json(https://api.kraken.com/0/public/Ticker?pair=XBTUSD).result.XXBTZUSD.c.0", btcUrl);
  });

  it('should be created with stopped state', async function () {
    //enum - Stopped will be 0
    const state = (await this.ethPriceProvider.state()).toNumber();
    assert.equal(0, state);
  });

  it('should have 2 hours updateInterval by default', async function () {
    const interval = (await this.ethPriceProvider.updateInterval()).toNumber();
    assert.equal(7200, interval);
  });

  it('should allow to start update only for owner', async function () {
    try {
      await this.ethPriceProvider.startUpdate(30000, { value: web3.toWei(10), from: accounts[1] });
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should allow to start update', async function () {
    await this.ethPriceProvider.startUpdate(30000, { value: web3.toWei(10), from: accounts[0] });

    const currentPrice = await this.ethPriceProvider.currentPrice();
    assert.equal(30000, currentPrice);

    //should not allow to start again
    try {
      await this.ethPriceProvider.startUpdate(30000, { value: web3.toWei(10), from: accounts[0] });
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should allow to stop update', async function () {
    await this.ethPriceProvider.startUpdate(30000, { value: web3.toWei(10), from: accounts[0] });
    await this.ethPriceProvider.stopUpdate({ from: accounts[0] });

    //should not allow to stop again
    try {
      await this.ethPriceProvider.stopUpdate({ from: accounts[0] });
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should allow to stop update only by owner', async function () {
    await this.ethPriceProvider.startUpdate(30000, { value: web3.toWei(10), from: accounts[0] });

    try {
      await this.ethPriceProvider.stopUpdate({ from: accounts[1] });
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should allow to set url only by owner', async function () {
    await this.ethPriceProvider.setUrl("new url", { from: accounts[0] });
    const url = await this.ethPriceProvider.url();

    assert.equal("new url", url);

    try {
      await this.ethPriceProvider.setUrl("new url", { from: accounts[1] });
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should allow to set update interval only by owner', async function () {
    await this.ethPriceProvider.setUpdateInterval(100, { from: accounts[0] });
    const interval = await this.ethPriceProvider.updateInterval();

    assert.equal(100, interval);

    try {
      await this.ethPriceProvider.setUpdateInterval(100, { from: accounts[1] });
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should not allow to set update interval to 0', async function () {
    try {
      await this.ethPriceProvider.setUpdateInterval(0, { from: accounts[0] });
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should allow to set watcher only by owner', async function () {
    await this.ethPriceProvider.setWatcher(accounts[1], { from: accounts[0] });
    const watcher = await this.ethPriceProvider.watcher();

    assert.equal(accounts[1], watcher);

    try {
      await this.ethPriceProvider.setWatcher(accounts[1], { from: accounts[1] });
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should not allow to set watcher to 0x0', async function () {
    try {
      await this.ethPriceProvider.setWatcher(0x0, { from: accounts[0] });
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should allow withdraw only in stopped state', async function () {
    await this.ethPriceProvider.startUpdate(30000, { value: web3.toWei(10), from: accounts[0] });

    try {
      await this.ethPriceProvider.withdraw(accounts[0], { from: accounts[0] });
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should allow withdraw only for owner', async function () {
    await this.ethPriceProvider.startUpdate(30000, { value: web3.toWei(10), from: accounts[0] });

    try {
      await this.ethPriceProvider.withdraw(accounts[1], { from: accounts[1] });
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should allow withdraw', async function () {
    await this.ethPriceProvider.startUpdate(30000, { value: web3.toWei(10), from: accounts[0] });
    await this.ethPriceProvider.stopUpdate({ from: accounts[0] });

    const oldBalance = web3.eth.getBalance(accounts[0]);

    await this.ethPriceProvider.withdraw(accounts[0], { from: accounts[0] });

    const newBalance = web3.eth.getBalance(accounts[0]);
    assert(web3.eth.getBalance(this.ethPriceProvider.address).eq(0));
    assert(newBalance.gt(oldBalance));
  });

  it('should not allow to call update directly', async function () {
    try {
      await this.ethPriceProvider.update(100, { from: accounts[0] });
    } catch (error) {
      return;
    }
    assert.fail('should have thrown before');
  });

  it('should not allow to call notify watcher directly', async function () {
    try {
      await this.ethPriceProvider.notifyWatcher({ from: accounts[0] });
    } catch (error) {
      return;
    }
    assert.fail('should have thrown before');
  });

  it('complex tests for price receiver/provider', async function () {
    const provider = await EthPriceProviderHelper.new({from: accounts[0]});
    const receiver = await PriceReceiverHelper.new({from: accounts[0]});
    await provider.setWatcher(receiver.address, {from: accounts[0]});
    await receiver.setEthPriceProvider(provider.address, {from: accounts[0]});

    // some checks, that ether will be spent from provider
    await provider.startUpdate(86126, {value: web3.toWei(1, 'ether'), gasPrice:0, from: accounts[0]});

    let providerBalance = await web3.eth.getBalance(provider.address);
    const updatePrice = await provider.oraclize_getPrice_public.call();
    assert(providerBalance.add(updatePrice).eq(web3.toWei(1, 'ether')));

    await provider.emulateUpdate(11);
    providerBalance = await web3.eth.getBalance(provider.address);
    assert(providerBalance.add(updatePrice.mul(2)).eq(web3.toWei(1, 'ether')));

    await provider.stopUpdate({from: accounts[0]});


    //to small price 888.88
    await provider.startUpdate(88888, {value: web3.toWei(1, 'ether'), from: accounts[0]});
    await provider.emulateUpdate(11);
    await provider.callCallback(11, "748.92000", "0x0");
    assert.equal(0, (await provider.state()).toNumber());

    //to big price 633.33
    await provider.startUpdate(63333, {value: web3.toWei(1, 'ether'), from: accounts[0]});
    await provider.emulateUpdate(11);
    await provider.callCallback(11, "748.92000", "0x0");
    assert.equal(0, (await provider.state()).toNumber());

    //normal price
    await provider.startUpdate(74000, {value: web3.toWei(1, 'ether'), from: accounts[0]});
    await provider.emulateUpdate(11);
    await provider.callCallback(11, "748.92000", "0x0");
    assert((await receiver.receivedEthPrice()).eq(74892))

  });

});