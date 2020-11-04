# BondlyswapSubstrate
Depolyed on Plasm


ERC20:  0xe0605d8030e7C4f8770Ef670D574edC945197D40


PoolFactory:  0xbEc5b1faDE897D49A10DC02fD405dCa2aC4C752f


BidPoolFactory:  0x66bB595Bc60C8Af0a306aa86EDf96A88D3A59e9A

Followed: 
https://docs.plasmnet.io/workshop-and-tutorial/evm-smart-contracts
Custon RPC: http://8.210.56.181:9922


Compile the below abi to interact with Contracts through Remix 

// SPDX-License-Identifier: MIT
pragma solidity ^0.6.3;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.1.0/contracts/token/ERC20/IERC20.sol";

contract ABIFixedPoolFactory {

    struct FixedPool {
        string name;
        address payable maker;

        uint32 endTime;
        bool enabled;

        uint256 tokenRate;
        address tokenaddr;
        uint256 tokenAmount; // left amount
        uint256 units;
        bool onlyHolder;
    }

    mapping(uint32 => FixedPool) public fixedPools;
    uint32 public fixedPoolCnt = 1000;


    function createFixedPool(string memory _name, address _tracker, uint256 _amount, uint256 _rate, uint256 _units, uint32 _endTime, bool _onlyHolder)
    payable public {
        
    }

    function fixedPoolJoin(uint32 _id, uint256 _value)  payable public {
    }

    function fixedPoolClose(uint32 _id) public {
    }

}
contract ABIPrivFixedPoolFactory {
    
    struct PrivFixedPool {
        string name;
        address payable maker;

        uint32 endTime;
        bool enabled;

        uint256 tokenRate;
        address tokenaddr;
        uint256 tokenAmount; // left amount
        uint256 units;
        address[] takers;
    }

    mapping(uint32 => PrivFixedPool) public privFixedPools;

    uint32 public privFixedPoolCnt = 300;

    function createPrivFixedPool(string memory  _name, address _tracker, uint256 _amount, uint256 _rate, uint256 _units, uint32 _endTime,
    address[] memory _takers)
    payable public {

    }

    function privFixedPoolJoin(uint32 _id, uint32 _index, uint256 _value)  payable public {
        
    }

    function privFixedPoolClose(uint32 _id) public {
        
    }


    function privFixedPoolTakers(uint32 _id) public view returns(address[] memory){
        PrivFixedPool storage _pool = privFixedPools[_id];
        return _pool.takers;
    }
}

contract ABIPoolFactory is ABIFixedPoolFactory, ABIPrivFixedPoolFactory {}



contract BidPoolFactory  {


    struct BidPool {
        string name;
        address payable maker;

        uint32 endTime;
        bool enabled;

        address tokenaddr;
        uint256 tokenAmount; // maker erc20 token amount

        uint256 takerAmountTotal; // taker ether coin amount
        uint256 makerReceiveTotal; // maker received = all - fee
        mapping(address=>uint256) takerAmountMap; // taker ether coin amount

        bool onlyHolder; // only token holder could join
    }

    mapping(uint32 => BidPool) public bidPools;
    uint32 public bidPoolCnt = 100;

    function createBidPool(string memory  _name, address _tracker, uint256 _amount, uint32 _endTime, bool _onlyHolder) payable public {
       
    }

    function bidPoolJoin(uint32 _id, uint256 _value) payable public {
    }

    function bidPoolTakerWithdraw(uint32 _id) public {
    }

    function bidPoolMakerWithdraw(uint32 _id) public {
    }
}
