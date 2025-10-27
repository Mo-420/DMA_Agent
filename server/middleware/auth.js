// Simple authentication middleware
// In production, implement proper JWT or session-based authentication

const authenticateRequest = (req, res, next) => {
  // For development, allow all requests
  // In production, implement proper authentication
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    // For now, allow requests without authentication
    // In production, return 401 Unauthorized
    return next();
  }

  // Basic token validation (implement proper JWT validation in production)
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // For development, accept any token
  // In production, validate the JWT token
  req.user = { id: 'user-123', role: 'admin' }; // Mock user
  next();
};

module.exports = {
  authenticateRequest
};

