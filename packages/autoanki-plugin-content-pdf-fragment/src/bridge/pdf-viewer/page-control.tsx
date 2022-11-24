import { useEffect, useState } from 'react';
import {
  IconButton,
  TextField,
  Typography,
  useMediaQuery,
  Theme,
  Divider,
} from '@mui/material';
import {
  ArrowUpward as PreviousPageIcon,
  ArrowDownward as NextPageIcon,
} from '@mui/icons-material';

interface PageControlProps {
  page: number;
  onPageChanged: (newPage: number) => void;
  numPages?: number;
  allowedPages?: number[];
}

function coerceToInt(value: string | number): number {
  return typeof value === 'string' ? Number.parseInt(value) : value;
}

type PageOperationConstraint = Pick<
  PageControlProps,
  'numPages' | 'allowedPages'
>;

type PageOperation<T> = {
  /**
   * Whether given the current state, this operation is still allowed
   */
  allowed: (
    currentValue: number,
    constrains: PageOperationConstraint
  ) => boolean;
  /**
   * Trigger the operation
   *
   * @returns new state or udnefined if the action was triggered inappropriately.
   */
  trigger: (
    currentValue: number,
    constrains: PageOperationConstraint,
    payload: T
  ) => number | undefined;
};

const pageOperations = {
  previousPage: {
    allowed: (currentValue, constrains) => {
      if (currentValue === 1) {
        return false;
      }
      if (constrains.allowedPages?.indexOf(currentValue) === 0) {
        return false;
      }
      return true;
    },
    trigger: (currentValue, constrains, payload) => {
      if (constrains.allowedPages) {
        return constrains.allowedPages[
          constrains.allowedPages.indexOf(currentValue) - 1
        ];
      }
      return currentValue - 1;
    },
  } as PageOperation<void>,
  nextPage: {
    allowed: (currentValue, constrains) => {
      if (!constrains.numPages || currentValue >= constrains.numPages) {
        return false;
      }
      if (
        constrains.allowedPages &&
        constrains.allowedPages.indexOf(currentValue) ===
          constrains.allowedPages.length - 1
      ) {
        return false;
      }
      return true;
    },
    trigger: (currentValue, constrains, payload) => {
      if (constrains.allowedPages) {
        return constrains.allowedPages[
          constrains.allowedPages.indexOf(currentValue) + 1
        ];
      }
      return currentValue + 1;
    },
  } as PageOperation<void>,
  setPage: {
    allowed: (currentValue, constrains) => {
      if (!constrains.numPages && constrains.numPages === 1) {
        return false;
      }
      if (constrains.allowedPages && constrains.allowedPages.length === 0) {
        return false;
      }
      return true;
    },
    trigger: (currentValue, constrains, newValue) => {
      if (newValue < 1) {
        return;
      }
      if (!constrains.numPages || newValue > constrains.numPages) {
        return;
      }
      return newValue;
    },
  } as PageOperation<number>,
} as const;

function PageControlInput(props: PageControlProps) {
  const [inputPageNumber, setInputPageNumber] = useState<string>(
    props.page.toString()
  );

  useEffect(() => {
    setInputPageNumber(props.page.toString());
  }, [props.page]);

  return (
    <TextField
      variant="outlined"
      sx={{
        mx: 1,
        width: '4rem',
        input: {
          textAlign: 'right',
        },
      }}
      size="small"
      disabled={!pageOperations.setPage.allowed(props.page, props)}
      value={inputPageNumber}
      onBlur={() => {
        const newPage = pageOperations.setPage.trigger(
          props.page,
          props,
          Number.parseInt(inputPageNumber)
        );
        if (newPage) {
          props.onPageChanged(newPage);
        } else {
          // invalid page, reset input to original value
          setInputPageNumber(props.page.toString());
        }
      }}
      onChange={(ev) => {
        setInputPageNumber(ev.target.value);
      }}
    />
  );
}

export default function PageControl(props: PageControlProps) {
  const isMobile = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down('md')
  );

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <IconButton
        aria-label="previous page"
        disabled={!pageOperations.previousPage.allowed(props.page, props)}
        onClick={() => {
          const previousPage = pageOperations.previousPage.trigger(
            props.page,
            props
          );
          if (previousPage) {
            props.onPageChanged(previousPage);
          }
        }}
      >
        <PreviousPageIcon />
      </IconButton>
      <Divider orientation="vertical" />
      <IconButton
        aria-label="next page"
        disabled={!pageOperations.nextPage.allowed(props.page, props)}
        onClick={() => {
          const nextPage = pageOperations.nextPage.trigger(props.page, props);
          if (nextPage) {
            props.onPageChanged(nextPage);
          }
        }}
      >
        <NextPageIcon />
      </IconButton>
      {isMobile ? (
        /* On mobile the input takes too much space.
         * Furthermore AnkiAndroid doesn't support inputs anyway */
        <Typography variant="body1">{props.page}&nbsp;</Typography>
      ) : (
        <PageControlInput {...props} />
      )}
      <Typography variant="body1">of {props.numPages}</Typography>
    </div>
  );
}
