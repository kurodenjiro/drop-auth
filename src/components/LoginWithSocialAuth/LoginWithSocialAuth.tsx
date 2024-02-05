import { yupResolver } from '@hookform/resolvers/yup';
import React, { useEffect ,useState } from 'react';
import { useForm } from 'react-hook-form';
import { getAuth, signInWithPopup, GoogleAuthProvider,TwitterAuthProvider } from "firebase/auth";
import { useNavigate, useRoutes, useSearchParams } from 'react-router-dom';
import * as yup from 'yup';
import { LoginWrapper } from './LoginWithSocialAuth.style';
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
// Initialize Firebase Auth provider
const provider = new GoogleAuthProvider();
const providerTwiiter = new TwitterAuthProvider();
import { createKey, isPassKeyAvailable } from '@near-js/biometric-ed25519';
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
  console.log("oidcKeypair",oidcKeypair)
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
  //if (res.type === 'err') return;

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
  console.log(recoveryPK)
//recoveryPK sẽ pass vào dưới này
    await onSignIn({
      accessToken,
      publicKeyFak,
      public_key_lak : recoveryPK,
      contract_id,
      methodNames,
      setStatusMessage,
      email,
      gateway,
      navigate
    })
  
  
  

  // parsedUrl.searchParams.set('account_id', res.near_account_id);
  // parsedUrl.searchParams.set('public_key', public_key_lak);
  // parsedUrl.searchParams.set('all_keys', (publicKeyFak ? [public_key_lak, publicKeyFak, recoveryPK] : [public_key_lak, recoveryPK]).join(','));

  // window.location.replace(parsedUrl.href);
  //recoverPK sẽ pass vào dưới này
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
}) => {

  const recoveryPK = await window.fastAuthController.getUserCredential(accessToken);
  const accountIds = await fetch(`${network.fastAuth.authHelperUrl}/publicKey/${recoveryPK}/accounts`)
    .then((res) => res.json())
    .catch((err) => {
      console.log(err);
      captureException(err);
      throw new Error('Unable to retrieve account Id');
    });


  if (!accountIds.length) {
    //creat wallet here
    throw new Error('Account not found, please create an account and try again');
  }
  
  // TODO: If we want to remove old LAK automatically, use below code and add deleteKeyActions to signAndSendActionsWithRecoveryKey
  // const existingDevice = await window.firestoreController.getDeviceCollection(publicKeyFak);
  // // delete old lak key attached to webAuthN public Key
  // const deleteKeyActions = existingDevice
  //   ? getDeleteKeysAction(existingDevice.publicKeys.filter((key) => key !== publicKeyFak)) : [];


   // onlyAddLak will be true if current browser already has a FAK with passkey
   const onlyAddLak = !publicKeyFak || publicKeyFak === 'null';
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
     window.localStorage.setItem('accessToken', accessToken);
     window.localStorage.setItem('accountId', accountIds[0]);
     window.localStorage.setItem('recoveryPK', recoveryPK);
   return (window as any).fastAuthController.signAndSendActionsWithRecoveryKey({
     oidcToken: accessToken,
     accountId: accountIds[0],
     recoveryPK,
     actions:   addKeyActions
   })
     .then((res) => res.json())
     .then(async (res) => {
       const failure = res['Receipts Outcome']
         .find(({ outcome: { status } }) => Object.keys(status).some((k) => k === 'Failure'))?.outcome?.status?.Failure;
       if (failure?.ActionError?.kind?.LackBalanceForState) {
         //navigate(`/devices?${searchParams.toString()}`);
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
         
         //setStatusMessage()
        //  const syncActions = syncProfile({
        //   accountId:   "",
        //   accountName: "",
        //   accountUser:        "",
        //   accountPicProfile : ""
        // });
   

        // (window as any).fastAuthController.signAndSendActionsWithRecoveryKey({
        //   oidcToken: accessToken,
        //   accountId: accountIds[0],
        //   recoveryPK,
        //   actions: syncActions
        // })
        //   .then((res) => res.json())
        //   .then(async (res) => {
        //     setStatusMessage('done');
        //   })

        
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





function LoginWithSocialAuth() {
  const navigate = useNavigate();
  const { authenticated } = useAuthState();
  const [statusMessage, setStatusMessage] = useState<any>(authenticated&&"");
  const logout = async () => {
    await firebaseAuth.signOut();
    // once it has email but not authenicated, it means existing passkey is not valid anymore, therefore remove webauthn_username and try to create a new passkey
    window.localStorage.removeItem('webauthn_username');
    window.fastAuthController.clearUser().then(() => {
    });
    navigate(0)
  }

  const signInWithTwitter = async() =>{
    const {user} = await signInWithTwitterPopup();
    if (!user) return;
    const accessToken = await user.getIdToken();
      let publicKeyFak: string;
      let public_key_lak : string;
      const keyPair = KeyPair.fromRandom('ed25519');
      publicKeyFak = keyPair.getPublicKey().toString();
      await window.fastAuthController.setKey(keyPair);
      const email = user.providerData[0].email;
      //console.log("accesstoken",accessToken)
      const success_url = window.location.origin;
      let accountId = "" // user.email.replace("@gmail.com",`.${network.fastAuth.accountIdSuffix}`) ;
      const methodNames = "set";
      const contract_id = "v1.social08.testnet"
      
      let isRecovery = true;
      let oidcKeypair = await window.fastAuthController.getKey(`oidc_keypair_${accessToken}`);

      if (!window.fastAuthController.getAccountId()) {
        await window.fastAuthController.setAccountId(accountId);
      }

      if(!oidcKeypair){
        await window.fastAuthController.claimOidcToken(accessToken);
        oidcKeypair = await window.fastAuthController.getKey(`oidc_keypair_${accessToken}`);
        window.firestoreController = new FirestoreController();
        window.firestoreController.updateUser({
          userUid:   user.uid,
          oidcToken: accessToken,
        });
      }
      //console.log("acc",accountId)
      const accountIds = await fetch(`${network.fastAuth.authHelperUrl}/publicKey/${publicKeyFak}/accounts`)
        .then((res) => res.json())
        .catch((err) => {
          console.log(err);
          captureException(err);
          throw new Error('Unable to retrieve account Id');
        });
       if (!accountIds.length) {
        isRecovery = false
       }
       if(isRecovery){
        accountId = accountIds[0]
        
       }
        //check exist account . if not exist then create . if exist create another account
        const isAvailable = await checkIsAccountAvailable(email?email.replace("@gmail.com",`.${network.fastAuth.accountIdSuffix}`):`${user.displayName.toString().toLocaleLowerCase()}.${network.fastAuth.accountIdSuffix}`);
        if(isAvailable){
          accountId = `${email?email.replace("@gmail.com",""):user.displayName.toString().toLocaleLowerCase()}.${network.fastAuth.accountIdSuffix}`

        }else{
          accountId = `${email?email.replace("@gmail.com",publicKeyFak.replace("ed25519:","").slice(0,4).toLocaleLowerCase()):user.displayName.toString().toLocaleLowerCase()+publicKeyFak.replace("ed25519:","").slice(0,4).toLocaleLowerCase()}.${network.fastAuth.accountIdSuffix}`;
        }
        if (!window.fastAuthController.getAccountId()) {
          await window.fastAuthController.setAccountId(accountId);
        }
      // if account in mpc then recovery 
      // if account not exist then create new account
      if(isRecovery){
       
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
          }
        )
      }else{
      //  public_key_lak = publicKeyFak;
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
      }
  }

  const signInWithGoogle = async () => {
    try {
      const {user} = await signInWithGooglePopup();
      if (!user || !user.emailVerified) return;
  
      const accessToken = await user.getIdToken();
      let publicKeyFak: string;
      let public_key_lak : string;
      const keyPair = KeyPair.fromRandom('ed25519');
      publicKeyFak = keyPair.getPublicKey().toString();
      await window.fastAuthController.setKey(keyPair);
      const email = user.email;
      //console.log("accesstoken",accessToken)
      const success_url = window.location.origin;
      let accountId = "" // user.email.replace("@gmail.com",`.${network.fastAuth.accountIdSuffix}`) ;
      const methodNames = "set";
      const contract_id = "v1.social08.testnet"
      
      let isRecovery = true;
      let oidcKeypair = await window.fastAuthController.getKey(`oidc_keypair_${accessToken}`);

      if (!window.fastAuthController.getAccountId()) {
        await window.fastAuthController.setAccountId(accountId);
      }

      if(!oidcKeypair){
        await window.fastAuthController.claimOidcToken(accessToken);
        oidcKeypair = await window.fastAuthController.getKey(`oidc_keypair_${accessToken}`);
        window.firestoreController = new FirestoreController();
        window.firestoreController.updateUser({
          userUid:   user.uid,
          oidcToken: accessToken,
        });
      }
      //console.log("acc",accountId)
      const accountIds = await fetch(`${network.fastAuth.authHelperUrl}/publicKey/${publicKeyFak}/accounts`)
        .then((res) => res.json())
        .catch((err) => {
          console.log(err);
          captureException(err);
          throw new Error('Unable to retrieve account Id');
        });
       if (!accountIds.length) {
        isRecovery = false
                //check exist account . if not exist then create . if exist create another account
                const isAvailable = await checkIsAccountAvailable(user.email.replace("@gmail.com",`.${network.fastAuth.accountIdSuffix}`));
                if(isAvailable){
                  accountId = user.email.replace("@gmail.com",`.${network.fastAuth.accountIdSuffix}`)
                }else{
                  accountId = user.email.replace("@gmail.com",publicKeyFak.replace("ed25519:","").slice(0,4).toLocaleLowerCase() + `.${network.fastAuth.accountIdSuffix}`) ;
                }
       } else{
        if(isRecovery){
          accountId = accountIds[0]
         }
       }

      

      
       
      // if account in mpc then recovery 
      // if account not exist then create new account
      if(isRecovery){
       
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
          }
        )
      }else{
      //  public_key_lak = publicKeyFak;
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
      }


  
    } catch (error) {
      console.log('error', error);
      captureException(error);
    }
  }
  const hanleSync = async() =>{
    const accountId = window.localStorage.getItem("accountId");
    const accessToken = window.localStorage.getItem('accessToken');
    const recoveryPk = window.localStorage.getItem('recoveryPK');
    const syncActions = syncProfile({
      accountId:   "",
      accountName: "",
      accountUser:        "",
      accountPicProfile : ""
    });
  
  
    (window as any).fastAuthController.signAndSendActionsWithRecoveryKey({
      oidcToken: accessToken,
      accountId: accountId,
      recoveryPk,
      actions: syncActions
    })
      .then((res) => res.json())
      .then(async (res) => {
        setStatusMessage('done');
      })
  }

  return (
    <LoginWrapper>
      <div >
        <header>
          <h1 data-test-id="heading_login">Log In With Google</h1>
        </header>
        {authenticated ? 
        (
        <div>
        <h3 className='text-2xl font-semibold'>signed in</h3>
        <button className='px-4 py-2 border flex gap-2 border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-slate-300 hover:shadow transition duration-150' onClick={logout}>Logout</button>
        <div className="flex items-center justify-center h-screen dark:bg-gray-800">
              <button onClick={hanleSync} className="px-4 py-2 border flex gap-2 border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-slate-300 hover:shadow transition duration-150">
                  <span>Sync Profile Social</span>
              </button>
          </div>
        </div>
        
        )
        
        : <div>
          <div className="flex items-center justify-center h-screen dark:bg-gray-800">
              <button onClick={signInWithGoogle} className="px-4 py-2 border flex gap-2 border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-slate-300 hover:shadow transition duration-150">
                  <span>Login with Google</span>
              </button>
          </div>
          <div className="flex items-center justify-center h-screen dark:bg-gray-800">
              <button onClick={signInWithTwitter} className="px-4 py-2 border flex gap-2 border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-slate-300 hover:shadow transition duration-150">
                  <span>Login with Twitter</span>
              </button>
          </div>
        </div>
        
        }
        
        <div data-test-id="callback-status-message">{statusMessage}</div>
      </div>
    </LoginWrapper>
  );
}

export default LoginWithSocialAuth;