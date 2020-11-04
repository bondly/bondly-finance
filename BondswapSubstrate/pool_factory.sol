pragma solidity ^0.6.3;

import "./mintable.sol";

abstract contract Reward is Ownable {
    using SafeMath for uint256;
    uint256 private dayRewardAmount;

    mapping(address => uint256) rewardDetails;
    address[] rewardAddr;

    uint32 public lastMintDayTime;
    uint32 public units;

    event Mint(uint32 time, uint256 amount);

    constructor() public {
        units = 86400;
    }

    function updateUnits(uint32 _units) onlyOwner public{
        units = _units;
    }

    // update lastDayTime
    function refreshMintDay() internal returns(uint16)  {
        uint32 _units = units;
        uint32 _dayTime = ( uint32(now) / _units ) * _units;
        require(_dayTime>lastMintDayTime, "day time check");
        lastMintDayTime = _dayTime;
    }

    function clearReward() private {
        uint _addrsLength = rewardAddr.length;
        for (uint i=0; i< _addrsLength; i++) {
            delete rewardDetails[rewardAddr[i]];
        }
        delete rewardAddr;
    }

    function mint() internal {
        // clear reward
        clearReward();

        address[] memory _addrs;
        uint256[] memory _amounts;
        uint256 _total;
        (_addrs, _amounts, _total) = mintInfo();

        require(_addrs.length == _amounts.length, "check length");
        require(_total > 0, "check total");

        uint256 _rewardAmount = getRewardAmount();

        uint _addrsLength = _addrs.length;
        for (uint i=0; i< _addrsLength; i++) {
            require(_addrs[i]!=address(0), "check address");
            require(_amounts[i]>0, "check amount");

            rewardDetails[_addrs[i]] = _amounts[i].mul(_rewardAmount).div(_total);
            rewardAddr.push(_addrs[i]);
        }

        emit Mint(lastMintDayTime, _rewardAmount);
    }

    function withdraw() public {
        uint256 _amount = rewardDetails[msg.sender];
        require(_amount>0, "check reward amount");
        // clear
        rewardDetails[msg.sender] = 0;

        transferTo(msg.sender, _amount);
    }

    function myReward(address addr) public view returns(uint256){
        return rewardDetails[addr];
    }

    function withdrawInfo() public view returns(uint32, address[] memory,  uint256[] memory, uint256) {
        uint256[] memory _amounts = new uint256[](rewardAddr.length);
        uint256 _total = 0;
        uint _arrLength = rewardAddr.length;
        for (uint i=0; i< _arrLength; i++) {
            uint256 amount = rewardDetails[rewardAddr[i]];
            _total = _total.add(amount);
            _amounts[i] = amount;
        }
        return (lastMintDayTime, rewardAddr, _amounts, _total);
    }

    function transferTo(address _to, uint256 _amount) internal virtual;
    function getRewardAmount() public view virtual returns (uint256);
    function mintInfo() public view virtual returns(address[] memory,  uint256[] memory, uint256);
}

abstract contract RewardERC20 is Reward {
    uint256 private dayRewardAmount;
    address public rewardToken;

    constructor(address _rewardToken, uint256 _dayRewardAmount) public {
        dayRewardAmount = _dayRewardAmount;
        rewardToken = _rewardToken;
    }

    function updateRewardAmount(uint256 _amount) onlyOwner public {
        dayRewardAmount = _amount;
    }

    function getRewardAmount() public view override returns (uint256) {
        return dayRewardAmount;
    }


    function transferTo(address _to, uint256 _amount) internal override {
        // transfer erc20 token
        IERC20(rewardToken).transfer(_to, _amount);
    }
}

interface ILiquidity {
    function emitJoin(address _taker, uint256 _ethVal) external;
}

contract LiquidityStats is Ownable {
    using SafeMath for uint256;

    mapping(address=>uint8) public factoryOwnerMap;
    address public clearOwner;

    mapping ( address => uint256 ) public takerValueMap;
    address[] public takerArr;

    uint256 public threshold;

    constructor(address[] memory _factorys, uint256 _threshold) public {
        uint _arrLength = _factorys.length;
        for (uint i=0; i< _arrLength; i++) {
            factoryOwnerMap[_factorys[i]] = 1;
        }
        threshold = _threshold;
    }

    function updateFactoryOwner(address[] memory _addrs, uint8[] memory _vals) onlyOwner public {
        uint _arrLength = _addrs.length;
        for (uint i=0; i< _arrLength; i++) {
            factoryOwnerMap[_addrs[i]] = _vals[i];
        }
    }

    function updateThreshold(uint256 _threshold) onlyOwner public {
        threshold = _threshold;
    }

    function updateClearOwner(address _addr) onlyOwner public {
        clearOwner = _addr;
    }

    function emitJoin(address _taker, uint256 _ethVal) public {
        require(factoryOwnerMap[msg.sender]>0, "factory address check");
        if(_ethVal>=threshold){
            uint256 prev = takerValueMap[_taker];
            if (prev == 0) {
                takerArr.push(_taker);
            }
            takerValueMap[_taker] = prev.add(1);
        }
    }

    function clear() public {
        require(msg.sender == clearOwner, "clear owner address check");

        uint _arrLength = takerArr.length;
        for (uint i=0; i< _arrLength; i++) {
            delete takerValueMap[takerArr[i]];
        }
        delete takerArr;
    }

    function stats() public view returns(address[] memory,  uint256[] memory, uint256) {
        uint256[] memory _amounts = new uint256[](takerArr.length);
        uint256 _total = 0;
        uint _arrLength = takerArr.length;
        for (uint i=0; i< _arrLength; i++) {
            uint256 amount = takerValueMap[takerArr[i]];
            _total = _total.add(amount);
            _amounts[i] = amount;
        }
        return (takerArr, _amounts, _total);
    }
}

interface IStats {
    function stats() external view returns(address[] memory,  uint256[] memory, uint256);
    function clear() external;
}

contract LiquidityMiner is Operable, RewardERC20, Destructor {
    address public liquidityStatsAddr;

    constructor(address _rewardToken, uint256 _dayRewardAmount, address _statsAddr, address _operatorAddr) Operable(_operatorAddr) RewardERC20(_rewardToken,_dayRewardAmount) public {
        liquidityStatsAddr = _statsAddr;
    }

    function updateStatsAddr(address _addr) onlyOwner public {
        require(_addr!=liquidityStatsAddr, "check stats address");
        require(_addr!=address(0), "check stats address 0");
        liquidityStatsAddr = _addr;
    }

    function liquidityMint() onlyOperator onlyBeforeDestruct public{
        // mint
        mint();
        // clear
        IStats(liquidityStatsAddr).clear();
    }

    function mintInfo() public view override returns(address[] memory,  uint256[] memory, uint256) {
        return IStats(liquidityStatsAddr).stats();
    }
}


interface IStaking {
    function hastaked(address _who) external returns(bool);
    function stats() external view returns(address[] memory,  uint256[] memory, uint256);
    function clear() external;
}

interface IFee {
    function emitFee(address _addr, uint256 _ethVal) payable external;
}


contract FeeStats {
    event Fee(address _addr, uint256 _ethVal);
    function emitFee(address _addr, uint256 _ethVal) payable public {
        require(_ethVal==msg.value, "fee value");
        emit Fee(_addr, _ethVal);
    }
}

interface Events {
    event CreatePool(uint32 indexed id, address indexed maker, bool priv, address tracker, uint256 amount, uint256 rate, uint256 units);
    event Join(uint32 indexed id, address indexed taker, bool priv, uint256 ethAmount, address tracker, uint256 amount);
    event Withdraw(uint32 indexed id, address indexed sender, uint256 amount, uint32 tp);
    event Close(uint32 indexed id, bool priv);
}

contract AbstractFactory is Ownable {
    address public liquidtyAddr;
    address public stakeAddr;
    address public feeAddr;
    uint32 public constant takerFeeBase = 100000;
    uint32 public takerFeeRate;
    uint256 public makerFixedFee;

    constructor() public {
        takerFeeRate = 0;
        makerFixedFee = 0;
    }

    modifier makerFee() {
        if(makerFixedFee>0) {
            require(msg.value >= makerFixedFee, "check maker fee, fee must be le value");
            require(feeAddr!=address(0), "check fee address, fail");

            // transfer fee to owner
            IFee(feeAddr).emitFee{value:makerFixedFee}(msg.sender, makerFixedFee);
        }
        _;
    }

    modifier takerFee(uint256 _value) {
        require(_value>0, "check taker value, value must be gt 0");
        uint256 _fee = 0;
        if(takerFeeRate>0){
            _fee = _value * takerFeeRate / takerFeeBase;
            require(_fee > 0, "check taker fee, fee must be gt 0");
            require(_fee < _value, "check taker fee, fee must be le value");
            require(feeAddr!=address(0), "check fee address, fail");

            // transfer fee to owner
            IFee(feeAddr).emitFee{value:_fee}(msg.sender, _fee);
        }
        require(_value+_fee<=msg.value,"check taker fee and value, total must be le value");
        _;
    }

    function joinPoolAfter(address _taker, uint256 _ethVal) internal {
        if(liquidtyAddr!=address(0)){
            ILiquidity(liquidtyAddr).emitJoin(_taker, _ethVal);
        }
    }
    function updateTakerFeeRate(uint32 _rate) public onlyOwner {
        takerFeeRate = _rate;
    }
    function updateMakerFee(uint256 _fee) public onlyOwner {
        makerFixedFee = _fee;
    }
    function updateFeeAddr(address _addr) public onlyOwner {
        feeAddr = _addr;
    }
    function updateLiquidityAddr(address _addr) public onlyOwner {
        liquidtyAddr = _addr;
    }
    function updateStakeAddr(address _addr) public onlyOwner {
        stakeAddr = _addr;
    }
    function hastaked(address _who) internal returns(bool) {
        if(stakeAddr==address(0)){
            return true;
        }
        return IStaking(stakeAddr).hastaked(_who);
    }
}

contract FixedPoolFactory is Events, AbstractFactory, Destructor {
    using SafeMath for uint256;

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
    uint32 public fixedPoolCnt = 0;


    function createFixedPool(string memory _name, address _tracker, uint256 _amount, uint256 _rate, uint256 _units, uint32 _endTime, bool _onlyHolder) makerFee onlyBeforeDestruct payable public {
        require(_amount>0, "check create pool amount");
        require(_rate>0, "check create pool rate");
        require(_units>0, "check create pool units");

        // transfer erc20 token from maker
        IERC20(_tracker).transferFrom(msg.sender, address(this), _amount);

        fixedPools[fixedPoolCnt] =  FixedPool({
            maker : msg.sender,
            tokenRate : _rate,
            tokenaddr : _tracker,
            tokenAmount : _amount,
            name: _name,
            endTime: uint32(now) + _endTime,
            units: _units,
            enabled: true,
            onlyHolder: _onlyHolder
            });
        emit CreatePool(fixedPoolCnt, msg.sender, false, _tracker, _amount, _rate, _units);
        fixedPoolCnt++;
    }

    function fixedPoolJoin(uint32 _id, uint256 _value) takerFee(_value) payable public {
        require(msg.value > 0, "check value, value must be gt 0");
        require(_value <= msg.value, "check value, value must be le msg.value");

        FixedPool storage _pool = fixedPools[_id];

        // check pool exist
        require(_pool.enabled, "check pool exists");
        if(_pool.onlyHolder){
            require(hastaked(msg.sender), "only holder");
        }
        // check end time
        require(now < _pool.endTime, "check before end time");

        uint _order = _value.mul(_pool.tokenRate).div(_pool.units);
        require(_order>0, "check taker amount");
        require(_order<=_pool.tokenAmount, "check left token amount");

        address _taker = msg.sender; // todo test gas

        _pool.tokenAmount = _pool.tokenAmount.sub(_order);

        // transfer ether to maker
        _pool.maker.transfer(_value);

        IERC20(_pool.tokenaddr).transfer(_taker, _order);

        emit Join(_id, msg.sender, false, _value, _pool.tokenaddr, _order);
        joinPoolAfter(msg.sender, _value);
    }

    function fixedPoolClose(uint32 _id) public {
        FixedPool storage _pool = fixedPools[_id];

        require(_pool.enabled, "check pool exists");
        require(_pool.maker == msg.sender, "check maker owner");


        _pool.enabled = false;
        IERC20(_pool.tokenaddr).transfer(_pool.maker, _pool.tokenAmount);
        emit Close(_id, false);
    }

}

contract PrivFixedPoolFactory is Events, AbstractFactory, Destructor {
    using SafeMath for uint256;

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

    uint32 public privFixedPoolCnt = 0;

    function createPrivFixedPool(string memory  _name, address _tracker, uint256 _amount, uint256 _rate, uint256 _units, uint32 _endTime, address[] memory _takers)
    makerFee onlyBeforeDestruct payable public {

        require(_amount>0, "check create pool amount");
        require(_rate>0, "check create pool amount");
        require(_units>0, "check create pool amount");


        // transfer erc20 token from maker
        IERC20(_tracker).transferFrom(msg.sender, address(this), _amount);

        privFixedPools[privFixedPoolCnt] =  PrivFixedPool({
            maker : msg.sender,
            tokenRate : _rate,
            tokenaddr : _tracker,
            tokenAmount : _amount,
            name: _name,
            endTime: uint32(now) + _endTime,
            units: _units,
            enabled: true,
            takers: _takers
            });

        emit CreatePool(privFixedPoolCnt, msg.sender, true, _tracker, _amount, _rate, _units);

        privFixedPoolCnt++;
    }

    function privFixedPoolJoin(uint32 _id, uint32 _index, uint256 _value) takerFee(_value) payable public {
        require(msg.value > 0, "check value, value must be gt 0");
        require(_value <= msg.value, "check value, value must be le msg.value");

        PrivFixedPool storage _pool = privFixedPools[_id];

        // check pool exist
        require(_pool.enabled, "check pool exists");

        // check end time
        require(now < _pool.endTime, "check before end time");
        // check taker limit
        require(_pool.takers[_index] == msg.sender, "check taker limit");

        uint _order = msg.value.mul(_pool.tokenRate).div(_pool.units);
        require(_order>0, "check taker amount");
        require(_order<=_pool.tokenAmount, "check left token amount");

        address _taker = msg.sender; // todo test gas

        _pool.tokenAmount = _pool.tokenAmount.sub(_order);

        // transfer ether to maker
        _pool.maker.transfer(_value);

        IERC20(_pool.tokenaddr).transfer(_taker, _order);

        emit Join(_id, msg.sender, true, msg.value, _pool.tokenaddr, _order);
        joinPoolAfter(msg.sender, msg.value);
    }

    function privFixedPoolClose(uint32 _id) public {
        PrivFixedPool storage _pool = privFixedPools[_id];

        require(_pool.enabled, "check pool exists");
        require(_pool.maker == msg.sender, "check maker owner");

        _pool.enabled = false;
        IERC20(_pool.tokenaddr).transfer(_pool.maker, _pool.tokenAmount);

        emit Close(_id, true);
    }


    function privFixedPoolTakers(uint32 _id) public view returns(address[] memory){
        PrivFixedPool storage _pool = privFixedPools[_id];
        return _pool.takers;
    }
}

contract PoolFactory is FixedPoolFactory, PrivFixedPoolFactory {}



contract BidPoolFactory is Events, AbstractFactory, Destructor {
    using SafeMath for uint256;

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
    uint32 public bidPoolCnt = 0;

    function createBidPool(string memory  _name, address _tracker, uint256 _amount, uint32 _endTime, bool _onlyHolder) makerFee onlyBeforeDestruct payable public {
        require(_amount>0, "check create pool amount");

        // transfer erc20 token from maker
        IERC20(_tracker).transferFrom(msg.sender, address(this), _amount);

        bidPools[bidPoolCnt] = BidPool({
            name: _name,
            maker : msg.sender,
            endTime: uint32(now) + _endTime,
            tokenaddr : _tracker,
            tokenAmount : _amount,
            takerAmountTotal: 0,
            enabled: true,
            makerReceiveTotal:0,
            onlyHolder:_onlyHolder
            });
        emit CreatePool(bidPoolCnt, msg.sender, false, _tracker, _amount, 0, 0);
        bidPoolCnt++;
    }

    function bidPoolJoin(uint32 _id, uint256 _value) takerFee(_value) payable public {
        require(msg.value > 0, "check value, value must be gt 0");
        require(_value <= msg.value, "check value, value must be le msg.value");

        BidPool storage _pool = bidPools[_id];

        // check pool exist
        require(_pool.enabled, "check pool exists");

        // check end time
        require(now < _pool.endTime, "check before end time");

        // check holder
        if(_pool.onlyHolder){
            require(hastaked(msg.sender), "only holder");
        }
        address _taker = msg.sender;
        _pool.takerAmountMap[_taker] = _pool.takerAmountMap[_taker].add(_value);
        _pool.takerAmountTotal = _pool.takerAmountTotal.add(_value);
        _pool.makerReceiveTotal = _pool.makerReceiveTotal.add(_value);

        emit Join(_id, msg.sender, false, _value, _pool.tokenaddr, 0);
        joinPoolAfter(msg.sender, _value);
    }

    function bidPoolTakerWithdraw(uint32 _id) public {
        BidPool storage _pool = bidPools[_id];

        // check end time
        require(now > _pool.endTime, "check after end time");

        address _taker = msg.sender;
        uint256 _amount = _pool.takerAmountMap[_taker];
        require(_amount>0, "amount check");

        uint256 _order = _amount.mul(_pool.tokenAmount).div(_pool.takerAmountTotal);

        // clear taker amount
        delete _pool.takerAmountMap[_taker];
        IERC20(_pool.tokenaddr).transfer(_taker, _order);
        emit Withdraw(_id, _taker, _order, uint32(2));
    }

    function bidPoolMakerWithdraw(uint32 _id) public {
        BidPool storage _pool = bidPools[_id];
        // check end time
        require(now > _pool.endTime, "check after end time");
        require(_pool.enabled, "check pool enabled");
        require(_pool.maker == msg.sender, "check pool owner");
        if( _pool.takerAmountTotal == 0 ){
            _pool.enabled = false;
            IERC20(_pool.tokenaddr).transfer(_pool.maker, _pool.tokenAmount);
            return;
        }
        uint256 _order = _pool.makerReceiveTotal;
        require( _order>0, "check received value");
        _pool.makerReceiveTotal = 0;
        msg.sender.transfer(_order);
        emit Withdraw(_id, msg.sender, _order, uint32(1));
    }

    function bidTakerAmount(uint32 _id, address _taker) public view returns(uint256) {
        BidPool storage _pool = bidPools[_id];
        uint256 _amount = _pool.takerAmountMap[_taker];
        return _amount;
    }
}

