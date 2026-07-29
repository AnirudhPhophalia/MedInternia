import React from 'react';
import { Card, CardContent, Typography, Button } from '@mui/material';
import Link from 'next/link';

export default function DoctorCard({ doctor }: { doctor: any }) {
  const [connected, setConnected] = React.useState(false);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const handleConnect = async () => {
    try {
      await import('../utils/api').then(apiModule =>
      .catch(err => console.error(err))