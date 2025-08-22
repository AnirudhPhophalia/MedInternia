// import React from "react";
// import {
//   Box,
//   Typography,
//   Card,
//   List,
//   ListItem,
//   ListItemText,
//   Divider,
// } from "@mui/material";

// const activities = [
//   { type: "Case", desc: "Reviewed case #123", date: "2025-08-15" },
//   { type: "Comment", desc: "Commented on webinar #45", date: "2025-08-14" },
//   { type: "Achievement", desc: "Unlocked Champion badge", date: "2025-08-10" },
// ];

// export default function ActivityPage() {
//   return (
//     <Box maxWidth={600} mx="auto" my={4}>
//       <Card sx={{ p: 4, borderRadius: 4 }}>
//         <Typography variant="h5" fontWeight={700} mb={2}>
//           Recent Activity
//         </Typography>
//         <List>
//           {activities.map((a, i) => (
//             <React.Fragment key={i}>
//               <ListItem>
//                 <ListItemText primary={a.desc} secondary={a.date} />
//               </ListItem>
//               {i < activities.length - 1 && <Divider />}
//             </React.Fragment>
//           ))}
//         </List>
//       </Card>
//     </Box>
//   );
// }
