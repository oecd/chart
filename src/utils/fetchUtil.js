import * as R from 'ramda';

const handleResponse = async (response) => {
  if (response.status >= 200 && response.status < 300) {
    return response.json();
  }
  let errorResponse = null;
  try {
    errorResponse = await response.json();
  } catch (e) {
    throw new Error(response.statusText);
  }
  if (R.has('error', errorResponse)) {
    throw new Error(R.prop('error', errorResponse));
  } else {
    throw new Error(response.statusText);
  }
};

export const fetchJson = async (url, config = {}) => {
  const response = await fetch(url, config);
  return handleResponse(response);
};
