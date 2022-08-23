import React, { useEffect, useState } from 'react';
import {Button, PageHeader, Spin, List, Avatar} from "antd";
import { utils, transactions, accountCreator, Contract } from "near-api-js";
import { functionCall, transfer } from 'near-api-js/lib/transaction';
import axios from 'axios';
import { SERVER_URL } from '~utils/constants';
import {formatNumber, login, parseTokenAmount, parseTokenWithDecimals, wallet, buildMerkleTree, getProof, config} from "~utils/near";
import { airdropContract, airdrop, claim } from "~utils/airdrop-contract";
import BN from 'bn.js';
import { number } from 'mathjs';
import SHA256 from 'crypto-js/sha256'

function Claim() {

    const [campaigns, setCampaigns] = useState([]);

    const getCampaignData = async () => {
        // @ts-ignore
        let response = await axios.get(`${SERVER_URL}/api/campaigns`);
        let campaign_list = response["data"]["data"]["result"];
        setCampaigns(campaign_list);
    }

    const refreshData = () => {
        Promise.all([
            getCampaignData(),
        ]).catch(e => {
            console.log("Error", e);
        })
    }

    useEffect(() => {
        refreshData()
    }, []);


    const numberCampaigns = campaigns.length;
    const title = `Airdrop List (${numberCampaigns} campaigns)`
    const items = campaigns.map((item, k) => <CampaignItem key={k} merkle_root={item.merkle_root} tokenAddress={item.tokenAddress} airdrop_id={k+1} leave={item.leave} ft_symbol={item.ft_symbol} ft_icon={item.ft_icon} owner={item.owner} ft_name={item.ft_name} />)

    return (
        <div>
            <PageHeader
                className="site-page-header"
                title={title}
            />
            <div style={{ padding: 30, display: "flex"}}>
                <List bordered={true} size="large" itemLayout="vertical">
                    {items}
                </List>
            </div>
        </div>
    )
}

// @ts-ignore
const CampaignItem = ({airdrop_id, ft_symbol, ft_icon, owner, ft_name, leave, merkle_root, tokenAddress}) => {
    const [loading, setLoading] = useState(false);
    // @ts-ignore
    const toggle = (checked) => {
        setLoading(checked);
    };

    const content = ft_name.concat(" (").concat(ft_symbol).concat(")");
    const href = config.explorerUrl + "/accounts/" + tokenAddress;
    console.log(`Merkle root: ${airdrop_id}`, merkle_root)

    console.log("Leave: ", leave);
    const tree = buildMerkleTree(leave)
    let regex = /\s+/;
    let leaf = null;
    let amount = 0.0
    for (let l of leave) {
        let arr = l.split(regex)
        if (arr.length <= 1) {
            continue
        }
        let account = arr[0]
        
        if (account == wallet.getAccountId()) {
            amount = parseFloat(arr[1])
            leaf = SHA256(l)
            console.log("leaf: ", leaf.toString())
            break
        }
         
    }
    console.log("Tree: ", tree);
    let proof: any
    if (leaf != null) {
        proof = getProof(tree, leaf)
    } else {
        proof = ''
    }
    console.log(`Airdrop ${airdrop_id} of ${wallet.getAccountId()}: ${amount} token`)
    const description = `Campaign owner: ${owner}. Number of token to claim: ${amount} ${ft_symbol}`;

    const handleClaim = async () => {
        
        try {
            setLoading(true)
            
            let result = await claim(airdrop_id, proof, amount, tokenAddress)
            // window.location.reload()
        } catch (e) {
            console.log(e)
        }
        
    }

    return (
        <Spin spinning={loading}>
            <List.Item style={{width: "70vw", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                <List.Item.Meta 
                    avatar={<Avatar src={ft_icon} size={"large"} style={{border: "1px solid gray"}}/>}
                    title={<a href={href} target="_blank">{content}</a>}
                    description={description}
                />
                <Btn airdrop_id={airdrop_id} proof={proof} handleClaim={handleClaim} />
            </List.Item>
        </Spin>
        
    )
}

// @ts-ignore
const Btn = ({ airdrop_id, proof, handleClaim }) => {
    let btn;
    console.log(`Proof: ${airdrop_id}`, proof)
    console.log("AirdropId: ", airdrop_id)
    const [isIssued, setIsIssued] = useState(false);
    // @ts-ignore
    useEffect(async () => {
        // @ts-ignore
        let issue = await airdropContract.check_issued_account({
            airdrop_id: airdrop_id,
            account_id: wallet.getAccountId()
        })
        setIsIssued(issue)
    }, [])
    if (proof.length != 0) {
        if (!isIssued) {
            btn = <div>
                <Button type="primary" ghost onClick={handleClaim}>
                    Claim
                </Button>
            </div>
        } else {
            btn = <div>
                <Button type="primary" disabled>
                    Claimed!
                </Button>
            </div>
        }
    } else {
        btn = <div></div>
    }
    return (
        <div>
            {btn}
        </div>
    )
}

export default Claim;