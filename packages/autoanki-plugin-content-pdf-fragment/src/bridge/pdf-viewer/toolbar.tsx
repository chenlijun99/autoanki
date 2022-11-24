import React from 'react';
import { AppBar, AppBarProps, Toolbar, useScrollTrigger } from '@mui/material';

interface ElevationScrollProps {
  scrollContainer: Node | null;
  children: React.ReactElement;
}

function ElevationScroll(props: ElevationScrollProps) {
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 0,
    target: props.scrollContainer ?? undefined,
  });

  return React.cloneElement(props.children, {
    elevation: trigger ? 2 : 0,
  });
}

interface CustomAppBarProps extends AppBarProps {
  children: React.ReactElement;
}

function CustomAppBar(props: CustomAppBarProps) {
  const { children, ...forward } = props;
  return (
    <AppBar position="sticky" color="default" elevation={0} {...forward}>
      <Toolbar variant="dense">{children}</Toolbar>
    </AppBar>
  );
}

export type ToolbarProps = CustomAppBarProps & ElevationScrollProps;

/**
 * The custom appbar is sticky. So it will stick to the nearest scrollable parent.
 */
export default function ElevateAppBar(props: ToolbarProps) {
  const { scrollContainer, ...forwarded } = props;
  if (scrollContainer) {
    return (
      <ElevationScroll scrollContainer={scrollContainer}>
        <CustomAppBar {...forwarded} />
      </ElevationScroll>
    );
  } else {
    return <CustomAppBar {...forwarded} />;
  }
}
