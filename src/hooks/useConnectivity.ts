import {useEffect,useState} from 'react';
import NetInfo from '@react-native-community/netinfo';
export function useConnectivity(){const [state,setState]=useState({lan:false,internet:false,type:'unknown'});useEffect(()=>NetInfo.addEventListener(s=>setState({lan:s.type==='wifi'&&!!s.isConnected,internet:!!s.isInternetReachable,type:s.type})),[]);return state;}
