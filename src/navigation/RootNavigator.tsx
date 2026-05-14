/**
 * Root navigation stack
 */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../types';
import {ScannerScreen} from '../screens/ScannerScreen';
import {GalleryScreen} from '../screens/GalleryScreen';
import {COLORS} from '../constants';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Scanner"
      screenOptions={{
        headerShown: false,
        contentStyle: {backgroundColor: COLORS.background},
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="Scanner" component={ScannerScreen} />
      <Stack.Screen name="Gallery" component={GalleryScreen} />
    </Stack.Navigator>
  );
};
