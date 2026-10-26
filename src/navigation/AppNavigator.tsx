/* eslint-disable react/no-unstable-nested-components -- React Navigation requires an icon render callback in screen options. */
import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {NavigationContainer,DarkTheme} from '@react-navigation/native';
import {Gauge,History,MapPinned,Network} from 'lucide-react-native';
import {colors} from '../theme/tokens';
import {DashboardScreen} from '../screens/DashboardScreen';
import {NetworkScannerScreen} from '../screens/NetworkScannerScreen';
import {InstallationScreen} from '../screens/InstallationScreen';
import {HistoryScreen} from '../screens/HistoryScreen';
import {DeviceDetailScreen,SnmpScreen,SshScreen} from '../screens/DiagnosticScreens';
import {QrScreen} from '../screens/QrScreen';
import {ReportsScreen,SettingsScreen,SyncScreen} from '../screens/OperationsScreens';
import {RootStackParamList} from './types';

const Stack=createNativeStackNavigator<RootStackParamList>();
const Tabs=createBottomTabNavigator();
const icons={Resumen:Gauge,Red:Network,Instalación:MapPinned,Historial:History};
function HomeTabs(){return <Tabs.Navigator screenOptions={({route})=>({headerShown:false,tabBarStyle:{backgroundColor:colors.surface,borderTopColor:colors.border,height:66,paddingTop:7,paddingBottom:8},tabBarActiveTintColor:colors.accent,tabBarInactiveTintColor:colors.muted,tabBarLabelStyle:{fontSize:11,fontWeight:'700'},tabBarIcon:({color,size})=>{const Icon=icons[route.name as keyof typeof icons];return <Icon color={color} size={size}/>;}})}><Tabs.Screen name="Resumen" component={DashboardScreen}/><Tabs.Screen name="Red" component={NetworkScannerScreen}/><Tabs.Screen name="Instalación" component={InstallationScreen}/><Tabs.Screen name="Historial" component={HistoryScreen}/></Tabs.Navigator>}
export function AppNavigator(){return <NavigationContainer theme={{...DarkTheme,colors:{...DarkTheme.colors,background:colors.background,card:colors.surface,border:colors.border,text:colors.ink,primary:colors.accent}}}><Stack.Navigator screenOptions={{headerStyle:{backgroundColor:colors.surface},headerTintColor:colors.ink,headerShadowVisible:false,contentStyle:{backgroundColor:colors.background}}}><Stack.Screen name="Home" component={HomeTabs} options={{headerShown:false}}/><Stack.Screen name="DeviceDetail" component={DeviceDetailScreen} options={{title:'Detalle del dispositivo'}}/><Stack.Screen name="Snmp" component={SnmpScreen} options={{title:'Diagnóstico SNMP'}}/><Stack.Screen name="Ssh" component={SshScreen} options={{title:'Diagnóstico SSH'}}/><Stack.Screen name="Qr" component={QrScreen} options={{title:'Identificar equipo'}}/><Stack.Screen name="Reports" component={ReportsScreen} options={{title:'Reportes PDF'}}/><Stack.Screen name="Sync" component={SyncScreen} options={{title:'Sincronización'}}/><Stack.Screen name="Settings" component={SettingsScreen} options={{title:'Configuración'}}/></Stack.Navigator></NavigationContainer>}
