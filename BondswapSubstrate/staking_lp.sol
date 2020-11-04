pragma solidity 0.6.3;

import "./mintable.sol";


// MasterChef is the master of Sushi. He can make Sushi and he is a fair guy.
//
// Note that it's ownable and the owner wields tremendous power. The ownership
// will be transferred to a governance smart contract once SUSHI is sufficiently
// distributed and the community can show to govern itself.
//
// Have fun reading it. Hopefully it's bug-free. God bless.
contract MasterChef is Ownable {
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

    // Info of each pool.
    struct PoolInfo {
        IERC20 lpToken;           // Address of LP token contract.
        uint256 allocPoint;       // How many allocation points assigned to this pool. Reward to distribute per round.
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
    uint256 public constant BONUS_MULTIPLIER = 2;
    // The migrator contract. It has a lot of power. Can only be set through governance (owner).
    IMigratorChef public migrator;

    // Info of each pool.
    PoolInfo[] public poolInfo;
    // Info of each user that stakes LP tokens.
    mapping (uint256 => mapping (address => UserInfo)) public userInfo;
    // Total allocation poitns. Must be the sum of all allocation points in all pools.
    uint256 public totalAllocPoint = 0;
    // The Round number when Reward Token mining starts.
    uint256 public startRound;
    // The time when contract create
    uint256 public genesisTime;

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event WithdrawReward(address indexed user, uint256 indexed pid, uint256 amount);

    constructor(
        IERC20 _rewardToken,
        IMintProxy _mintProxy,
        uint256 _rewardPerRound,
        uint256 _startRound,
        uint256 _bonusEndRound,
        uint256 _genesisTime
    ) public {
        rewardToken = _rewardToken;
        rewardPerRound = _rewardPerRound;
        bonusEndRound = _bonusEndRound;
        startRound = _startRound;
        genesisTime = _genesisTime;
        mintProxy = _mintProxy;
    }

    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    // Add a new lp to the pool. Can only be called by the owner.
    // XXX DO NOT add the same LP token more than once. Rewards will be messed up if you do.
    function add(uint256 _allocPoint, IERC20 _lpToken, bool _withUpdate) public onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        uint256 nowRound = calcRound();
        uint256 lastRewardRound = nowRound > startRound ? nowRound : startRound;
        totalAllocPoint = totalAllocPoint.add(_allocPoint);
        poolInfo.push(PoolInfo({
            lpToken: _lpToken,
            allocPoint: _allocPoint,
            lastRewardRound: lastRewardRound,
            accRewardPerShare: 0
            }));
    }

    // Update the given pool's SUSHI allocation point. Can only be called by the owner.
    function set(uint256 _pid, uint256 _allocPoint, bool _withUpdate) public onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        totalAllocPoint = totalAllocPoint.sub(poolInfo[_pid].allocPoint).add(_allocPoint);
        poolInfo[_pid].allocPoint = _allocPoint;
    }

    // Set the migrator contract. Can only be called by the owner.
    function setMigrator(IMigratorChef _migrator) public onlyOwner {
        migrator = _migrator;
    }

    // Migrate lp token to another lp contract. Can be called by anyone. We trust that migrator contract is good.
    function migrate(uint256 _pid) public {
        require(address(migrator) != address(0), "migrate: no migrator");
        PoolInfo storage pool = poolInfo[_pid];
        IERC20 lpToken = pool.lpToken;
        uint256 bal = lpToken.balanceOf(address(this));
        lpToken.safeApprove(address(migrator), bal);
        IERC20 newLpToken = migrator.migrate(lpToken);
        require(bal == newLpToken.balanceOf(address(this)), "migrate: bad");
        pool.lpToken = newLpToken;
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

    // View function to see pending SUSHIs on frontend.
    function pendingSushi(uint256 _pid, address _user) external view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 accSushiPerShare = pool.accRewardPerShare;
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));

        uint256 nowRound = calcRound();
        if (nowRound > pool.lastRewardRound && lpSupply != 0) {
            uint256 multiplier = getMultiplier(pool.lastRewardRound, nowRound);
            uint256 reward = multiplier.mul(rewardPerRound).mul(pool.allocPoint).div(totalAllocPoint);
            accSushiPerShare = accSushiPerShare.add(reward.mul(1e12).div(lpSupply));
        }
        return user.amount.mul(accSushiPerShare).div(1e12).sub(user.rewardDebt);
    }

    // Update reward vairables for all pools. Be careful of gas spending!
    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(pid);
        }
    }

    // Update reward variables of the given pool to be up-to-date.
    function updatePool(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        if (calcRound() <= pool.lastRewardRound) {
            return;
        }
        uint256 nowRound = calcRound();
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        if (lpSupply == 0) {
            pool.lastRewardRound = nowRound;
            return;
        }
        uint256 multiplier = getMultiplier(pool.lastRewardRound, nowRound);
        uint256 sushiReward = multiplier.mul(rewardPerRound).mul(pool.allocPoint).div(totalAllocPoint);
        bool flag = mintProxy.mint(address(this), sushiReward, uint8(1));
        require(flag, "mint failed.");

        pool.accRewardPerShare = pool.accRewardPerShare.add(sushiReward.mul(1e12).div(lpSupply));
        pool.lastRewardRound = nowRound;
    }

    // Deposit LP tokens to MasterChef for SUSHI allocation.
    function deposit(uint256 _pid, uint256 _amount) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        updatePool(_pid);
        if (user.amount > 0) {
            uint256 pending = user.amount.mul(pool.accRewardPerShare).div(1e12).sub(user.rewardDebt);
            safeSushiTransfer(msg.sender, pending);
        }
        pool.lpToken.safeTransferFrom(address(msg.sender), address(this), _amount);
        user.amount = user.amount.add(_amount);
        user.rewardDebt = user.amount.mul(pool.accRewardPerShare).div(1e12);
        emit Deposit(msg.sender, _pid, _amount);
    }

    // Withdraw LP tokens from MasterChef.
    function withdraw(uint256 _pid, uint256 _amount) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        require(user.amount >= _amount, "withdraw: not good");
        updatePool(_pid);
        uint256 pending = user.amount.mul(pool.accRewardPerShare).div(1e12).sub(user.rewardDebt);
        safeSushiTransfer(msg.sender, pending);
        user.amount = user.amount.sub(_amount);
        user.rewardDebt = user.amount.mul(pool.accRewardPerShare).div(1e12);
        pool.lpToken.safeTransfer(address(msg.sender), _amount);
        emit Withdraw(msg.sender, _pid, _amount);
        emit WithdrawReward(msg.sender, _pid, pending);
    }

    function withdrawReward(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        updatePool(_pid);
        if (user.amount > 0) {
            uint256 pending = user.amount.mul(pool.accRewardPerShare).div(1e12).sub(user.rewardDebt);
            safeSushiTransfer(msg.sender, pending);
            emit WithdrawReward(msg.sender, _pid, pending);
        }
        user.rewardDebt = user.amount.mul(pool.accRewardPerShare).div(1e12);
    }

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        pool.lpToken.safeTransfer(address(msg.sender), user.amount);
        emit EmergencyWithdraw(msg.sender, _pid, user.amount);
        user.amount = 0;
        user.rewardDebt = 0;
    }

    // Safe sushi transfer function, just in case if rounding error causes pool to not have enough SUSHIs.
    function safeSushiTransfer(address _to, uint256 _amount) internal {
        rewardToken.safeTransfer(_to, _amount);
    }

    // calc the round
    function calcRound() internal view returns(uint256)  {
        uint256 nowTime = block.timestamp;

        return nowTime.sub(genesisTime).div(30*60);
    }

    function nowInfo() public view returns(uint256,uint256,uint256){
        return (block.timestamp, block.number, calcRound());
    }
}
