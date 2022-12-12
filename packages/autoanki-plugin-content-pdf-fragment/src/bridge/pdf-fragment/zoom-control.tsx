import {
  IconButton,
  FormControl,
  Select,
  MenuItem,
  useMediaQuery,
  Theme,
} from '@mui/material';
import {
  Add as IncreaseZoomIcon,
  Remove as DecreaseZoomIcon,
} from '@mui/icons-material';

interface ZoomControlProps {
  zoom: number;
  onZoomChanged: (newZoom: number) => void;
  className?: string;
}

const ZOOM_LEVELS = [50, 75, 100, 125, 150, 200, 300, 400];

function coerceToInt(value: string | number): number {
  // NOTE: we expect only decimal values.
  return typeof value === 'string' ? Number.parseInt(value, 10) : value;
}

export default function ZoomControl(props: ZoomControlProps) {
  const hidden = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  return (
    <div
      className={props.className}
      css={{
        display: 'flex',
        flexDirection: 'row',
        alignContent: 'center',
      }}
    >
      <IconButton
        aria-label="decrease zoom"
        onClick={() => props.onZoomChanged(Math.max(10, props.zoom - 10))}
      >
        <DecreaseZoomIcon />
      </IconButton>
      <IconButton
        aria-label="increase zoom"
        onClick={() => props.onZoomChanged(Math.min(500, props.zoom + 10))}
      >
        <IncreaseZoomIcon />
      </IconButton>
      {hidden ? undefined : (
        <FormControl variant="outlined" sx={{ mx: 1 }} size="small">
          <Select
            value={props.zoom.toString()}
            onChange={(value) =>
              props.onZoomChanged(coerceToInt(value.target.value))
            }
          >
            {!ZOOM_LEVELS.includes(props.zoom) ? (
              <MenuItem
                css={{ display: 'none' }}
                key={props.zoom}
                value={props.zoom}
              >
                {props.zoom.toFixed(0)}%
              </MenuItem>
            ) : undefined}
            {ZOOM_LEVELS.map((level) => {
              return (
                <MenuItem key={level} value={level}>
                  {level}%
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      )}
    </div>
  );
}
