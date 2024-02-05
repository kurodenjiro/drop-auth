import { yupResolver } from '@hookform/resolvers/yup';
import React, { useEffect ,useState } from 'react';
import { useForm } from 'react-hook-form';
import { getAuth, signInWithPopup, GoogleAuthProvider,TwitterAuthProvider } from "firebase/auth";
import { useNavigate, useRoutes, useSearchParams } from 'react-router-dom';
import * as yup from 'yup';
import { Button } from '../../lib/Button';
import Input from '../../lib/Input/Input';
import { createNEARAccount } from '../../api';
import FirestoreController from '../../lib/firestoreController';
import { actionCreators } from "@near-js/transactions";
import { basePath, network, networkId } from '../../utils/config';
import { captureException } from '@sentry/react';
import { KeyPair } from 'near-api-js';
import { InMemoryKeyStore } from "@near-js/keystores";
import { JsonRpcProvider } from '@near-js/providers';
import type { KeyStore } from '@near-js/keystores';
import { Account } from '@near-js/accounts';
import { InMemorySigner } from '@near-js/signers';
import {
  getAddKeyAction, getAddLAKAction , syncProfile
} from '../../utils/mpc-service';
import FastAuthController from '../../lib/controller';
import BN from 'bn.js';
import { openToast } from '../../lib/Toast';
import { checkFirestoreReady, firebaseAuth } from '../../utils/firebase';
import { useAuthState } from '../../lib/useAuthState';
const {
  functionCall
  } = actionCreators;
// Initialize Firebase Auth provider
const provider = new GoogleAuthProvider();
const providerTwiiter = new TwitterAuthProvider();
import { createKey, isPassKeyAvailable } from '@near-js/biometric-ed25519';
import axios from "axios"
// whenever a user interacts with the provider, we force them to select an account
provider.setCustomParameters({   
    prompt : "select_account"
});
providerTwiiter.setCustomParameters({   
  prompt : "select_account"
});
export const signInWithGooglePopup = () => signInWithPopup(firebaseAuth, provider);
export const signInWithTwitterPopup = () => signInWithPopup(firebaseAuth, providerTwiiter)

const onCreateAccount = async ({
  oidcKeypair,
  accessToken,
  accountId,
  publicKeyFak,
  public_key_lak,
  contract_id,
  methodNames,
  success_url,
  setStatusMessage,
  email,
  gateway,
  navigate
}) => {
  const res = await createNEARAccount({
    accountId,
    fullAccessKeys:    publicKeyFak ? [publicKeyFak] : [],
    limitedAccessKeys: public_key_lak ? [{
      public_key:   public_key_lak,
      receiver_id:  contract_id,
      allowance:    '250000000000000',
      method_names: methodNames ?? '',
    }] : [],
    accessToken,
    oidcKeypair,
  });
  console.log("res.type",res)
  if (res.type === 'err') return;

  if (!window.firestoreController) {
    window.firestoreController = new FirestoreController();
  }

  // Add device
  await window.firestoreController.addDeviceCollection({
    fakPublicKey: publicKeyFak,
    lakPublicKey: public_key_lak,
    gateway,
  });

  setStatusMessage('Account created successfully!');

  // TODO: Check if account ID matches the one from email

  if (publicKeyFak) {
    window.localStorage.setItem('webauthn_username', email);
  }

  setStatusMessage('Redirecting to app...');

  const recoveryPK = await window.fastAuthController.getUserCredential(accessToken);

    await onSignIn({
      accessToken,
      publicKeyFak,
      public_key_lak : recoveryPK,
      contract_id,
      methodNames,
      setStatusMessage,
      email,
      gateway,
      navigate,
      accountId,
      recoveryPK
    })
};

export const onSignIn = async ({
  accessToken,
  publicKeyFak,
  public_key_lak,
  contract_id,
  methodNames,
  setStatusMessage,
  email,
  gateway,
  navigate,
  accountId,
  recoveryPK
}) => {

   const onlyAddLak = !publicKeyFak || publicKeyFak === 'null';
   console.log("onlyAddLak",onlyAddLak)
   const addKeyActions = onlyAddLak
     ? getAddLAKAction({
       publicKeyLak: public_key_lak,
       contractId:   contract_id,
       methodNames,
       allowance:    new BN('250000000000000'),
     }) : getAddKeyAction({
       publicKeyLak:      public_key_lak,
       webAuthNPublicKey: publicKeyFak,
       contractId:        contract_id,
       methodNames,
       allowance:         new BN('250000000000000'),
     });

   await (window as any).fastAuthController.signAndSendActionsWithRecoveryKey({
     oidcToken: accessToken,
     accountId,
     recoveryPK,
     actions:   addKeyActions
   })
     .then((res) => res.json())
     .then(async (res) => {
       const failure = res['Receipts Outcome']
         .find(({ outcome: { status } }) => Object.keys(status).some((k) => k === 'Failure'))?.outcome?.status?.Failure;
       if (failure?.ActionError?.kind?.LackBalanceForState) {

       } else {
         await checkFirestoreReady();
          
         if (!window.firestoreController) {
           (window as any).firestoreController = new FirestoreController();
         }
         await window.firestoreController.addDeviceCollection({
           fakPublicKey: onlyAddLak ? null : publicKeyFak,
           lakPublicKey: public_key_lak,
           gateway,
         });
 
         setStatusMessage('Account recovered successfully!');
 
         if (publicKeyFak) {
           window.localStorage.setItem('webauthn_username', email);
         }
         window.location.reload();
       }
     });
};


const checkIsAccountAvailable = async (desiredUsername: string): Promise<boolean> => {
  try {
    const response = await fetch(network.nodeUrl, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id:      'dontcare',
        method:  'query',
        params:  {
          request_type: 'view_account',
          finality:     'final',
          account_id:   `${desiredUsername}`,
        },
      }),
    });
    const data = await response.json();
    if (data?.error?.cause?.name === 'UNKNOWN_ACCOUNT') {
      return true;
    }

    if (data?.result?.code_hash) {
      return false;
    }

    return false;
  } catch (error: any) {
    console.log(error);
    openToast({
      title: error.message,
      type:  'ERROR'
    });
    return false;
  }
};


const schema = yup.object().shape({
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Please enter a valid email address'),
});





function CreateMission() {
  const navigate = useNavigate();
  const { authenticated } = useAuthState();
  const [statusMessage, setStatusMessage] = useState<any>("");
  const [elment,setElemnt] = useState([])
  const [image,setImage] = useState<any>(null)
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [link, setLink] = useState([]);
  const [amount, setAmount] = useState("");
  const [select, setSelect] = useState("");
  const [timezone, setTimeZone] = useState("");
  const [defaultLink, setDefaultLink] = useState("");




  useEffect(()=>{

    if(select=="like"){
      //https://twitter.com/0_bishi_7/status/1754587117966008752
      let tweet_id = defaultLink.split("/")[5]
      let username =  defaultLink.split("/")[3]
      //console.log("tw",tweet_id)
      setLink(l=>l.concat({
        title:`Like @${username} Tweet`,
        link:`https://twitter.com/intent/like?tweet_id=${tweet_id}`
      }))
    }else if(select=="follow"){
      let screen_name = defaultLink.split("/")[3]
      setLink(l=>l.concat({
        title: `Follow @${screen_name} on Twitter`,
        link: `https://twitter.com/intent/follow?screen_name=${screen_name}`
      }))
    }else if(select == "retweet"){
      let tweet_id = defaultLink.split("/")[5]
      setLink(l=>l.concat({
        title:`Retweet the Tweet`,
        link:`https://twitter.com/intent/retweet?tweet_id=${tweet_id}`
      }))
    }
  },[select])


  const handleInsertData = () =>{
    axios.post('http://localhost:8080/api/dropauth/postData', {
      name: name,
      description: description,
      start: start,
      end: end,
      backgroundCover: image,
      link: link,
      timezone: timezone,
      amount: amount
    } )
    .then(function (response) {
      console.log(response);
    })
    .catch(function (error) {
      console.log(error);
    });
  
  }
  const handleSelect= (e:any) =>{
    setSelect(e.target.value)
  }

  const handleUpdateFile = (e:any) =>{
    const data = new FileReader();
    data.addEventListener('load',()=>{
      setImage(data.result)
    })
    data.readAsDataURL(e.target.files[0])
  }


console.log(link)
console.log(image)
//console.log("set",select)

const signIn = async (authType) => {
  try {
    const {user} = authType == "google" ? await signInWithGooglePopup() : await signInWithTwitterPopup();
    if (!user || !user.emailVerified) return;

    const accessToken = await user.getIdToken();
    
    const email = user.email;
    const success_url = window.location.origin;

    //check accounts
    let accountId = window.fastAuthController.getAccountId()
    console.log("accountId",accountId)
    const methodNames = "set";
    const contract_id = "v1.social08.testnet"
    let isRecovery = true;

    
  

    // claim the oidc token
    window.fastAuthController = new FastAuthController({
      accountId,
      networkId
    });
    

    let publicKeyFak: string;
    let public_key_lak : string;
    
    
      const keyPair =  KeyPair.fromRandom('ed25519');
      publicKeyFak = keyPair.getPublicKey().toString();
      await window.fastAuthController.setKey(keyPair);
    

    if (!window.fastAuthController.getAccountId()) {
      isRecovery = false
      const isAvailable = await checkIsAccountAvailable(user.email.replace("@gmail.com",`.${network.fastAuth.accountIdSuffix}`));
      if(isAvailable){
        accountId = user.email.replace("@gmail.com",`.${network.fastAuth.accountIdSuffix}`)
      }else{
        accountId = user.email.replace("@gmail.com",publicKeyFak.replace("ed25519:","").slice(0,4).toLocaleLowerCase()) ;
      }
      await window.fastAuthController.setAccountId(accountId);
    }

    await window.fastAuthController.claimOidcToken(accessToken);
    const oidcKeypair = await window.fastAuthController.getKey(`oidc_keypair_${accessToken}`);
    window.firestoreController = new FirestoreController();
    window.firestoreController.updateUser({
      userUid:   user.uid,
      oidcToken: accessToken,
    });
    // if account in mpc then recovery 
    // if account not exist then create new account
    const recoveryPK = await window.fastAuthController.getUserCredential(accessToken);

    const accountIds = await fetch(`${network.fastAuth.authHelperUrl}/publicKey/${recoveryPK}/accounts`)
      .then((res) => res.json())
      .catch((err) => {
        console.log(err);
        captureException(err);
        throw new Error('Unable to retrieve account Id');
      });
  
   
    if (!accountIds.length) {
      let accountId : string;
      const isAvailable = await checkIsAccountAvailable(email.replace("@gmail.com",`.${network.fastAuth.accountIdSuffix}`));
      if(isAvailable){
        accountId = email.replace("@gmail.com",`.${network.fastAuth.accountIdSuffix}`)
      }else{
        accountId = email.replace("@gmail.com",publicKeyFak.replace("ed25519:","").slice(0,4).toLocaleLowerCase() + `.${network.fastAuth.accountIdSuffix}`) ;
      }
      await window.fastAuthController.setAccountId(accountId);
      await onCreateAccount(
        {
          oidcKeypair,
          accessToken,
          accountId,
          publicKeyFak,
          public_key_lak,
          contract_id,
          methodNames,
          success_url,
          setStatusMessage,
          email,
          gateway:success_url,
          navigate
        }
      )
    }else{
      setStatusMessage("logging...")
      await onSignIn(
        {
          accessToken,
          publicKeyFak,
          public_key_lak,
          contract_id,
          methodNames,
          setStatusMessage,
          email,
          navigate,
          gateway:success_url,
          accountId:accountIds[0],
          recoveryPK
        }
      )
    }

  } catch (error) {
    console.log('error', error);
    captureException(error);
  }
}
const hanleSync = async() =>{
  const accessToken = await firebaseAuth.currentUser.getIdToken()
  const recoveryPK = await window.fastAuthController.getUserCredential(accessToken);
  const accountIds = await fetch(`${network.fastAuth.authHelperUrl}/publicKey/${recoveryPK}/accounts`).then((res) => res.json())
  
  console.log("recoveryPk",recoveryPK)
  const syncActions = syncProfile({
    accountId:   "",
    accountName: "",
    accountUser:        "",
    accountPicProfile : ""
  });
 
  const gas = "300000000000000";
  const deposit = "50000000000000000000000";
  // (window as any).fastAuthController.signAndSendAddKey({
  //   contractId :"v1.social08.testnet", 
  //   methodNames:"", 
  //   allowance:"250000000000000", 
  //   publicKey:recoveryPK,
  // })
  (window as any).fastAuthController.signAndSendDelegateActionWhitelist({
    receiverId :"v1.social08.testnet",
    actions: [functionCall(
      "set",
      {
        data: {
          [accountIds[0]]: {
              profile: {
                  name:  "MPC x",
                  description: "MPC sync with ",
                  linktree: {
                      gmail: "",
                  },
                  image: {
                    ipfs_cid: ""
                  },
                  tags: {
                    dropauth: "",
                    near: "",
                    wallet: ""
                  }
                }
            }
        }
      
      },
      new BN(gas),
      new BN(deposit))
      ]
  })
    .then((res) => res.json())
    .then(async (res) => {
      setStatusMessage('done');
    })
    
}
  return (
  <div className='background'>
  <nav className="navbar navbar-expand-lg bg-body-tertiary">
            <div className="container-fluid nav-format">
                <a className="navbar-brand text-white text-decoration-none fs-4 font-weight-bold" href={window.location.origin+"/"}>DropAuth</a>
                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse  nav-format" id="navbarSupportedContent">
                    <ul className="navbar-nav me-auto mb-2 mb-lg-0 text-decoration-none ">
                        <li className="nav-item">
                        <a className="nav-link active text-white text-decoration-none fs-6" href="/">Home</a>
                        </li>
                        <li className="nav-item text-decoration-none">
                        <a className="nav-link text-white text-decoration-none fs-6" href="/create-mission">Create Mission</a>
                        </li>
                    </ul>
                    {authenticated ? (
                      <button className="btn btn-outline-success text-white" >Logout</button>
                    ) :(
                      <button className="btn text-white" onClick={(e)=>signIn("twitter")} >Login Twitter</button>
                    )}
                    
                </div>
            </div>
            </nav>

<div className="container py-5">

  <div className="row mb-4">
    <div className="col-lg-8 mx-auto text-center">
       {image && (
                  <div>
                    <img
                    width={"100%"}
                    height={"400px"}
                      src={image}
                      alt="Thumb"
                    />
                  </div>
                )}
    </div>
  </div>
  <div className="row">
    <div className="col-lg-7 mx-auto">
    {authenticated ? 
        (
          <div className="form-format rounded-lg shadow-sm p-5">
          <div className="tab-content">
            <div id="nav-tab-card" className="tab-pane fade show active">
              {/* <p className="alert alert-success">Some text success or error</p> */}
              <h3 className='fs-3 text-white'>General Information</h3>
              <form className="form mt-2">
                <div className="form-group mt-2 fs-6">
                  <label className='text-white'>Name</label>
                  <input onChange={(e)=>setName(e.target.value)} type="text" name="username" placeholder="MyCompany Macbook Air giveaway" required className="form-control"/>
                </div>
                <div className="form-group mt-2 fs-6">
                  <label className='text-white'>Description</label>
                  <input onChange={(e)=>setDescription(e.target.value)} type="text" name="username" placeholder="It's Time to Step into the Open Web with NEAR Protocol" required className="form-control"/>
                </div>
                <div className="form-group mt-2 fs-6">
                  <div className='d-flex justify-content-between'>
                   <div>
                   <label className='text-white'>Start</label>
                    <div className="input-group">
                      <input onChange={(e)=>setStart(e.target.value)} type="date" name="cardNumber" className="form-control" required/>
                    </div>
                   </div>
                    <div>
                      <label className='text-white'>End</label>
                      <div className="input-group">
                        <input onChange={(e)=>setEnd(e.target.value)} type="date" name="cardNumber" className="form-control" required/>
                      </div>
                    </div>
                    <div>
                    <label className='text-white'>Time Zone</label>
                    <select onChange={(e)=>setTimeZone(e.target.value)} className="form-select mt-2">
                      <option selected>-- Select time zone --</option>
                      <option value="UTC+07">UTC+07:00 (HCM Time)</option>
                      <option value="UTC-11">UTC-11:00 (ST)</option>
                      <option value="TC-10">UTC-10:00 </option>
                    </select>
                    </div>
                  </div>
                </div>
  
                <label className='mt-3 fs-6 text-white'>Upload cover</label>
                <div className="form-group mt border">
                  <input type="file" onChange={handleUpdateFile}/>
                </div>
              </form>
              <h3 className='mt-3 fs-3 text-white'>Add Mission</h3>
              <div className="form mt-2">
                <button onClick={()=>{
                  setElemnt(elment=>elment.concat(<div>
                    <div className="form-group mt-2">
                    <label className='mt-2 text-white fs-6'>Link</label>
                    <input onChange={(e)=>setDefaultLink(e.target.value)} type="text" name="username" placeholder={"https://twitter.com/0_bishi_7/status/1754587117966008752"} required className="form-control"/>
                  </div>
                  <div className="form-group mt-2">
                    <select onChange={handleSelect} className="form-select">
                      <option selected>-- Select options --</option>
                      <option value="like">Like</option>
                      <option value="follow">Follow</option>
                      <option value="retweet">Retweet</option>
                    </select>
                  </div>
                </div>))
                }} type="button" className="btn btn-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor" className="bi bi-twitter" viewBox="0 0 16 16">
                  <path d="M5.026 15c6.038 0 9.341-5.003 9.341-9.334q.002-.211-.006-.422A6.7 6.7 0 0 0 16 3.542a6.7 6.7 0 0 1-1.889.518 3.3 3.3 0 0 0 1.447-1.817 6.5 6.5 0 0 1-2.087.793A3.286 3.286 0 0 0 7.875 6.03a9.32 9.32 0 0 1-6.767-3.429 3.29 3.29 0 0 0 1.018 4.382A3.3 3.3 0 0 1 .64 6.575v.045a3.29 3.29 0 0 0 2.632 3.218 3.2 3.2 0 0 1-.865.115 3 3 0 0 1-.614-.057 3.28 3.28 0 0 0 3.067 2.277A6.6 6.6 0 0 1 .78 13.58a6 6 0 0 1-.78-.045A9.34 9.34 0 0 0 5.026 15"/>
                </svg>
                  <span className='p-2'>Twiiter</span>
                </button>
                {elment}
              </div>
              <h3 className='mt-3 fs-3 text-white'>Prizes</h3>
              <form className="form mt-2">
                <div className="form-group mt-2">
                  <label className='fs-6 text-white'>Amount</label>
                  <input onChange={(e)=>setAmount(e.target.value)} type="text" placeholder="10 NEAR" required className="form-control"/>
                </div>
                <div className="row mt-2 g-2">
                  <label className='col fs-6 text-white'>Distribute</label>
                  <div className="form-check col fs-6">
                    <input className="form-check-input" type="checkbox" value="" id="flexCheckDefault"/>
                    <label className="form-check-label text-white" htmlFor="flexCheckDefault">
                      Random
                    </label>
                  </div>
                </div>
                <button onClick={()=>handleInsertData()} type="button" className="mt-3 font-weight-bold subscribe btn btn-primary btn-block rounded-pill shadow-sm px-3 py-2 fs-5"> Create  </button>
              </form>
            </div>
          </div>
        </div>
        
        )
        
        : <div>
          <div className="flex items-center justify-center h-screen dark:bg-gray-800">
              <button onClick={(e)=>signIn("twitter")} className="px-4 py-2 border flex gap-2 border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-slate-300 hover:shadow transition duration-150">
                  <span>Login with Twitter</span>
              </button>
          </div>
          <div data-test-id="callback-status-message">{statusMessage}</div>
        </div>
        
        }
        

    </div>
  </div>
</div>
  </div>
  );
}

export default CreateMission;