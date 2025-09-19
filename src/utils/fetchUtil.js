/*global fetch*/
import * as R from 'ramda';

const handleResponse = async (response) => {
  if (response.status >= 200 && response.status < 300) {
    return response.json();
  }
  let errorResponse = null;
  try {
    errorResponse = await response.json();
  } catch {
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

export const postJson = async (url, json, config = {}) => {
  const newConfig = {
    ...config,
    method: 'POST',
    headers: {
      ...config.headers,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(json),
  };
  const response = await fetch(url, newConfig);
  return handleResponse(response);
};
