pragma solidity ^0.6.3;

import "./mintable.sol";


contract StakingReward is Operable, Destructor {
    using SafeERC20 for IERC20;

    struct UserInfo {
        uint256 pendingStaking;
        uint256 stakingReleaseTime;
        uint256 pendingReward;
    }

    IERC20 public rewardToken;
    IERC20 public stakingToken;
    uint256 public releaseSec;
    mapping(address => UserInfo) public userInfo;

    constructor(IERC20 _rewardToken, IERC20 _stakingToken) Operable(address(0)) public {
        rewardToken = _rewardToken;
        stakingToken = _stakingToken;
        releaseSec = 86400;
    }

    function setReleaseSec(uint256 sec) onlyOwner public{
        require(sec>=0, "relase time limit");
        require(sec<7*24*60*60, "relase time limit");
        releaseSec = sec;
    }

    function pendingRewardAmount(address account) view public returns(uint256) {
        return userInfo[account].pendingReward;
    }

    function pendingStaking(address account, uint256 amount) onlyOperator onlyBeforeDestruct public {
        require(account != address(0), "pending staking address");
        UserInfo storage u = userInfo[account];
        u.pendingStaking += amount;
        u.stakingReleaseTime = block.timestamp + releaseSec;
    }

    function withdrawStaking() onlyBeforeDestruct public {
        UserInfo storage u = userInfo[msg.sender];
        require(u.stakingReleaseTime < block.timestamp, "withdraw release time limit");
        require(u.pendingStaking > 0, "withdraw staking amount limit");
        uint256 pending = u.pendingStaking;
        u.pendingStaking = 0;
        IERC20(stakingToken).safeTransfer(msg.sender, pending);
    }

    function pendingReward(address account, uint256 amount) onlyOperator onlyBeforeDestruct public {
        require(account != address(0), "pending reward address");
        UserInfo storage u = userInfo[account];
        u.pendingReward += amount;
    }

    function withdrawReward() onlyBeforeDestruct public {
        UserInfo storage u = userInfo[msg.sender];
        require(u.pendingReward > 0, "withdraw reward amount limit");
        uint256 pending = u.pendingReward;
        u.pendingReward = 0;
        IERC20(rewardToken).safeTransfer(msg.sender, pending);
    }

    function withdrawRewardOp(address account) onlyOperator onlyBeforeDestruct public {
        UserInfo storage u = userInfo[account];
        require(u.pendingReward > 0, "withdraw reward amount limit");
        uint256 pending = u.pendingReward;
        u.pendingReward = 0;
        IERC20(rewardToken).safeTransfer(account, pending);
    }
}


// MasterChef is the master of Sushi. He can make Sushi and he is a fair guy.
//
// Note that it's ownable and the owner wields tremendous power. The ownership
// will be transferred to a governance smart contract once SUSHI is sufficiently
// distributed and the community can show to govern itself.
//
// Have fun reading it. Hopefully it's bug-free. God bless.
contract Erc20MasterChef is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // Info of each user.
    struct UserInfo {
        uint256 amount;     // How many LP tokens the user has provided.
        uint256 rewardDebt; // Reward debt. See explanation below.
        //
        // We do some fancy math here. Basically, any point in time, the amount of SUSHIs
        // entitled to a user but is pending to be distributed is:
        //
        //   pending reward = (user.amount * pool.accSushiPerShare) - user.rewardDebt
        //
        // Whenever a user deposits or withdraws LP tokens to a pool. Here's what happens:
        //   1. The pool's `accSushiPerShare` (and `lastRewardBlock`) gets updated.
        //   2. User receives the pending reward sent to his/her address.
        //   3. User's `amount` gets updated.
        //   4. User's `rewardDebt` gets updated.
    }

    address public srAddress;

    // Info of each pool.
    struct PoolInfo {
        IERC20 lpToken;           // Address of LP token contract.
        uint256 lastRewardRound;  // Last round that Reward token distribution occurs.
        uint256 accRewardPerShare; // Accumulated SUSHIs per share, times 1e12. See below.
    }

    // The Reward TOKEN!
    IERC20 public rewardToken;
    IMintProxy public mintProxy;
    // Block number when bonus SUSHI period ends.
    uint256 public bonusEndRound;
    // Reward tokens created per block.
    uint256 public rewardPerRound;
    // Bonus muliplier for early sushi makers.
    uint256 public constant BONUS_MULTIPLIER = 1;

    // Info of each pool.
    PoolInfo public pool;
    // Info of each user that stakes LP tokens.
    mapping(address => UserInfo) public userInfo;
    // The Round number when Reward Token mining starts.
    uint256 public startRound;
    // The time when contract create
    uint256 public genesisTime;

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 amount);
    event WithdrawReward(address indexed user, uint256 amount);

    constructor(
        IERC20 _rewardToken,
        IMintProxy _mintProxy,
        uint256 _rewardPerRound,
        uint256 _startRound,
        uint256 _bonusEndRound,
        uint256 _genesisTime,
        address _stakingReward,
        IERC20 _stakingToken
    ) public {
        rewardToken = _rewardToken;
        rewardPerRound = _rewardPerRound;
        bonusEndRound = _bonusEndRound;
        startRound = _startRound;
        genesisTime = _genesisTime;
        mintProxy = _mintProxy;

        uint256 nowRound = calcRound();
        uint256 lastRewardRound = nowRound > startRound ? nowRound : startRound;
        srAddress = _stakingReward;
        pool = PoolInfo({
            lpToken: _stakingToken,
            lastRewardRound: lastRewardRound,
            accRewardPerShare: 0
            });
    }

    // Update mint. Can only be called by the owner.
    function setMintProxy(IMintProxy _mintProxy) public onlyOwner {
        mintProxy = _mintProxy;
    }

    // Return reward multiplier over the given _from to _to block.
    function getMultiplier(uint256 _from, uint256 _to) public view returns (uint256) {
        if (_to <= bonusEndRound) {
            return _to.sub(_from).mul(BONUS_MULTIPLIER);
        } else if (_from >= bonusEndRound) {
            return _to.sub(_from);
        } else {
            return bonusEndRound.sub(_from).mul(BONUS_MULTIPLIER).add(
                _to.sub(bonusEndRound)
            );
        }
    }

    function setPerReward(uint256 _rewardPerRound) onlyOwner public {
        updatePool();
        rewardPerRound = _rewardPerRound;
    }

    // View function to see pending SUSHIs on frontend.
    function pendingReward(address _user) external view returns (uint256) {
        UserInfo storage user = userInfo[_user];
        uint256 accSushiPerShare = pool.accRewardPerShare;
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));

        uint256 nowRound = calcRound();
        if (nowRound > pool.lastRewardRound && lpSupply != 0) {
            uint256 multiplier = getMultiplier(pool.lastRewardRound, nowRound);
            uint256 reward = multiplier.mul(rewardPerRound);
            accSushiPerShare = accSushiPerShare.add(reward.mul(1e12).div(lpSupply));
        }
        return user.amount.mul(accSushiPerShare).div(1e12).sub(user.rewardDebt) + StakingReward(srAddress).pendingRewardAmount(_user);
    }

    // Update reward variables of the given pool to be up-to-date.
    function updatePool() public {
        uint256 nowRound = calcRound();
        if (nowRound <= pool.lastRewardRound) {
            return;
        }
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        if (lpSupply == 0) {
            pool.lastRewardRound = nowRound;
            return;
        }
        uint256 multiplier = getMultiplier(pool.lastRewardRound, nowRound);
        uint256 sushiReward = multiplier.mul(rewardPerRound);
        bool flag = mintProxy.mint(srAddress, sushiReward, uint8(2));
        require(flag, "mint failed.");

        pool.accRewardPerShare = pool.accRewardPerShare.add(sushiReward.mul(1e12).div(lpSupply));
        pool.lastRewardRound = nowRound;
    }

    // Deposit LP tokens to MasterChef for SUSHI allocation.
    function staking(uint256 _amount) public {
        UserInfo storage user = userInfo[msg.sender];
        updatePool();
        if (user.amount > 0) {
            uint256 pending = user.amount.mul(pool.accRewardPerShare).div(1e12).sub(user.rewardDebt);
            StakingReward(srAddress).pendingReward(msg.sender, pending);
            //            safeSushiTransfer(msg.sender, pending);
        }
        pool.lpToken.safeTransferFrom(address(msg.sender), address(this), _amount);
        user.amount = user.amount.add(_amount);
        user.rewardDebt = user.amount.mul(pool.accRewardPerShare).div(1e12);
        emit Deposit(msg.sender, _amount);
    }

    // Withdraw LP tokens from MasterChef.
    function unStaking(uint256 _amount) public {
        UserInfo storage user = userInfo[msg.sender];
        require(user.amount >= _amount, "withdraw: not good");
        updatePool();
        uint256 pending = user.amount.mul(pool.accRewardPerShare).div(1e12).sub(user.rewardDebt);
        //        safeSushiTransfer(msg.sender, pending);
        StakingReward(srAddress).pendingReward(msg.sender, pending);
        user.amount = user.amount.sub(_amount);
        user.rewardDebt = user.amount.mul(pool.accRewardPerShare).div(1e12);
        pool.lpToken.safeTransfer(srAddress, _amount);
        StakingReward(srAddress).pendingStaking(msg.sender, _amount);
        emit Withdraw(msg.sender , _amount);
    }

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw() public {
        UserInfo storage user = userInfo[msg.sender];
        pool.lpToken.safeTransfer(srAddress, user.amount);
        StakingReward(srAddress).pendingStaking(msg.sender, user.amount);
        emit EmergencyWithdraw(msg.sender, user.amount);
        user.amount = 0;
        user.rewardDebt = 0;
    }

    // Deposit LP tokens to MasterChef for SUSHI allocation.
    function withdrawReward() public {
        staking(0);
        StakingReward(srAddress).withdrawRewardOp(msg.sender);
    }


    // calc the round
    function calcRound() internal view returns (uint256)  {
        uint256 nowTime = block.timestamp;

        return nowTime.sub(genesisTime).div(1 * 60);
    }


    function nowInfo() public view returns(uint256,uint256,uint256){
        return (block.timestamp, block.number, calcRound());
    }
}

