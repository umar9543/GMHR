/* eslint-disable no-restricted-globals */
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import AttendanceMonthWisePDF from '../sections/HR_Attendance/attendance-month-wise-pdf';

self.onmessage = async (e) => {
  try {
    const { reportData, currentMonth } = e.data;
    
    // Run the massive PDF generation inside the worker to keep the main UI thread 100% free!
    const blob = await pdf(
      <AttendanceMonthWisePDF reportData={reportData} currentMonth={new Date(currentMonth)} />
    ).toBlob();
    
    self.postMessage({ blob, success: true });
  } catch (err) {
    self.postMessage({ error: err.message, success: false });
  }
};
