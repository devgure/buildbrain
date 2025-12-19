const { expressjwt: jwt } = require('express-jwt')
const jwksRsa = require('jwks-rsa')

function authMiddleware() {
  if (process.env.DISABLE_AUTH === 'true') {
    return (req, res, next) => next()
  }
  const domain = process.env.AUTH0_DOMAIN
  const audience = process.env.AUTH0_AUDIENCE
  if (!domain || !audience) {
    console.warn('AUTH0_DOMAIN or AUTH0_AUDIENCE not set; auth disabled')
    return (req, res, next) => next()
  }
  return jwt({
    secret: jwksRsa.expressJwtSecret({ cache: true, rateLimit: true, jwksUri: `https://${domain}/.well-known/jwks.json` }),
    audience: audience,
    issuer: `https://${domain}/`,
    algorithms: ['RS256']
  })
}

module.exports = authMiddleware()
