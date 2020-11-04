pragma solidity ^0.6.3;

import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";

abstract contract Destructor is Ownable {
    bool public destructing;

    modifier onlyBeforeDestruct() {
        require(!destructing, "pre destory...");
        _;
    }

    modifier onlyDestructing() {
        require(destructing, "destorying...");
        _;
    }

    function preDestruct() onlyOwner onlyBeforeDestruct public {
        destructing = true;
    }

    function destructERC20(address _erc20, uint256 _amount) onlyOwner onlyDestructing public {
        if (_amount == 0) {
            _amount = IERC20(_erc20).balanceOf(address(this));
        }
        require(_amount > 0, "check balance");
        IERC20(_erc20).transfer(owner(), _amount);
    }

    function destory() onlyOwner onlyDestructing public {
        selfdestruct(address(uint160(owner())));
    }
}


abstract contract Operable is Ownable {
    address public operator;

    event OperatorUpdated(address indexed previous, address indexed newOperator);
    constructor(address _operator) public {
        if (_operator == address(0)) {
            operator = msg.sender;
        } else {
            operator = _operator;
        }
    }

    modifier onlyOperator() {
        require(operator == msg.sender, "Operable: caller is not the operator");
        _;
    }

    function updateOperator(address newOperator) public onlyOwner {
        require(newOperator != address(0), "Operable: new operator is the zero address");
        emit OperatorUpdated(operator, newOperator);
        operator = newOperator;
    }
}


interface IMigratorChef {
    // Perform LP token migration from legacy UniswapV2 to SushiSwap.
    // Take the current LP token address and return the new LP token address.
    // Migrator should have full access to the caller's LP token.
    // Return the new LP token address.
    //
    // XXX Migrator must have allowance access to UniswapV2 LP tokens.
    // SushiSwap must mint EXACTLY the same amount of SushiSwap LP tokens or
    // else something bad will happen. Traditional UniswapV2 does not
    // do that so be careful!
    function migrate(IERC20 token) external returns (IERC20);
}
