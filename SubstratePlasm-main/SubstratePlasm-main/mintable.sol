pragma solidity ^0.6.3;

import "./tools.sol";

interface Mintable {
    function mint(address account, uint256 amount) external returns (bool);
}


interface IMintProxy {
    function mint(address account, uint256 amount, uint8 tp) external returns (bool);
}

contract TmpMintProxy is IMintProxy, Operable, Destructor {
    using SafeERC20 for IERC20;

    event Mint(address indexed user, uint8 indexed tp, uint256 amount);

    IERC20 public token;

    constructor(IERC20 _token) Operable(address(0)) public {
        token = _token;
    }

    // mint for deposit lp token
    function mint(address account, uint256 amount, uint8 tp) onlyOperator onlyBeforeDestruct override public returns (bool){
        require(account != address(0), "mint to the zero address");
        IERC20(token).safeTransfer(account, amount);
        emit Mint(account, tp, amount);
        return true;
    }
}
