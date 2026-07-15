// eslint-disable-next-line react/prop-types
const ErrorMessage = ({ message }) => (
  <div style={{ textAlign: 'center' }}>{message}</div>
);

const GenericErrorMessage = () => (
  <ErrorMessage
    message={
      <>
        An error occured.
        <br />
        Please refresh the page.
      </>
    }
  />
);

const NoDataErrorMessage = () => (
  <ErrorMessage message="No data available for the current selection." />
);

const EmbargoErrorMessage = () => <ErrorMessage message="Not yet available." />;

export const errorMessages = {
  generic: {
    code: 'generic',
    getLabel: GenericErrorMessage,
  },
  noData: {
    code: 'noData',
    getLabel: NoDataErrorMessage,
  },
  underEmbargo: {
    code: 'underEmbargo',
    getLabel: EmbargoErrorMessage,
  },
};
