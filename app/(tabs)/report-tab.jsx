import React from 'react';
import { Redirect } from 'expo-router';
 
// This is just a placeholder for the tab
// The actual reporting screen is a modal at /report
export default function ReportTabScreen() {
  return <Redirect href="/report" />;
} 