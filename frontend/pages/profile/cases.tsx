import React from "react";
import {
  Box,
  Typography,
  Card,
  List,
  ListItem,
  ListItemText,
  Button,
} from "@mui/material";

const cases = [
  { id: 1, title: "Cardiology Case #1", status: "Reviewed" },
  { id: 2, title: "Neurology Case #2", status: "Pending" },
];

export default function CasesPage() {
  const router = require("next/router").useRouter();
  return (
    <Box maxWidth={600} mx="auto" my={4}>
      <Card sx={{ p: 4, borderRadius: 4 }}>
        <Typography variant="h5" fontWeight={700} mb={2}>
          My Cases
        </Typography>
        <List>
          {cases.map((c) => (
            <ListItem
              key={c.id}
              secondaryAction={
                <Button
                  variant="outlined"
                  onClick={() => router.push(`/cases/${c.id}`)}
                >
                  View
                </Button>
              }
            >
              <ListItemText primary={c.title} secondary={c.status} />
            </ListItem>
          ))}
        </List>
      </Card>
    </Box>
  );
}
