const capturedErrors = [];

module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'POST') {
    const { message, source, lineno, colno, error, type, url } = req.body || {};

    capturedErrors.unshift({
      timestamp: new Date().toISOString(),
      type,
      message,
      source,
      lineno,
      colno,
      error,
      url,
    });

    if (capturedErrors.length > 50) capturedErrors.pop();

    return res.status(200).json({ success: true });
  } else if (req.method === 'GET') {
    return res.status(200).json(capturedErrors);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
};
