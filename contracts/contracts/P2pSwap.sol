// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

/**
 * @title P2pSwap
 * @dev Basic peer to per swap. Alice exchanging X tok1 with Y tok2 with Bob
 **/
contract P2pSwap {
    using SafeERC20 for IERC20;
    struct Swap {
        address aliceAddress;
        address token1;
        uint256 value1;
        address token2;
        uint256 value2;
        uint8 executed; // 0 - pending, 1 - executed, 2 - canceled
    }

    mapping(uint256 => Swap) swaps;

    function getSwap(uint256 _id)
    public view returns (address, address, uint256, address, uint256, uint8) {
        Swap memory swap = swaps[_id];
        return (
            swap.aliceAddress,
            swap.token1,
            swap.value1,
            swap.token2,
            swap.value2,
            swap.executed
        );
    }

    function registerSwap(
        uint256 _id,
        address _token1,
        uint256 _value1,
        address _token2,
        uint256 _value2)
    public returns (bool) {
        require(_id != 0);
        require(_token1 != address(0));
        require(_value1 != 0);
        require(_token2 != address(0));
        require(_value2 != 0);
        Swap storage swap = swaps[_id];
        require(swap.aliceAddress == address(0), "Swap already exists");
        swap.aliceAddress = msg.sender;
        swap.token1 = _token1;
        swap.value1 = _value1;
        swap.token2 = _token2;
        swap.value2 = _value2;
        return true;
    }

    function cancelSwap(uint256 _id) public returns (bool) {
        Swap storage swap = swaps[_id];
        require(swap.executed == 0, "Swap not available");
        require(swap.aliceAddress == msg.sender, "Not your swap");
        swap.executed = 2;
    }

    function executeSwap(uint256 _id)
    public returns (bool) {
        Swap storage swap = swaps[_id];
        require(swap.aliceAddress != address(0), "Swap does not exists");
        require(swap.executed == 0, "Swap not available");
        address _bob = msg.sender;
        IERC20 Token1 = IERC20(swap.token1);
        IERC20 Token2 = IERC20(swap.token2);
        // Swap. Make sure to set the allowances in advance
        Token1.safeTransferFrom(swap.aliceAddress, _bob, swap.value1);
        Token2.safeTransferFrom(_bob, swap.aliceAddress, swap.value2);
        swap.executed = 1;
        return true;
    }
}