import React from 'react';

import { Tooltip, IconButton } from '@mui/material';
import {
  Fullscreen as EnterFullscreenIcon,
  FullscreenExit as ExitFullscreenIcon,
} from '@mui/icons-material';

import { useFullscreen, useToggle } from 'react-use';

export interface Props {
  container: React.RefObject<Element>;
}

const FullscreenButton: React.FC<Props> = (props) => {
  const [show, toggle] = useToggle(false);
  const isFullscreen = useFullscreen(props.container, show, {
    onClose: () => {
      toggle(false);
    },
  });

  return (
    <Tooltip title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
      <IconButton
        onClick={() => {
          toggle();
        }}
      >
        {isFullscreen ? <ExitFullscreenIcon /> : <EnterFullscreenIcon />}
      </IconButton>
    </Tooltip>
  );
};

export default FullscreenButton;
