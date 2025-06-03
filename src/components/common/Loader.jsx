// src/components/common/Loader.jsx
import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const Loader = ({ message = 'Chargement en cours...' }) => (
  <Box 
    display="flex" 
    flexDirection="column"
    justifyContent="center" 
    alignItems="center" 
    minHeight="300px"
  >
    <CircularProgress size={40} />
    <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
      {message}
    </Typography>
  </Box>
);

export default Loader;