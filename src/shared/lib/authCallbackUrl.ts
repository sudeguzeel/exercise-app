export function getAuthCallbackParameters(url: string) {
  const queryStart = url.indexOf("?");
  const hashStart = url.indexOf("#");
  const queryEnd = hashStart >= 0 && hashStart > queryStart ? hashStart : url.length;
  const query = queryStart >= 0 ? url.slice(queryStart + 1, queryEnd) : "";
  const fragment = hashStart >= 0 ? url.slice(hashStart + 1) : "";
  const parameters = new URLSearchParams(query);

  new URLSearchParams(fragment).forEach((value, key) => {
    parameters.set(key, value);
  });

  return parameters;
}
