import { CssBaseline, Button } from '@material-ui/core';
import React from 'react';

export const App: React.FC<{}> = () => {
  return (
    <>
      <CssBaseline />
      <Button variant="contained" color="primary">
        Hello World
      </Button>
    </>
  );
};
