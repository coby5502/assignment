let names = [];

onmessage = function(e) {
  const { type, payload } = e.data;
  if (type === 'init') {
    names = payload.names;
    postMessage({ type: 'ready' });
  } else if (type === 'search') {
    const query = payload.query;
    if (!query.trim()) {
      postMessage({ type: 'search', result: [] });
      return;
    }
    const result = names.filter(name => name.toLowerCase().includes(query.toLowerCase()));
    postMessage({ type: 'search', result });
  } else if (type === 'autocomplete') {
    const query = payload.query;
    if (!query.trim()) {
      postMessage({ type: 'autocomplete', result: null });
      return;
    }
    const match = names.find(name => name.toLowerCase().startsWith(query.toLowerCase())) || null;
    postMessage({ type: 'autocomplete', result: match });
  }
}; 