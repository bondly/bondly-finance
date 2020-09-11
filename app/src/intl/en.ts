export const stringsEn = `

## waiting msgs
waiting-for-sign = Now go back to the wallet to sign transactions. After you signature is completed, come back here.

## Dashboard
fatal-error-heading = Error connecting to server
fatal-error-details = Your session might be expired. Open this page from your Unifyre Wallet again.

##  Dialogue
btn-ok = Ok
btn-cancel = Cancel

## Swap Create
create-swap = Swap tokens with no risk
balance = Current balance
swap-sending = Sending
swap-receiving = Receiving
create-swap-btn = Create the swap
create-swap-notes = Note: Swaps are publicly on chain and anybody can claim a swap that you create. 
    If you are running an OTC swap with discount, the party that is receiving the discount should be the one that creates the swap.
    If you have special needs for OTC swaps, please let us know on telegram and we may accomodate them in future updates.

## Execute Swap
execute-swap = Execute Swap
currencies-not-enabled-warning = Make sure to enable the following currencies in your unifyre
   wallet:  { $currency1 } and { $currency2 }, then come back here by clicking on your swap link again.
sign-and-execute = Sign and execute
executed-msg = Swap is executed
canceled-msg = Initiator canceled this swap
canceling-msg = Initiator has requested to cancel this swap
pending-transaction = Pending transaction
all-transactions = All transations for this swap
pending-transaction-warning = There is currently a pending transaction on this swap. Actions will become available once all pnding transactions are confirmed, failed, or timed out. Check the pending transaction by clicking on its link to inspect it.
approve-link = Reduce gas if you run multiple swaps

## Manage Swap
manage-swap-title = Your swap
close-btn = Cancel without transaction
cancel-btn = Cancel (needs signature)
cancel-btn-comments = Cancelling the swap at this stage requires two transactions. One to set the allocation to zero, and another to cancel the registered swap.
btn-copy-to-clipboard = Copy to clipboard
copied = Copied

## Approve
approve-title = Pre-approve Swap Contract with { $symbol }
approve-notes-1 = Every transaction requires an approval of amount that swap contract can use. Approve transactions require gas to execute. You can save on gas by giving a large approval to the swap contract here.
    Future swaps can use this approval hence reduce the amount of gas used.
approve-notes-2 = Note that cancelling a swap that is submitted to network will reset this approval to zero.
approve-amount = Approve amount
submit-approve = Submit and sign approve 
approve-submitted = Approve transaction submitted
`;