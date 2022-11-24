import { createTheme, responsiveFontSizes, ThemeProvider } from '@mui/material';
import React from 'react';

let theme = createTheme({
  typography: {
    fontSize: 12,
  },
});
theme = responsiveFontSizes(theme);

export interface ThemeProps {
  children: React.ReactElement;
}

export default function Theme(props: ThemeProps) {
  return <ThemeProvider theme={theme}>{props.children}</ThemeProvider>;
}
