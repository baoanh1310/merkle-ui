import React, { useEffect, useState } from 'react';
import {Button, Input, Upload, notification, Form} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { utils, transactions, accountCreator, Contract } from "near-api-js";
import { functionCall, transfer } from 'near-api-js/lib/transaction';
import axios from 'axios';
import { SERVER_URL } from '~utils/constants';
import {formatNumber, login, parseTokenAmount, parseTokenWithDecimals, wallet, buildMerkleTree, config} from "~utils/near";
import { airdropContract, airdrop } from "~utils/airdrop-contract";
import BN from 'bn.js';
import { number } from 'mathjs';

function Airdrop() {

    const [leave, setLeave] = useState([]);
    const [ft_balance, setFtBalane] = useState(0.0);
    const [userAddresses, setUserAddresses] = useState("");
    const [tokenAddress, setTokenAddress] = useState("");

    const [numberCampaign, setNumberCampaign] = useState(0);

    const getCampaignData = async () => {
        // @ts-ignore
        let numCampaign = await airdropContract.total_number_airdrop_campaigns();
        numCampaign = parseInt(numCampaign);
        setNumberCampaign(numCampaign + 1);
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

    console.log("Number campaign: ", numberCampaign)

    const onFinish = async () => {
        if (!wallet.isSignedIn()) await login();
        let tree = buildMerkleTree(leave);
        let root = tree.getRoot().toString('hex');
        console.log(root);
        let ft_contract = new Contract(wallet.account(), tokenAddress, {
            viewMethods: ['ft_balance_of', 'ft_metadata'],
            changeMethods: []
        });
        
        try {
            // @ts-ignore
            let metadata = await ft_contract.ft_metadata();
            let ft_name = metadata.name;
            let ft_symbol = metadata.symbol;
            let ft_icon = metadata.icon;
            let ft_decimals = metadata.decimals;
            // @ts-ignore
            let airdropOwnerFtBalance = await ft_contract.ft_balance_of({ account_id: wallet.getAccountId() });
            
            console.log("User balance: ", airdropOwnerFtBalance);
            if (airdropOwnerFtBalance < ft_balance) {
                notification["warning"]({
                    message: `NOT ENOUGH ${ft_name} IN YOUR BALANCE`,
                    description:
                    'YOUR BALANCE IS NOT ENOUGH TO CREATE AIRDROP!',
                });
                return;
            }
            
            // save csv content in mongodb
            const obj =  { owner: wallet.getAccountId(), merkle_root: root, tokenAddress: tokenAddress, leave: leave, ft_name: ft_name, ft_symbol: ft_symbol, ft_icon: ft_icon }
            await axios.post(`${SERVER_URL}/api/campaigns/`, obj);

            // create airdrop
            let amount = ft_balance;
            console.log("Amount: ", amount);
            console.log("Decimals: ", ft_decimals);
            // @ts-ignore
            let transfer_amount = parseTokenAmount(amount, ft_decimals).toLocaleString('fullwide', {useGrouping:false})
            console.log("Transfer amount: ", transfer_amount)
            const message = {}
            message["merkle_root"] = root;
            message["ft_account_id"] = tokenAddress;

            let result = await airdrop(tokenAddress, transfer_amount, message);
            
        } catch (e) {
            console.log(e);
        }

    };

    const onFinishFailed = (errorInfo: any) => {
        console.log('Failed:', errorInfo);
    };

    const handleTokenAddressChange = (e: any) => {
        setTokenAddress(e.target.value);
    }

    const handleLeaveChange = (e: any) => {
        let addresses = e.target.value;
        setUserAddresses(addresses);
        let userAddresses = addresses.split('\n');
        let l = [numberCampaign];
        let balance = 0.0;
        let regex = /\s+/;
        for (let address of userAddresses) {
            let line = address.trim();
            if (line != '') {
                l.push(line);
                let arr = line.split(regex);
                balance += parseFloat(arr[1])
            }
        }
        setLeave(l);
        setFtBalane(balance);
    }

    const handleCSVFileChange = async (e: any) => {
        e.preventDefault()
        const reader = new FileReader()
        reader.onload = async (e) => { 
            const text: string = (e.target.result).toString()
            let arr = text.split('\n')
            let lines = []
            for (let line of arr) {
                let subarr = line.split(',')
                let newLine = subarr.join(' ')
                lines.push(newLine)
            }
            let addresses = lines.join('\n')
            let preview = document.getElementById('userAddresses');
            preview.innerHTML = addresses
            let l = [];
            let balance = 0.0;
            let regex = /\s+/;
            for (let address of lines) {
                let line = address.trim();
                if (line != '') {
                    l.push(line);
                    let arr = line.split(regex);
                    balance += parseInt(arr[1])
                }
            }
            setUserAddresses(addresses)
            setLeave(l);
            setFtBalane(balance);
        };
        reader.readAsText(e.target.files[0])
    }

    const handleChange = async (e: any) => {
        e.preventDefault();
        
        if (e.target.files && e.target.files.length > 0) {
            const reader = new FileReader()
            reader.onload = async (e) => { 
                const text: string = (e.target.result).toString()
                let arr = text.split('\n')
                let lines = []
                for (let line of arr) {
                    let subarr = line.split(',')
                    let newLine = subarr.join(' ')
                    lines.push(newLine)
                }
                let addresses = lines.join('\n')
                let l = [numberCampaign.toString()];
                let balance = 0.0;
                let regex = /\s+/;
                for (let address of lines) {
                    let line = address.trim();
                    if (line != '') {
                        l.push(line);
                        let arr = line.split(regex);
                        balance += parseFloat(arr[1])
                    }
                }
                setUserAddresses(addresses)
                setLeave(l);
                setFtBalane(balance);
                let preview = document.getElementById('userAddresses');
                preview.innerHTML = addresses
                console.log("Preview: ", preview);
                console.log("token address: ", tokenAddress);
                console.log("leave: ", leave);
                console.log("user addresses: ", userAddresses);
                console.log("balance: ", ft_balance);
            };
            reader.readAsText(e.target.files[0])
        } else {
            let addresses = e.target.value;
            setUserAddresses(addresses);
            let userAddresses = addresses.split('\n');
            let l = [numberCampaign.toString()];
            let balance = 0.0;
            let regex = /\s+/;
            for (let address of userAddresses) {
                let line = address.trim();
                if (line != '') {
                    l.push(line);
                    let arr = line.split(regex);
                    balance += parseFloat(arr[1])
                }
            }
            setLeave(l);
            setFtBalane(balance);
        }
    }

    console.log("token address: ", tokenAddress);
    console.log("leave: ", leave);
    console.log("user addresses: ", userAddresses);
    console.log("balance: ", ft_balance);
    console.log("Server URL: ", SERVER_URL)

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
            
            <Form
                style={{width: '50%'}}
                name="basic"
                labelCol={{
                    span: 8,
                }}
                wrapperCol={{
                    span: 16,
                }}
                initialValues={{
                }}
                onFinish={onFinish}
                onFinishFailed={onFinishFailed}
                autoComplete="off"
            >
                <Form.Item
                    label="Token Address"
                    name="token"
                    rules={[
                        {
                            required: true,
                            message: 'Please enter the token address (e.g. ft.example.testnet)',
                        },
                    ]}
                >
                    <Input value={tokenAddress} onChange={handleTokenAddressChange} />
                </Form.Item>

                <Form.Item
                    label="List of Addresses"
                    name="address"
                    rules={[
                        {
                            required: true,
                            message: 'Please enter the list of user addresses in format "account.testnet 10"',
                        },
                    ]}
                >
                    {/* <textarea id="userAddresses" rows={20} cols={50} value={userAddresses} onChange={handleLeaveChange} /> */}
                    <Input.TextArea name="userAddresses" id="userAddresses" rows={20} cols={50} value={userAddresses} onChange={handleChange} />
                </Form.Item>

                <Form.Item
                    name="upload"
                    label="Upload CSV"
                >
                    {/* <input type="file" onChange={handleCSVFileChange} /> */}
                    <input type="file" onChange={handleChange} />
                </Form.Item>

                <Form.Item
                    wrapperCol={{
                        offset: 8,
                        span: 16,
                    }}
                >
                    <Button type="primary" htmlType="submit">
                        Airdrop
                    </Button>
                </Form.Item>
                
            </Form>
        </div>
    )
}

export default Airdrop;
