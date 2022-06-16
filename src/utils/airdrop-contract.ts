import { Contract } from "near-api-js";
import { wallet, config, Transaction, FT_STORAGE_AMOUNT, executeMultipleTransactions, ONE_YOCTO_NEAR, parseTokenAmount } from "~utils/near";

const airdropContract = new Contract(
  wallet.account(),
  config.MERKLE_AIRDROP_CONTRACT,
  {
    viewMethods: ['get_all_campaigns', 'get_ft_contract_by_campaign', 'check_issued_account', 'total_number_airdrop_campaigns', 
    'number_airdrop_campaigns_by_account', 'airdrop_campaigns_by_account', 'airdrop_merkle_root'],
    changeMethods: ['claim', 'get_ft_decimals'],
  }
)

const airdrop = async (tokenAddress: string, amount: string, message: any) => {
  // Execute multi transaction: 1. deposit staking storage, 2. ft transfer call
  let airdropCall: Transaction = {
      receiverId: tokenAddress,
      functionCalls: [
          {
              methodName: "ft_transfer_call",
              args: {
                receiver_id: config.MERKLE_AIRDROP_CONTRACT,
                amount: amount,
                msg: JSON.stringify(message)
              },
              gas: "60000000000000",
              amount: ONE_YOCTO_NEAR
          }
      ]
  }

  let transactions: Transaction[] = [airdropCall];

  // Check storage balance
  let ft_contract = new Contract(wallet.account(), tokenAddress, {
      viewMethods: ['ft_balance_of', 'storage_balance_of'],
      changeMethods: ['storage_deposit']
  });
  //@ts-ignore
  let storageBalance: any = await ft_contract.storage_balance_of({ account_id: config.MERKLE_AIRDROP_CONTRACT });

  if (!storageBalance) {
      let airdropDepositStorage: Transaction = {
          receiverId: tokenAddress,
          functionCalls: [
              {
                  methodName: "storage_deposit",
                  args: {
                    account_id: config.MERKLE_AIRDROP_CONTRACT
                  },
                  gas: "10000000000000",
                  amount: FT_STORAGE_AMOUNT
              }
          ]
      };

      transactions.unshift(airdropDepositStorage);
  }

  await executeMultipleTransactions(transactions);
}

const claim = async (airdrop_id: number, proof: any, amount: number, tokenAddress: string) => {
  console.log("Claim: airdrop_id: ", airdrop_id)
  console.log("Claim proof: ", proof)
  console.log("Claim amount: ", amount)
  console.log("Claim tokenAddress: ", tokenAddress)
  // Execute multi transaction: 1. deposit staking storage, 2. ft transfer call
  // @ts-ignore
  let ft_contract = new Contract(wallet.account(), tokenAddress, {
    viewMethods: ['ft_balance_of', 'ft_metadata', 'storage_balance_of'],
    changeMethods: []
  });
  // @ts-ignore
  let metadata = await ft_contract.ft_metadata();
  let ft_decimals = metadata.decimals;
  // @ts-ignore
  // let transfer_amount = parseTokenAmount(amount, ft_decimals).toLocaleString('fullwide', {useGrouping:false})
  let claimCall: Transaction = {
    receiverId: config.MERKLE_AIRDROP_CONTRACT,
    functionCalls: [
        {
            methodName: "claim",
            args: {
              airdrop_id: airdrop_id,
              amount: amount,
              proof: proof,
              decimals: ft_decimals
            },
            gas: "60000000000000",
            amount: ONE_YOCTO_NEAR
        }
    ]
  }

  let transactions: Transaction[] = [claimCall];

  //@ts-ignore
  let storageBalance: any = await ft_contract.storage_balance_of({ account_id: wallet.getAccountId() });

  if (!storageBalance) {
      let claimDepositStorage: Transaction = {
          receiverId: tokenAddress,
          functionCalls: [
              {
                  methodName: "storage_deposit",
                  args: {
                      account_id: wallet.getAccountId()
                  },
                  gas: "10000000000000",
                  amount: FT_STORAGE_AMOUNT
              }
          ]
      };

      transactions.unshift(claimDepositStorage);
  }

  await executeMultipleTransactions(transactions);
}

export { airdropContract, airdrop, claim };