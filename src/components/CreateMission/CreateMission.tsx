import { yupResolver } from '@hookform/resolvers/yup';
import React, { useEffect ,useState,CSSProperties } from 'react';
import { useForm } from 'react-hook-form';
import { getAuth, signInWithPopup, GoogleAuthProvider,TwitterAuthProvider, signOut } from "firebase/auth";
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
import CircleLoader from "react-spinners/CircleLoader"

const override: CSSProperties = {
  display: "block",
  margin: "0 auto",
  borderColor: "red",
  border: "2px soild #ffffff"
}

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
  const [userId, setUserId] = useState("");
  const [end, setEnd] = useState("");
  const [link, setLink] = useState([]);
  const [action, setAction] = useState("");
  const [amount, setAmount] = useState("");
  const [select, setSelect] = useState("");
  const [timezone, setTimeZone] = useState("");
  const [defaultLink, setDefaultLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [accountId, setAccountId] = useState("")

  const logout = async () => {
    await firebaseAuth.signOut();
    // once it has email but not authenicated, it means existing passkey is not valid anymore, therefore remove webauthn_username and try to create a new passkey
    window.localStorage.removeItem('webauthn_username');
    window.fastAuthController.clearUser().then(() => {
    });
    navigate(0)
  }


  useEffect(()=>{
    if(authenticated){
      const accountId = window.localStorage.getItem("accountId")
      console.log("accountId",accountId)
      setAccountId(accountId)
    }
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
    setAction(select)
  },[select])


  const handleInsertData = async() =>{
    const res = await fetch('https://blockquest-api.vercel.app/api/dropauth', {
      method:"POST",
      body:JSON.stringify({
        name: name,
        description: description,
        start: start,
        end: end,
        backgroundCover: image,
        link: link,
        action:action,
        timezone: timezone,
        amount: amount,
        perform:false,
        userCreated:userId
      })
    })
    if(res.ok){
      setLoading(true)
    }
  
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
    setLoading(true)
    const {user} = await signInWithTwitterPopup();
    console.log("user",user);
   // if (!user || !user.emailVerified) return;

    const accessToken = await user.getIdToken();
    setUserId(user.providerData[0].uid)
    window.localStorage.setItem("twitter-uid",user.providerData[0].uid)
    const email = user.providerData[0].uid;
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
      accountId = publicKeyFak.replace("ed25519:","").toLocaleLowerCase() + `.${network.fastAuth.accountIdSuffix}`;
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

      accountId = publicKeyFak.replace("ed25519:","").toLocaleLowerCase() + `.${network.fastAuth.accountIdSuffix}`;
      await window.fastAuthController.setAccountId(accountId);
      setAccountId(accountId)
      
      window.localStorage.setItem("accountId",accountId)
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
      window.localStorage.setItem("accountId",accountIds[0])
      setAccountId(accountIds[0])
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
      setLoading(false)
    }

  } catch (error) {
    setLoading(false)
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
                    BlockQuest: "",
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
  <div className='bg-slate-300'>
      {loading&&<div className="loading">
        <div className='format-loading'>
        <CircleLoader
                color={"#000000"}
                loading={loading}
                cssOverride={override}
                size={200}
                aria-label="Loading Spinner"
                data-testid="loader"
                    />
        </div>    
      </div>}
  <nav className="navbar navbar-expand-lg bg-body-tertiary">

            <div className="container-fluid nav-format">
                <a className="navbar-brand text-decoration-none fs-4 font-weight-bold text-white" href={window.location.origin+"/"}>BlockQuest</a>
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
                      <div className='login'>
                        <span className="text-white accountid">huunhanz.near</span>
                        <button className="btn btn-outline-success text-white" onClick={logout} >Logout</button>
                      </div>
                      
                    ) :(
                      <button className="btn btn-outline-success text-white" onClick={(e)=>signIn("twitter")} >Login</button>
                    )}
                    
                </div>
            </div>
            </nav>
            
<div className="container py-5 bg-slate-300">

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
    {!authenticated ? 
        (
          <div className="form-format rounded-lg shadow-sm p-5">
            
          <div className="tab-content">
            <div id="nav-tab-card" className="tab-pane fade show active">
              {/* <p className="alert alert-success">Some text success or error</p> */}
              <h3 className='fs-3 text-black'>General Information</h3>
              <div className="form mt-2">
                <div className="form-group mt-2 fs-6">
                  <label className='text-black'>Name</label>
                  <input onChange={(e)=>setName(e.target.value)} type="text" name="username" placeholder="MyCompany Macbook Air giveaway" required className="form-control"/>
                </div>
                <div className="form-group mt-2 fs-6">
                  <label className='text-black'>Description</label>
                  <input onChange={(e)=>setDescription(e.target.value)} type="text" name="username" placeholder="It's Time to Step into the Open Web with NEAR Protocol" required className="form-control"/>
                </div>
                <div className="form-group mt-2 fs-6">
                  <div className='d-flex justify-content-between'>
                   <div>
                   <label className='text-black'>Start</label>
                    <div className="input-group">
                      <input onChange={(e)=>setStart(e.target.value)} type="date" name="cardNumber" className="form-control" required/>
                    </div>
                   </div>
                    <div>
                      <label className='text-black'>End</label>
                      <div className="input-group">
                        <input onChange={(e)=>setEnd(e.target.value)} type="date" name="cardNumber" className="form-control" required/>
                      </div>
                    </div>
                    <div>
                    <label className='text-black'>Time Zone</label>
                    <select onChange={(e)=>setTimeZone(e.target.value)} className="form-select mt-2">
                      <option selected>-- Select time zone --</option>
                      <option value="UTC+07">UTC+07:00 (HCM Time)</option>
                      <option value="UTC-11">UTC-11:00 (ST)</option>
                      <option value="TC-10">UTC-10:00 </option>
                    </select>
                    </div>
                  </div>
                </div>
  
                <label className='mt-3 fs-6 text-black'>Upload NFT</label>
                <div className="form-group mt border">
                  <input type="file" onChange={handleUpdateFile}/>
                </div>
              </div>
              <h3 className='mt-3 fs-3 text-black'>Add Mission</h3>
              <div className="form mt-2">
                <button onClick={()=>{
                  setElemnt(elment=>elment.concat(<div>
                    <div className="form-group mt-2">
                    <label className='mt-2 text-black fs-6'>Link</label>
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
              <h3 className='mt-3 fs-3 text-black'>Prizes</h3>
              <form className="form mt-2">
                <div className="form-group mt-2">
                  <label className='fs-6 text-black'>Amount</label>
                  <input onChange={(e)=>setAmount(e.target.value)} type="text" placeholder="1 NFT" required className="form-control"/>
                </div>
                <div className="row mt-2 g-2">
                  <label className='col fs-6 text-black'>Distribute</label>
                  <div className="form-check col fs-6">
                    <input className="form-check-input" type="checkbox" value="" id="flexCheckDefault"/>
                    <label className="form-check-label text-black" htmlFor="flexCheckDefault">
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
          <button onClick={(e)=>signIn("twitter")} className=" px-3 py-2 btn btn-m btn-ms bg-black ">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-caret-right-fill icon text-white" viewBox="0 0 16 16">
                                    <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/>
                                    </svg>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" x="0px" y="0px"  viewBox="0 0 48 48">
                                    <path fill="#03A9F4" d="M42,12.429c-1.323,0.586-2.746,0.977-4.247,1.162c1.526-0.906,2.7-2.351,3.251-4.058c-1.428,0.837-3.01,1.452-4.693,1.776C34.967,9.884,33.05,9,30.926,9c-4.08,0-7.387,3.278-7.387,7.32c0,0.572,0.067,1.129,0.193,1.67c-6.138-0.308-11.582-3.226-15.224-7.654c-0.64,1.082-1,2.349-1,3.686c0,2.541,1.301,4.778,3.285,6.096c-1.211-0.037-2.351-0.374-3.349-0.914c0,0.022,0,0.055,0,0.086c0,3.551,2.547,6.508,5.923,7.181c-0.617,0.169-1.269,0.263-1.941,0.263c-0.477,0-0.942-0.054-1.392-0.135c0.94,2.902,3.667,5.023,6.898,5.086c-2.528,1.96-5.712,3.134-9.174,3.134c-0.598,0-1.183-0.034-1.761-0.104C9.268,36.786,13.152,38,17.321,38c13.585,0,21.017-11.156,21.017-20.834c0-0.317-0.01-0.633-0.025-0.945C39.763,15.197,41.013,13.905,42,12.429"></path>
                                    </svg>
                                    <span className="text-sm text-white text-center">Login Twitter</span>
                                </button>
          </div>
          <h2 data-test-id="callback-status-message">{statusMessage}</h2>
        </div>
        
        }
        

    </div>
  </div>
</div>

  </div>
  );
}

export default CreateMission;