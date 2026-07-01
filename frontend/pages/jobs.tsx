import { useEffect, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Divider
} from "@mui/material";
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import WorkIcon from '@mui/icons-material/Work';
import BusinessIcon from '@mui/icons-material/Business';
import RoomIcon from '@mui/icons-material/Room';
import { useRouter } from "next/router";
import api from "../utils/api";
import { hasAuthToken, redirectToLogin } from "../utils/authRedirect";
import { getCurrentUserRole } from "../utils/permissions";

interface JobApplication {
  id: string;
  title: string;
  company: string;
  location: string;
  status: 'Applied' | 'Interviewing' | 'Offered' | 'Closed';
  appliedDate: string;
}

export default function Jobs() {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [userType, setUserType] = useState("");
  const [activeTab, setActiveTab] = useState(0);

  // Saved / Applied states using localStorage
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);

  useEffect(() => {
    if (!router.isReady) return;

    if (!hasAuthToken()) {
      redirectToLogin(router, "/jobs");
      return;
    }

    setAuthChecked(true);
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;

    const storedUser = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "null") : null;
    const currentUserType = storedUser?.userType || getCurrentUserRole() || "";
    setUserType(String(currentUserType).toLowerCase());

    // Fetch jobs
    api
      .get("/jobs")
      .then((res) => {
        setJobs(res.data.data.jobs || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to fetch jobs");
        setLoading(false);
      });

    // Load saved / applied jobs from localstorage
    try {
      const saved = JSON.parse(localStorage.getItem('savedJobs') || '[]');
      setSavedJobIds(saved);
      const apps = JSON.parse(localStorage.getItem('jobApplications') || '[]');
      setApplications(apps);
    } catch (e) {
      console.error(e);
    }
  }, [authChecked]);

  const toggleSaveJob = (id: string) => {
    let updated;
    if (savedJobIds.includes(id)) {
      updated = savedJobIds.filter(savedId => savedId !== id);
    } else {
      updated = [...savedJobIds, id];
    }
    setSavedJobIds(updated);
    localStorage.setItem('savedJobs', JSON.stringify(updated));
  };

  const handleApply = (job: any) => {
    // Add to applications list in localstorage
    const exists = applications.find(app => app.id === job._id);
    if (exists) return;

    const newApp: JobApplication = {
      id: job._id,
      title: job.title,
      company: job.company || 'MedInternia Hospital Group',
      location: job.location,
      status: 'Applied',
      appliedDate: new Date().toLocaleDateString()
    };

    const updated = [newApp, ...applications];
    setApplications(updated);
    localStorage.setItem('jobApplications', JSON.stringify(updated));
  };

  const isPatient = userType === "patient";

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  if (error) return <Alert severity="error">{error}</Alert>;

  const savedJobs = jobs.filter(j => savedJobIds.includes(j._id));

  // Career recommendations based on user role
  const recommendedJobs = jobs
    .filter(j => j.status === 'Open')
    .slice(0, 2);

  return (
    <Box sx={{ bgcolor: '#f5f7fa', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        {isPatient ? (
          <Alert severity="info" sx={{ mb: 3, textAlign: "center", borderRadius: 3 }}>
            Job opportunities are currently available for doctors and interns.
          </Alert>
        ) : null}

        <Box sx={{ mb: 4, textAlign: "center" }}>
          <Typography variant="h3" fontWeight={900} color="#1565c0" gutterBottom>
            Career Dashboard
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Find residency openings, fellowships, and clinical job opportunities.
          </Typography>
        </Box>

        {isPatient ? (
          <Card sx={{ p: 4, textAlign: 'center', borderRadius: 4 }}>
            <Typography color="text.secondary">
              Patients do not see job opportunities on this platform.
            </Typography>
          </Card>
        ) : (
          <Box>
            <Tabs
              value={activeTab}
              onChange={(e, val) => setActiveTab(val)}
              centered
              sx={{ mb: 4, borderBottom: '1px solid #e3eafc' }}
            >
              <Tab label="Explore Jobs" sx={{ fontWeight: 600 }} />
              <Tab label={`Saved (${savedJobs.length})`} sx={{ fontWeight: 600 }} />
              <Tab label={`Application Tracker (${applications.length})`} sx={{ fontWeight: 600 }} />
            </Tabs>

            <Grid container spacing={4}>
              {/* Main Tab Content */}
              <Grid size={{ xs: 12, md: 8 }}>
                {activeTab === 0 && (
                  <Stack spacing={3}>
                    {jobs.length === 0 ? (
                      <Typography align="center" color="text.secondary">No job opportunities found.</Typography>
                    ) : (
                      jobs.map((j) => {
                        const isSaved = savedJobIds.includes(j._id);
                        const isApplied = applications.some(app => app.id === j._id);

                        return (
                          <Card key={j._id} sx={{ borderRadius: 4, border: '1px solid #e3eafc', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                            <CardContent sx={{ p: 3 }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                <Box>
                                  <Typography variant="h6" fontWeight={700} color="primary">
                                    {j.title}
                                  </Typography>
                                  <Stack direction="row" spacing={2} sx={{ mt: 1, color: 'text.secondary' }} flexWrap="wrap" useFlexGap>
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                      <BusinessIcon sx={{ fontSize: 18 }} />
                                      <Typography variant="caption">{j.company || 'MedInternia Partners'}</Typography>
                                    </Stack>
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                      <RoomIcon sx={{ fontSize: 18 }} />
                                      <Typography variant="caption">{j.location}</Typography>
                                    </Stack>
                                  </Stack>
                                </Box>
                                <IconButton onClick={() => toggleSaveJob(j._id)} color="primary">
                                  {isSaved ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                                </IconButton>
                              </Stack>

                              <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Chip label={j.status} color={j.status === 'Open' ? 'success' : 'default'} size="small" sx={{ fontWeight: 700 }} />
                                {j.salary && <Chip label={j.salary} size="small" variant="outlined" />}
                              </Box>

                              <Divider sx={{ my: 2 }} />

                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="caption" color="text.secondary">
                                  Posted: {new Date(j.createdAt || Date.now()).toLocaleDateString()}
                                </Typography>
                                {j.status === "Open" ? (
                                  <Button 
                                    variant="contained" 
                                    color={isApplied ? "success" : "primary"}
                                    onClick={() => handleApply(j)}
                                    disabled={isApplied}
                                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                                  >
                                    {isApplied ? "Applied" : "Apply"}
                                  </Button>
                                ) : (
                                  <Button variant="outlined" disabled sx={{ borderRadius: 2, textTransform: 'none' }}>
                                    Closed
                                  </Button>
                                )}
                              </Stack>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </Stack>
                )}

                {activeTab === 1 && (
                  <Stack spacing={3}>
                    {savedJobs.length === 0 ? (
                      <Alert severity="info" sx={{ borderRadius: 3 }}>
                        No saved opportunities. Go to 'Explore Jobs' and click the bookmark icon to save job postings!
                      </Alert>
                    ) : (
                      savedJobs.map((j) => {
                        const isApplied = applications.some(app => app.id === j._id);
                        return (
                          <Card key={j._id} sx={{ borderRadius: 4, border: '1px solid #e3eafc', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                            <CardContent sx={{ p: 3 }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                <Box>
                                  <Typography variant="h6" fontWeight={700} color="primary">
                                    {j.title}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">{j.location}</Typography>
                                </Box>
                                <IconButton onClick={() => toggleSaveJob(j._id)} color="primary">
                                  <BookmarkIcon />
                                </IconButton>
                              </Stack>
                              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 3 }}>
                                <Chip label={j.status} color={j.status === 'Open' ? 'success' : 'default'} size="small" sx={{ fontWeight: 700 }} />
                                {j.status === "Open" ? (
                                  <Button 
                                    variant="contained" 
                                    color={isApplied ? "success" : "primary"}
                                    onClick={() => handleApply(j)}
                                    disabled={isApplied}
                                    sx={{ borderRadius: 2, textTransform: 'none' }}
                                  >
                                    {isApplied ? "Applied" : "Apply"}
                                  </Button>
                                ) : (
                                  <Button variant="outlined" disabled sx={{ borderRadius: 2 }}>Closed</Button>
                                )}
                              </Stack>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </Stack>
                )}

                {activeTab === 2 && (
                  <Card sx={{ borderRadius: 4, border: '1px solid #e3eafc', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                        Submitted Applications
                      </Typography>
                      {applications.length === 0 ? (
                        <Alert severity="info" sx={{ borderRadius: 3 }}>
                          No applications tracked yet. Click 'Apply' on any open job to add it to the tracker.
                        </Alert>
                      ) : (
                        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3 }}>
                          <Table aria-label="application tracker table">
                            <TableHead sx={{ bgcolor: '#f8fafc' }}>
                              <TableRow>
                                <TableCell><strong>Position / Company</strong></TableCell>
                                <TableCell><strong>Applied Date</strong></TableCell>
                                <TableCell><strong>Status</strong></TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {applications.map((app) => (
                                <TableRow key={app.id}>
                                  <TableCell>
                                    <Typography variant="body2" fontWeight={700}>{app.title}</Typography>
                                    <Typography variant="caption" color="text.secondary">{app.company} - {app.location}</Typography>
                                  </TableCell>
                                  <TableCell>{app.appliedDate}</TableCell>
                                  <TableCell>
                                    <Chip 
                                      label={app.status} 
                                      size="small" 
                                      color={
                                        app.status === 'Offered' ? 'success' : 
                                        app.status === 'Interviewing' ? 'warning' : 'primary'
                                      }
                                      sx={{ fontWeight: 700 }}
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </CardContent>
                  </Card>
                )}
              </Grid>

              {/* Sidebar: Recommendations Widget */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ borderRadius: 4, border: '1px solid #e3eafc', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                      <WorkIcon color="primary" />
                      <Typography variant="subtitle1" fontWeight={700}>
                        Recommended for You
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Career matches based on your medical profile and interests:
                    </Typography>
                    {recommendedJobs.length === 0 ? (
                      <Typography variant="caption" color="text.secondary">No recommended positions available.</Typography>
                    ) : (
                      <Stack spacing={2.5}>
                        {recommendedJobs.map((j) => (
                          <Box key={j._id} sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 3, border: '1px solid #e2e8f0' }}>
                            <Typography variant="body2" fontWeight={700} color="primary" gutterBottom>
                              {j.title}
                            </Typography>
                            <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 1.5 }}>
                              {j.location}
                            </Typography>
                            <Button 
                              variant="outlined" 
                              size="small" 
                              onClick={() => {
                                setActiveTab(0);
                              }}
                              sx={{ borderRadius: 2, textTransform: 'none', fontSize: 11 }}
                            >
                              View Opportunity
                            </Button>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
      </Container>
    </Box>
  );
}
