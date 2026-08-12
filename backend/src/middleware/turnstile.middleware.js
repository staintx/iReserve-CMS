const turnstileMiddleware = async (req, res, next) => {
  if (process.env.SKIP_TURNSTILE === 'true') {
    if (req.body) {
      delete req.body['cf-turnstile-response'];
      delete req.body['cfTurnstileResponse'];
    }
    return next();
  }

  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  if (turnstileSecret) {
    const token = req.body['cf-turnstile-response'];
    if (!token) {
      return res.status(400).json({ message: "Security check failed. Please complete the captcha." });
    }
    try {
      const formData = new URLSearchParams();
      formData.append('secret', turnstileSecret);
      formData.append('response', token);
      
      const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: 'POST',
        body: formData
      });
      const verifyData = await verifyRes.json();
      
      if (!verifyData.success) {
        return res.status(400).json({ message: "Security check failed. Please refresh and try again." });
      }
    } catch (err) {
      return res.status(500).json({ message: "Unable to verify security check." });
    }
  }

  // Remove Turnstile response from req.body to prevent Joi validation errors in downstream middleware
  if (req.body) {
    delete req.body['cf-turnstile-response'];
    delete req.body['cfTurnstileResponse'];
  }

  next();
};

module.exports = { turnstileMiddleware };
