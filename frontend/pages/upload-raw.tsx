import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Stack,
  Divider,
  Avatar,
  CircularProgress,
  Alert,
  Snackbar,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ImageIcon from "@mui/icons-material/Image";
import { withAuth } from "../components/withAuth";
import api from "../utils/api";

const statusColor: Record<string, string> = {
  approved: "#b9f6ca",
  pending: "#fff9c4",
  solved: "#e1f5fe",
};

function FileIcon({ type }: { type: string }) {
  if (type === "pdf") return <PictureAsPdfIcon color="error" sx={{ mr: 1 }} />;
  if (type === "image") return <ImageIcon color="primary" sx={{ mr: 1 }} />;
  return <InsertDriveFileIcon sx={{ mr: 1 }} />;
}

interface CaseDataType {
  _id: string;
  title: string;
  status?: string;
  moderationStatus?: string;
  description: string;
  createdAt?: string;
  specialization?: string;
  doctor?: { firstName?: string; lastName?: string; specialization?: string };
}

function CaseDetailsDialog({
  open,
  onClose,
  caseData,
}: {
  open: boolean;
  onClose: () => void;
  caseData: CaseDataType | null;
}) {
  if (!caseData) return null;
  const displayStatus = caseData.moderationStatus || caseData.status || "pending";
  const doctorName = caseData.doctor
    ? `${caseData.doctor.firstName ?? ""} ${caseData.doctor.lastName ?? ""}`.trim()
    : "—";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          fontWeight: 700,
          fontSize: 22,
          background: "linear-gradient(90deg, #0072ff 0%, #6dd5ed 100%)",
          color: "#fff",
          borderTopLeftRadius: 4,
          borderTopRightRadius: 4,
          pr: 6,
        }}
      >
        {caseData.title}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: "absolute", right: 16, top: 12, color: "#fff" }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 4, mb: 2 }}>
          <Box sx={{ flex: 1, minWidth: 180 }}>
            <Typography fontWeight={600} fontSize={16} mb={0.5}>Doctor</Typography>
            <Typography mb={1}>{doctorName}</Typography>
            <Typography fontWeight={600} fontSize={16} mb={0.5}>Specialization</Typography>
            <Typography mb={1}>{caseData.doctor?.specialization ?? caseData.specialization ?? "—"}</Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 180 }}>
            <Typography fontWeight={600} fontSize={16} mb={0.5}>Date</Typography>
            <Typography mb={1}>
              {caseData.createdAt ? new Date(caseData.createdAt).toLocaleDateString() : "—"}
            </Typography>
            <Typography fontWeight={600} fontSize={16} mb={0.5}>Status</Typography>
            <Chip
              label={displayStatus}
              sx={{
                background: statusColor[displayStatus] ?? "#f5f5f5",
                color: "#222",
                fontWeight: 600,
                textTransform: "capitalize",
                fontSize: 15,
                px: 2,
              }}
            />
          </Box>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Typography fontWeight={700} fontSize={17} mb={1}>Medical Data</Typography>
        <Box sx={{ background: "#f8fafc", borderRadius: 2, p: 2, fontSize: 15, color: "#222" }}>
          {caseData.description}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            borderColor: "#0072ff",
            color: "#0072ff",
            fontWeight: 600,
            borderRadius: 2,
            "&:hover": { background: "#e0f7fa", borderColor: "#0056cc", color: "#0056cc" },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function UploadRawPage() {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCase, setSelectedCase] = useState<CaseDataType | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    personName: "",
    date: "",
    location: "",
    doctorName: "",
    ayushmanId: "",
    additionalMedicalData: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // File state
  const [medicalFiles, setMedicalFiles] = useState<File[]>([]);
  const [bills, setBills] = useState<File[]>([]);

  // Cases fetched from the API
  const [myCases, setMyCases] = useState<CaseDataType[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError, setCasesError] = useState<string | null>(null);

  // Fetch the authenticated user's own cases on mount
  useEffect(() => {
    const fetchMyCases = async () => {
      try {
        setCasesLoading(true);
        setCasesError(null);
        const res = await api.get("/cases/my");
        const data = res.data?.data?.cases ?? res.data?.cases ?? [];
        setMyCases(data);
      } catch (err: any) {
        setCasesError("Failed to load your cases. Please refresh.");
      } finally {
        setCasesLoading(false);
      }
    };
    fetchMyCases();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => { const e = { ...prev }; delete e[field]; return e; });
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "medical" | "bills"
  ) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      type === "medical"
        ? setMedicalFiles((prev) => [...prev, ...files])
        : setBills((prev) => [...prev, ...files]);
    }
  };

  const handleRemoveFile = (index: number, type: "medical" | "bills") => {
    type === "medical"
      ? setMedicalFiles((prev) => prev.filter((_, i) => i !== index))
      : setBills((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.personName.trim()) newErrors.personName = "Person Name is required";
    if (!formData.date.trim()) newErrors.date = "Date is required";
    if (!formData.location.trim()) newErrors.location = "Location is required";
    if (!formData.doctorName.trim()) newErrors.doctorName = "Doctor Name is required";
    if (!formData.ayushmanId.trim()) newErrors.ayushmanId = "Ayushman Reference ID is required";
    if (!formData.additionalMedicalData.trim())
      newErrors.additionalMedicalData = "Please enter all required patient information";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Send form data and files to the backend via multipart/form-data
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      setSnackbar({ open: true, message: "Please fill in all required fields", severity: "error" });
      return;
    }

    try {
      setSubmitting(true);

      const payload = new FormData();
      // Map form fields to the case creation API shape
      payload.append("title", `Visit on ${formData.date} – ${formData.personName}`);
      payload.append("description", formData.additionalMedicalData);
      payload.append("patientInfo[name]", formData.personName);
      payload.append("patientInfo[location]", formData.location);
      payload.append("patientInfo[doctorName]", formData.doctorName);
      payload.append("patientInfo[ayushmanId]", formData.ayushmanId);
      payload.append("patientInfo[visitDate]", formData.date);

      medicalFiles.forEach((file) => payload.append("medicalFiles", file));
      bills.forEach((file) => payload.append("bills", file));

      const res = await api.post("/cases", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Add the newly created case to the local list immediately
      const created: CaseDataType = res.data?.data?.case ?? res.data?.case;
      if (created) setMyCases((prev) => [created, ...prev]);

      setSnackbar({ open: true, message: "Medical case submitted successfully!", severity: "success" });

      // Reset form
      setFormData({ personName: "", date: "", location: "", doctorName: "", ayushmanId: "", additionalMedicalData: "" });
      setMedicalFiles([]);
      setBills([]);
      setErrors({});
    } catch (err: any) {
      const msg = err.response?.data?.message ?? "Submission failed. Please try again.";
      setSnackbar({ open: true, message: msg, severity: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", background: "linear-gradient(120deg, #e0eafc 0%, #cfdef3 100%)", py: 6, px: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ maxWidth: 700, mx: "auto", mb: 4, textAlign: "center" }}>
        <Typography variant="h3" fontWeight={900} mb={1}
          sx={{ background: "linear-gradient(90deg, #0056cc 0%, #0072ff 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Upload RAW Medical Data
        </Typography>
        <Typography color="text.secondary" fontSize={16}>
          Securely upload your medical records, bills, and clinical data.
        </Typography>
      </Box>

      {/* Upload form */}
      <Box sx={{ maxWidth: 700, mx: "auto", mb: 5 }}>
        <Card sx={{ p: 4, borderRadius: 4, boxShadow: "0 4px 24px #0072ff33", border: "1px solid #e0eafc", background: "#fff", overflow: "hidden" }}>
          <Box sx={{ height: 6, borderRadius: 3, background: "linear-gradient(90deg, #0072ff 0%, #6dd5ed 100%)", mb: 3, mx: -4, mt: -4, borderTopLeftRadius: 16, borderTopRightRadius: 16 }} />
          <Typography color="text.secondary" mb={1} fontSize={15}>
            Upload your raw medical files, bills, and additional data. Only you and authorized medical staff can view your uploads.
          </Typography>
          <Typography mb={3} fontSize={14} sx={{ color: "#0072ff", fontWeight: 600, background: "#e0f7fa", borderRadius: 2, px: 2, py: 1, display: "inline-block" }}>
            Your data is hidden and secured. It will not be copied or shared with anyone else.
          </Typography>
          <form onSubmit={handleSubmit}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Person Name" fullWidth variant="outlined" required value={formData.personName}
                onChange={(e) => handleInputChange("personName", e.target.value)} error={!!errors.personName} helperText={errors.personName} />
              <TextField label="Date" type="date" fullWidth variant="outlined" required InputLabelProps={{ shrink: true }}
                value={formData.date} onChange={(e) => handleInputChange("date", e.target.value)} error={!!errors.date} helperText={errors.date} />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mt={2}>
              <TextField label="Location" fullWidth variant="outlined" required value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)} error={!!errors.location} helperText={errors.location} />
              <TextField label="Doctor Name" fullWidth variant="outlined" required value={formData.doctorName}
                onChange={(e) => handleInputChange("doctorName", e.target.value)} error={!!errors.doctorName} helperText={errors.doctorName} />
            </Stack>
            <TextField label="Ayushman Reference ID" fullWidth variant="outlined" required value={formData.ayushmanId}
              onChange={(e) => handleInputChange("ayushmanId", e.target.value)} error={!!errors.ayushmanId} helperText={errors.ayushmanId} sx={{ mt: 2 }} />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mt={3} mb={1}>
              <Button variant="contained" component="label"
                sx={{ borderRadius: 2, fontWeight: 700, background: "linear-gradient(90deg, #0072ff 0%, #6dd5ed 100%)", color: "#fff" }}>
                Upload Medical Files
                <input type="file" hidden multiple onChange={(e) => handleFileChange(e, "medical")} />
              </Button>
              <Button variant="outlined" component="label"
                sx={{ borderRadius: 2, fontWeight: 600, borderColor: "#0072ff", color: "#0072ff" }}>
                Upload Bills (Optional)
                <input type="file" hidden multiple onChange={(e) => handleFileChange(e, "bills")} />
              </Button>
            </Stack>
            {medicalFiles.length > 0 && (
              <Box sx={{ mb: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
                {medicalFiles.map((file, i) => (
                  <Chip key={i} label={file.name} onDelete={() => handleRemoveFile(i, "medical")} sx={{ bgcolor: "#e3f2fd", color: "#0056cc" }} />
                ))}
              </Box>
            )}
            {bills.length > 0 && (
              <Box sx={{ mb: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
                {bills.map((file, i) => (
                  <Chip key={i} label={file.name} onDelete={() => handleRemoveFile(i, "bills")} sx={{ bgcolor: "#fff3e0", color: "#e65100" }} />
                ))}
              </Box>
            )}
            <TextField label="Additional Medical Data" multiline minRows={3} fullWidth variant="outlined" required
              value={formData.additionalMedicalData} onChange={(e) => handleInputChange("additionalMedicalData", e.target.value)}
              error={!!errors.additionalMedicalData}
              helperText={errors.additionalMedicalData || "Enter symptoms, diagnosis, treatment details, medications prescribed..."}
              sx={{ mb: 2, mt: 2 }} placeholder="Enter symptoms, diagnosis, treatment details..." />
            <Button type="submit" variant="contained" disabled={submitting}
              sx={{ borderRadius: 2, fontWeight: 700, fontSize: 16, mt: 1, px: 4, background: "linear-gradient(90deg, #0072ff 0%, #6dd5ed 100%)", color: "#fff" }}>
              {submitting ? <CircularProgress size={22} color="inherit" /> : "Submit Case"}
            </Button>
          </form>
        </Card>
      </Box>

      {/* My Cases — fetched from API */}
      <Box sx={{ maxWidth: 1100, mx: "auto" }}>
        <Typography variant="h5" fontWeight={800} mb={3} color="#0056cc">
          Your Medical Cases
        </Typography>

        {casesLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {!casesLoading && casesError && (
          <Alert severity="error" sx={{ mb: 3 }}>{casesError}</Alert>
        )}

        {!casesLoading && !casesError && myCases.length === 0 && (
          <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>
            <Typography fontSize={18} fontWeight={600} mb={1}>No cases yet</Typography>
            <Typography fontSize={14}>Cases you submit will appear here.</Typography>
          </Box>
        )}

        {!casesLoading && !casesError && myCases.length > 0 && (
          <Stack direction="row" flexWrap="wrap" gap={3}>
            {myCases.map((c) => {
              const displayStatus = c.moderationStatus || c.status || "pending";
              const doctorName = c.doctor
                ? `${c.doctor.firstName ?? ""} ${c.doctor.lastName ?? ""}`.trim()
                : "—";
              return (
                <Card key={c._id}
                  sx={{ p: 3, borderRadius: 3, minWidth: 270, flex: "1 1 270px", maxWidth: 360, boxShadow: "0 2px 12px #0072ff22",
                    border: "1px solid #e0eafc", cursor: "pointer", overflow: "hidden",
                    transition: "box-shadow 0.2s, transform 0.2s",
                    "&:hover": { boxShadow: "0 8px 32px #0072ff44", transform: "translateY(-2px)", borderColor: "#0072ff" } }}
                  onClick={() => { setSelectedCase(c); setOpenDialog(true); }}>
                  <Box sx={{ height: 4, borderRadius: 2, background: "linear-gradient(90deg, #0072ff 0%, #6dd5ed 100%)",
                    mb: 2, mx: -3, mt: -3, borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                  <Typography fontWeight={700} fontSize={17} mb={1} color="#0056cc">{c.title}</Typography>
                  <Chip label={displayStatus}
                    sx={{ background: statusColor[displayStatus] ?? "#f5f5f5", color: "#222", fontWeight: 600,
                      textTransform: "capitalize", fontSize: 14, px: 1, mb: 1.5 }} />
                  {doctorName !== "—" && (
                    <Typography fontSize={13} color="#0072ff" mb={0.5} fontWeight={500}>{doctorName}</Typography>
                  )}
                  {c.createdAt && (
                    <Typography fontSize={13} color="#888" mb={0.5}>
                      {new Date(c.createdAt).toLocaleDateString()}
                    </Typography>
                  )}
                  <Typography fontSize={13} mb={1.5} color="#555">
                    {c.description.slice(0, 80)}{c.description.length > 80 ? "..." : ""}
                  </Typography>
                </Card>
              );
            })}
          </Stack>
        )}
      </Box>

      <CaseDetailsDialog open={openDialog} onClose={() => setOpenDialog(false)} caseData={selectedCase} />

      <Snackbar open={snackbar.open} autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity} sx={{ width: "100%", fontWeight: 600 }} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default withAuth(UploadRawPage);
