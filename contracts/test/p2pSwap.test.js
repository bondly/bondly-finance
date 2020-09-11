const P2pSwap = artifacts.require("P2pSwap");
const DummyToken = artifacts.require("DummyToken");
const GummyToken = artifacts.require("GummyToken");


contract('P2pSwap', (accounts) => {
  let p2p, token1, token2;

  beforeEach('setup contract for each test', async function () {
    p2p = await P2pSwap.new(accounts[0]);
    token1 = await DummyToken.new();
    token2 = await GummyToken.new();
  });

  async function prep() {
    await token2.transfer(accounts[1], '10000000000000000000000', { from: accounts[0] });
    let bal11 = (await token1.balanceOf(accounts[0])).toString();
    let bal12 = (await token2.balanceOf(accounts[0])).toString();
    await assert.equal(bal11, '10000000000000000000000');
    await assert.equal(bal12, '0');
    let bal21 = (await token1.balanceOf(accounts[1])).toString();
    let bal22 = (await token2.balanceOf(accounts[1])).toString();
    await assert.equal(bal21, '0');
    await assert.equal(bal22, '10000000000000000000000');
    return [token1, token2]
  }

  function errMsg(e) {
    return e.reason || e.toString().split(' at ')[0];
  }

  function assertErrMsg(e, msg) {
    const actual = errMsg(e);
    assert.equal(true, actual.indexOf(msg)>=0, `Expected error: ${msg}, but got ${actual}`);
  }

  async function createSwap(id, amount1, amount2, noAlloc) {
    if (!noAlloc) {
      await token1.approve(p2p.address, amount1, {from: accounts[0]});
    }
    await p2p.registerSwap(id, token1.address, amount1, token2.address, amount2,
      { from: accounts[0], });
  }

  async function executeSwap(id, token, amount) {
    await token.approve(p2p.address, amount, {from: accounts[1]});
    await p2p.executeSwap(id, {from: accounts[1]});
  }

  it('happily swap 100 tokens1 with 50 token2', async () => {
    await prep();

    const swapId = 1;
    // Create the swap
    await createSwap(swapId, 100, 50);

    // Execute the swap
    await executeSwap(swapId, token2, 50);

    bal11 = (await token1.balanceOf(accounts[0])).toString();
    bal12 = (await token2.balanceOf(accounts[0])).toString();
    assert.equal(bal11, '9999999999999999999900');
    assert.equal(bal12, '50');
    bal21 = (await token1.balanceOf(accounts[1])).toString();
    bal22 = (await token2.balanceOf(accounts[1])).toString();
    assert.equal(bal21, '100');
    assert.equal(bal22, '9999999999999999999950');
  });

  it('Side1 without allocation, reverts', async () => {
    await prep();

    let err = false;
    const swapId = 1;
    // Create the swap should fail
    await createSwap(swapId, 200, 100, true);

    try  {
      await executeSwap(swapId, token2, 100);
    } catch(e) {
      console.log('Side2 without alloc failed!', errMsg(e));
      assertErrMsg(e, 'low-level call failed');
      err = true;
    }
    assert.equal(err, true);

    bal11 = (await token1.balanceOf(accounts[0])).toString();
    bal12 = (await token2.balanceOf(accounts[0])).toString();
    await assert.equal(bal11, '10000000000000000000000');
    await assert.equal(bal12, '0');
    bal21 = (await token1.balanceOf(accounts[1])).toString();
    bal22 = (await token2.balanceOf(accounts[1])).toString();
    await assert.equal(bal21, '0');
    await assert.equal(bal22, '10000000000000000000000');
  });

  it('Side2 without allocation, reverts', async () => {
    await prep();

    let err = false;
    const swapId = 1;
    // Create the swap should fail
    await createSwap(swapId, 200, 100);

    try  {
      await p2p.executeSwap(swapId, {from: accounts[1]});
    } catch(e) {
      console.log('Side2 without alloc failed!', errMsg(e));
      assertErrMsg(e, 'low-level call failed');
      err = true;
    }
    assert.equal(err, true);

    bal11 = (await token1.balanceOf(accounts[0])).toString();
    bal12 = (await token2.balanceOf(accounts[0])).toString();
    await assert.equal(bal11, '10000000000000000000000');
    await assert.equal(bal12, '0');
    bal21 = (await token1.balanceOf(accounts[1])).toString();
    bal22 = (await token2.balanceOf(accounts[1])).toString();
    await assert.equal(bal21, '0');
    await assert.equal(bal22, '10000000000000000000000');
  });

  it('Double register same ID', async () => {
    await prep();

    let err = false;
    const swapId = 1;
    // Create the swap should fail
    await createSwap(swapId, 200, 100);

    await createSwap(2, 200, 100);

    try  {
      await createSwap(1, 200, 100);
    } catch(e) {
      console.log('Double register swap failed!', errMsg(e));
      assertErrMsg(e, 'Swap already exists');
      err = true;
    }
    assert.equal(err, true);
  });

  it('Executing non-existing ID', async () => {
    await prep();

    const swapId = 1;
    // Create the swap should fail
    await createSwap(swapId, 200, 100);

    let err = false;
    try  {
      await executeSwap(2, token2, 100);
    } catch(e) {
      console.log('ExecuteSwap with non-existing ID failed!', errMsg(e));
      assertErrMsg(e, 'Swap does not exists');
      err = true;
    }
    assert.equal(err, true);
  });

  it('Executing already executed ID', async () => {
    await prep();

    const swapId = 1;
    // Create the swap
    await createSwap(swapId, 100, 50);

    // Execute the swap
    await executeSwap(swapId, token2, 50);

    // Now execute the swap again
    let err = false;
    try  {
      await executeSwap(swapId, token2, 100);
    } catch(e) {
      console.log('ExecuteSwap already executed failed!', errMsg(e));
      assertErrMsg(e, 'Swap not available');
      err = true;
    }
    assert.equal(err, true);
  });

  it('Getting swap before and after execution', async () => {
    await prep();

    const swapId = 1;
    // Create the swap
    await createSwap(swapId, 100, 50);
    const swapBefore = swapToObj(await p2p.getSwap(swapId));
    assert.equal(swapBefore.aliceAddress, accounts[0]);
    assert.equal(swapBefore.token1, token1.address);
    assert.equal(swapBefore.value1, '100');
    assert.equal(swapBefore.token2, token2.address);
    assert.equal(swapBefore.value2, '50');
    assert.equal(swapBefore.executed, '0');

    // Execute the swap
    await executeSwap(swapId, token2, 50);
    const swapAfter = swapToObj(await p2p.getSwap(swapId))
    assert.equal(swapAfter.executed, '1');
  });

  it('Cancel swap', async () => {
    await prep();

    const swapId = 1;
    // Create the swap
    await createSwap(swapId, 100, 50);
    // Cancel
    await p2p.cancelSwap(swapId);

    // Execute the swap
    let err = false;
    try  {
      await executeSwap(swapId, token2, 50);
    } catch(e) {
      console.log('Execing a cancelled swap failed!', errMsg(e));
      assertErrMsg(e, 'Swap not available');
      err = true;
    }
    assert.equal(err, true);
  });
});

function swapToObj(result) {
  return {
      aliceAddress: result[0],
      token1: result[1],
      value1: result[2].toString(),
      token2: result[3].toString(),
      value2: result[4].toString(),
      executed: result[5].toString(),
  }
}