import React, { useState, useEffect } from 'react';
import { Button, Snackbar, Alert, Tooltip } from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import DownloadDoneIcon from '@mui/icons-material/DownloadDone';

interface OfflineSaveButtonProps {
  caseId: string;
  caseData: any;
}

export default function OfflineSaveButton({ caseId, caseData }: OfflineSaveButtonProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    // Check if it's already cached
    if ('caches' in window) {
      caches.match(`/cases/${caseId}`).then((response) => {
      .catch(err => console.error(err))